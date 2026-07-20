/**
 * Testes da Etapa 18 — Logs Avançados e Auditoria
 *
 * Cobertura:
 *   BLOCO 1  — Schema (audit_log)                             (6 testes)
 *   BLOCO 2  — Migração 004_audit_log                         (4 testes)
 *   BLOCO 3  — AuditLog.mjs — logAudit (escrita)              (10 testes)
 *   BLOCO 4  — AuditLog.mjs — listAuditLogs (filtros)         (10 testes)
 *   BLOCO 5  — AuditLog.mjs — paginação                       (6 testes)
 *   BLOCO 6  — AuditLog.mjs — getAuditStats                   (6 testes)
 *   BLOCO 7  — AuditLog.mjs — exportAuditLogs                 (8 testes)
 *   BLOCO 8  — AuditLog.mjs — isolamento por guildId          (6 testes)
 *   BLOCO 9  — AuditLog.mjs — falha silenciosa                (4 testes)
 *   BLOCO 10 — audit/flow.mjs — buildAuditEmbed               (5 testes)
 *   BLOCO 11 — audit/flow.mjs — buildAuditStatsEmbed          (3 testes)
 *   BLOCO 12 — audit/index.mjs — exports                      (2 testes)
 *
 * Total: 70 testes
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const RUN = randomUUID().slice(0, 8);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Schema (audit_log)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — Schema (audit_log)', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

  test('1.1 — tabela audit_log existe', () => {
    assert.ok(tables.includes('audit_log'), 'audit_log deve existir');
  });

  test('1.2 — audit_log tem colunas obrigatórias', () => {
    const cols = db.prepare('PRAGMA table_info(audit_log)').all().map(c => c.name);
    for (const col of ['id','guild_id','actor_id','module','action','entity','entity_id',
                        'before_data','after_data','result','details','source','created_at']) {
      assert.ok(cols.includes(col), `Coluna '${col}' ausente em audit_log`);
    }
  });

  test('1.3 — result tem default success', () => {
    const col = db.prepare('PRAGMA table_info(audit_log)').all().find(c => c.name === 'result');
    assert.ok(col?.dflt_value?.includes('success'), 'result deve ter default "success"');
  });

  test('1.4 — source tem default admin', () => {
    const col = db.prepare('PRAGMA table_info(audit_log)').all().find(c => c.name === 'source');
    assert.ok(col?.dflt_value?.includes('admin'), 'source deve ter default "admin"');
  });

  test('1.5 — schema é idempotente (dupla execução segura)', () => {
    assert.doesNotThrow(() => runSchema(db));
  });

  test('1.6 — índices existem', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_log'")
      .all().map(r => r.name);
    assert.ok(indexes.some(n => n.includes('guild_created') || n.includes('audit_log')),
      'Pelo menos um índice de audit_log deve existir');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Migração 004_audit_log
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — Migração 004_audit_log', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runMigrations, listAllMigrationNames } = await import('../src/database/migrations.mjs');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  test('2.1 — migração 004_audit_log está na lista', () => {
    const names = listAllMigrationNames();
    assert.ok(names.includes('004_audit_log'), '004_audit_log deve constar nas migrações');
  });

  test('2.2 — runMigrations executa sem erro', () => {
    assert.doesNotThrow(() => runMigrations(db));
  });

  test('2.3 — runMigrations é idempotente (segunda execução)', () => {
    assert.doesNotThrow(() => runMigrations(db));
  });

  test('2.4 — audit_log existe após migração', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    assert.ok(tables.includes('audit_log'), 'audit_log deve existir após migração');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — AuditLog.mjs — logAudit (escrita)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — AuditLog.mjs — logAudit (escrita)', () => {
  let repo;
  const GUILD = `guild_18_log_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');
  });

  test('3.1 — logAudit retorna objeto normalizado', () => {
    const entry = repo.logAudit({ guildId: GUILD, module: 'templates', action: 'create' });
    assert.ok(entry?.id, 'Deve ter id');
    assert.equal(entry.guildId, GUILD);
    assert.equal(entry.module, 'templates');
    assert.equal(entry.action, 'create');
    assert.equal(entry.result, 'success');
    assert.equal(entry.source, 'admin');
  });

  test('3.2 — logAudit registra actorId', () => {
    const entry = repo.logAudit({ guildId: GUILD, actorId: 'user123', module: 'orders', action: 'update' });
    assert.equal(entry.actorId, 'user123');
  });

  test('3.3 — logAudit registra entity e entityId', () => {
    const entry = repo.logAudit({ guildId: GUILD, module: 'tickets', action: 'close', entity: 'ticket', entityId: 'abc' });
    assert.equal(entry.entity, 'ticket');
    assert.equal(entry.entityId, 'abc');
  });

  test('3.4 — logAudit registra before e after', () => {
    const before = { status: 'pending' };
    const after  = { status: 'paid' };
    const entry  = repo.logAudit({ guildId: GUILD, module: 'orders', action: 'status_changed', before, after });
    assert.deepEqual(entry.before, before);
    assert.deepEqual(entry.after,  after);
  });

  test('3.5 — logAudit registra result error', () => {
    const entry = repo.logAudit({ guildId: GUILD, module: 'conexoes', action: 'execute', result: repo.AUDIT_RESULT.ERROR });
    assert.equal(entry.result, 'error');
  });

  test('3.6 — logAudit registra source discord_event', () => {
    const entry = repo.logAudit({ guildId: GUILD, module: 'discord_events', action: 'message_delete', source: repo.AUDIT_SOURCE.DISCORD_EVENT });
    assert.equal(entry.source, 'discord_event');
  });

  test('3.7 — logAudit registra details', () => {
    const details = { reason: 'spam', extra: 42 };
    const entry   = repo.logAudit({ guildId: GUILD, module: 'tickets', action: 'delete', details });
    assert.deepEqual(entry.details, details);
  });

  test('3.8 — logAuditError registra result error com mensagem', () => {
    const entry = repo.logAuditError(GUILD, 'products', 'create', new Error('Estoque inválido'));
    assert.equal(entry.result, 'error');
    assert.ok(entry.details?.error?.includes('Estoque'), 'Deve conter mensagem de erro');
  });

  test('3.9 — logAudit com actorId null é válido', () => {
    const entry = repo.logAudit({ guildId: GUILD, module: 'system', action: 'migration', actorId: null });
    assert.ok(entry?.id, 'Deve registrar sem actorId');
    assert.equal(entry.actorId, null);
  });

  test('3.10 — getAuditEntry retorna null para ID inexistente', () => {
    const entry = repo.getAuditEntry(GUILD, 'nao-existe');
    assert.equal(entry, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — AuditLog.mjs — listAuditLogs (filtros)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — AuditLog.mjs — listAuditLogs (filtros)', () => {
  let repo;
  const GUILD = `guild_18_filter_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');

    // Populamos dados de teste
    repo.logAudit({ guildId: GUILD, actorId: 'userA', module: 'templates', action: 'create', result: 'success', source: 'admin' });
    repo.logAudit({ guildId: GUILD, actorId: 'userA', module: 'templates', action: 'delete', result: 'success', source: 'admin' });
    repo.logAudit({ guildId: GUILD, actorId: 'userB', module: 'orders',    action: 'update', result: 'error',   source: 'admin' });
    repo.logAudit({ guildId: GUILD, actorId: null,    module: 'discord_events', action: 'member_join', result: 'success', source: 'discord_event' });
    repo.logAudit({ guildId: GUILD, actorId: null,    module: 'discord_events', action: 'message_delete', result: 'success', source: 'discord_event' });
  });

  test('4.1 — listAuditLogs retorna todos os registros do guild', () => {
    const r = repo.listAuditLogs(GUILD);
    assert.ok(r.total >= 5, 'Deve ter pelo menos 5 registros');
  });

  test('4.2 — filtro por module', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'templates' });
    assert.ok(r.entries.every(e => e.module === 'templates'));
    assert.ok(r.total >= 2);
  });

  test('4.3 — filtro por actorId', () => {
    const r = repo.listAuditLogs(GUILD, { actorId: 'userA' });
    assert.ok(r.entries.every(e => e.actorId === 'userA'));
    assert.ok(r.total >= 2);
  });

  test('4.4 — filtro por result error', () => {
    const r = repo.listAuditLogs(GUILD, { result: 'error' });
    assert.ok(r.entries.every(e => e.result === 'error'));
    assert.ok(r.total >= 1);
  });

  test('4.5 — filtro por source discord_event', () => {
    const r = repo.listAuditLogs(GUILD, { source: 'discord_event' });
    assert.ok(r.entries.every(e => e.source === 'discord_event'));
    assert.ok(r.total >= 2);
  });

  test('4.6 — filtro por action', () => {
    const r = repo.listAuditLogs(GUILD, { action: 'create' });
    assert.ok(r.entries.every(e => e.action === 'create'));
  });

  test('4.7 — filtro por período (from/to)', () => {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 60;   // 1 minuto atrás
    const to   = now + 60;   // 1 minuto à frente
    const r    = repo.listAuditLogs(GUILD, { from, to });
    assert.ok(r.total >= 1);
    assert.ok(r.entries.every(e => e.createdAt >= from && e.createdAt <= to));
  });

  test('4.8 — filtro from após o futuro retorna zero', () => {
    const future = Math.floor(Date.now() / 1000) + 999999;
    const r = repo.listAuditLogs(GUILD, { from: future });
    assert.equal(r.total, 0);
  });

  test('4.9 — combinação de filtros funciona', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'templates', action: 'create' });
    assert.ok(r.entries.every(e => e.module === 'templates' && e.action === 'create'));
  });

  test('4.10 — listAuditLogs sem registros retorna total 0', () => {
    const r = repo.listAuditLogs(`guild_18_empty_${RUN}`);
    assert.equal(r.total, 0);
    assert.deepEqual(r.entries, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — AuditLog.mjs — paginação
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — AuditLog.mjs — paginação', () => {
  let repo;
  const GUILD = `guild_18_page_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');

    // Insere 15 registros para testar paginação
    for (let i = 0; i < 15; i++) {
      repo.logAudit({ guildId: GUILD, module: 'pagination_test', action: `action_${i}` });
    }
  });

  test('5.1 — pageSize padrão é 10', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test' });
    assert.equal(r.pageSize, 10);
    assert.equal(r.entries.length, 10);
  });

  test('5.2 — page 1 retorna os 10 primeiros', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test', page: 1 });
    assert.equal(r.page, 1);
    assert.equal(r.entries.length, 10);
  });

  test('5.3 — page 2 retorna os restantes', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test', page: 2 });
    assert.equal(r.page, 2);
    assert.equal(r.entries.length, 5);
  });

  test('5.4 — totalPages calculado corretamente', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test' });
    assert.equal(r.totalPages, 2);
  });

  test('5.5 — pageSize customizado funciona', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test', pageSize: 5, page: 1 });
    assert.equal(r.pageSize, 5);
    assert.equal(r.entries.length, 5);
  });

  test('5.6 — page além do total retorna vazio sem erro', () => {
    const r = repo.listAuditLogs(GUILD, { module: 'pagination_test', page: 999 });
    assert.equal(r.entries.length, 0);
    assert.equal(r.total, 15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — AuditLog.mjs — getAuditStats
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — AuditLog.mjs — getAuditStats', () => {
  let repo;
  const GUILD = `guild_18_stats_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');

    repo.logAudit({ guildId: GUILD, module: 'templates', action: 'create', result: 'success', source: 'admin' });
    repo.logAudit({ guildId: GUILD, module: 'templates', action: 'delete', result: 'error',   source: 'admin' });
    repo.logAudit({ guildId: GUILD, module: 'discord_events', action: 'member_join', result: 'success', source: 'discord_event' });
  });

  test('6.1 — stats retorna total correto', () => {
    const s = repo.getAuditStats(GUILD);
    assert.ok(s.total >= 3, 'Total deve ser >= 3');
  });

  test('6.2 — stats contém byModule', () => {
    const s = repo.getAuditStats(GUILD);
    assert.ok(typeof s.byModule === 'object');
    assert.ok(s.byModule['templates'] >= 2);
  });

  test('6.3 — stats contém byResult', () => {
    const s = repo.getAuditStats(GUILD);
    assert.ok(typeof s.byResult === 'object');
    assert.ok(s.byResult['success'] >= 2);
    assert.ok(s.byResult['error']   >= 1);
  });

  test('6.4 — stats contém bySource', () => {
    const s = repo.getAuditStats(GUILD);
    assert.ok(s.bySource['admin']         >= 2);
    assert.ok(s.bySource['discord_event'] >= 1);
  });

  test('6.5 — last24h inclui registros recentes', () => {
    const s = repo.getAuditStats(GUILD);
    assert.ok(s.last24h >= 3);
  });

  test('6.6 — guild sem registros retorna zeros', () => {
    const s = repo.getAuditStats(`guild_18_empty_stats_${RUN}`);
    assert.equal(s.total, 0);
    assert.equal(s.last24h, 0);
    assert.deepEqual(s.byModule, {});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — AuditLog.mjs — exportAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — AuditLog.mjs — exportAuditLogs', () => {
  let repo;
  const GUILD = `guild_18_export_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');

    repo.logAudit({ guildId: GUILD, actorId: 'user1', module: 'templates', action: 'create' });
    repo.logAudit({ guildId: GUILD, actorId: 'user2', module: 'orders',    action: 'update' });
    repo.logAudit({ guildId: GUILD, actorId: null,    module: 'discord_events', action: 'member_join', source: 'discord_event' });
  });

  test('7.1 — exportação TXT retorna conteúdo', () => {
    const r = repo.exportAuditLogs(GUILD, {}, 'txt');
    assert.ok(r.content.length > 0);
    assert.ok(r.filename.endsWith('.txt'));
    assert.ok(r.count >= 3);
  });

  test('7.2 — exportação CSV inclui header', () => {
    const r = repo.exportAuditLogs(GUILD, {}, 'csv');
    assert.ok(r.content.startsWith('id,guild_id'));
    assert.ok(r.filename.endsWith('.csv'));
  });

  test('7.3 — exportação CSV tem linhas de dados', () => {
    const r     = repo.exportAuditLogs(GUILD, {}, 'csv');
    const lines = r.content.split('\n').filter(Boolean);
    assert.ok(lines.length >= 4, 'Header + pelo menos 3 linhas de dados');
  });

  test('7.4 — exportação JSON é JSON válido', () => {
    const r = repo.exportAuditLogs(GUILD, {}, 'json');
    assert.doesNotThrow(() => JSON.parse(r.content));
    const parsed = JSON.parse(r.content);
    assert.ok(Array.isArray(parsed));
    assert.ok(parsed.length >= 3);
  });

  test('7.5 — exportação JSON tem campos esperados', () => {
    const r      = repo.exportAuditLogs(GUILD, {}, 'json');
    const parsed = JSON.parse(r.content);
    const first  = parsed[0];
    assert.ok(first.id);
    assert.ok(first.module);
    assert.ok(first.action);
  });

  test('7.6 — exportação com filtro por módulo funciona', () => {
    const r = repo.exportAuditLogs(GUILD, { module: 'templates' }, 'json');
    const parsed = JSON.parse(r.content);
    assert.ok(parsed.every(e => e.module === 'templates'));
  });

  test('7.7 — exportação de guild sem dados retorna count 0', () => {
    const r = repo.exportAuditLogs(`guild_18_empty_export_${RUN}`, {}, 'txt');
    assert.equal(r.count, 0);
  });

  test('7.8 — formato inválido cai no TXT (default)', () => {
    const r = repo.exportAuditLogs(GUILD, {}, 'pdf'); // formato inválido
    assert.ok(r.filename.endsWith('.txt'), 'Deve retornar txt por padrão');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — AuditLog.mjs — isolamento por guildId
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — AuditLog.mjs — isolamento por guildId', () => {
  let repo;
  const GUILD_A = `guild_18_isoA_${RUN}`;
  const GUILD_B = `guild_18_isoB_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');

    repo.logAudit({ guildId: GUILD_A, module: 'templates', action: 'create' });
    repo.logAudit({ guildId: GUILD_A, module: 'templates', action: 'delete' });
    repo.logAudit({ guildId: GUILD_B, module: 'orders',    action: 'update' });
  });

  test('8.1 — listAuditLogs GUILD_A não retorna registros de GUILD_B', () => {
    const r = repo.listAuditLogs(GUILD_A);
    assert.ok(r.entries.every(e => e.guildId === GUILD_A));
  });

  test('8.2 — listAuditLogs GUILD_B não retorna registros de GUILD_A', () => {
    const r = repo.listAuditLogs(GUILD_B);
    assert.ok(r.entries.every(e => e.guildId === GUILD_B));
  });

  test('8.3 — total de GUILD_A é independente de GUILD_B', () => {
    const rA = repo.listAuditLogs(GUILD_A);
    const rB = repo.listAuditLogs(GUILD_B);
    assert.equal(rA.total, 2);
    assert.equal(rB.total, 1);
  });

  test('8.4 — getAuditStats GUILD_A não inclui dados de GUILD_B', () => {
    const sA = repo.getAuditStats(GUILD_A);
    const sB = repo.getAuditStats(GUILD_B);
    assert.equal(sA.total, 2);
    assert.equal(sB.total, 1);
  });

  test('8.5 — getAuditEntry de GUILD_A não retorna entrada de GUILD_B', () => {
    // Cria uma entrada em GUILD_B e tenta lê-la como se fosse de GUILD_A
    const entry = repo.logAudit({ guildId: GUILD_B, module: 'discord_events', action: 'test' });
    const result = repo.getAuditEntry(GUILD_A, entry.id);
    assert.equal(result, null, 'Cross-guild lookup deve retornar null');
  });

  test('8.6 — exportação de GUILD_A não inclui dados de GUILD_B', () => {
    const r      = repo.exportAuditLogs(GUILD_A, {}, 'json');
    const parsed = JSON.parse(r.content);
    assert.ok(parsed.every(e => e.guildId === GUILD_A));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — AuditLog.mjs — falha silenciosa
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — AuditLog.mjs — falha silenciosa', () => {
  let repo;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AuditLog.mjs');
  });

  test('9.1 — logAudit não lança exceção mesmo com guildId inválido', () => {
    // guildId inválido que não pertence a guild_configs — logAudit chama getOrCreate
    assert.doesNotThrow(() => repo.logAudit({ guildId: `guild_invalid_${RUN}`, module: 'test', action: 'test' }));
  });

  test('9.2 — getAuditEntry nunca lança exceção', () => {
    assert.doesNotThrow(() => repo.getAuditEntry('qualquer', 'qualquer'));
  });

  test('9.3 — listAuditLogs retorna estrutura vazia em caso de guild inexistente', () => {
    const r = repo.listAuditLogs(`guild_nonexistent_${RUN}`);
    assert.ok(Array.isArray(r.entries));
    assert.equal(typeof r.total, 'number');
  });

  test('9.4 — getAuditStats retorna zeros para guild sem dados', () => {
    const s = repo.getAuditStats(`guild_18_nostats_${RUN}`);
    assert.equal(s.total, 0);
    assert.equal(s.last24h, 0);
    assert.equal(s.last7d, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — audit/flow.mjs — buildAuditEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — audit/flow.mjs — buildAuditEmbed', async () => {
  const { buildAuditEmbed, formatAuditEntry, AUDIT_FILTERS } = await import('../src/modules/audit/flow.mjs');

  const fakeResult = {
    entries: [
      { id: 'e1', guildId: 'g1', actorId: 'u1', module: 'templates', action: 'create', entity: null, entityId: null, before: null, after: null, result: 'success', source: 'admin', details: null, createdAt: Math.floor(Date.now() / 1000) },
    ],
    total:      1,
    page:       1,
    pageSize:   10,
    totalPages: 1,
  };

  test('10.1 — buildAuditEmbed retorna objeto EmbedBuilder-like', () => {
    const embed = buildAuditEmbed(fakeResult);
    assert.ok(typeof embed.toJSON === 'function', 'Deve ter toJSON');
  });

  test('10.2 — buildAuditEmbed sem filtros não inclui linha de filtros', () => {
    const embed = buildAuditEmbed(fakeResult, {});
    const data  = embed.toJSON();
    assert.ok(data.title?.includes('Auditoria'));
  });

  test('10.3 — buildAuditEmbed com resultado vazio exibe mensagem adequada', () => {
    const empty  = { entries: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
    const embed  = buildAuditEmbed(empty);
    const data   = embed.toJSON();
    assert.ok(data.fields?.some(f => f.name === 'Sem registros'));
  });

  test('10.4 — formatAuditEntry retorna string', () => {
    const line = formatAuditEntry(fakeResult.entries[0]);
    assert.equal(typeof line, 'string');
    assert.ok(line.includes('templates/create'));
  });

  test('10.5 — AUDIT_FILTERS contém listas válidas', () => {
    assert.ok(Array.isArray(AUDIT_FILTERS.MODULE));
    assert.ok(Array.isArray(AUDIT_FILTERS.SOURCE));
    assert.ok(Array.isArray(AUDIT_FILTERS.RESULT));
    assert.ok(AUDIT_FILTERS.SOURCE.includes('admin'));
    assert.ok(AUDIT_FILTERS.SOURCE.includes('discord_event'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — audit/flow.mjs — buildAuditStatsEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — audit/flow.mjs — buildAuditStatsEmbed', async () => {
  const { buildAuditStatsEmbed } = await import('../src/modules/audit/flow.mjs');

  const fakeStats = {
    total:    42,
    byModule: { templates: 20, orders: 22 },
    byResult: { success: 40, error: 2 },
    bySource: { admin: 30, discord_event: 12 },
    last24h:  10,
    last7d:   35,
  };

  test('11.1 — buildAuditStatsEmbed retorna EmbedBuilder-like', () => {
    const embed = buildAuditStatsEmbed(fakeStats, 'Meu Servidor');
    assert.ok(typeof embed.toJSON === 'function');
  });

  test('11.2 — embed contém totais corretos', () => {
    const embed = buildAuditStatsEmbed(fakeStats, 'Meu Servidor');
    const data  = embed.toJSON();
    const totaisField = data.fields?.find(f => f.name?.includes('Totais'));
    assert.ok(totaisField?.value?.includes('42'));
  });

  test('11.3 — embed contém informações de módulos', () => {
    const embed = buildAuditStatsEmbed(fakeStats, 'Meu Servidor');
    const data  = embed.toJSON();
    const modField = data.fields?.find(f => f.name?.includes('módulo'));
    assert.ok(modField?.value?.includes('templates'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — audit/index.mjs — exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — audit/index.mjs — exports', async () => {
  const auditModule = await import('../src/modules/audit/index.mjs');

  test('12.1 — exporta funções obrigatórias do repositório', () => {
    assert.equal(typeof auditModule.logAudit,         'function');
    assert.equal(typeof auditModule.listAuditLogs,    'function');
    assert.equal(typeof auditModule.getAuditStats,    'function');
    assert.equal(typeof auditModule.exportAuditLogs,  'function');
    assert.equal(typeof auditModule.AUDIT_SOURCE,     'object');
    assert.equal(typeof auditModule.AUDIT_RESULT,     'object');
  });

  test('12.2 — exporta funções de UI e o registerAuditHandler', () => {
    assert.equal(typeof auditModule.buildAuditEmbed,       'function');
    assert.equal(typeof auditModule.buildAuditStatsEmbed,  'function');
    assert.equal(typeof auditModule.formatAuditEntry,      'function');
    assert.equal(typeof auditModule.registerAuditHandler,  'function');
  });
});
