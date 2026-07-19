/**
 * Repositório de Pedidos.
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 *
 * Status disponíveis:
 *   pending → awaiting_payment → paid → processing → delivered → completed
 *   Qualquer status → cancelled (exceto completed e cancelled, que são terminais)
 *
 * Campos:
 *   vendor_id   — quem criou o pedido (Discord userId)
 *   client_id   — ID Discord do cliente resolvido (null se não resolvido)
 *   cliente_raw — texto original do campo cliente
 *   produto     — nome do produto/serviço (obrigatório)
 *   valor       — valor do pedido (texto livre, opcional)
 *   ticket_id   — referência ao ticket relacionado (opcional)
 *   status      — status atual do pedido
 *   notas       — observações adicionais
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';
import { VALID_TRANSITIONS, isTerminal } from '../../modules/orders/flow.mjs';

// ── Criação ───────────────────────────────────────────────────────────────────

/**
 * Cria um novo pedido com status inicial 'pending'.
 *
 * @param {string} guildId
 * @param {{
 *   vendorId:    string,
 *   clientId?:   string|null,
 *   clienteRaw?: string|null,
 *   produto:     string,
 *   valor?:      string|null,
 *   ticketId?:   string|null,
 *   notas?:      string|null,
 * }} params
 * @returns {object} Pedido criado
 */
export function createOrder(guildId, {
  vendorId,
  clientId    = null,
  clienteRaw  = null,
  produto,
  valor       = null,
  ticketId    = null,
  notas       = null,
}) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();

  db.prepare(`
    INSERT INTO orders
      (id, guild_id, vendor_id, client_id, cliente_raw, produto, valor, ticket_id, status, notas, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, unixepoch(), unixepoch())
  `).run(id, guildId, vendorId, clientId, clienteRaw, produto, valor, ticketId, notas);

  return getOrder(guildId, id);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna um pedido pelo ID, isolado pelo guildId.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getOrder(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Lista pedidos do servidor, do mais recente para o mais antigo.
 *
 * @param {string} guildId
 * @param {{ limit?: number, status?: string, vendorId?: string }} opts
 * @returns {object[]}
 */
export function listOrders(guildId, { limit = 25, status, vendorId } = {}) {
  const db = getDb();

  if (status && vendorId) {
    return db
      .prepare('SELECT * FROM orders WHERE guild_id = ? AND status = ? AND vendor_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(guildId, status, vendorId, limit)
      .map(normalize);
  }
  if (status) {
    return db
      .prepare('SELECT * FROM orders WHERE guild_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(guildId, status, limit)
      .map(normalize);
  }
  if (vendorId) {
    return db
      .prepare('SELECT * FROM orders WHERE guild_id = ? AND vendor_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(guildId, vendorId, limit)
      .map(normalize);
  }

  return db
    .prepare('SELECT * FROM orders WHERE guild_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .all(guildId, limit)
    .map(normalize);
}

/**
 * Conta pedidos do servidor, opcionalmente filtrados por status.
 *
 * @param {string} guildId
 * @param {{ status?: string }} opts
 * @returns {number}
 */
export function countOrders(guildId, { status } = {}) {
  const db = getDb();
  if (status) {
    const row = db
      .prepare('SELECT COUNT(*) as total FROM orders WHERE guild_id = ? AND status = ?')
      .get(guildId, status);
    return row?.total ?? 0;
  }
  const row = db
    .prepare('SELECT COUNT(*) as total FROM orders WHERE guild_id = ?')
    .get(guildId);
  return row?.total ?? 0;
}

// ── Atualização de status ─────────────────────────────────────────────────────

/**
 * Atualiza o status de um pedido, validando a transição.
 *
 * Retorna:
 *   { ok: true, order }   — transição feita com sucesso
 *   { ok: false, reason } — transição inválida ou pedido não encontrado
 *
 * @param {string} guildId
 * @param {string} id
 * @param {string} newStatus
 * @returns {{ ok: boolean, order?: object, reason?: string }}
 */
export function updateOrderStatus(guildId, id, newStatus) {
  const existing = getOrder(guildId, id);
  if (!existing) return { ok: false, reason: 'not_found' };

  if (isTerminal(existing.status)) {
    return { ok: false, reason: 'terminal_status' };
  }

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { ok: false, reason: 'invalid_transition' };
  }

  const db = getDb();
  db.prepare(`
    UPDATE orders
       SET status = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(newStatus, id, guildId);

  return { ok: true, order: getOrder(guildId, id) };
}

/**
 * Cancela um pedido diretamente (sem validar transição).
 * Equivale a updateOrderStatus(guildId, id, 'cancelled') mas mais explícito.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {{ ok: boolean, order?: object, reason?: string }}
 */
export function cancelOrder(guildId, id) {
  return updateOrderStatus(guildId, id, 'cancelled');
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove um pedido do banco (exclusão permanente).
 * Retorna true se excluído, false se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteOrder(guildId, id) {
  const db     = getDb();
  const result = db
    .prepare('DELETE FROM orders WHERE id = ? AND guild_id = ?')
    .run(id, guildId);
  return result.changes > 0;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

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
    status:     row.status,
    notas:      row.notas       ?? null,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}
