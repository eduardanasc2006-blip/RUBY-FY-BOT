/**
 * Repositório de Automações Visuais (Etapa 16)
 *
 * Gerencia CRUD de automações e seus logs de execução.
 * Cada automação pertence a um servidor (guildId) — isolamento total.
 *
 * Tabelas:
 *   automations      — definições de automações
 *   automation_logs  — histórico de execuções
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAutomation(row) {
  if (!row) return null;
  return {
    id:         row.id,
    guildId:    row.guild_id,
    name:       row.name,
    trigger:    row.trigger_type,
    conditions: JSON.parse(row.conditions ?? '[]'),
    actions:    JSON.parse(row.actions    ?? '[]'),
    enabled:    row.enabled === 1,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

// ── CRUD — Automações ─────────────────────────────────────────────────────────

export function createAutomation(guildId, { name, trigger, conditions = [], actions = [] }) {
  const db  = getDb();
  const id  = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO automations (id, guild_id, name, trigger_type, conditions, actions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, guildId, name, trigger, JSON.stringify(conditions), JSON.stringify(actions), now, now);

  return getAutomation(guildId, id);
}

export function getAutomation(guildId, id) {
  const db  = getDb();
  const row = db.prepare(
    'SELECT * FROM automations WHERE id = ? AND guild_id = ?'
  ).get(id, guildId);
  return parseAutomation(row);
}

export function listAutomations(guildId, { trigger } = {}) {
  const db = getDb();
  if (trigger) {
    const rows = db.prepare(
      'SELECT * FROM automations WHERE guild_id = ? AND trigger_type = ? ORDER BY created_at ASC'
    ).all(guildId, trigger);
    return rows.map(parseAutomation);
  }
  const rows = db.prepare(
    'SELECT * FROM automations WHERE guild_id = ? ORDER BY created_at ASC'
  ).all(guildId);
  return rows.map(parseAutomation);
}

export function listEnabledAutomations(guildId, trigger) {
  const db   = getDb();
  const rows = db.prepare(
    'SELECT * FROM automations WHERE guild_id = ? AND trigger_type = ? AND enabled = 1 ORDER BY created_at ASC'
  ).all(guildId, trigger);
  return rows.map(parseAutomation);
}

export function updateAutomation(guildId, id, patch) {
  const auto = getAutomation(guildId, id);
  if (!auto) return null;

  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);

  const name       = patch.name       ?? auto.name;
  const trigger    = patch.trigger    ?? auto.trigger;
  const conditions = patch.conditions ?? auto.conditions;
  const actions    = patch.actions    ?? auto.actions;

  db.prepare(`
    UPDATE automations
    SET name = ?, trigger_type = ?, conditions = ?, actions = ?, updated_at = ?
    WHERE id = ? AND guild_id = ?
  `).run(name, trigger, JSON.stringify(conditions), JSON.stringify(actions), now, id, guildId);

  return getAutomation(guildId, id);
}

export function enableAutomation(guildId, id) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);
  const r   = db.prepare(
    'UPDATE automations SET enabled = 1, updated_at = ? WHERE id = ? AND guild_id = ?'
  ).run(now, id, guildId);
  return r.changes > 0;
}

export function disableAutomation(guildId, id) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);
  const r   = db.prepare(
    'UPDATE automations SET enabled = 0, updated_at = ? WHERE id = ? AND guild_id = ?'
  ).run(now, id, guildId);
  return r.changes > 0;
}

export function deleteAutomation(guildId, id) {
  const db = getDb();
  const r  = db.prepare('DELETE FROM automations WHERE id = ? AND guild_id = ?').run(id, guildId);
  return r.changes > 0;
}

export function countAutomations(guildId) {
  const db  = getDb();
  const row = db.prepare('SELECT COUNT(*) as c FROM automations WHERE guild_id = ?').get(guildId);
  return row?.c ?? 0;
}

// ── CRUD — Logs ───────────────────────────────────────────────────────────────

export function logAutomationExecution(guildId, automationId, trigger, result, detail = null) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO automation_logs (automation_id, guild_id, trigger_type, result, detail, executed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(automationId, guildId, trigger, result, detail, now);
}

export function getAutomationLogs(guildId, { automationId, result, limit = 50 } = {}) {
  const db = getDb();
  if (automationId && result) {
    return db.prepare(`
      SELECT * FROM automation_logs
      WHERE guild_id = ? AND automation_id = ? AND result = ?
      ORDER BY executed_at DESC LIMIT ?
    `).all(guildId, automationId, result, limit);
  }
  if (automationId) {
    return db.prepare(`
      SELECT * FROM automation_logs WHERE guild_id = ? AND automation_id = ?
      ORDER BY executed_at DESC LIMIT ?
    `).all(guildId, automationId, limit);
  }
  if (result) {
    return db.prepare(`
      SELECT * FROM automation_logs WHERE guild_id = ? AND result = ?
      ORDER BY executed_at DESC LIMIT ?
    `).all(guildId, result, limit);
  }
  return db.prepare(`
    SELECT * FROM automation_logs WHERE guild_id = ? ORDER BY executed_at DESC LIMIT ?
  `).all(guildId, limit);
}

export function countAutomationLogs(guildId, { automationId } = {}) {
  const db = getDb();
  if (automationId) {
    const row = db.prepare(
      'SELECT COUNT(*) as c FROM automation_logs WHERE guild_id = ? AND automation_id = ?'
    ).get(guildId, automationId);
    return row?.c ?? 0;
  }
  const row = db.prepare(
    'SELECT COUNT(*) as c FROM automation_logs WHERE guild_id = ?'
  ).get(guildId);
  return row?.c ?? 0;
}
