/**
 * Repositório de Cargos Automáticos (Fase 4).
 *
 * Gerencia a configuração de cargos que serão atribuídos automaticamente
 * quando um novo membro entrar no servidor.
 *
 * Todas as funções recebem guildId para garantir isolamento entre servidores.
 */

import { randomUUID } from 'node:crypto';
import { getDb }      from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Prioridade padrão para novos cargos automáticos. */
export const DEFAULT_PRIORITY = 100;

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Adiciona um cargo automático.
 *
 * @param {string} guildId
 * @param {string} roleId
 * @param {{ priority?: number }} opts
 * @returns {{ id: string, guildId: string, roleId: string, priority: number, enabled: number, createdAt: number, updatedAt: number }|null}
 */
export function addAutoRole(guildId, roleId, { priority = DEFAULT_PRIORITY } = {}) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();

  try {
    db.prepare(`
      INSERT INTO auto_roles (id, guild_id, role_id, priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, unixepoch(), unixepoch())
    `).run(id, guildId, roleId, priority);

    return getAutoRole(guildId, id);
  } catch (err) {
    // UNIQUE constraint violation = cargo já existe
    if (err?.message?.includes('UNIQUE')) return null;
    throw err;
  }
}

/**
 * Retorna um cargo automático pelo ID.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getAutoRole(guildId, id) {
  const row = getDb()
    .prepare('SELECT * FROM auto_roles WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Lista todos os cargos automáticos de um servidor.
 *
 * @param {string} guildId
 * @param {{ enabled?: boolean }} opts
 * @returns {object[]}
 */
export function listAutoRoles(guildId, { enabled } = {}) {
  const db    = getDb();
  let sql     = 'SELECT * FROM auto_roles WHERE guild_id = ?';
  const args  = [guildId];

  if (enabled !== undefined) {
    sql += ' AND enabled = ?';
    args.push(enabled ? 1 : 0);
  }

  sql += ' ORDER BY priority ASC, created_at ASC';

  return db.prepare(sql).all(...args).map(normalize);
}

/**
 * Lista cargos automáticos ativos para um servidor (ordenados por prioridade).
 * Usado pelo evento guildMemberAdd.
 *
 * @param {string} guildId
 * @returns {object[]}
 */
export function getActiveAutoRoles(guildId) {
  return listAutoRoles(guildId, { enabled: true });
}

/**
 * Atualiza um cargo automático.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ priority?: number, enabled?: boolean }} patch
 * @returns {object|null}
 */
export function updateAutoRole(guildId, id, patch) {
  const db       = getDb();
  const existing = getAutoRole(guildId, id);
  if (!existing) return null;

  const setClauses = ['updated_at = unixepoch()'];
  const vals       = [];

  if ('priority' in patch) {
    setClauses.push('priority = ?');
    vals.push(patch.priority ?? DEFAULT_PRIORITY);
  }

  if ('enabled' in patch) {
    setClauses.push('enabled = ?');
    vals.push(patch.enabled ? 1 : 0);
  }

  vals.push(id, guildId);
  db.prepare(`UPDATE auto_roles SET ${setClauses.join(', ')} WHERE id = ? AND guild_id = ?`).run(...vals);

  return getAutoRole(guildId, id);
}

/**
 * Remove um cargo automático.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function removeAutoRole(guildId, id) {
  const changes = getDb()
    .prepare('DELETE FROM auto_roles WHERE id = ? AND guild_id = ?')
    .run(id, guildId).changes;
  return changes > 0;
}

/**
 * Alterna o estado enabled de um cargo automático.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function toggleAutoRole(guildId, id) {
  const existing = getAutoRole(guildId, id);
  if (!existing) return null;

  return updateAutoRole(guildId, id, { enabled: !existing.enabled });
}

/**
 * Verifica se um cargo automático já existe para um servidor.
 *
 * @param {string} guildId
 * @param {string} roleId
 * @returns {boolean}
 */
export function hasAutoRole(guildId, roleId) {
  const row = getDb()
    .prepare('SELECT 1 FROM auto_roles WHERE guild_id = ? AND role_id = ?')
    .get(guildId, roleId);
  return !!row;
}

// ── Utilitário ────────────────────────────────────────────────────────────────

/**
 * Normaliza uma linha do banco para objeto.
 *
 * @param {object} row
 * @returns {object}
 */
function normalize(row) {
  return {
    id:        row.id,
    guildId:   row.guild_id,
    roleId:    row.role_id,
    priority:  row.priority,
    enabled:   !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
