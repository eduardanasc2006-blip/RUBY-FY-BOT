/**
 * Repositório de Provas de Venda.
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 *
 * Campos:
 *   vendor_id   — quem registrou a prova (Discord userId)
 *   client_id   — ID do cliente Discord (null se não resolvido)
 *   cliente_raw — texto original do campo cliente (null se client_id foi resolvido)
 *   produto     — nome do produto/serviço
 *   valor       — valor da venda (texto livre)
 *   ticket_id   — referência opcional ao ticket relacionado
 *   notas       — observações adicionais
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Criação ───────────────────────────────────────────────────────────────────

/**
 * Cria uma nova prova de venda.
 *
 * @param {string} guildId
 * @param {{
 *   vendorId:   string,
 *   clientId?:  string|null,
 *   clienteRaw?: string|null,
 *   produto?:   string|null,
 *   valor?:     string|null,
 *   ticketId?:  string|null,
 *   notas?:     string|null,
 * }} params
 * @returns {object} Prova criada
 */
export function createProof(guildId, {
  vendorId,
  clientId    = null,
  clienteRaw  = null,
  produto     = null,
  valor       = null,
  ticketId    = null,
  notas       = null,
}) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();

  db.prepare(`
    INSERT INTO proofs
      (id, guild_id, vendor_id, client_id, cliente_raw, produto, valor, ticket_id, notas, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(id, guildId, vendorId, clientId, clienteRaw, produto, valor, ticketId, notas);

  return getProof(guildId, id);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna uma prova pelo ID, isolada pelo guildId.
 * Retorna null se não encontrada ou pertencer a outro servidor.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getProof(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM proofs WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Lista provas do servidor, da mais recente para a mais antiga.
 *
 * @param {string} guildId
 * @param {{ limit?: number, vendorId?: string }} opts
 * @returns {object[]}
 */
export function listProofs(guildId, { limit = 20, vendorId } = {}) {
  const db = getDb();

  if (vendorId) {
    return db
      .prepare('SELECT * FROM proofs WHERE guild_id = ? AND vendor_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(guildId, vendorId, limit)
      .map(normalize);
  }

  return db
    .prepare('SELECT * FROM proofs WHERE guild_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .all(guildId, limit)
    .map(normalize);
}

/**
 * Conta o total de provas do servidor.
 *
 * @param {string} guildId
 * @returns {number}
 */
export function countProofs(guildId) {
  const db  = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as total FROM proofs WHERE guild_id = ?')
    .get(guildId);
  return row?.total ?? 0;
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove uma prova pelo ID, isolada pelo guildId.
 * Retorna true se excluída, false se não encontrada.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteProof(guildId, id) {
  const db     = getDb();
  const result = db
    .prepare('DELETE FROM proofs WHERE id = ? AND guild_id = ?')
    .run(id, guildId);
  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/** Normaliza uma linha do banco para o formato canônico do repositório. */
function normalize(row) {
  return {
    id:         row.id,
    guildId:    row.guild_id,
    vendorId:   row.vendor_id,
    clientId:   row.client_id   ?? null,
    clienteRaw: row.cliente_raw ?? null,
    produto:    row.produto     ?? null,
    valor:      row.valor       ?? null,
    ticketId:   row.ticket_id   ?? null,
    notas:      row.notas       ?? null,
    createdAt:  row.created_at,
  };
}
