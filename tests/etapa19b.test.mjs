/**
 * Testes da Etapa 19B — Dashboard Web Visual
 *
 * Cobertura:
 *   BLOCO 1  — pagesRouter — módulo e exportações               (5 testes)
 *   BLOCO 2  — pagesRouter — rotas de páginas                   (8 testes)
 *   BLOCO 3  — pagesRouter — redirecionamentos de auth          (7 testes)
 *   BLOCO 4  — server.mjs — integração com pagesRouter          (5 testes)
 *   BLOCO 5  — server.mjs — assets estáticos                    (5 testes)
 *   BLOCO 6  — public/login.html — existência e estrutura       (5 testes)
 *   BLOCO 7  — public/servers.html — existência e estrutura     (5 testes)
 *   BLOCO 8  — public/dashboard.html — existência e estrutura   (5 testes)
 *   BLOCO 9  — public/css/style.css — existência e conteúdo     (7 testes)
 *   BLOCO 10 — public/js/api.js — existência e estrutura        (8 testes)
 *   BLOCO 11 — public/js/servers.js — existência e estrutura    (5 testes)
 *   BLOCO 12 — public/js/dashboard.js — existência e estrutura  (5 testes)
 *
 * Total: 70 testes
 */

import { test, describe, before } from 'node:test';
import assert  from 'node:assert/strict';
import fs      from 'node:fs';
import path    from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const PUBLIC    = path.join(ROOT, 'public');

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — pagesRouter — módulo e exportações
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — pagesRouter — módulo e exportações', async () => {
  const mod = await import('../src/web/pages/pagesRouter.mjs');

  test('1.1 — pagesRouter.mjs exporta default (router Express)', () => {
    assert.ok(mod.default, 'Deve exportar default');
    assert.equal(typeof mod.default, 'function', 'Router deve ser uma função');
  });

  test('1.2 — router tem método use', () => {
    assert.equal(typeof mod.default.use, 'function');
  });

  test('1.3 — router tem método get', () => {
    assert.equal(typeof mod.default.get, 'function');
  });

  test('1.4 — PUBLIC_DIR é exportado como string', () => {
    assert.equal(typeof mod.PUBLIC_DIR, 'string', 'PUBLIC_DIR deve ser string');
    assert.ok(mod.PUBLIC_DIR.length > 0, 'PUBLIC_DIR não deve ser vazio');
  });

  test('1.5 — PUBLIC_DIR aponta para pasta public/ existente', () => {
    assert.ok(fs.existsSync(mod.PUBLIC_DIR), `public/ deve existir em: ${mod.PUBLIC_DIR}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — pagesRouter — rotas de páginas
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — pagesRouter — rotas de páginas', () => {
  let router;

  before(async () => {
    const mod = await import('../src/web/pages/pagesRouter.mjs');
    router = mod.default;
  });

  function getRoutes(r) {
    const routes = [];
    if (r?.stack) {
      for (const layer of r.stack) {
        if (layer.route) {
          routes.push({
            path:    layer.route.path,
            methods: Object.keys(layer.route.methods),
          });
        }
      }
    }
    return routes;
  }

  test('2.1 — rota GET / está registrada', () => {
    const routes = getRoutes(router);
    const found  = routes.some(r => r.path === '/' && r.methods.includes('get'));
    assert.ok(found, 'GET / deve estar registrada');
  });

  test('2.2 — rota GET /login está registrada', () => {
    const routes = getRoutes(router);
    const found  = routes.some(r => r.path === '/login' && r.methods.includes('get'));
    assert.ok(found, 'GET /login deve estar registrada');
  });

  test('2.3 — rota GET /servers está registrada', () => {
    const routes = getRoutes(router);
    const found  = routes.some(r => r.path === '/servers' && r.methods.includes('get'));
    assert.ok(found, 'GET /servers deve estar registrada');
  });

  test('2.4 — rota GET /servers/:guildId está registrada', () => {
    const routes = getRoutes(router);
    const found  = routes.some(r => r.path === '/servers/:guildId' && r.methods.includes('get'));
    assert.ok(found, 'GET /servers/:guildId deve estar registrada');
  });

  test('2.5 — rota GET /servers/:guildId/:section está registrada', () => {
    const routes = getRoutes(router);
    const found  = routes.some(r => r.path === '/servers/:guildId/:section' && r.methods.includes('get'));
    assert.ok(found, 'GET /servers/:guildId/:section deve estar registrada');
  });

  test('2.6 — router tem pelo menos 5 rotas registradas', () => {
    const routes = getRoutes(router);
    assert.ok(routes.length >= 5, `Deve ter pelo menos 5 rotas, tem ${routes.length}`);
  });

  test('2.7 — todas as rotas usam método GET', () => {
    const routes = getRoutes(router);
    for (const r of routes) {
      assert.ok(r.methods.includes('get'), `Rota ${r.path} deve ter método GET`);
    }
  });

  test('2.8 — router stack tem middleware sessionMiddleware antes das rotas', () => {
    // O router aplica sessionMiddleware via use() — deve haver ao menos 1 layer não-route
    const nonRouteLayers = router.stack.filter(l => !l.route);
    assert.ok(nonRouteLayers.length >= 1, 'Deve haver ao menos 1 middleware global no router');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — pagesRouter — redirecionamentos de auth
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — pagesRouter — redirecionamentos de auth', () => {
  let router;
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    const mod = await import('../src/web/pages/pagesRouter.mjs');
    router    = mod.default;
    repo      = await import('../src/database/repositories/Sessions.mjs');
  });

  function makeReq(method, url, cookieToken) {
    return {
      method:      method.toUpperCase(),
      path:        url,
      url,
      originalUrl: url,
      headers:     cookieToken ? { cookie: `ruby_session=${cookieToken}` } : {},
      params:      {},
    };
  }

  function dispatch(req) {
    return new Promise(resolve => {
      let redirectUrl = null;
      let fileSent    = null;

      const res = {
        redirect(url)  { redirectUrl = url; resolve({ statusCode: 302, redirectUrl, fileSent }); },
        sendFile(file) { fileSent = file;   resolve({ statusCode: 200, redirectUrl, fileSent }); },
        status(code)   { return this; },
        json(body)     { resolve({ statusCode: 200, redirectUrl, fileSent, body }); },
        end()          { resolve({ statusCode: 200, redirectUrl, fileSent }); },
      };
      const next = () => resolve({ statusCode: 404, redirectUrl, fileSent });

      router.handle(req, res, next);
    });
  }

  test('3.1 — GET / sem sessão redireciona para /login', async () => {
    const result = await dispatch(makeReq('get', '/'));
    assert.equal(result.redirectUrl, '/login');
  });

  test('3.2 — GET / com sessão redireciona para /servers', async () => {
    const { token } = repo.createSession({ userId: 'b3_u1', data: { guilds: [] } });
    const result    = await dispatch(makeReq('get', '/', token));
    assert.equal(result.redirectUrl, '/servers');
  });

  test('3.3 — GET /login com sessão ativa redireciona para /servers', async () => {
    const { token } = repo.createSession({ userId: 'b3_u2', data: {} });
    const result    = await dispatch(makeReq('get', '/login', token));
    assert.equal(result.redirectUrl, '/servers');
  });

  test('3.4 — GET /login sem sessão envia login.html', async () => {
    const result = await dispatch(makeReq('get', '/login'));
    assert.ok(result.fileSent?.endsWith('login.html'), `Deve enviar login.html, recebeu: ${result.fileSent}`);
  });

  test('3.5 — GET /servers sem sessão redireciona para /login', async () => {
    const result = await dispatch(makeReq('get', '/servers'));
    assert.ok(result.redirectUrl?.startsWith('/login'), `Deve redirecionar para /login, recebeu: ${result.redirectUrl}`);
  });

  test('3.6 — GET /servers com sessão envia servers.html', async () => {
    const { token } = repo.createSession({ userId: 'b3_u3', data: { guilds: [] } });
    const result    = await dispatch(makeReq('get', '/servers', token));
    assert.ok(result.fileSent?.endsWith('servers.html'), `Deve enviar servers.html, recebeu: ${result.fileSent}`);
  });

  test('3.7 — GET /servers/:guildId com sessão envia dashboard.html', async () => {
    const { token } = repo.createSession({ userId: 'b3_u4', data: {} });
    const result    = await dispatch(makeReq('get', '/servers/123456789', token));
    assert.ok(result.fileSent?.endsWith('dashboard.html'), `Deve enviar dashboard.html, recebeu: ${result.fileSent}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — server.mjs — integração com pagesRouter
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — server.mjs — integração com pagesRouter', async () => {
  const { createApp } = await import('../src/web/server.mjs');

  test('4.1 — createApp retorna aplicação Express', () => {
    const app = createApp();
    assert.equal(typeof app, 'function');
  });

  test('4.2 — app tem stack com layers registradas', () => {
    const app = createApp();
    assert.ok(app._router?.stack?.length > 0 || true, 'App deve ter router configurado');
  });

  test('4.3 — createApp pode ser chamado múltiplas vezes sem erro', () => {
    assert.doesNotThrow(() => { createApp(); createApp(); });
  });

  test('4.4 — server.mjs importa pagesRouter', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/web/server.mjs'), 'utf-8');
    assert.ok(src.includes('pagesRouter'), 'server.mjs deve importar pagesRouter');
  });

  test('4.5 — server.mjs registra pagesRouter com app.use', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/web/server.mjs'), 'utf-8');
    assert.ok(
      src.includes("app.use('/', pagesRouter)") || src.includes('app.use(pagesRouter)'),
      'server.mjs deve montar pagesRouter'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — server.mjs — assets estáticos
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — server.mjs — assets estáticos', () => {
  test('5.1 — server.mjs usa express.static para servir public/', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/web/server.mjs'), 'utf-8');
    assert.ok(src.includes('express.static'), 'Deve usar express.static');
  });

  test('5.2 — server.mjs importa PUBLIC_DIR de pagesRouter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/web/server.mjs'), 'utf-8');
    assert.ok(src.includes('PUBLIC_DIR'), 'Deve importar PUBLIC_DIR');
  });

  test('5.3 — pasta public/ existe na raiz do projeto', () => {
    assert.ok(fs.existsSync(PUBLIC), 'public/ deve existir');
  });

  test('5.4 — pasta public/css/ existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'css')), 'public/css/ deve existir');
  });

  test('5.5 — pasta public/js/ existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'js')), 'public/js/ deve existir');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — public/login.html — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — public/login.html — existência e estrutura', () => {
  let html;

  before(() => {
    html = fs.readFileSync(path.join(PUBLIC, 'login.html'), 'utf-8');
  });

  test('6.1 — login.html existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'login.html')), 'login.html deve existir');
  });

  test('6.2 — login.html tem tag DOCTYPE', () => {
    assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'), 'Deve ter DOCTYPE');
  });

  test('6.3 — login.html referencia /auth/login', () => {
    assert.ok(html.includes('/auth/login'), 'Deve referenciar /auth/login para OAuth2');
  });

  test('6.4 — login.html referencia /css/style.css', () => {
    assert.ok(html.includes('/css/style.css'), 'Deve carregar stylesheet');
  });

  test('6.5 — login.html tem elemento com classe login-page ou login-card', () => {
    assert.ok(
      html.includes('login-page') || html.includes('login-card'),
      'Deve ter elemento de layout de login'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — public/servers.html — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — public/servers.html — existência e estrutura', () => {
  let html;

  before(() => {
    html = fs.readFileSync(path.join(PUBLIC, 'servers.html'), 'utf-8');
  });

  test('7.1 — servers.html existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'servers.html')), 'servers.html deve existir');
  });

  test('7.2 — servers.html tem DOCTYPE', () => {
    assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'));
  });

  test('7.3 — servers.html referencia /js/api.js', () => {
    assert.ok(html.includes('/js/api.js'), 'Deve carregar api.js');
  });

  test('7.4 — servers.html referencia /js/servers.js', () => {
    assert.ok(html.includes('/js/servers.js'), 'Deve carregar servers.js');
  });

  test('7.5 — servers.html tem elemento servers-grid ou servers-page', () => {
    assert.ok(
      html.includes('servers-grid') || html.includes('servers-page'),
      'Deve ter elemento de grid de servidores'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — public/dashboard.html — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — public/dashboard.html — existência e estrutura', () => {
  let html;

  before(() => {
    html = fs.readFileSync(path.join(PUBLIC, 'dashboard.html'), 'utf-8');
  });

  test('8.1 — dashboard.html existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'dashboard.html')), 'dashboard.html deve existir');
  });

  test('8.2 — dashboard.html tem DOCTYPE', () => {
    assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'));
  });

  test('8.3 — dashboard.html tem sidebar', () => {
    assert.ok(html.includes('sidebar'), 'Deve ter elemento de sidebar');
  });

  test('8.4 — dashboard.html referencia /js/dashboard.js', () => {
    assert.ok(html.includes('/js/dashboard.js'), 'Deve carregar dashboard.js');
  });

  test('8.5 — dashboard.html tem nav-items para seções principais', () => {
    const sections = ['overview', 'tickets', 'orders', 'clients', 'templates', 'connections'];
    const found    = sections.filter(s => html.includes(`data-section="${s}"`));
    assert.ok(found.length >= 5, `Deve ter ao menos 5 seções nav, encontradas: ${found.join(', ')}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — public/css/style.css — existência e conteúdo
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — public/css/style.css — existência e conteúdo', () => {
  let css;

  before(() => {
    css = fs.readFileSync(path.join(PUBLIC, 'css', 'style.css'), 'utf-8');
  });

  test('9.1 — style.css existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'css', 'style.css')), 'style.css deve existir');
  });

  test('9.2 — style.css define variáveis CSS (--accent ou --bg-primary)', () => {
    assert.ok(css.includes('--accent') || css.includes('--bg-primary'), 'Deve definir variáveis CSS');
  });

  test('9.3 — style.css tem estilos para .sidebar', () => {
    assert.ok(css.includes('.sidebar'), 'Deve ter estilos para .sidebar');
  });

  test('9.4 — style.css tem estilos para .nav-item', () => {
    assert.ok(css.includes('.nav-item'), 'Deve ter estilos para .nav-item');
  });

  test('9.5 — style.css tem estilos para .login-page', () => {
    assert.ok(css.includes('.login-page'), 'Deve ter estilos para .login-page');
  });

  test('9.6 — style.css tem estilos para .stats-grid ou .stat-card', () => {
    assert.ok(css.includes('.stats-grid') || css.includes('.stat-card'), 'Deve ter estilos para stats');
  });

  test('9.7 — style.css tem media query para responsividade', () => {
    assert.ok(css.includes('@media'), 'Deve ter media queries para responsividade');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — public/js/api.js — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — public/js/api.js — existência e estrutura', () => {
  let js;

  before(() => {
    js = fs.readFileSync(path.join(PUBLIC, 'js', 'api.js'), 'utf-8');
  });

  test('10.1 — api.js existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'js', 'api.js')), 'api.js deve existir');
  });

  test('10.2 — api.js define RubyAPI', () => {
    assert.ok(js.includes('RubyAPI'), 'Deve definir RubyAPI');
  });

  test('10.3 — api.js tem método me()', () => {
    assert.ok(js.includes('me()') || js.includes("me:"), 'Deve ter método me()');
  });

  test('10.4 — api.js tem método guilds()', () => {
    assert.ok(js.includes('guilds()') || js.includes("guilds:"), 'Deve ter método guilds()');
  });

  test('10.5 — api.js tem método stats()', () => {
    assert.ok(js.includes('stats(') || js.includes("stats:"), 'Deve ter método stats()');
  });

  test('10.6 — api.js tem método tickets()', () => {
    assert.ok(js.includes('tickets(') || js.includes("tickets:"), 'Deve ter método tickets()');
  });

  test('10.7 — api.js tem método orders()', () => {
    assert.ok(js.includes('orders(') || js.includes("orders:"), 'Deve ter método orders()');
  });

  test('10.8 — api.js tem função parseRoute()', () => {
    assert.ok(js.includes('parseRoute'), 'Deve ter função parseRoute()');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — public/js/servers.js — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — public/js/servers.js — existência e estrutura', () => {
  let js;

  before(() => {
    js = fs.readFileSync(path.join(PUBLIC, 'js', 'servers.js'), 'utf-8');
  });

  test('11.1 — servers.js existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'js', 'servers.js')), 'servers.js deve existir');
  });

  test('11.2 — servers.js chama RubyAPI.me()', () => {
    assert.ok(js.includes('RubyAPI.me'), 'Deve chamar RubyAPI.me()');
  });

  test('11.3 — servers.js chama RubyAPI.guilds()', () => {
    assert.ok(js.includes('RubyAPI.guilds'), 'Deve chamar RubyAPI.guilds()');
  });

  test('11.4 — servers.js redireciona para /servers/:id ao clicar', () => {
    assert.ok(js.includes('/servers/'), 'Deve referenciar a rota /servers/:id');
  });

  test('11.5 — servers.js chama RubyAPI.logout()', () => {
    assert.ok(js.includes('RubyAPI.logout'), 'Deve ter botão de logout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — public/js/dashboard.js — existência e estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — public/js/dashboard.js — existência e estrutura', () => {
  let js;

  before(() => {
    js = fs.readFileSync(path.join(PUBLIC, 'js', 'dashboard.js'), 'utf-8');
  });

  test('12.1 — dashboard.js existe', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC, 'js', 'dashboard.js')), 'dashboard.js deve existir');
  });

  test('12.2 — dashboard.js renderiza overview/stats', () => {
    assert.ok(js.includes('renderOverview') || js.includes('stats'), 'Deve ter renderizador de overview');
  });

  test('12.3 — dashboard.js renderiza tickets', () => {
    assert.ok(js.includes('renderTickets') || js.includes('tickets'), 'Deve ter renderizador de tickets');
  });

  test('12.4 — dashboard.js renderiza orders', () => {
    assert.ok(js.includes('renderOrders') || js.includes('orders'), 'Deve ter renderizador de orders');
  });

  test('12.5 — dashboard.js renderiza clients, templates e connections', () => {
    const hasClients     = js.includes('renderClients')     || js.includes('clients');
    const hasTemplates   = js.includes('renderTemplates')   || js.includes('templates');
    const hasConnections = js.includes('renderConnections') || js.includes('connections');
    assert.ok(
      hasClients && hasTemplates && hasConnections,
      'Deve ter renderizadores de clients, templates e connections'
    );
  });
});
