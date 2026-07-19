/**
 * Repositório de Modelos Salvos.
 *
 * Todas as funções recebem `guildId` como primeiro argumento
 * para garantir isolamento completo entre servidores.
 *
 * Os dados do modelo (campo `data`) são automaticamente
 * serializados/desserializados em JSON.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Criação ──────────────────────────────────────────────────────────────────

/**
 * Cria um novo modelo para o servidor.
 *
 * @param {string} guildId
 * @param {{ name: string, description?: string, type?: string, data: object }} params
 * @returns {object} Modelo criado
 */
export function createTemplate(guildId, { name, description = null, type = 'embed', data = {} }) {
  const db = getDb();
  getOrCreate(guildId); // garante que o servidor está registrado

  const id = randomUUID();

  db.prepare(`
    INSERT INTO templates (id, guild_id, name, description, type, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, guildId, name, description, type, JSON.stringify(data));

  return getTemplate(guildId, id);
}

// ── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Retorna um modelo pelo ID, isolado pelo guildId.
 * Retorna null se não encontrado ou pertencer a outro servidor.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getTemplate(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM templates WHERE id = ? AND guild_id = ?')
    .get(id, guildId);

  return row ? deserialize(row) : null;
}

/**
 * Lista todos os modelos do servidor, ordenados por nome.
 *
 * @param {string} guildId
 * @returns {object[]}
 */
export function listTemplates(guildId) {
  const db   = getDb();
  const rows = db
    .prepare('SELECT * FROM templates WHERE guild_id = ? ORDER BY name ASC')
    .all(guildId);

  return rows.map(deserialize);
}

// ── Atualização ───────────────────────────────────────────────────────────────

/**
 * Atualiza campos do modelo.
 * Apenas os campos fornecidos em `patch` são alterados.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ name?: string, description?: string, data?: object }} patch
 * @returns {object|null} Modelo atualizado, ou null se não encontrado
 */
export function updateTemplate(guildId, id, patch) {
  const db = getDb();

  const existing = getTemplate(guildId, id);
  if (!existing) return null;

  const name        = patch.name        ?? existing.name;
  const description = patch.description !== undefined ? patch.description : existing.description;
  const data        = patch.data        ?? existing.data;

  db.prepare(`
    UPDATE templates
       SET name = ?, description = ?, data = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(name, description, JSON.stringify(data), id, guildId);

  return getTemplate(guildId, id);
}

// ── Duplicação ────────────────────────────────────────────────────────────────

/**
 * Duplica um modelo existente, criando um novo com nome "— Cópia".
 * O original não é alterado. A cópia recebe um novo UUID.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null} Novo modelo criado, ou null se o original não existir
 */
export function duplicateTemplate(guildId, id) {
  const original = getTemplate(guildId, id);
  if (!original) return null;

  return createTemplate(guildId, {
    name:        `${original.name} — Cópia`,
    description: original.description,
    type:        original.type,
    data:        original.data,
  });
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove um modelo pelo ID, isolado pelo guildId.
 * Retorna true se excluído, false se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteTemplate(guildId, id) {
  const db = getDb();

  const result = db
    .prepare('DELETE FROM templates WHERE id = ? AND guild_id = ?')
    .run(id, guildId);

  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/** Desserializa o campo `data` de uma linha do banco. */
function deserialize(row) {
  let data = {};
  try { data = JSON.parse(row.data); } catch { /* mantém {} */ }
  return { ...row, data };
}
