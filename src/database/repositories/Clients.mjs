/**
 * Repositório de Clientes.
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 *
 * Clientes Discord (com discord_id) são únicos por servidor — a constraint
 * UNIQUE(guild_id, discord_id) impede duplicatas (SQLite ignora NULLs,
 * portanto múltiplos clientes externos sem Discord são permitidos).
 *
 * Campos:
 *   display_name — nome de exibição (obrigatório)
 *   discord_id   — ID Discord resolvido (opcional)
 *   email        — e-mail de contato (opcional)
 *   phone        — telefone (opcional)
 *   notas        — observações (opcional)
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Criação ───────────────────────────────────────────────────────────────────

/**
 * Cria um novo cliente.
 * Lança erro se tentar registrar um discord_id já existente no servidor.
 *
 * @param {string} guildId
 * @param {{
 *   displayName: string,
 *   discordId?:  string|null,
 *   email?:      string|null,
 *   phone?:      string|null,
 *   notas?:      string|null,
 * }} params
 * @returns {object} Cliente criado
 */
export function createClient(guildId, {
  displayName,
  discordId = null,
  email     = null,
  phone     = null,
  notas     = null,
}) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();

  db.prepare(`
    INSERT INTO clients
      (id, guild_id, display_name, discord_id, email, phone, notas, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, guildId, displayName, discordId, email, phone, notas);

  return getClient(guildId, id);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna um cliente pelo ID interno, isolado por guildId.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getClient(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM clients WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Busca um cliente pelo discord_id (único por servidor).
 *
 * @param {string} guildId
 * @param {string} discordId
 * @returns {object|null}
 */
export function getClientByDiscordId(guildId, discordId) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM clients WHERE guild_id = ? AND discord_id = ?')
    .get(guildId, discordId);
  return row ? normalize(row) : null;
}

/**
 * Lista clientes do servidor, do mais recente para o mais antigo.
 * Suporta paginação com LIMIT e OFFSET.
 *
 * @param {string} guildId
 * @param {{ limit?: number, offset?: number, search?: string }} opts
 * @returns {object[]}
 */
export function listClients(guildId, { limit = 1000, offset = 0, search } = {}) {
  const db = getDb();

  if (search) {
    const q = `%${search}%`;
    return db
      .prepare(`
        SELECT * FROM clients
         WHERE guild_id = ?
           AND (display_name LIKE ? OR email LIKE ? OR discord_id LIKE ?)
         ORDER BY created_at DESC, rowid DESC
         LIMIT ? OFFSET ?
      `)
      .all(guildId, q, q, q, limit, offset)
      .map(normalize);
  }

  return db
    .prepare('SELECT * FROM clients WHERE guild_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?')
    .all(guildId, limit, offset)
    .map(normalize);
}

/**
 * Conta clientes do servidor.
 *
 * @param {string} guildId
 * @returns {number}
 */
export function countClients(guildId) {
  const db  = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as total FROM clients WHERE guild_id = ?')
    .get(guildId);
  return row?.total ?? 0;
}

// ── Atualização ───────────────────────────────────────────────────────────────

/**
 * Atualiza os dados de um cliente.
 * Apenas os campos fornecidos são alterados (patch parcial).
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{
 *   displayName?: string,
 *   discordId?:  string|null,
 *   email?:      string|null,
 *   phone?:      string|null,
 *   notas?:      string|null,
 * }} patch
 * @returns {object|null} Cliente atualizado, ou null se não encontrado
 */
export function updateClient(guildId, id, patch) {
  const existing = getClient(guildId, id);
  if (!existing) return null;

  const db = getDb();
  db.prepare(`
    UPDATE clients
       SET display_name = COALESCE(?, display_name),
           discord_id   = CASE WHEN ? THEN ? ELSE discord_id END,
           email        = CASE WHEN ? THEN ? ELSE email END,
           phone        = CASE WHEN ? THEN ? ELSE phone END,
           notas        = CASE WHEN ? THEN ? ELSE notas END,
           updated_at   = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(
    patch.displayName ?? null,
    patch.discordId  !== undefined ? 1 : 0, patch.discordId  ?? null,
    patch.email      !== undefined ? 1 : 0, patch.email      ?? null,
    patch.phone      !== undefined ? 1 : 0, patch.phone      ?? null,
    patch.notas      !== undefined ? 1 : 0, patch.notas      ?? null,
    id, guildId,
  );

  return getClient(guildId, id);
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove um cliente. Retorna true se excluído, false se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteClient(guildId, id) {
  const db     = getDb();
  const result = db
    .prepare('DELETE FROM clients WHERE id = ? AND guild_id = ?')
    .run(id, guildId);
  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

function normalize(row) {
  return {
    id:          row.id,
    guildId:     row.guild_id,
    displayName: row.display_name,
    discordId:   row.discord_id  ?? null,
    email:       row.email       ?? null,
    phone:       row.phone       ?? null,
    notas:       row.notas       ?? null,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}
