/**
 * Testes da Fase 4 — Auto Roles (Cargos Automáticos)
 *
 * Cobertura:
 *   BLOCO 1  — Schema: tabela auto_roles                     (4 testes) — DB
 *   BLOCO 2  — AutoRoles.mjs CRUD                         (10 testes) — DB
 *   BLOCO 3  — AutoRoles.mjs isolamento entre guilds        (4 testes) — DB
 *   BLOCO 4  — AutoRoles.mjs toggle e priorities          (3 testes) — DB
 *   BLOCO 5  — Migration 011_auto_roles                    (3 testes) — DB
 *   BLOCO 6  — Permissions: SUPPORTED_MODULES contém 'autorole' (2 testes) — puro
 *   BLOCO 7  — flow.mjs exports                            (4 testes) — puro
 *   BLOCO 8  — Permissões e auditoria integração          (3 testes) — DB
 *
 * Total: 33 testes
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// BLOCO 1 — Schema: tabela auto_roles
// =============================================================================

describe('BLOCO 1 — Schema: tabela auto_roles', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

  test('1.1 — tabela auto_roles existe', () => {
    assert.ok(tables.includes('auto_roles'), 'auto_roles deve existir');
  });

  test('1.2 — auto_roles tem coluna guild_id', () => {
    const cols = db.prepare('PRAGMA table_info(auto_roles)').all().map(c => c.name);
    assert.ok(cols.includes('guild_id'), 'guild_id deve existir');
  });

  test('1.3 — auto_roles tem coluna role_id', () => {
    const cols = db.prepare('PRAGMA table_info(auto_roles)').all().map(c => c.name);
    assert.ok(cols.includes('role_id'), 'role_id deve existir');
  });

  test('1.4 — auto_roles tem coluna enabled', () => {
    const cols = db.prepare('PRAGMA table_info(auto_roles)').all().map(c => c.name);
    assert.ok(cols.includes('enabled'), 'enabled deve existir');
  });
});

// =============================================================================
// BLOCO 2 — AutoRoles.mjs CRUD
// =============================================================================

describe('BLOCO 2 — AutoRoles.mjs CRUD', async () => {
  let repo;
  const GUILD = `guild_ar_crud_${Date.now()}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AutoRoles.mjs');
  });

  test('2.1 — addAutoRole cria registro com campos corretos', () => {
    const role = repo.addAutoRole(GUILD, '123456789012345678', { priority: 50 });
    assert.ok(role, 'addAutoRole deve retornar objeto');
    assert.ok(role.id, 'Deve ter id');
    assert.equal(role.guildId, GUILD, 'guildId deve ser o passado');
    assert.equal(role.roleId, '123456789012345678', 'roleId deve ser o passado');
    assert.equal(role.priority, 50, 'priority deve ser 50');
    assert.equal(role.enabled, true, 'enabled deve ser true');
  });

  test('2.2 — getAutoRole retorna auto role existente', () => {
    const role = repo.addAutoRole(GUILD, '223456789012345678', { priority: 100 });
    const found = repo.getAutoRole(GUILD, role.id);
    assert.ok(found, 'getAutoRole deve retornar o auto role');
    assert.equal(found.id, role.id, 'IDs devem ser iguais');
  });

  test('2.3 — getAutoRole retorna null para id inexistente', () => {
    const found = repo.getAutoRole(GUILD, 'inexistente');
    assert.equal(found, null, 'Deve retornar null para id inexistente');
  });

  test('2.4 — listAutoRoles retorna todos os cargos do servidor', () => {
    repo.addAutoRole(GUILD, '323456789012345678', { priority: 10 });
    repo.addAutoRole(GUILD, '423456789012345678', { priority: 20 });
    const roles = repo.listAutoRoles(GUILD);
    assert.ok(roles.length >= 2, 'Deve ter pelo menos 2 cargos');
  });

  test('2.5 — updateAutoRole altera priority', () => {
    const role = repo.addAutoRole(GUILD, '523456789012345678', { priority: 100 });
    const updated = repo.updateAutoRole(GUILD, role.id, { priority: 25 });
    assert.equal(updated.priority, 25, 'priority deve ser 25');
  });

  test('2.6 — updateAutoRole altera enabled', () => {
    const role = repo.addAutoRole(GUILD, '623456789012345678', { priority: 100 });
    const updated = repo.updateAutoRole(GUILD, role.id, { enabled: false });
    assert.equal(updated.enabled, false, 'enabled deve ser false');
  });

  test('2.7 — removeAutoRole remove o cargo', () => {
    const role = repo.addAutoRole(GUILD, '723456789012345678', { priority: 100 });
    const removed = repo.removeAutoRole(GUILD, role.id);
    assert.equal(removed, true, 'removeAutoRole deve retornar true');
    const found = repo.getAutoRole(GUILD, role.id);
    assert.equal(found, null, 'Cargo deve ser null após remoção');
  });

  test('2.8 — removeAutoRole retorna false para id inexistente', () => {
    const removed = repo.removeAutoRole(GUILD, 'inexistente');
    assert.equal(removed, false, 'Deve retornar false para id inexistente');
  });

  test('2.9 — hasAutoRole retorna true para cargo existente', () => {
    repo.addAutoRole(GUILD, '823456789012345678', { priority: 100 });
    const exists = repo.hasAutoRole(GUILD, '823456789012345678');
    assert.equal(exists, true, 'hasAutoRole deve retornar true');
  });

  test('2.10 — hasAutoRole retorna false para cargo inexistente', () => {
    const exists = repo.hasAutoRole(GUILD, 'inexistente');
    assert.equal(exists, false, 'hasAutoRole deve retornar false');
  });
});

// =============================================================================
// BLOCO 3 — AutoRoles.mjs isolamento entre guilds
// =============================================================================

describe('BLOCO 3 — AutoRoles.mjs isolamento entre guilds', async () => {
  let repo;
  const GUILDA = `guild_a_${Date.now()}`;
  const GUILDB = `guild_b_${Date.now()}`;
  const ROLE_ID = '999456789012345678';

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-isolamento-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AutoRoles.mjs');
  });

  test('3.1 — auto role de guildA não aparece em guildB', () => {
    repo.addAutoRole(GUILDA, ROLE_ID, { priority: 50 });
    const rolesA = repo.listAutoRoles(GUILDA);
    const rolesB = repo.listAutoRoles(GUILDB);
    assert.ok(rolesA.some(r => r.roleId === ROLE_ID), 'guildA deve ter o cargo');
    assert.ok(!rolesB.some(r => r.roleId === ROLE_ID), 'guildB não deve ter o cargo');
  });

  test('3.2 — getAutoRole de guildB retorna null para cargo de guildA', () => {
    const role = repo.addAutoRole(GUILDA, '888456789012345678', { priority: 50 });
    const found = repo.getAutoRole(GUILDB, role.id);
    assert.equal(found, null, 'guildB não deve encontrar cargo de guildA');
  });

  test('3.3 — removeAutoRole de guildB não afeta guildA', () => {
    const role = repo.addAutoRole(GUILDA, '777456789012345678', { priority: 50 });
    repo.removeAutoRole(GUILDB, role.id); // tentar remover de guildB
    const found = repo.getAutoRole(GUILDA, role.id);
    assert.ok(found, 'guildA ainda deve ter o cargo');
  });

  test('3.4 — UNIQUE constraint previne cargo duplicado na mesma guild', () => {
    repo.addAutoRole(GUILDA, '666456789012345678', { priority: 50 });
    const second = repo.addAutoRole(GUILDA, '666456789012345678', { priority: 75 });
    assert.equal(second, null, 'Deve retornar null para cargo duplicado');
  });
});

// =============================================================================
// BLOCO 4 — AutoRoles.mjs toggle e priorities
// =============================================================================

describe('BLOCO 4 — AutoRoles.mjs toggle e priorities', async () => {
  let repo;
  const GUILD = `guild_toggle_${Date.now()}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-toggle-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/AutoRoles.mjs');
  });

  test('4.1 — toggleAutoRole alterna enabled', () => {
    const role = repo.addAutoRole(GUILD, '555456789012345678', { priority: 50 });
    assert.equal(role.enabled, true, 'Inicialmente enabled = true');

    const toggled = repo.toggleAutoRole(GUILD, role.id);
    assert.equal(toggled.enabled, false, 'Após toggle, enabled = false');

    const toggled2 = repo.toggleAutoRole(GUILD, role.id);
    assert.equal(toggled2.enabled, true, 'Após segundo toggle, enabled = true');
  });

  test('4.2 — getActiveAutoRoles retorna apenas os ativos', () => {
    const role1 = repo.addAutoRole(GUILD, '444456789012345678', { priority: 10 });
    repo.addAutoRole(GUILD, '333456789012345678', { priority: 20 });

    // Desativar um
    repo.updateAutoRole(GUILD, role1.id, { enabled: false });

    const active = repo.getActiveAutoRoles(GUILD);
    assert.ok(!active.some(r => r.roleId === '444456789012345678'), 'Cargo desativado não deve aparecer');
  });

  test('4.3 — listAutoRoles ordena por priority crescente', () => {
    repo.addAutoRole(GUILD, '222456789012345678', { priority: 300 });
    repo.addAutoRole(GUILD, '111456789012345678', { priority: 100 });
    repo.addAutoRole(GUILD, '000456789012345678', { priority: 200 });

    const roles = repo.listAutoRoles(GUILD);
    // Pegar os 3 mais recentes (pelo ID, já que são do mesmo teste)
    const recent = roles.slice(-3);
    assert.equal(recent[0].priority, 100, 'Primeiro deve ter priority 100');
    assert.equal(recent[1].priority, 200, 'Segundo deve ter priority 200');
    assert.equal(recent[2].priority, 300, 'Terceiro deve ter priority 300');
  });
});

// =============================================================================
// BLOCO 5 — Migration 011_auto_roles
// =============================================================================

describe('BLOCO 5 — Migration 011_auto_roles', async () => {
  test('5.1 — 011_auto_roles pode ser executada', async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-mig-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const { runMigrations } = await import('../src/database/migrations.mjs');
    assert.doesNotThrow(() => runMigrations(), 'Migration deve executar sem erro');
  });

  test('5.2 — migration é idempotente', async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-mig2-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const { runMigrations } = await import('../src/database/migrations.mjs');
    assert.doesNotThrow(() => {
      runMigrations();
      runMigrations();
    }, 'Migration deve ser idempotente');
  });

  test('5.3 — Repository funciona após migration', async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-mig3-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const repo = await import('../src/database/repositories/AutoRoles.mjs');
    const guildId = `guild_mig_${Date.now()}`;

    const role = repo.addAutoRole(guildId, '123456789012345678', { priority: 50 });
    assert.ok(role, 'addAutoRole deve funcionar após migration');

    const found = repo.getAutoRole(guildId, role.id);
    assert.ok(found, 'getAutoRole deve funcionar');
  });
});

// =============================================================================
// BLOCO 6 — Permissions: SUPPORTED_MODULES contém 'autorole'
// =============================================================================

describe('BLOCO 6 — Permissions: SUPPORTED_MODULES', async () => {
  const { SUPPORTED_MODULES } = await import('../src/database/repositories/Permissions.mjs');

  test('6.1 — SUPPORTED_MODULES é array', () => {
    assert.ok(Array.isArray(SUPPORTED_MODULES), 'SUPPORTED_MODULES deve ser array');
  });

  test('6.2 — SUPPORTED_MODULES contém autorole', () => {
    assert.ok(SUPPORTED_MODULES.includes('autorole'), 'SUPPORTED_MODULES deve conter "autorole"');
  });
});

// =============================================================================
// BLOCO 7 — flow.mjs exports
// =============================================================================

describe('BLOCO 7 — flow.mjs exports', async () => {
  const mod = await import('../src/modules/autorole/flow.mjs');

  test('7.1 — openAutoRoleManager é função', () => {
    assert.equal(typeof mod.openAutoRoleManager, 'function', 'openAutoRoleManager deve ser função');
  });

  test('7.2 — handleAutoRoleComponent é função', () => {
    assert.equal(typeof mod.handleAutoRoleComponent, 'function', 'handleAutoRoleComponent deve ser função');
  });

  test('7.3 — buildAutoRoleManagerPayload é função', () => {
    assert.equal(typeof mod.buildAutoRoleManagerPayload, 'function', 'buildAutoRoleManagerPayload deve ser função');
  });

  test('7.4 — buildAutoRoleConfirmRemove é função', () => {
    assert.equal(typeof mod.buildAutoRoleConfirmRemove, 'function', 'buildAutoRoleConfirmRemove deve ser função');
  });
});

// =============================================================================
// BLOCO 8 — Permissões e auditoria integração
// =============================================================================

describe('BLOCO 8 — Permissões e auditoria integração', async () => {
  test('8.1 — logAudit pode registrar ação auto_role', async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase4-audit-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const { logAudit } = await import('../src/database/repositories/AuditLog.mjs');
    const guildId = `guild_audit_${Date.now()}`;

    const result = logAudit({
      guildId,
      actorId: 'user123',
      module: 'autorole',
      action: 'auto_role_configured',
      entity: 'auto_role',
      entityId: 'role123',
      result: 'success',
      details: { roleId: 'role123', roleName: 'TestRole' },
      source: 'admin',
    });

    assert.ok(result, 'logAudit deve registrar ação de autorole');
  });

  test('8.2 — AUDIT_SOURCE existe', async () => {
    const { AUDIT_SOURCE } = await import('../src/database/repositories/AuditLog.mjs');
    assert.ok(AUDIT_SOURCE, 'AUDIT_SOURCE deve existir');
    assert.ok(AUDIT_SOURCE.ADMIN, 'AUDIT_SOURCE.ADMIN deve existir');
    assert.ok(AUDIT_SOURCE.SYSTEM, 'AUDIT_SOURCE.SYSTEM deve existir');
  });

  test('8.3 — event guildMemberAdd exporta default', async () => {
    const mod = await import('../src/events/guildMemberAdd.mjs');
    assert.ok(mod.default, 'guildMemberAdd deve exportar default');
    assert.equal(mod.default.name, 'guildMemberAdd', 'Nome do evento deve ser guildMemberAdd');
    assert.equal(typeof mod.default.execute, 'function', 'execute deve ser função');
  });
});
