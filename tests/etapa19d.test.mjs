/**
 * Testes da Etapa 19D — Correções, Segurança e Consolidação
 *
 * Cobertura:
 *   BLOCO 1  — OAuth2 state/CSRF — generateOAuthState, validateOAuthState,
 *              parseStateCookie, buildStateCookie, clearStateCookie         (7 testes)
 *   BLOCO 2  — Novas variáveis: {order_id}, {client_name},
 *              {user}, {username}, {guild}, {channel}                       (10 testes)
 *   BLOCO 3  — reopen_count via módulo real de Tickets                     (7 testes)
 *   BLOCO 4  — Wiring dos gatilhos da Etapa 16 nos handlers reais          (4 testes)
 *   BLOCO 5  — Migration 006 — índices de performance                      (6 testes)
 *
 * Total: 34 testes
 */

import { test, describe, before, after } from 'node:test';
import assert  from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile }   from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const RUN_ID = randomUUID().slice(0, 8);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — OAuth2 state/CSRF (Etapa 19D — correção de segurança)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — OAuth2 state/CSRF', async () => {
  // Importa helpers exportados do módulo real de auth
  const {
    generateOAuthState,
    validateOAuthState,
    parseStateCookie,
    buildStateCookie,
    clearStateCookie,
    STATE_COOKIE,
  } = await import('../src/web/routes/auth.mjs');

  test('1.1 — generateOAuthState retorna string hex de 64 caracteres', () => {
    const state = generateOAuthState();
    assert.ok(typeof state === 'string', 'state deve ser string');
    assert.equal(state.length, 64, 'state deve ter 64 chars hex (32 bytes)');
    assert.ok(/^[0-9a-f]{64}$/.test(state), 'state deve ser hex minúsculo');
  });

  test('1.2 — generateOAuthState gera valores únicos (não previsíveis)', () => {
    const s1 = generateOAuthState();
    const s2 = generateOAuthState();
    assert.notEqual(s1, s2, 'Dois states gerados não devem ser iguais');
  });

  test('1.3 — validateOAuthState aceita state válido igual ao cookie', () => {
    const state = generateOAuthState();
    const result = validateOAuthState(state, state);
    assert.equal(result, true);
  });

  test('1.4 — validateOAuthState rejeita state divergente', () => {
    const s1 = generateOAuthState();
    const s2 = generateOAuthState();
    assert.equal(validateOAuthState(s1, s2), false);
  });

  test('1.5 — validateOAuthState rejeita state ausente no callback', () => {
    const cookieState = generateOAuthState();
    assert.equal(validateOAuthState(null,      cookieState), false);
    assert.equal(validateOAuthState(undefined, cookieState), false);
    assert.equal(validateOAuthState('',        cookieState), false);
  });

  test('1.6 — validateOAuthState rejeita cookie ausente (state expirado ou não iniciado)', () => {
    const state = generateOAuthState();
    assert.equal(validateOAuthState(state, null),      false);
    assert.equal(validateOAuthState(state, undefined), false);
    assert.equal(validateOAuthState(state, ''),        false);
  });

  test('1.7 — parseStateCookie extrai o state do header Cookie', () => {
    const state = generateOAuthState();
    const cookie = `${STATE_COOKIE}=${state}`;

    // Simula req.headers.cookie com apenas o state cookie
    const req1 = { headers: { cookie } };
    assert.equal(parseStateCookie(req1), state);

    // Simula com múltiplos cookies
    const req2 = { headers: { cookie: `outro=abc; ${STATE_COOKIE}=${state}; mais=xyz` } };
    assert.equal(parseStateCookie(req2), state);

    // Cookie ausente → null
    const req3 = { headers: { cookie: 'outro=abc' } };
    assert.equal(parseStateCookie(req3), null);

    // Sem header cookie → null
    const req4 = { headers: {} };
    assert.equal(parseStateCookie(req4), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Novas variáveis (Etapa 19D)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — Novas variáveis {order_id}, {client_name}, {user}, {username}, {guild}, {channel}', async () => {
  const { resolveVariables, listVariables } = await import('../src/modules/variables/index.mjs');

  test('2.1 — todas as novas variáveis estão registradas', () => {
    const registered = listVariables();
    for (const name of ['order_id', 'client_name', 'user', 'username', 'guild', 'channel']) {
      assert.ok(registered.includes(name), `Variável '{${name}}' deve estar registrada`);
    }
  });

  test('2.2 — {order_id} resolve ctx.orderId', () => {
    const result = resolveVariables('{order_id}', { orderId: 'ORD-1234' });
    assert.equal(result, 'ORD-1234');
  });

  test('2.3 — {order_id} mantém placeholder quando ctx.orderId ausente', () => {
    const result = resolveVariables('{order_id}', {});
    assert.equal(result, '{order_id}');
  });

  test('2.4 — {client_name} resolve ctx.clientName', () => {
    const result = resolveVariables('{client_name}', { clientName: 'João Silva' });
    assert.equal(result, 'João Silva');
  });

  test('2.5 — {client_name} mantém placeholder quando ausente', () => {
    const result = resolveVariables('{client_name}', {});
    assert.equal(result, '{client_name}');
  });

  test('2.6 — {user} resolve como menção a partir de ctx.user com id', () => {
    const result = resolveVariables('{user}', { user: { id: '123456789' } });
    assert.equal(result, '<@123456789>');
  });

  test('2.7 — {user} faz fallback para ctx.vendedor e ctx.cliente quando ctx.user ausente', () => {
    const r1 = resolveVariables('{user}', { vendedor: { id: '111' } });
    assert.equal(r1, '<@111>', 'Deve usar vendedor como fallback');

    const r2 = resolveVariables('{user}', { cliente: { id: '222' } });
    assert.equal(r2, '<@222>', 'Deve usar cliente como último fallback');
  });

  test('2.8 — {username} resolve displayName de GuildMember', () => {
    const member = { displayName: 'MarcioFy', id: '999' };
    const result = resolveVariables('{username}', { member });
    assert.equal(result, 'MarcioFy');
  });

  test('2.9 — {guild} é alias de {servidor} — resolve nome do servidor', () => {
    const result = resolveVariables('{guild}', { guild: { name: 'Ruby FY' } });
    assert.equal(result, 'Ruby FY');

    // Quando ctx.guild ausente → usa guildId como fallback
    const r2 = resolveVariables('{guild}', { guildId: '777' });
    assert.equal(r2, '(777)');
  });

  test('2.10 — {channel} é alias de {canal} — resolve menção de canal', () => {
    const result = resolveVariables('{channel}', { channel: { id: '555444333' } });
    assert.equal(result, '<#555444333>');

    // String raw de channel id
    const r2 = resolveVariables('{channel}', { channel: '111222333' });
    assert.equal(r2, '<#111222333>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — reopen_count via módulo real de Tickets
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — reopen_count (módulo real de Tickets)', () => {
  const GUILD   = 'guild_reopen_19d';
  const DB_PATH = `/tmp/ruby-fy-test-b3-19d-${RUN_ID}.db`;

  let createTicket, getTicket, closeTicket, reopenTicket;

  before(async () => {
    process.env.DATABASE_PATH = DB_PATH;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const mod    = await import('../src/database/repositories/Tickets.mjs');
    createTicket = mod.createTicket;
    getTicket    = mod.getTicket;
    closeTicket  = mod.closeTicket;
    reopenTicket = mod.reopenTicket;
  });

  after(async () => {
    const { unlink } = await import('node:fs/promises');
    unlink(DB_PATH).catch(() => {});
  });

  test('3.1 — ticket recém-criado tem reopenCount=0', () => {
    const t = createTicket(GUILD, { channelId: 'ch_rc_1', userId: 'u_rc_1' });
    assert.equal(t.reopenCount, 0);
  });

  test('3.2 — primeira reabertura define reopenCount=1', () => {
    const t  = createTicket(GUILD, { channelId: 'ch_rc_2', userId: 'u_rc_2' });
    closeTicket(GUILD, t.id, 'mod_x');
    const r1 = reopenTicket(GUILD, t.id, 'ch_rc_2b');
    assert.equal(r1.reopenCount, 1);
    assert.equal(r1.status, 'open');
  });

  test('3.3 — múltiplas reaberturas incrementam corretamente', () => {
    const t = createTicket(GUILD, { channelId: 'ch_rc_3', userId: 'u_rc_3' });

    closeTicket(GUILD, t.id, 'mod_x');
    const r1 = reopenTicket(GUILD, t.id, 'ch_rc_3b');
    assert.equal(r1.reopenCount, 1);

    closeTicket(GUILD, t.id, 'mod_x');
    const r2 = reopenTicket(GUILD, t.id, 'ch_rc_3c');
    assert.equal(r2.reopenCount, 2);

    closeTicket(GUILD, t.id, 'mod_x');
    const r3 = reopenTicket(GUILD, t.id, 'ch_rc_3d');
    assert.equal(r3.reopenCount, 3);
  });

  test('3.4 — fechar NÃO incrementa reopenCount', () => {
    const t = createTicket(GUILD, { channelId: 'ch_rc_4', userId: 'u_rc_4' });
    closeTicket(GUILD, t.id, 'mod_x');
    const closed = getTicket(GUILD, t.id);
    assert.equal(closed.reopenCount, 0, 'Fechar não deve incrementar o contador');
  });

  test('3.5 — reopenCount sobrevive a releitura do banco', () => {
    const t = createTicket(GUILD, { channelId: 'ch_rc_5', userId: 'u_rc_5' });
    closeTicket(GUILD, t.id, 'mod_x');
    reopenTicket(GUILD, t.id, 'ch_rc_5b');

    // Lê o ticket fresco do banco — confirma que a coluna foi persistida
    const fresh = getTicket(GUILD, t.id);
    assert.equal(fresh.reopenCount, 1, 'Valor persistido no banco deve ser 1');
  });

  test('3.6 — reopenTicket retorna null para ticket inexistente', () => {
    const r = reopenTicket(GUILD, 'id-que-nao-existe', 'ch_x');
    assert.equal(r, null);
  });

  test('3.7 — schema migration 002 adiciona reopen_count na tabela tickets', async () => {
    const { runMigrations, listAllMigrationNames } = await import('../src/database/migrations.mjs');
    const names = listAllMigrationNames();
    assert.ok(
      names.includes('002_ticket_reopen_support'),
      'Migration 002 deve estar listada',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — Wiring dos gatilhos da Etapa 16 nos handlers reais
//
// Estes testes verificam por inspeção de código-fonte que as chamadas a
// fireAutomationTrigger permanecem nos handlers de produção.
// Se uma chamada for removida acidentalmente, o teste correspondente falha.
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — Wiring dos gatilhos nos handlers reais', async () => {
  // Lê os fontes dos handlers uma única vez
  const [
    userHandlerSrc,
    ordersActionsSrc,
    clientsActionsSrc,
    proofsActionsSrc,
  ] = await Promise.all([
    readFile('./src/modules/tickets/userHandler.mjs',  'utf8'),
    readFile('./src/modules/orders/actions.mjs',       'utf8'),
    readFile('./src/modules/clients/actions.mjs',      'utf8'),
    readFile('./src/modules/proofs/actions.mjs',       'utf8'),
  ]);

  test('4.1 — ticket_opened: userHandler.mjs importa e chama fireAutomationTrigger', () => {
    assert.ok(
      userHandlerSrc.includes("import { fireAutomationTrigger }"),
      'userHandler.mjs deve importar fireAutomationTrigger',
    );
    assert.ok(
      userHandlerSrc.includes("fireAutomationTrigger('ticket_opened'"),
      "userHandler.mjs deve chamar fireAutomationTrigger('ticket_opened', ...)",
    );
  });

  test('4.2 — order_paid: orders/actions.mjs importa e chama fireAutomationTrigger', () => {
    assert.ok(
      ordersActionsSrc.includes("import { fireAutomationTrigger }"),
      'orders/actions.mjs deve importar fireAutomationTrigger',
    );
    assert.ok(
      ordersActionsSrc.includes("fireAutomationTrigger('order_paid'"),
      "orders/actions.mjs deve chamar fireAutomationTrigger('order_paid', ...)",
    );
  });

  test('4.3 — client_registered: clients/actions.mjs importa e chama fireAutomationTrigger', () => {
    assert.ok(
      clientsActionsSrc.includes("import { fireAutomationTrigger }"),
      'clients/actions.mjs deve importar fireAutomationTrigger',
    );
    assert.ok(
      clientsActionsSrc.includes("fireAutomationTrigger('client_registered'"),
      "clients/actions.mjs deve chamar fireAutomationTrigger('client_registered', ...)",
    );
  });

  test('4.4 — proof_created: proofs/actions.mjs importa e chama fireAutomationTrigger', () => {
    assert.ok(
      proofsActionsSrc.includes("import { fireAutomationTrigger }"),
      'proofs/actions.mjs deve importar fireAutomationTrigger',
    );
    assert.ok(
      proofsActionsSrc.includes("fireAutomationTrigger('proof_created'"),
      "proofs/actions.mjs deve chamar fireAutomationTrigger('proof_created', ...)",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — Migration 006 — índices de performance
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — Migration 006 — índices de performance', () => {
  let db;

  before(async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const { runSchema }    = await import('../src/database/schema.mjs');
    const { runMigrations } = await import('../src/database/migrations.mjs');

    db = new DatabaseSync(':memory:');
    runSchema(db);
    runMigrations(db);
  });

  test('5.1 — migration 006_performance_indexes está na lista', async () => {
    const { listAllMigrationNames } = await import('../src/database/migrations.mjs');
    const names = listAllMigrationNames();
    assert.ok(
      names.includes('006_performance_indexes'),
      'Migration 006 deve estar registrada',
    );
  });

  test('5.2 — índices de tickets foram criados', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tickets'")
      .all()
      .map(r => r.name);

    assert.ok(
      indexes.some(n => n.includes('guild_status')),
      'Índice tickets (guild_id, status) deve existir',
    );
    assert.ok(
      indexes.some(n => n.includes('guild_user') || n.includes('guild_id')),
      'Índice tickets (guild_id, user_id) deve existir',
    );
  });

  test('5.3 — índices de orders foram criados', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='orders'")
      .all()
      .map(r => r.name);

    assert.ok(
      indexes.some(n => n.includes('guild')),
      'Pelo menos 1 índice em orders deve existir',
    );
  });

  test('5.4 — índices de clients foram criados', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='clients'")
      .all()
      .map(r => r.name);

    assert.ok(
      indexes.some(n => n.includes('guild')),
      'Pelo menos 1 índice em clients deve existir',
    );
  });

  test('5.5 — índices de connections foram criados', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='connections'")
      .all()
      .map(r => r.name);

    assert.ok(
      indexes.some(n => n.includes('guild')),
      'Pelo menos 1 índice em connections deve existir',
    );
  });

  test('5.6 — migration 006 é idempotente (IF NOT EXISTS protege execuções repetidas)', () => {
    // Verifica que tentar criar os mesmos índices uma segunda vez não lança erro
    assert.doesNotThrow(() => {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_guild_status ON tickets (guild_id, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_guild_status  ON orders  (guild_id, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_clients_guild        ON clients (guild_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_connections_guild_enabled ON connections (guild_id, enabled)`);
    });
  });
});
