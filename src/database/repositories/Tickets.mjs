/**
 * Repositório de Tickets.
 *
 * Divide-se em duas responsabilidades:
 *
 * 1. CONFIGURAÇÃO do sistema de tickets (via guild_settings, module='tickets'):
 *    - enabled, category_id, log_channel_id, support_role_id, intro_message
 *
 * 2. INSTÂNCIAS de tickets abertos (via tabela 'tickets'):
 *    - createTicket / getTicket / listTickets / closeTicket / countOpenTickets
 *
 * Todas as funções recebem `guildId` como primeiro argumento para garantir
 * isolamento completo entre servidores.
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../client.mjs';
import { getOrCreate, getSetting, getAllSettings, setSetting } from './GuildConfig.mjs';

const MODULE = 'tickets';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna a configuração completa do sistema de tickets de um servidor.
 *
 * Campos:
 *   enabled         {boolean}  — se o sistema está ativo
 *   category_id     {string|null} — ID da categoria onde tickets são criados
 *   log_channel_id  {string|null} — ID do canal de logs de tickets
 *   support_role_id {string|null} — ID do cargo de suporte
 *   intro_message   {string|null} — mensagem de boas-vindas no ticket
 *
 * @param {string} guildId
 * @returns {{
 *   enabled: boolean,
 *   category_id: string|null,
 *   log_channel_id: string|null,
 *   support_role_id: string|null,
 *   intro_message: string|null,
 * }}
 */
export function getTicketConfig(guildId) {
  const raw = getAllSettings(guildId, MODULE);
  return {
    enabled:         raw.enabled         ?? false,
    category_id:     raw.category_id     ?? null,
    log_channel_id:  raw.log_channel_id  ?? null,
    support_role_id: raw.support_role_id ?? null,
    intro_message:   raw.intro_message   ?? null,
  };
}

/**
 * Salva um ou mais campos da configuração de tickets.
 * Apenas os campos presentes em `patch` são alterados.
 *
 * @param {string} guildId
 * @param {{
 *   enabled?:         boolean,
 *   category_id?:     string|null,
 *   log_channel_id?:  string|null,
 *   support_role_id?: string|null,
 *   intro_message?:   string|null,
 * }} patch
 */
export function setTicketConfig(guildId, patch) {
  getOrCreate(guildId);
  const allowed = ['enabled', 'category_id', 'log_channel_id', 'support_role_id', 'intro_message'];
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
 * Lista tickets do servidor. Filtra opcionalmente por status.
 *
 * @param {string} guildId
 * @param {{ status?: 'open'|'closed' }} opts
 * @returns {object[]}
 */
export function listTickets(guildId, { status } = {}) {
  const db = getDb();
  if (status) {
    return db
      .prepare('SELECT * FROM tickets WHERE guild_id = ? AND status = ? ORDER BY created_at DESC')
      .all(guildId, status)
      .map(normalize);
  }
  return db
    .prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC')
    .all(guildId)
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

// ── Utilitário interno ────────────────────────────────────────────────────────

function normalize(row) {
  return {
    id:        row.id,
    guildId:   row.guild_id,
    channelId: row.channel_id,
    userId:    row.user_id,
    status:    row.status,
    createdAt: row.created_at,
    closedAt:  row.closed_at  ?? null,
    closedBy:  row.closed_by  ?? null,
  };
}
