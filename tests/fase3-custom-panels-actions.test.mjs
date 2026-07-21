/**
 * Testes da Fase 3 — Botões e Ações de Painéis Personalizados
 *
 * Cobertura:
 *   BLOCO 1  — botValidator.mjs exports e constantes    (8 testes) — puro
 *   BLOCO 2  — flow.mjs: validateActionData             (6 testes) — puro
 *   BLOCO 3  — VALID_ACTION_TYPES contém ações de cargo  (3 testes) — puro
 *   BLOCO 4  — Auditoria: logAudit para ações de cargo  (3 testes) — DB
 *
 * Total: 20 testes
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// BLOCO 1 — botValidator.mjs exports
// =============================================================================

describe('BLOCO 1 — botValidator: exports', async () => {
  const mod = await import('../src/modules/custompanels/botValidator.mjs');

  test('1.1 — checkBotManageRolesPermission é função', () => {
    assert.equal(typeof mod.checkBotManageRolesPermission, 'function');
  });

  test('1.2 — validateRole é função', () => {
    assert.equal(typeof mod.validateRole, 'function');
  });

  test('1.3 — safeAddRole é função', () => {
    assert.equal(typeof mod.safeAddRole, 'function');
  });

  test('1.4 — safeRemoveRole é função', () => {
    assert.equal(typeof mod.safeRemoveRole, 'function');
  });

  test('1.5 — ERROR_MESSAGES é objeto', () => {
    assert.equal(typeof mod.ERROR_MESSAGES, 'object');
  });

  test('1.6 — BOT_NO_PERMISSION existe', () => {
    assert.ok(mod.ERROR_MESSAGES.BOT_NO_PERMISSION);
  });

  test('1.7 — BOT_ROLE_NOT_MANAGEABLE existe', () => {
    assert.ok(mod.ERROR_MESSAGES.BOT_ROLE_NOT_MANAGEABLE);
  });

  test('1.8 — SUCCESS_GIVE é função', () => {
    assert.equal(typeof mod.ERROR_MESSAGES.SUCCESS_GIVE, 'function');
  });
});

// =============================================================================
// BLOCO 2 — flow.mjs: validateActionData
// =============================================================================

describe('BLOCO 2 — flow.mjs: validateActionData', async () => {
  const mod = await import('../src/modules/custompanels/flow.mjs');
  const validateActionData = mod.validateActionData;

  test('2.1 — actionType inválido retorna invalid', () => {
    const result = validateActionData('invalid_action', {});
    assert.equal(result.valid, false);
    assert.ok(result.reason);
  });

  test('2.2 — message sem content retorna invalid', () => {
    const result = validateActionData('message', {});
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes('content'));
  });

  test('2.3 — message com content retorna valid', () => {
    const result = validateActionData('message', { content: 'Hello' });
    assert.equal(result.valid, true);
  });

  test('2.4 — give_role sem role_id retorna invalid', () => {
    const result = validateActionData('give_role', {});
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes('role_id'));
  });

  test('2.5 — give_role com role_id retorna valid', () => {
    const result = validateActionData('give_role', { role_id: '123' });
    assert.equal(result.valid, true);
  });

  test('2.6 — open_ticket sempre válido', () => {
    const result = validateActionData('open_ticket', {});
    assert.equal(result.valid, true);
  });
});

// =============================================================================
// BLOCO 3 — VALID_ACTION_TYPES contém ações de cargo
// =============================================================================

describe('BLOCO 3 — CustomPanels: VALID_ACTION_TYPES', async () => {
  const mod = await import('../src/database/repositories/CustomPanels.mjs');

  test('3.1 — VALID_ACTION_TYPES é array', () => {
    assert.ok(Array.isArray(mod.VALID_ACTION_TYPES));
  });

  test('3.2 — contém give_role', () => {
    assert.ok(mod.VALID_ACTION_TYPES.includes('give_role'));
  });

  test('3.3 — contém take_role e toggle_role', () => {
    assert.ok(mod.VALID_ACTION_TYPES.includes('take_role'));
    assert.ok(mod.VALID_ACTION_TYPES.includes('toggle_role'));
  });
});

// =============================================================================
// BLOCO 4 — Auditoria: logAudit para ações de cargo
// =============================================================================

describe('BLOCO 4 — Auditoria: logAudit para ações de cargo', async () => {
  const auditMod = await import('../src/database/repositories/AuditLog.mjs');

  test('4.1 — AUDIT_SOURCE existe e tem discord_event', () => {
    const { AUDIT_SOURCE } = auditMod;
    assert.ok(AUDIT_SOURCE);
    assert.ok(Object.values(AUDIT_SOURCE).includes('discord_event'));
  });

  test('4.2 — logAudit pode registrar ação com module painel', async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase3-audit-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    const { logAudit } = await import('../src/database/repositories/AuditLog.mjs');
    const guildId = `guild_audit_${Date.now()}`;

    const result = logAudit({
      guildId,
      actorId: 'user123',
      module: 'painel',
      action: 'role_give_success',
      entity: 'role',
      entityId: 'role456',
      result: 'success',
      source: 'discord_event',
    });

    assert.ok(result);
  });

  test('4.3 — AUDIT_RESULT existe', () => {
    const { AUDIT_RESULT } = auditMod;
    assert.ok(AUDIT_RESULT);
    assert.ok(AUDIT_RESULT.SUCCESS);
    assert.ok(AUDIT_RESULT.ERROR);
    assert.ok(AUDIT_RESULT.SKIPPED);
  });
});
