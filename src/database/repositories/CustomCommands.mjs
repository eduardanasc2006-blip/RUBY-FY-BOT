/**
 * Repositório de Comandos Personalizados.
 *
 * Armazena comandos personalizados por servidor (guild), permitindo
 * que administradores criem comandos como /pix, /regras, /horario.
 *
 * Regras de isolamento:
 *   - Cada comando pertence exclusivamente a um guild_id.
 *   - Dois servidores podem ter comandos com o mesmo nome sem conflito.
 *   - No mesmo servidor, nomes são únicos (UNIQUE guild_id, name).
 *
 * Conteúdo suportado:
 *   - text: texto simples com suporte a variáveis
 *   - embed: objeto de embed do Discord
 *
 * Todas as funções recebem `guildId` como primeiro argumento.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Tipos de conteúdo ─────────────────────────────────────────────────────────

export const CONTENT_TYPES = {
  TEXT:   'text',
  EMBED:  'embed',
};

// ── Criação ───────────────────────────────────────────────────────────────────

/**
 * Cria um novo comando personalizado para o servidor.
 * Lança erro se o nome já existir no mesmo servidor.
 *
 * @param {string} guildId
 * @param {{ name: string, description?: string, contentType: string, contentData: object }} params
 * @returns {object} Comando criado
 */
export function createCommand(guildId, { name, description = null, contentType = CONTENT_TYPES.TEXT, contentData = {} }) {
  const db = getDb();
  getOrCreate(guildId); // garante que o servidor está registrado

  const id = randomUUID();

  db.prepare(`
    INSERT INTO custom_commands
      (id, guild_id, name, description, content_type, content_data, enabled, use_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, unixepoch(), unixepoch())
  `).run(id, guildId, name, description, contentType, JSON.stringify(contentData));

  return getCommand(guildId, id);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna um comando pelo ID, isolado pelo guildId.
 * Retorna null se não encontrado ou pertencer a outro servidor.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getCommand(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM custom_commands WHERE id = ? AND guild_id = ?')
    .get(id, guildId);

  return row ? deserialize(row) : null;
}

/**
 * Retorna um comando pelo nome, isolado pelo guildId.
 * Retorna null se não encontrado.
 *
 * @param {string} guildId
 * @param {string} name
 * @returns {object|null}
 */
export function getCommandByName(guildId, name) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND LOWER(name) = LOWER(?)')
    .get(guildId, name);

  return row ? deserialize(row) : null;
}

/**
 * Lista todos os comandos do servidor, ordenados por nome.
 *
 * @param {string} guildId
 * @param {{ enabledOnly?: boolean }} [options]
 * @returns {object[]}
 */
export function listCommands(guildId, { enabledOnly = false } = {}) {
  const db   = getDb();
  let query  = 'SELECT * FROM custom_commands WHERE guild_id = ?';
  const args = [guildId];

  if (enabledOnly) {
    query += ' AND enabled = 1';
  }

  query += ' ORDER BY name ASC';
  const rows = db.prepare(query).all(...args);

  return rows.map(deserialize);
}

/**
 * Conta comandos do servidor.
 *
 * @param {string} guildId
 * @param {{ enabledOnly?: boolean }} [options]
 * @returns {number}
 */
export function countCommands(guildId, { enabledOnly = false } = {}) {
  const db   = getDb();
  let query  = 'SELECT COUNT(*) as total FROM custom_commands WHERE guild_id = ?';
  const args = [guildId];

  if (enabledOnly) {
    query += ' AND enabled = 1';
  }

  return db.prepare(query).get(...args)?.total ?? 0;
}

/**
 * Verifica se um comando com o nome dado já existe no servidor.
 *
 * @param {string} guildId
 * @param {string} name
 * @returns {boolean}
 */
export function existsCommand(guildId, name) {
  return getCommandByName(guildId, name) !== null;
}

// ── Atualização ───────────────────────────────────────────────────────────────

/**
 * Atualiza um comando.
 * Retorna null se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ name?: string, description?: string, contentType?: string, contentData?: object }} patch
 * @returns {object|null}
 */
export function updateCommand(guildId, id, patch) {
  const db      = getDb();
  const current = getCommand(guildId, id);
  if (!current) return null;

  const fields = [];
  const values  = [];

  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    fields.push('description = ?');
    values.push(patch.description);
  }
  if (patch.contentType !== undefined) {
    fields.push('content_type = ?');
    values.push(patch.contentType);
  }
  if (patch.contentData !== undefined) {
    fields.push('content_data = ?');
    values.push(JSON.stringify(patch.contentData));
  }

  if (fields.length === 0) return current;

  fields.push('updated_at = unixepoch()');
  values.push(id, guildId);

  db.prepare(`
    UPDATE custom_commands
       SET ${fields.join(', ')}
     WHERE id = ? AND guild_id = ?
  `).run(...values);

  return getCommand(guildId, id);
}

/**
 * Ativa ou desativa um comando.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {boolean} enabled
 * @returns {object|null}
 */
export function setCommandEnabled(guildId, id, enabled) {
  const db = getDb();

  const result = db.prepare(`
    UPDATE custom_commands
       SET enabled = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(enabled ? 1 : 0, id, guildId);

  if (result.changes === 0) return null;
  return getCommand(guildId, id);
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove um comando pelo ID, isolado pelo guildId.
 * Retorna true se excluído, false se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteCommand(guildId, id) {
  const db = getDb();

  const result = db
    .prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?')
    .run(id, guildId);

  return result.changes > 0;
}

// ── Contador de uso ───────────────────────────────────────────────────────────

/**
 * Incrementa o contador de uso de um comando.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function incrementUseCount(guildId, id) {
  const db = getDb();

  const result = db.prepare(`
    UPDATE custom_commands
       SET use_count = use_count + 1
     WHERE id = ? AND guild_id = ?
  `).run(id, guildId);

  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/** Normaliza uma linha do banco para camelCase. */
function deserialize(row) {
  let contentData;
  try {
    contentData = JSON.parse(row.content_data);
  } catch {
    contentData = {};
  }

  return {
    id:           row.id,
    guildId:      row.guild_id,
    name:         row.name,
    description:  row.description,
    contentType:  row.content_type,
    contentData,
    enabled:      row.enabled === 1,
    useCount:     row.use_count,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}
