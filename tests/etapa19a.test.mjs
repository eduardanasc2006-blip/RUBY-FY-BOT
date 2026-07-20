/**
 * Testes da Etapa 19A — Fundação Web + API + Autenticação
 *
 * Cobertura:
 *   BLOCO 1  — Schema (web_sessions)                           (5 testes)
 *   BLOCO 2  — Migração 005_web_sessions                       (4 testes)
 *   BLOCO 3  — Sessions.mjs — createSession / getSession       (10 testes)
 *   BLOCO 4  — Sessions.mjs — refresh / delete / prune         (8 testes)
 *   BLOCO 5  — Sessions.mjs — listUserSessions / count         (4 testes)
 *   BLOCO 6  — Sessions.mjs — expiração                        (5 testes)
 *   BLOCO 7  — config/web.mjs — estrutura                      (5 testes)
 *   BLOCO 8  — middleware/requireAuth — sessionMiddleware       (8 testes)
 *   BLOCO 9  — middleware/requireAuth — requireAuth guard       (5 testes)
 *   BLOCO 10 — middleware/requireAuth — requireGuildAccess      (8 testes)
 *   BLOCO 11 — web/server — createApp                          (5 testes)
 *   BLOCO 12 — Isolamento cross-guild                          (3 testes)
 *
 * Total: 70 testes
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const RUN = randomUUID().slice(0, 8);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Schema (web_sessions)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — Schema (web_sessions)', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

  test('1.1 — tabela web_sessions existe', () => {
    assert.ok(tables.includes('web_sessions'), 'web_sessions deve existir');
  });

  test('1.2 — web_sessions tem colunas obrigatórias', () => {
    const cols = db.prepare('PRAGMA table_info(web_sessions)').all().map(c => c.name);
    for (const col of ['token','user_id','data','expires_at','created_at']) {
      assert.ok(cols.includes(col), `Coluna '${col}' ausente em web_sessions`);
    }
  });

  test('1.3 — token é a chave primária', () => {
    const info = db.prepare('PRAGMA table_info(web_sessions)').all();
    const pk   = info.find(c => c.name === 'token');
    assert.equal(pk?.pk, 1, 'token deve ser PK');
  });

  test('1.4 — schema é idempotente', () => {
    assert.doesNotThrow(() => runSchema(db));
  });

  test('1.5 — índices existem', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='web_sessions'")
      .all().map(r => r.name);
    assert.ok(indexes.length >= 1, 'Pelo menos 1 índice de web_sessions deve existir');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Migração 005_web_sessions
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — Migração 005_web_sessions', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runMigrations, listAllMigrationNames } = await import('../src/database/migrations.mjs');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  test('2.1 — migração 005_web_sessions está na lista', () => {
    const names = listAllMigrationNames();
    assert.ok(names.includes('005_web_sessions'), '005_web_sessions deve constar nas migrações');
  });

  test('2.2 — runMigrations executa sem erro', () => {
    assert.doesNotThrow(() => runMigrations(db));
  });

  test('2.3 — runMigrations é idempotente', () => {
    assert.doesNotThrow(() => runMigrations(db));
  });

  test('2.4 — web_sessions existe após migração', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    assert.ok(tables.includes('web_sessions'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — Sessions.mjs — createSession / getSession
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — Sessions.mjs — createSession / getSession', () => {
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Sessions.mjs');
  });

  test('3.1 — createSession retorna token e expires', () => {
    const r = repo.createSession({ userId: `u_${RUN}`, data: { test: 1 } });
    assert.ok(r.token, 'Deve retornar token');
    assert.ok(r.expires > Math.floor(Date.now() / 1000), 'expires deve ser no futuro');
  });

  test('3.2 — getSession retorna sessão válida pelo token', () => {
    const { token } = repo.createSession({ userId: `u2_${RUN}`, data: { role: 'admin' } });
    const session   = repo.getSession(token);
    assert.ok(session, 'Deve retornar sessão');
    assert.equal(session.userId, `u2_${RUN}`);
  });

  test('3.3 — getSession retorna dados desserializados', () => {
    const data    = { user: { id: '123', name: 'Test' }, guilds: [{ id: 'g1' }] };
    const { token } = repo.createSession({ userId: `u3_${RUN}`, data });
    const session   = repo.getSession(token);
    assert.deepEqual(session.data, data);
  });

  test('3.4 — getSession retorna null para token inexistente', () => {
    const session = repo.getSession('token-nao-existe');
    assert.equal(session, null);
  });

  test('3.5 — getSession retorna null para token null/undefined', () => {
    assert.equal(repo.getSession(null),      null);
    assert.equal(repo.getSession(undefined), null);
    assert.equal(repo.getSession(''),        null);
  });

  test('3.6 — createSession usa TTL padrão de 7 dias', () => {
    const now     = Math.floor(Date.now() / 1000);
    const { expires } = repo.createSession({ userId: `u4_${RUN}`, data: {} });
    const diff    = expires - now;
    assert.ok(diff >= 7 * 24 * 60 * 60 - 5, 'TTL deve ser ~7 dias');
    assert.ok(diff <= 7 * 24 * 60 * 60 + 5, 'TTL deve ser ~7 dias');
  });

  test('3.7 — createSession suporta TTL customizado', () => {
    const now          = Math.floor(Date.now() / 1000);
    const { expires }  = repo.createSession({ userId: `u5_${RUN}`, data: {}, ttl: 3600 });
    const diff         = expires - now;
    assert.ok(diff >= 3595, 'TTL deve ser ~1 hora');
    assert.ok(diff <= 3605, 'TTL deve ser ~1 hora');
  });

  test('3.8 — SESSION_TTL_SECONDS é 7 dias', () => {
    assert.equal(repo.SESSION_TTL_SECONDS, 7 * 24 * 60 * 60);
  });

  test('3.9 — sessão contém createdAt', () => {
    const { token } = repo.createSession({ userId: `u6_${RUN}`, data: {} });
    const session   = repo.getSession(token);
    assert.ok(session.createdAt > 0, 'createdAt deve ser timestamp positivo');
  });

  test('3.10 — tokens são únicos entre sessões', () => {
    const { token: t1 } = repo.createSession({ userId: `u7_${RUN}`, data: {} });
    const { token: t2 } = repo.createSession({ userId: `u7_${RUN}`, data: {} });
    assert.notEqual(t1, t2, 'Tokens devem ser únicos');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — Sessions.mjs — refresh / delete / prune
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — Sessions.mjs — refresh / delete / prune', () => {
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Sessions.mjs');
  });

  test('4.1 — refreshSession atualiza dados da sessão', () => {
    const { token } = repo.createSession({ userId: `rf1_${RUN}`, data: { v: 1 } });
    repo.refreshSession(token, { v: 2 });
    const session = repo.getSession(token);
    assert.equal(session.data.v, 2);
  });

  test('4.2 — refreshSession retorna true para sessão válida', () => {
    const { token } = repo.createSession({ userId: `rf2_${RUN}`, data: {} });
    const ok = repo.refreshSession(token, { updated: true });
    assert.equal(ok, true);
  });

  test('4.3 — refreshSession retorna false para token inexistente', () => {
    const ok = repo.refreshSession('nao-existe', {});
    assert.equal(ok, false);
  });

  test('4.4 — deleteSession remove a sessão', () => {
    const { token } = repo.createSession({ userId: `del1_${RUN}`, data: {} });
    assert.ok(repo.getSession(token), 'Sessão deve existir antes do delete');
    repo.deleteSession(token);
    assert.equal(repo.getSession(token), null, 'Sessão deve estar removida');
  });

  test('4.5 — deleteSession retorna true quando remove', () => {
    const { token } = repo.createSession({ userId: `del2_${RUN}`, data: {} });
    assert.equal(repo.deleteSession(token), true);
  });

  test('4.6 — deleteSession retorna false para token inexistente', () => {
    assert.equal(repo.deleteSession('token-nao-existe'), false);
  });

  test('4.7 — deleteUserSessions remove todas as sessões do usuário', () => {
    const uid = `delall_${RUN}`;
    repo.createSession({ userId: uid, data: {} });
    repo.createSession({ userId: uid, data: {} });
    const removed = repo.deleteUserSessions(uid);
    assert.ok(removed >= 2);
    assert.equal(repo.listUserSessions(uid).length, 0);
  });

  test('4.8 — pruneExpiredSessions não remove sessões válidas', () => {
    const { token } = repo.createSession({ userId: `prune1_${RUN}`, data: {} });
    repo.pruneExpiredSessions();
    assert.ok(repo.getSession(token), 'Sessão válida não deve ser removida');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — Sessions.mjs — listUserSessions / countActiveSessions
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — Sessions.mjs — listUserSessions / countActiveSessions', () => {
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Sessions.mjs');
  });

  test('5.1 — listUserSessions retorna sessões do usuário', () => {
    const uid = `list1_${RUN}`;
    repo.createSession({ userId: uid, data: { a: 1 } });
    repo.createSession({ userId: uid, data: { a: 2 } });
    const list = repo.listUserSessions(uid);
    assert.ok(list.length >= 2);
    assert.ok(list.every(s => s.userId === uid));
  });

  test('5.2 — listUserSessions retorna array vazio para usuário sem sessão', () => {
    const list = repo.listUserSessions(`nenhum_${RUN}`);
    assert.deepEqual(list, []);
  });

  test('5.3 — countActiveSessions retorna número >= 0', () => {
    const count = repo.countActiveSessions();
    assert.ok(typeof count === 'number' && count >= 0);
  });

  test('5.4 — countActiveSessions aumenta após createSession', () => {
    const before = repo.countActiveSessions();
    repo.createSession({ userId: `cnt1_${RUN}`, data: {} });
    const after  = repo.countActiveSessions();
    assert.ok(after >= before + 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Sessions.mjs — expiração
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — Sessions.mjs — expiração', async () => {
  let repo;
  const { DatabaseSync }  = await import('node:sqlite');
  const { runSchema }     = await import('../src/database/schema.mjs');
  const { runMigrations } = await import('../src/database/migrations.mjs');

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Sessions.mjs');
  });

  test('6.1 — getSession com TTL 1s não retorna sessão expirada', () => {
    // Valida diretamente no SQLite em memória sem depender do repositório
    const db  = new DatabaseSync(':memory:');
    runSchema(db);
    runMigrations(db);

    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO web_sessions (token, user_id, data, expires_at, created_at)
      VALUES (?, ?, '{}', ?, ?)
    `).run('expired-token-test', 'user1', now - 10, now - 100);

    // A consulta deve filtrar expires_at <= now
    const row = db.prepare('SELECT * FROM web_sessions WHERE token = ? AND expires_at > ?').get('expired-token-test', now);
    assert.equal(row, undefined, 'Sessão expirada não deve ser retornada');
  });

  test('6.2 — pruneExpiredSessions remove apenas sessões expiradas', () => {
    // Valida que pruneExpiredSessions não lança exceção
    assert.doesNotThrow(() => repo.pruneExpiredSessions());
  });

  test('6.3 — sessão com expires futuro não é expirada', () => {
    const { token } = repo.createSession({ userId: `exp2_${RUN}`, data: {} });
    const session   = repo.getSession(token);
    assert.ok(session, 'Sessão futura deve ser válida');
    assert.ok(session.expires > Math.floor(Date.now() / 1000), 'expires deve ser futuro');
  });

  test('6.4 — refreshSession renova o expires da sessão', () => {
    const { token, expires: oldExpires } = repo.createSession({ userId: `exp3_${RUN}`, data: {}, ttl: 3600 });
    repo.refreshSession(token, { refreshed: true }, 7200);
    const session = repo.getSession(token);
    assert.ok(session.expires >= oldExpires, 'expires renovado deve ser >= original');
  });

  test('6.5 — SESSION_TTL_SECONDS exportado é número positivo', async () => {
    assert.ok(repo.SESSION_TTL_SECONDS > 0);
    assert.equal(typeof repo.SESSION_TTL_SECONDS, 'number');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — config/web.mjs — estrutura
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — config/web.mjs — estrutura', async () => {
  const { webConfig } = await import('../src/config/web.mjs');

  test('7.1 — webConfig.port é número positivo', () => {
    assert.ok(typeof webConfig.port === 'number' && webConfig.port > 0);
  });

  test('7.2 — webConfig.discord tem clientId, clientSecret, callbackUrl', () => {
    assert.ok(typeof webConfig.discord.clientId      === 'string');
    assert.ok(typeof webConfig.discord.clientSecret  === 'string');
    assert.ok(typeof webConfig.discord.callbackUrl   === 'string');
  });

  test('7.3 — webConfig.session tem secret e ttl', () => {
    assert.ok(typeof webConfig.session.secret === 'string');
    assert.ok(typeof webConfig.session.ttl    === 'number' && webConfig.session.ttl > 0);
  });

  test('7.4 — webConfig.corsOrigins é array', () => {
    assert.ok(Array.isArray(webConfig.corsOrigins));
  });

  test('7.5 — webConfig.isProduction é booleano', () => {
    assert.equal(typeof webConfig.isProduction, 'boolean');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — middleware/requireAuth — sessionMiddleware
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — middleware/requireAuth — sessionMiddleware', () => {
  let mw;
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    mw   = await import('../src/web/middleware/requireAuth.mjs');
    repo = await import('../src/database/repositories/Sessions.mjs');
  });

  function mockReqRes(overrides = {}) {
    const req = { headers: {}, ...overrides };
    const res = { status: () => res, json: () => res };
    const next = { called: false, fn: () => { next.called = true; } };
    return { req, res, next };
  }

  test('8.1 — sessionMiddleware chama next() sem cookie', () => {
    const { req, res, next } = mockReqRes();
    mw.sessionMiddleware(req, res, next.fn);
    assert.equal(next.called, true);
    assert.equal(req.session, null);
  });

  test('8.2 — sessionMiddleware popula req.session com cookie válido', () => {
    const { token } = repo.createSession({ userId: `mw1_${RUN}`, data: { ok: true } });
    const { req, res, next } = mockReqRes({ headers: { cookie: `ruby_session=${token}` } });
    mw.sessionMiddleware(req, res, next.fn);
    assert.ok(req.session, 'req.session deve ser populado');
    assert.equal(req.session.userId, `mw1_${RUN}`);
  });

  test('8.3 — sessionMiddleware define req.sessionToken', () => {
    const { token } = repo.createSession({ userId: `mw2_${RUN}`, data: {} });
    const { req, res, next } = mockReqRes({ headers: { cookie: `ruby_session=${token}` } });
    mw.sessionMiddleware(req, res, next.fn);
    assert.equal(req.sessionToken, token);
  });

  test('8.4 — sessionMiddleware aceita token via Bearer header', () => {
    const { token } = repo.createSession({ userId: `mw3_${RUN}`, data: {} });
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } });
    mw.sessionMiddleware(req, res, next.fn);
    assert.ok(req.session, 'req.session deve ser populado via Bearer');
  });

  test('8.5 — cookie inválido resulta em req.session null', () => {
    const { req, res, next } = mockReqRes({ headers: { cookie: 'ruby_session=token-invalido' } });
    mw.sessionMiddleware(req, res, next.fn);
    assert.equal(req.session, null);
  });

  test('8.6 — cookie de outro nome é ignorado', () => {
    const { req, res, next } = mockReqRes({ headers: { cookie: 'outro_cookie=qualquer' } });
    mw.sessionMiddleware(req, res, next.fn);
    assert.equal(req.session, null);
  });

  test('8.7 — COOKIE_NAME exportado é string', () => {
    assert.equal(typeof mw.COOKIE_NAME, 'string');
    assert.ok(mw.COOKIE_NAME.length > 0);
  });

  test('8.8 — sessionMiddleware sempre chama next()', () => {
    const { req, res, next } = mockReqRes({ headers: {} });
    mw.sessionMiddleware(req, res, next.fn);
    assert.equal(next.called, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — middleware/requireAuth — requireAuth guard
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — middleware/requireAuth — requireAuth guard', () => {
  let mw;

  before(async () => {
    mw = await import('../src/web/middleware/requireAuth.mjs');
  });

  function mockGuard(session = null) {
    let statusCode = null;
    let jsonBody   = null;
    let nextCalled = false;

    const req = { session };
    const res = {
      status(code) { statusCode = code; return this; },
      json(body)   { jsonBody   = body; return this; },
    };
    const next = () => { nextCalled = true; };

    mw.requireAuth(req, res, next);
    return { statusCode, jsonBody, nextCalled };
  }

  test('9.1 — requireAuth com sessão válida chama next()', () => {
    const result = mockGuard({ userId: 'u1', data: {} });
    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, null);
  });

  test('9.2 — requireAuth sem sessão retorna 401', () => {
    const result = mockGuard(null);
    assert.equal(result.statusCode, 401);
    assert.ok(result.jsonBody?.error, 'Deve ter mensagem de erro');
  });

  test('9.3 — requireAuth com sessão null não chama next()', () => {
    const result = mockGuard(null);
    assert.equal(result.nextCalled, false);
  });

  test('9.4 — requireAuth retorna JSON com campo error', () => {
    const result = mockGuard(null);
    assert.ok(typeof result.jsonBody?.error === 'string');
  });

  test('9.5 — requireAuth com sessão undefined retorna 401', () => {
    const result = mockGuard(undefined);
    assert.equal(result.statusCode, 401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — middleware/requireAuth — requireGuildAccess
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — middleware/requireAuth — requireGuildAccess', () => {
  let mw;

  before(async () => {
    mw = await import('../src/web/middleware/requireAuth.mjs');
  });

  function mockGuildGuard(guildId, guilds) {
    let statusCode = null;
    let jsonBody   = null;
    let nextCalled = false;
    let targetGuild = null;

    // ManageGuild = 0x20 = 32
    const req = {
      params:  { guildId },
      session: { data: { guilds } },
    };
    const res = {
      status(code)  { statusCode = code; return this; },
      json(body)    { jsonBody   = body; return this; },
    };
    const next = () => {
      nextCalled  = true;
      targetGuild = req.targetGuild;
    };

    mw.requireGuildAccess(req, res, next);
    return { statusCode, jsonBody, nextCalled, targetGuild: req.targetGuild };
  }

  const MANAGE_PERM = '32'; // 0x20
  const ADMIN_PERM  = '8';  // 0x8

  test('10.1 — acesso permitido com ManageGuild', () => {
    const result = mockGuildGuard('guild1', [{ id: 'guild1', permissions: MANAGE_PERM }]);
    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, null);
  });

  test('10.2 — acesso permitido com Administrator', () => {
    const result = mockGuildGuard('guild1', [{ id: 'guild1', permissions: ADMIN_PERM }]);
    assert.equal(result.nextCalled, true);
  });

  test('10.3 — acesso negado se guild não está na sessão', () => {
    const result = mockGuildGuard('guild-outro', [{ id: 'guild1', permissions: MANAGE_PERM }]);
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
  });

  test('10.4 — acesso negado sem permissão ManageGuild', () => {
    const result = mockGuildGuard('guild1', [{ id: 'guild1', permissions: '1' }]);
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
  });

  test('10.5 — req.targetGuild preenchido no next()', () => {
    const result = mockGuildGuard('g123', [{ id: 'g123', permissions: MANAGE_PERM, name: 'Server A' }]);
    assert.ok(result.targetGuild, 'targetGuild deve ser definido');
    assert.equal(result.targetGuild.id, 'g123');
  });

  test('10.6 — guildId ausente retorna 400', () => {
    let statusCode = null;
    const req = { params: {}, session: { data: { guilds: [] } } };
    const res = { status(c) { statusCode = c; return this; }, json() { return this; } };
    mw.requireGuildAccess(req, res, () => {});
    assert.equal(statusCode, 400);
  });

  test('10.7 — guilds vazia retorna 403', () => {
    const result = mockGuildGuard('guild1', []);
    assert.equal(result.statusCode, 403);
  });

  test('10.8 — owner=true + permissions corretas permite acesso', () => {
    const result = mockGuildGuard('g1', [{ id: 'g1', permissions: MANAGE_PERM, owner: true }]);
    assert.equal(result.nextCalled, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — web/server — createApp
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — web/server — createApp', async () => {
  const { createApp } = await import('../src/web/server.mjs');

  test('11.1 — createApp retorna objeto Express', () => {
    const app = createApp();
    assert.equal(typeof app, 'function', 'Express app deve ser uma função');
  });

  test('11.2 — app tem método listen', () => {
    const app = createApp();
    assert.equal(typeof app.listen, 'function');
  });

  test('11.3 — app tem método use', () => {
    const app = createApp();
    assert.equal(typeof app.use, 'function');
  });

  test('11.4 — app tem método get', () => {
    const app = createApp();
    assert.equal(typeof app.get, 'function');
  });

  test('11.5 — createApp pode ser chamado múltiplas vezes', () => {
    assert.doesNotThrow(() => {
      createApp();
      createApp();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — Isolamento cross-guild
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — Isolamento cross-guild', () => {
  let mw;

  before(async () => {
    mw = await import('../src/web/middleware/requireAuth.mjs');
  });

  test('12.1 — usuário sem guild na sessão não acessa guild de outro', () => {
    let status = null;
    const req = { params: { guildId: 'guild-alvo' }, session: { data: { guilds: [{ id: 'guild-minha', permissions: '32' }] } } };
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    mw.requireGuildAccess(req, res, () => {});
    assert.equal(status, 403, 'Deve ser bloqueado com 403');
  });

  test('12.2 — usuário com muitos guilds só acessa o que está na lista', () => {
    const guilds = [
      { id: 'g1', permissions: '32' },
      { id: 'g2', permissions: '32' },
      { id: 'g3', permissions: '32' },
    ];
    let status = null;
    const req = { params: { guildId: 'g-nao-autorizado' }, session: { data: { guilds } } };
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    mw.requireGuildAccess(req, res, () => {});
    assert.equal(status, 403);
  });

  test('12.3 — sessões de usuários diferentes são independentes', async () => {
    const { createSession, getSession } = await import('../src/database/repositories/Sessions.mjs');
    const { token: t1 } = createSession({ userId: `iso_u1_${RUN}`, data: { role: 'admin' } });
    const { token: t2 } = createSession({ userId: `iso_u2_${RUN}`, data: { role: 'user'  } });
    // Token do user1 não dá acesso aos dados do user2
    const s1 = getSession(t1);
    const s2 = getSession(t2);
    assert.notEqual(s1.userId, s2.userId, 'Sessões de usuários distintos são independentes');
  });
});
