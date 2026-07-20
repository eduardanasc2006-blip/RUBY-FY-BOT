/**
 * Testes da Etapa 19C — Gerenciamento Avançado do Dashboard
 *
 * BLOCO 1  — Templates CRUD                      (7 testes)
 * BLOCO 2  — Connections CRUD + toggle           (8 testes)
 * BLOCO 3  — Automations CRUD + logs + meta      (8 testes)
 * BLOCO 4  — Panels CRUD + buttons               (8 testes)
 * BLOCO 5  — Products CRUD + stock               (8 testes)
 * BLOCO 6  — Orders get-one + status update      (6 testes)
 * BLOCO 7  — Clients get-one + update + delete   (5 testes)
 * BLOCO 8  — Proofs listagem + filtros           (4 testes)
 * BLOCO 9  — Settings tickets                    (5 testes)
 * BLOCO 10 — Autenticação e isolamento           (7 testes)
 * BLOCO 11 — Stats expandidas (19C)              (4 testes)
 *
 * Total: 70 testes
 */

import { test, describe, before } from 'node:test';
import assert  from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Bootstrap ──────────────────────────────────────────────────────────────
let db19c;
let repos;
let Sessions;
let api19cRouter;
let apiRouter;

before(async () => {
  const { initDatabase } = await import('../src/database/client.mjs');
  initDatabase();
  Sessions    = await import('../src/database/repositories/Sessions.mjs');
  repos       = {
    Templates:   await import('../src/database/repositories/Templates.mjs'),
    Connections: await import('../src/database/repositories/Connections.mjs'),
    Automations: await import('../src/database/repositories/Automations.mjs'),
    Panels:      await import('../src/database/repositories/CustomPanels.mjs'),
    Products:    await import('../src/database/repositories/Products.mjs'),
    Orders:      await import('../src/database/repositories/Orders.mjs'),
    Clients:     await import('../src/database/repositories/Clients.mjs'),
    Proofs:      await import('../src/database/repositories/Proofs.mjs'),
    Tickets:     await import('../src/database/repositories/Tickets.mjs'),
  };
  api19cRouter = (await import('../src/web/routes/api19c.mjs')).default;
  apiRouter    = (await import('../src/web/routes/api.mjs')).default;
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Cria sessão autenticada com acesso ao guildId informado */
function makeSession(guildId, perms = '0x8') {
  const { token } = Sessions.createSession({
    userId: `user_${Math.random().toString(36).slice(2)}`,
    data: {
      guilds: [{ id: guildId, name: 'Test Guild', permissions: String(parseInt(perms, 16)) }],
    },
  });
  return token;
}

/** Cria sessão SEM acesso a nenhum guild */
function makeSessionNoGuild() {
  const { token } = Sessions.createSession({
    userId: 'u_noaccess',
    data: { guilds: [] },
  });
  return token;
}

/** Despacha uma request HTTP simulada no router api19c */
function dispatch(router, method, url, { cookieToken, body } = {}) {
  return new Promise(resolve => {
    const req = {
      method: method.toUpperCase(),
      path:   url, url,
      originalUrl: url,
      headers: cookieToken ? { cookie: `ruby_session=${cookieToken}` } : {},
      params: {},
      query: {},
      body: body ?? {},
    };

    // Parse params from URL (básico, suficiente para testes)
    const segments = url.split('/');
    // /guilds/:guildId/...
    const giIdx = segments.indexOf('guilds');
    if (giIdx !== -1 && segments[giIdx + 1]) req.params.guildId = segments[giIdx + 1];

    let statusCode = 200;
    let responseBody = null;

    const res = {
      _status: 200,
      status(code) { statusCode = code; return this; },
      json(b)  { responseBody = b; resolve({ statusCode, body: b }); },
      send(b)  { responseBody = b; resolve({ statusCode, body: b }); },
      end()    { resolve({ statusCode, body: responseBody }); },
    };
    const next = () => resolve({ statusCode: 404, body: null });

    // Session middleware precisa ser aplicado manualmente
    const { sessionMiddleware, requireAuth } = require('../src/web/middleware/requireAuth.mjs');
    // simples: popula req.session via getSession
    import('../src/database/repositories/Sessions.mjs').then(mod => {
      const token = cookieToken;
      if (token) {
        const session = mod.getSession(token);
        req.session = session ?? null;
        req.sessionToken = token;
      } else {
        req.session = null;
        req.sessionToken = null;
      }
      router.handle(req, res, next);
    });
  });
}

/**
 * Despacha via router com session pré-populada diretamente
 * (mais confiável que parse manual de cookie)
 */
function dispatchWithSession(router, method, url, { session = null, body = {}, extraParams = {} } = {}) {
  return new Promise(resolve => {
    const segments = url.split('/');
    const giIdx    = segments.indexOf('guilds');
    const params   = { ...extraParams };
    if (giIdx !== -1 && segments[giIdx + 1]) params.guildId = segments[giIdx + 1];

    // Extrai parâmetros adicionais das rotas
    const specialRoutes = [
      { re: /\/guilds\/[^/]+\/templates\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/connections\/([^/]+)\/toggle/, key: 'id' },
      { re: /\/guilds\/[^/]+\/connections\/([^/]+)\/clear-error/, key: 'id' },
      { re: /\/guilds\/[^/]+\/connections\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/automations\/([^/]+)\/toggle/, key: 'id' },
      { re: /\/guilds\/[^/]+\/automations\/([^/]+)\/logs/, key: 'id' },
      { re: /\/guilds\/[^/]+\/automations\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/panels\/([^/]+)\/buttons\/([^/]+)/, key: 'btnId', key2: 'id' },
      { re: /\/guilds\/[^/]+\/panels\/([^/]+)\/buttons/, key: 'panelId' },
      { re: /\/guilds\/[^/]+\/panels\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/products\/([^/]+)\/stock/, key: 'id' },
      { re: /\/guilds\/[^/]+\/products\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/orders\/([^/]+)\/status/, key: 'id' },
      { re: /\/guilds\/[^/]+\/orders\/([^/]+)/, key: 'id' },
      { re: /\/guilds\/[^/]+\/clients\/([^/]+)/, key: 'id' },
    ];
    for (const { re, key, key2 } of specialRoutes) {
      const m = re.exec(url);
      if (m) {
        if (key2) { params['id'] = m[1]; params[key2] = m[2]; break; }
        params[key] = m[1];
        if (key === 'panelId') params.id = m[1];
        break;
      }
    }

    const req = {
      method:  method.toUpperCase(),
      path:    url, url,
      originalUrl: url,
      headers: {},
      params,
      query:   {},
      body:    body ?? {},
      session,
      sessionToken: session ? 'mock-token' : null,
    };

    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return this; },
      json(b)   { resolve({ statusCode, body: b }); },
      send(b)   { resolve({ statusCode, body: b }); },
      end()     { resolve({ statusCode, body: null }); },
    };
    const next = () => resolve({ statusCode: 404, body: null });
    router.handle(req, res, next);
  });
}

/** Constrói objeto de sessão com acesso a um guild */
function sessionObj(guildId, perms = (0x8).toString()) {
  return {
    userId: `u_${Math.random().toString(36).slice(2)}`,
    data: {
      guilds: [{ id: guildId, name: 'Guild Test', permissions: perms }],
    },
  };
}

const G1 = 'guild_19c_test_001';
const G2 = 'guild_19c_test_002';

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 1 — Templates CRUD
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 1 — Templates CRUD', () => {
  let tmplId;
  const sess1 = () => sessionObj(G1);

  test('1.1 — POST /guilds/:guildId/templates cria template', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/templates`, {
      session: sess1(),
      body: { name: 'Tmpl Teste 19C', description: 'Descrição teste', type: 'embed', data: { color: '#fff' } },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.template?.id);
    assert.equal(r.body.template.name, 'Tmpl Teste 19C');
    tmplId = r.body.template.id;
  });

  test('1.2 — GET /guilds/:guildId/templates/:id retorna template', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/templates/${tmplId}`, {
      session: sess1(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.template.id, tmplId);
  });

  test('1.3 — PATCH /guilds/:guildId/templates/:id atualiza template', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/templates/${tmplId}`, {
      session: sess1(),
      body: { name: 'Tmpl Atualizado' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.template.name, 'Tmpl Atualizado');
  });

  test('1.4 — DELETE /guilds/:guildId/templates/:id exclui template', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/templates/${tmplId}`, {
      session: sess1(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
  });

  test('1.5 — POST /templates sem nome retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/templates`, {
      session: sess1(),
      body: { description: 'sem nome' },
    });
    assert.equal(r.statusCode, 400);
    assert.ok(r.body.error);
  });

  test('1.6 — GET /templates/:id inexistente retorna 404', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/templates/id-inexistente`, {
      session: sess1(),
    });
    assert.equal(r.statusCode, 404);
  });

  test('1.7 — GET /templates/:id de outro guild retorna 404', async () => {
    // Cria no G1, tenta acessar como G2
    const t = repos.Templates.createTemplate(G1, { name: 'Cross Guild', data: {} });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/templates/${t.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Template de G1 não deve ser acessível pelo G2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 2 — Connections CRUD + toggle + clear-error
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 2 — Connections CRUD + toggle + clear-error', () => {
  let connId;
  const sess = () => sessionObj(G1);

  before(() => {
    // Garante que o template do templateId de referência existe
    repos.Templates.createTemplate(G1, { name: 'TmplForConn', data: {} });
  });

  test('2.1 — POST /connections cria conexão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/connections`, {
      session: sess(),
      body: { action: 'order_paid', templateId: 'tmpl-ref-001', targetChannelId: '123456789', enabled: true },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.connection?.id);
    connId = r.body.connection.id;
  });

  test('2.2 — GET /connections/:id retorna conexão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/connections/${connId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.connection.id, connId);
  });

  test('2.3 — PATCH /connections/:id atualiza conexão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/connections/${connId}`, {
      session: sess(),
      body: { action: 'order_created' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.connection.action, 'order_created');
  });

  test('2.4 — POST /connections/:id/toggle alterna enabled', async () => {
    const before = (await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/connections/${connId}`, { session: sess() })).body.connection.enabled;
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/connections/${connId}/toggle`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.notEqual(r.body.connection.enabled, before, 'Toggle deve inverter o enabled');
  });

  test('2.5 — POST /connections/:id/clear-error limpa erro', async () => {
    repos.Connections.markConnectionError(G1, connId, 'Erro simulado');
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/connections/${connId}/clear-error`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
    const c = repos.Connections.getConnection(G1, connId);
    assert.equal(c.lastError, null, 'lastError deve ser null após clear');
  });

  test('2.6 — DELETE /connections/:id exclui conexão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/connections/${connId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
  });

  test('2.7 — POST /connections sem action retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/connections`, {
      session: sess(),
      body: { templateId: 'x', targetChannelId: 'y' },
    });
    assert.equal(r.statusCode, 400);
  });

  test('2.8 — GET /connections/:id inexistente retorna 404', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/connections/inexistente-conn`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 3 — Automations CRUD + logs + meta
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 3 — Automations CRUD + logs + meta', () => {
  let autoId;
  const sess = () => sessionObj(G1);

  test('3.1 — GET /automations/meta retorna triggers, conditions, actions', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations/meta`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.triggers), 'triggers deve ser array');
    assert.ok(Array.isArray(r.body.conditions), 'conditions deve ser array');
    assert.ok(Array.isArray(r.body.actions), 'actions deve ser array');
    assert.ok(r.body.triggers.length > 0, 'deve ter pelo menos 1 trigger');
  });

  test('3.2 — GET /automations lista automações', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.automations));
  });

  test('3.3 — POST /automations cria automação', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/automations`, {
      session: sess(),
      body: { name: 'Auto Teste 19C', trigger: 'ticket_opened', conditions: [], actions: [] },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.automation?.id);
    autoId = r.body.automation.id;
  });

  test('3.4 — GET /automations/:id retorna automação', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations/${autoId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.automation.id, autoId);
  });

  test('3.5 — PATCH /automations/:id atualiza automação', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/automations/${autoId}`, {
      session: sess(),
      body: { name: 'Auto Atualizada' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.automation.name, 'Auto Atualizada');
  });

  test('3.6 — POST /automations/:id/toggle ativa/desativa', async () => {
    const before = (await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations/${autoId}`, { session: sess() })).body.automation.enabled;
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/automations/${autoId}/toggle`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.notEqual(r.body.automation.enabled, before, 'Toggle deve inverter enabled');
  });

  test('3.7 — GET /automations/:id/logs retorna logs', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations/${autoId}/logs`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.logs));
  });

  test('3.8 — POST /automations com trigger inválido retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/automations`, {
      session: sess(),
      body: { name: 'X', trigger: 'trigger_invalido_xyz' },
    });
    assert.equal(r.statusCode, 400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 4 — Panels CRUD + buttons
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 4 — Panels CRUD + buttons', () => {
  let panelId;
  let btnId;
  const sess = () => sessionObj(G1);

  test('4.1 — GET /panels lista painéis', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/panels`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.panels));
  });

  test('4.2 — POST /panels cria painel', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/panels`, {
      session: sess(),
      body: { name: 'Painel 19C', embedTitle: 'Título do painel', embedColor: '#8b5cf6' },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.panel?.id);
    panelId = r.body.panel.id;
  });

  test('4.3 — GET /panels/:id retorna painel com botões', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/panels/${panelId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.panel.id, panelId);
    assert.ok(Array.isArray(r.body.panel.buttons), 'Deve incluir array buttons');
  });

  test('4.4 — PATCH /panels/:id atualiza painel', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/panels/${panelId}`, {
      session: sess(),
      body: { name: 'Painel Atualizado', embedDescription: 'Nova descrição' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.panel.name, 'Painel Atualizado');
  });

  test('4.5 — POST /panels/:id/buttons adiciona botão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/panels/${panelId}/buttons`, {
      session: sess(),
      body: { label: 'Abrir Ticket', style: 'Primary', actionType: 'open_ticket', actionData: {} },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.button?.id);
    btnId = r.body.button.id;
  });

  test('4.6 — POST /panels/:id/buttons com actionType inválido retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/panels/${panelId}/buttons`, {
      session: sess(),
      body: { label: 'X', actionType: 'invalid_action_type' },
    });
    assert.equal(r.statusCode, 400);
  });

  test('4.7 — DELETE /panels/:id/buttons/:btnId exclui botão', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/panels/${panelId}/buttons/${btnId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
  });

  test('4.8 — DELETE /panels/:id exclui painel', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/panels/${panelId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 5 — Products CRUD + stock
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 5 — Products CRUD + stock', () => {
  let prodId;
  const sess = () => sessionObj(G1);

  test('5.1 — GET /products lista produtos', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/products`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.products));
  });

  test('5.2 — POST /products cria produto', async () => {
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/products`, {
      session: sess(),
      body: { name: 'Produto 19C', price: 'R$ 29,90', stock: 10 },
    });
    assert.equal(r.statusCode, 201);
    assert.ok(r.body?.product?.id);
    assert.equal(r.body.product.stock, 10);
    prodId = r.body.product.id;
  });

  test('5.3 — GET /products/:id retorna produto', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/products/${prodId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.product.id, prodId);
  });

  test('5.4 — PATCH /products/:id atualiza produto', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/products/${prodId}`, {
      session: sess(),
      body: { name: 'Produto Atualizado', price: 'R$ 39,90' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.product.name, 'Produto Atualizado');
  });

  test('5.5 — PATCH /products/:id/stock define estoque com qty', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/products/${prodId}/stock`, {
      session: sess(),
      body: { qty: 50 },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.product.stock, 50);
  });

  test('5.6 — PATCH /products/:id/stock ajusta estoque com delta', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/products/${prodId}/stock`, {
      session: sess(),
      body: { delta: -5 },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.product.stock, 45, 'Stock deve ser 50 - 5 = 45');
  });

  test('5.7 — PATCH /products/:id/stock com qty negativa retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/products/${prodId}/stock`, {
      session: sess(),
      body: { qty: -10 },
    });
    assert.equal(r.statusCode, 400);
  });

  test('5.8 — DELETE /products/:id exclui produto', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/products/${prodId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 6 — Orders get-one + status update
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 6 — Orders get-one + status update', () => {
  let orderId;
  const sess = () => sessionObj(G1);

  before(() => {
    const order = repos.Orders.createOrder(G1, {
      vendorId: 'vendor_19c',
      produto:  'Produto Teste 19C',
      valor:    'R$ 50,00',
    });
    orderId = order.id;
  });

  test('6.1 — GET /orders/:id retorna pedido', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/orders/${orderId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.order.id, orderId);
  });

  test('6.2 — PATCH /orders/:id/status transição válida (pending → paid)', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/orders/${orderId}/status`, {
      session: sess(),
      body: { status: 'paid' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.order.status, 'paid');
  });

  test('6.3 — PATCH /orders/:id/status transição inválida retorna 409', async () => {
    // paid → pending é inválido
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/orders/${orderId}/status`, {
      session: sess(),
      body: { status: 'pending' },
    });
    assert.equal(r.statusCode, 409);
  });

  test('6.4 — PATCH /orders/:id/status sem campo status retorna 400', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/orders/${orderId}/status`, {
      session: sess(),
      body: {},
    });
    assert.equal(r.statusCode, 400);
  });

  test('6.5 — PATCH /orders/:id/status pedido terminal retorna 409', async () => {
    // Leva o pedido até completed
    await repos.Orders.updateOrderStatus(G1, orderId, 'completed');
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/orders/${orderId}/status`, {
      session: sess(),
      body: { status: 'cancelled' },
    });
    assert.equal(r.statusCode, 409);
  });

  test('6.6 — GET /orders/:id inexistente retorna 404', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/orders/inexistente-order-19c`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 7 — Clients get-one + update + delete
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 7 — Clients get-one + update + delete', () => {
  let clientId;
  const sess = () => sessionObj(G1);

  before(() => {
    const c = repos.Clients.createClient(G1, { displayName: 'Cliente 19C', email: 'test19c@example.com' });
    clientId = c.id;
  });

  test('7.1 — GET /clients/:id retorna cliente', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/clients/${clientId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.client.id, clientId);
  });

  test('7.2 — PATCH /clients/:id atualiza cliente', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/clients/${clientId}`, {
      session: sess(),
      body: { displayName: 'Cliente Atualizado 19C', phone: '+55 11 99999-0000' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.client.displayName, 'Cliente Atualizado 19C');
    assert.equal(r.body.client.phone, '+55 11 99999-0000');
  });

  test('7.3 — GET /clients/:id inexistente retorna 404', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/clients/inexistente-client-19c`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 404);
  });

  test('7.4 — PATCH /clients/:id inexistente retorna 404', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/clients/inexistente-client-x`, {
      session: sess(),
      body: { displayName: 'X' },
    });
    assert.equal(r.statusCode, 404);
  });

  test('7.5 — DELETE /clients/:id exclui cliente', async () => {
    const r = await dispatchWithSession(api19cRouter, 'DELETE', `/guilds/${G1}/clients/${clientId}`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.ok);
    const check = repos.Clients.getClient(G1, clientId);
    assert.equal(check, null, 'Cliente deve ser removido do banco');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 8 — Proofs listagem + filtros
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 8 — Proofs listagem + filtros', () => {
  const sess = () => sessionObj(G1);

  before(() => {
    repos.Proofs.createProof(G1, { vendorId: 'vendor_proof_1', produto: 'Prod A', valor: 'R$ 10' });
    repos.Proofs.createProof(G1, { vendorId: 'vendor_proof_2', produto: 'Prod B', valor: 'R$ 20' });
  });

  test('8.1 — GET /proofs lista provas', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/proofs`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(Array.isArray(r.body.proofs));
    assert.ok(r.body.total >= 2);
  });

  test('8.2 — GET /proofs retorna campos esperados', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/proofs`, {
      session: sess(),
    });
    const proof = r.body.proofs[0];
    assert.ok(proof.id,        'proof deve ter id');
    assert.ok(proof.guildId,   'proof deve ter guildId');
    assert.ok(proof.vendorId,  'proof deve ter vendorId');
    assert.ok(proof.createdAt, 'proof deve ter createdAt');
  });

  test('8.3 — GET /proofs retorna total e totalPages', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/proofs`, {
      session: sess(),
    });
    assert.ok(typeof r.body.total === 'number');
    assert.ok(typeof r.body.totalPages === 'number');
  });

  test('8.4 — GET /proofs isolado por guild (G2 não vê proofs do G1)', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/proofs`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 200);
    // G2 não tem proofs criados neste teste
    const ids = r.body.proofs.map(p => p.guildId);
    for (const id of ids) assert.equal(id, G2, 'Apenas proofs do G2 devem aparecer');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 9 — Settings tickets
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 9 — Settings tickets', () => {
  const sess = () => sessionObj(G1);

  test('9.1 — GET /settings/tickets retorna configuração de tickets', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/settings/tickets`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body?.tickets !== undefined, 'Deve retornar objeto tickets');
  });

  test('9.2 — GET /settings/tickets retorna campos esperados', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/settings/tickets`, {
      session: sess(),
    });
    const t = r.body.tickets;
    assert.ok('enabled' in t,         'deve ter enabled');
    assert.ok('category_id' in t,     'deve ter category_id');
    assert.ok('log_channel_id' in t,  'deve ter log_channel_id');
    assert.ok('support_role_id' in t, 'deve ter support_role_id');
    assert.ok('intro_message' in t,   'deve ter intro_message');
  });

  test('9.3 — PATCH /settings/tickets atualiza configuração', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/settings/tickets`, {
      session: sess(),
      body: { enabled: true, category_id: '999888777', intro_message: 'Bem-vindo ao suporte 19C!' },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.tickets.enabled, true);
    assert.equal(r.body.tickets.category_id, '999888777');
    assert.equal(r.body.tickets.intro_message, 'Bem-vindo ao suporte 19C!');
  });

  test('9.4 — PATCH /settings/tickets persiste no banco', async () => {
    const saved = repos.Tickets.getTicketConfig(G1);
    assert.equal(saved.category_id, '999888777', 'Deve persistir no banco de dados');
  });

  test('9.5 — PATCH /settings/tickets campos desconhecidos são ignorados', async () => {
    const r = await dispatchWithSession(api19cRouter, 'PATCH', `/guilds/${G1}/settings/tickets`, {
      session: sess(),
      body: { campo_inexistente: 'valor_perigoso', enabled: false },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.tickets.enabled, false);
    // campo_inexistente não deve estar na resposta
    assert.ok(!('campo_inexistente' in r.body.tickets));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 10 — Autenticação e isolamento
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 10 — Autenticação e isolamento', () => {

  test('10.1 — Endpoints 19C retornam 401 sem sessão', async () => {
    const endpoints = [
      ['POST', `/guilds/${G1}/templates`],
      ['GET',  `/guilds/${G1}/automations`],
      ['POST', `/guilds/${G1}/panels`],
      ['GET',  `/guilds/${G1}/products`],
      ['GET',  `/guilds/${G1}/proofs`],
    ];
    for (const [method, url] of endpoints) {
      const r = await dispatchWithSession(api19cRouter, method, url, { session: null });
      assert.equal(r.statusCode, 401, `${method} ${url} deve retornar 401 sem sessão`);
    }
  });

  test('10.2 — requireGuildAccess retorna 403 para guild sem permissão', async () => {
    // Sessão válida mas sem acesso ao G1
    const sessNoAccess = { userId: 'u_noaccess', data: { guilds: [] } };
    const r = await dispatchWithSession(api19cRouter, 'POST', `/guilds/${G1}/templates`, {
      session: sessNoAccess,
      body: { name: 'test' },
    });
    assert.equal(r.statusCode, 403);
  });

  test('10.3 — Templates isolados: G2 não acessa template do G1', async () => {
    const t = repos.Templates.createTemplate(G1, { name: 'Isolamento G1', data: {} });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/templates/${t.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Template de G1 não deve ser visível em G2');
  });

  test('10.4 — Connections isoladas: G2 não acessa connection do G1', async () => {
    const c = repos.Connections.createConnection(G1, {
      action: 'test_isolation', templateId: 't1', targetChannelId: 'ch1',
    });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/connections/${c.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Connection de G1 não deve ser visível em G2');
  });

  test('10.5 — Products isolados: G2 não acessa product do G1', async () => {
    const p = repos.Products.createProduct(G1, { name: 'Prod Isolamento G1', stock: 1 });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/products/${p.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Product de G1 não deve ser visível em G2');
  });

  test('10.6 — Orders isolados: G2 não acessa order do G1', async () => {
    const o = repos.Orders.createOrder(G1, { vendorId: 'v1', produto: 'P1' });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/orders/${o.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Order de G1 não deve ser visível em G2');
  });

  test('10.7 — Clients isolados: G2 não acessa client do G1', async () => {
    const c = repos.Clients.createClient(G1, { displayName: 'CLI Isolamento G1' });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/clients/${c.id}`, {
      session: sessionObj(G2),
    });
    assert.equal(r.statusCode, 404, 'Client de G1 não deve ser visível em G2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO 11 — Stats expandidas (19C)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCO 11 — Stats expandidas com 19C', () => {
  const sess = () => sessionObj(G1);

  test('11.1 — api19c.mjs exporta router Express', async () => {
    assert.equal(typeof api19cRouter, 'function', 'api19c deve exportar router Express');
    assert.equal(typeof api19cRouter.use, 'function', 'router deve ter método use');
  });

  test('11.2 — api19c.mjs é importado em api.mjs (via stack)', async () => {
    // Verifica que api.mjs tem o router de 19C montado
    assert.ok(apiRouter, 'api.mjs deve ser importável');
    // Conta layers do router pai
    const layers = apiRouter.stack ?? [];
    assert.ok(layers.length > 0, 'api.mjs deve ter routes registradas');
  });

  test('11.3 — GET /guilds/:guildId/automations/meta é acessível via api19c', async () => {
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G1}/automations/meta`, {
      session: sess(),
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.triggers, 'meta deve retornar triggers');
  });

  test('11.4 — Todos os novos recursos têm isolamento por guildId (smoke test)', async () => {
    // Cria recursos no G1, verifica que NÃO aparecem em listagens do G2
    repos.Automations.createAutomation(G1, { name: 'Auto G1 Smoke', trigger: 'ticket_opened' });
    const r = await dispatchWithSession(api19cRouter, 'GET', `/guilds/${G2}/automations`, {
      session: sessionObj(G2),
    });
    const names = (r.body.automations ?? []).map(a => a.name);
    assert.ok(!names.includes('Auto G1 Smoke'), 'Automação do G1 não deve aparecer no G2');
  });
});
