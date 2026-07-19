/**
 * Repositório de Conexões.
 *
 * Uma conexão liga uma AÇÃO a um MODELO e a um CANAL DE DESTINO,
 * permitindo que eventos automatizados publiquem mensagens configuráveis.
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 *
 * A conexão não armazena FK para template_id porque modelos podem ser
 * excluídos independentemente; o executor trata o template ausente com
 * graciosidade.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Criação ──────────────────────────────────────────────────────────────────

/**
 * Cria uma nova conexão para o servidor.
 *
 * @param {string} guildId
 * @param {{
 *   action:          string,
 *   templateId:      string,
 *   targetChannelId: string,
 *   enabled?:        boolean,
 * }} params
 * @returns {object} Conexão criada
 */
export function createConnection(guildId, { action, templateId, targetChannelId, enabled = true }) {
  const db = getDb();
  getOrCreate(guildId); // garante que o servidor está registrado

  const id      = randomUUID();
  const enabledInt = enabled ? 1 : 0;

  db.prepare(`
    INSERT INTO connections (id, guild_id, action, template_id, target_channel_id, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, guildId, action, templateId, targetChannelId, enabledInt);

  return getConnection(guildId, id);
}

// ── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Retorna uma conexão pelo ID, isolada pelo guildId.
 * Retorna null se não encontrada ou se pertencer a outro servidor.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getConnection(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM connections WHERE id = ? AND guild_id = ?')
    .get(id, guildId);

  return row ? normalize(row) : null;
}

/**
 * Lista todas as conexões do servidor.
 * Filtra opcionalmente por ação.
 *
 * @param {string} guildId
 * @param {{ action?: string }} opts
 * @returns {object[]}
 */
export function listConnections(guildId, { action } = {}) {
  const db = getDb();

  if (action) {
    return db
      .prepare('SELECT * FROM connections WHERE guild_id = ? AND action = ? ORDER BY created_at ASC')
      .all(guildId, action)
      .map(normalize);
  }

  return db
    .prepare('SELECT * FROM connections WHERE guild_id = ? ORDER BY action ASC, created_at ASC')
    .all(guildId)
    .map(normalize);
}

/**
 * Lista apenas as conexões ativas (enabled = 1) para uma ação específica.
 * Usada internamente pelo executor para processar eventos.
 *
 * @param {string} guildId
 * @param {string} action
 * @returns {object[]}
 */
export function listActiveConnections(guildId, action) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM connections WHERE guild_id = ? AND action = ? AND enabled = 1 ORDER BY created_at ASC')
    .all(guildId, action)
    .map(normalize);
}

// ── Atualização ───────────────────────────────────────────────────────────────

/**
 * Atualiza campos de uma conexão.
 * Apenas os campos presentes em `patch` são alterados.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{
 *   action?:          string,
 *   templateId?:      string,
 *   targetChannelId?: string,
 *   enabled?:         boolean,
 * }} patch
 * @returns {object|null} Conexão atualizada, ou null se não encontrada
 */
export function updateConnection(guildId, id, patch) {
  const db = getDb();

  const existing = getConnection(guildId, id);
  if (!existing) return null;

  const action          = patch.action          ?? existing.action;
  const templateId      = patch.templateId      ?? existing.templateId;
  const targetChannelId = patch.targetChannelId ?? existing.targetChannelId;
  const enabledInt      = patch.enabled !== undefined
    ? (patch.enabled ? 1 : 0)
    : (existing.enabled ? 1 : 0);

  db.prepare(`
    UPDATE connections
       SET action = ?, template_id = ?, target_channel_id = ?, enabled = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(action, templateId, targetChannelId, enabledInt, id, guildId);

  return getConnection(guildId, id);
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove uma conexão pelo ID, isolada pelo guildId.
 * Retorna true se excluída, false se não encontrada.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteConnection(guildId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM connections WHERE id = ? AND guild_id = ?')
    .run(id, guildId);
  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/**
 * Normaliza uma linha do banco para o formato público.
 * Converte snake_case → camelCase e enabled de INTEGER para boolean.
 */
function normalize(row) {
  return {
    id:              row.id,
    guildId:         row.guild_id,
    action:          row.action,
    templateId:      row.template_id,
    targetChannelId: row.target_channel_id,
    enabled:         row.enabled === 1,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}
