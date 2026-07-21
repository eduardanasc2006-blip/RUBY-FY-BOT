/**
 * Repositório de Tickets.
 *
 * Divide-se em duas responsabilidades:
 *
 * 1. CONFIGURAÇÃO do sistema de tickets (via guild_settings, module='tickets'):
 *    - enabled, category_id, log_channel_id, support_role_id, intro_message
 *
 * 2. INSTÂNCIAS de tickets abertos (via tabela 'tickets'):
 *    - createTicket / getTicket / getTicketByChannel / getOpenTicketByUser
 *    - listTickets / closeTicket / countOpenTickets
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate, getAllSettings, setSetting } from './GuildConfig.mjs';

const MODULE = 'tickets';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna a configuração completa do sistema de tickets de um servidor.
 *
 * @param {string} guildId
 * @returns {{
 *   enabled: boolean,
 *   category_id: string|null,
 *   log_channel_id: string|null,
 *   support_role_id: string|null,
 *   intro_message: string|null,
 *   panel_channel_id: string|null,
 *   panel_message_id: string|null,
 * }}
 */
export function getTicketConfig(guildId) {
  const raw = getAllSettings(guildId, MODULE);
  return {
    enabled:          raw.enabled          ?? false,
    category_id:      raw.category_id      ?? null,
    log_channel_id:   raw.log_channel_id   ?? null,
    support_role_id:  raw.support_role_id  ?? null,
    intro_message:    raw.intro_message    ?? null,
    panel_channel_id: raw.panel_channel_id ?? null,
    panel_message_id: raw.panel_message_id ?? null,
  };
}

/**
 * Salva um ou mais campos da configuração de tickets.
 * Apenas os campos presentes em `patch` são alterados.
 *
 * @param {string} guildId
 * @param {{
 *   enabled?:           boolean,
 *   category_id?:       string|null,
 *   log_channel_id?:    string|null,
 *   support_role_id?:   string|null,
 *   intro_message?:     string|null,
 *   panel_channel_id?:  string|null,
 *   panel_message_id?:  string|null,
 * }} patch
 */
export function setTicketConfig(guildId, patch) {
  getOrCreate(guildId);
  const allowed = [
    'enabled', 'category_id', 'log_channel_id', 'support_role_id',
    'intro_message', 'panel_channel_id', 'panel_message_id',
  ];
  for (const key of allowed) {
    if (key in patch) {
      setSetting(guildId, MODULE, key, patch[key]);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INSTÂNCIAS DE TICKETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria um novo ticket aberto.
 *
 * @param {string} guildId
 * @param {{ channelId: string, userId: string }} params
 * @returns {object} Ticket criado
 */
export function createTicket(guildId, { channelId, userId }) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();
  db.prepare(`
    INSERT INTO tickets (id, guild_id, channel_id, user_id, status, created_at)
    VALUES (?, ?, ?, ?, 'open', unixepoch())
  `).run(id, guildId, channelId, userId);

  return getTicket(guildId, id);
}

/**
 * Retorna um ticket pelo ID, isolado pelo guildId.
 * Retorna null se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getTicket(guildId, id) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM tickets WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Retorna o ticket de um usuário com status 'open' nessa guild.
 * Um usuário só pode ter um ticket aberto por servidor.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {object|null}
 */
export function getOpenTicketByUser(guildId, userId) {
  const db  = getDb();
  const row = db
    .prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1")
    .get(guildId, userId);
  return row ? normalize(row) : null;
}

/**
 * Retorna o ticket associado a um canal de ticket.
 * Útil para encontrar o ticket quando o usuário clica "Fechar Ticket" no canal.
 *
 * @param {string} guildId
 * @param {string} channelId
 * @returns {object|null}
 */
export function getTicketByChannel(guildId, channelId) {
  const db  = getDb();
  const row = db
    .prepare('SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?')
    .get(guildId, channelId);
  return row ? normalize(row) : null;
}

/**
 * Lista tickets do servidor. Filtra opcionalmente por status.
 * Suporta paginação com LIMIT e OFFSET.
 *
 * @param {string} guildId
 * @param {{ status?: 'open'|'closed', limit?: number, offset?: number }} opts
 * @returns {object[]}
 */
export function listTickets(guildId, { status, limit = 1000, offset = 0 } = {}) {
  const db = getDb();
  if (status) {
    return db
      .prepare('SELECT * FROM tickets WHERE guild_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(guildId, status, limit, offset)
      .map(normalize);
  }
  return db
      .prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(guildId, limit, offset)
      .map(normalize);
}

/**
 * Conta quantos tickets estão abertos no servidor.
 * @param {string} guildId
 * @returns {number}
 */
export function countOpenTickets(guildId) {
  const db  = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as total FROM tickets WHERE guild_id = ? AND status = 'open'")
    .get(guildId);
  return row?.total ?? 0;
}

/**
 * Conta tickets por status (ou todos se status omitido).
 * Mais eficiente que listTickets(...).length para grandes volumes.
 *
 * @param {string} guildId
 * @param {{ status?: 'open'|'closed' }} opts
 * @returns {number}
 */
export function countTickets(guildId, { status } = {}) {
  const db = getDb();
  if (status) {
    const row = db
      .prepare('SELECT COUNT(*) as total FROM tickets WHERE guild_id = ? AND status = ?')
      .get(guildId, status);
    return row?.total ?? 0;
  }
  const row = db
    .prepare('SELECT COUNT(*) as total FROM tickets WHERE guild_id = ?')
    .get(guildId);
  return row?.total ?? 0;
}

/**
 * Fecha um ticket, registrando quem fechou e quando.
 * Retorna o ticket atualizado, ou null se não encontrado.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {string} closedBy - userId de quem fechou
 * @returns {object|null}
 */
export function closeTicket(guildId, id, closedBy) {
  const db = getDb();
  const existing = getTicket(guildId, id);
  if (!existing) return null;

  db.prepare(`
    UPDATE tickets
       SET status = 'closed', closed_at = unixepoch(), closed_by = ?
     WHERE id = ? AND guild_id = ?
  `).run(closedBy, id, guildId);

  return getTicket(guildId, id);
}

/**
 * Reabre um ticket fechado, criando um novo canal.
 * Requer que a migração 002 já tenha sido executada (coluna reopen_count).
 *
 * @param {string} guildId
 * @param {string} id
 * @param {string} newChannelId - ID do novo canal Discord criado para o ticket
 * @returns {object|null}
 */
export function reopenTicket(guildId, id, newChannelId) {
  const db = getDb();
  const existing = getTicket(guildId, id);
  if (!existing) return null;

  // reopen_count pode não existir em bancos antigos (antes da migração 002).
  // O DEFAULT 0 na migração garante que a coluna existe; a expressão COALESCE é só segurança.
  db.prepare(`
    UPDATE tickets
       SET status     = 'open',
           channel_id  = ?,
           closed_at   = NULL,
           closed_by   = NULL,
           reopen_count = COALESCE(reopen_count, 0) + 1
     WHERE id = ? AND guild_id = ?
  `).run(newChannelId, id, guildId);

  return getTicket(guildId, id);
}

// ── Utilitário interno ────────────────────────────────────────────────────────

function normalize(row) {
  return {
    id:          row.id,
    guildId:     row.guild_id,
    channelId:   row.channel_id,
    userId:      row.user_id,
    status:      row.status,
    createdAt:   row.created_at,
    closedAt:    row.closed_at    ?? null,
    closedBy:    row.closed_by    ?? null,
    reopenCount: row.reopen_count ?? 0,
  };
}
