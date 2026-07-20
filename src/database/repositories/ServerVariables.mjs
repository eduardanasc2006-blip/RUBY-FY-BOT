/**
 * Repositório de Variáveis de Servidor.
 *
 * Armazena variáveis personalizadas por servidor (guild), permitindo
 * que administradores criem placeholders como {pix}, {loja}, etc.
 *
 * Regras de isolamento:
 *   - Cada variável pertence exclusivamente a um guild_id.
 *   - Dois servidores podem ter variáveis com o mesmo nome sem conflito.
 *   - No mesmo servidor, nomes são únicos (UNIQUE guild_id, name).
 *
 * Todas as funções recebem `guildId` como primeiro argumento.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Criação ───────────────────────────────────────────────────────────────────

/**
 * Cria uma nova variável para o servidor.
 * Lança erro se o nome já existir no mesmo servidor.
 *
 * @param {string} guildId
 * @param {{ name: string, value: string }} params
 * @returns {object} Variável criada
 */
export function createServerVariable(guildId, { name, value }) {
  const db = getDb();
  getOrCreate(guildId); // garante que o servidor está registrado

  const id = randomUUID();

  db.prepare(`
    INSERT INTO server_variables (id, guild_id, name, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, guildId, name, value);

  return getServerVariable(guildId, id);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna uma variável pelo ID, isolada pelo guildId.
 * Retorna null se não encontrada ou pertencer a outro servidor.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getServerVariable(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM server_variables WHERE id = ? AND guild_id = ?')
    .get(id, guildId);

  return row ? deserialize(row) : null;
}

/**
 * Retorna uma variável pelo nome, isolada pelo guildId.
 * Retorna null se não encontrada.
 *
 * @param {string} guildId
 * @param {string} name
 * @returns {object|null}
 */
export function getServerVariableByName(guildId, name) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM server_variables WHERE guild_id = ? AND name = ?')
    .get(guildId, name);

  return row ? deserialize(row) : null;
}

/**
 * Lista todas as variáveis do servidor, ordenadas por nome.
 *
 * @param {string} guildId
 * @returns {object[]}
 */
export function listServerVariables(guildId) {
  const db   = getDb();
  const rows = db
    .prepare('SELECT * FROM server_variables WHERE guild_id = ? ORDER BY name ASC')
    .all(guildId);

  return rows.map(deserialize);
}

/**
 * Conta variáveis do servidor.
 *
 * @param {string} guildId
 * @returns {number}
 */
export function countServerVariables(guildId) {
  const db = getDb();
  return db
    .prepare('SELECT COUNT(*) as total FROM server_variables WHERE guild_id = ?')
    .get(guildId)?.total ?? 0;
}

/**
 * Verifica se uma variável com o nome dado já existe no servidor.
 *
 * @param {string} guildId
 * @param {string} name
 * @returns {boolean}
 */
export function existsServerVariable(guildId, name) {
  return getServerVariableByName(guildId, name) !== null;
}

// ── Atualização ───────────────────────────────────────────────────────────────

/**
 * Atualiza o valor de uma variável.
 * O nome não pode ser alterado (chave de negócio).
 * Retorna null se não encontrada.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ value: string }} patch
 * @returns {object|null}
 */
export function updateServerVariable(guildId, id, { value }) {
  const db = getDb();

  const existing = getServerVariable(guildId, id);
  if (!existing) return null;

  db.prepare(`
    UPDATE server_variables
       SET value = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(value, id, guildId);

  return getServerVariable(guildId, id);
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove uma variável pelo ID, isolada pelo guildId.
 * Retorna true se excluída, false se não encontrada.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteServerVariable(guildId, id) {
  const db = getDb();

  const result = db
    .prepare('DELETE FROM server_variables WHERE id = ? AND guild_id = ?')
    .run(id, guildId);

  return result.changes > 0;
}

// ── Carregamento em lote ──────────────────────────────────────────────────────

/**
 * Retorna um mapa { name → value } de todas as variáveis do servidor.
 * Utilizado por resolveVariables para injetar variáveis no contexto.
 *
 * @param {string} guildId
 * @returns {Record<string, string>}
 */
export function loadServerVariablesMap(guildId) {
  const list = listServerVariables(guildId);
  const map  = {};
  for (const v of list) {
    map[v.name] = v.value;
  }
  return map;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/** Normaliza uma linha do banco para camelCase. */
function deserialize(row) {
  return {
    id:        row.id,
    guildId:   row.guild_id,
    name:      row.name,
    value:     row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
