/**
 * Repositório de Painéis Personalizados (Etapa 17A).
 *
 * Divide-se em duas responsabilidades:
 *
 * 1. PAINÉIS (custom_panels):
 *    - createPanel / getPanel / listPanels / updatePanel / deletePanel
 *    - markPublished
 *
 * 2. BOTÕES (panel_buttons):
 *    - addButton / getButton / listButtons / deleteButton / reorderButtons
 *
 * Todas as funções recebem guildId para garantir isolamento total entre servidores.
 * action_data é serializado/desserializado automaticamente como JSON.
 */

import { randomUUID } from 'node:crypto';
import { getDb }      from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Constantes ─────────────────────────────────────────────────────────────────

export const MAX_BUTTONS        = 20;   // máx. botões por painel (4 rows × 5)
export const VALID_ACTION_TYPES = ['message', 'open_ticket', 'give_role', 'take_role', 'toggle_role', 'execute_connection'];
export const VALID_STYLES       = ['Primary', 'Secondary', 'Success', 'Danger'];
export const VALID_STATUSES     = ['draft', 'published'];

// ══════════════════════════════════════════════════════════════════════════════
// PAINÉIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria um novo painel personalizado.
 *
 * @param {string} guildId
 * @param {{ name: string, embedTitle?: string, embedDescription?: string,
 *           embedColor?: string, embedImage?: string, embedThumbnail?: string,
 *           embedFooter?: string }} params
 * @returns {object}
 */
export function createPanel(guildId, { name, embedTitle = null, embedDescription = null,
  embedColor = '#5865F2', embedImage = null, embedThumbnail = null, embedFooter = null }) {
  const db = getDb();
  getOrCreate(guildId);

  const id = randomUUID();
  db.prepare(`
    INSERT INTO custom_panels
      (id, guild_id, name, embed_title, embed_description, embed_color, embed_image, embed_thumbnail, embed_footer, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', unixepoch(), unixepoch())
  `).run(id, guildId, name, embedTitle, embedDescription, embedColor, embedImage, embedThumbnail, embedFooter);

  return getPanel(guildId, id);
}

/**
 * Retorna um painel pelo ID, isolado pelo guildId.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getPanel(guildId, id) {
  const row = getDb()
    .prepare('SELECT * FROM custom_panels WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalizePanel(row) : null;
}

/**
 * Lista painéis do servidor.
 *
 * @param {string} guildId
 * @param {{ status?: string, limit?: number, offset?: number }} opts
 * @returns {object[]}
 */
export function listPanels(guildId, { status, limit = 25, offset = 0 } = {}) {
  const db   = getDb();
  let sql    = 'SELECT * FROM custom_panels WHERE guild_id = ?';
  const args = [guildId];

  if (status) { sql += ' AND status = ?'; args.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  return db.prepare(sql).all(...args).map(normalizePanel);
}

/**
 * Conta painéis do servidor.
 *
 * @param {string} guildId
 * @param {{ status?: string }} opts
 * @returns {number}
 */
export function countPanels(guildId, { status } = {}) {
  const db   = getDb();
  let sql    = 'SELECT COUNT(*) as total FROM custom_panels WHERE guild_id = ?';
  const args = [guildId];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  return db.prepare(sql).get(...args)?.total ?? 0;
}

/**
 * Atualiza campos de um painel existente.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ name?: string, embedTitle?: string, embedDescription?: string,
 *           embedColor?: string, embedImage?: string, embedThumbnail?: string,
 *           embedFooter?: string }} patch
 * @returns {object|null}
 */
export function updatePanel(guildId, id, patch) {
  const db = getDb();
  const existing = getPanel(guildId, id);
  if (!existing) return null;

  const fieldMap = {
    name:             'name',
    embedTitle:       'embed_title',
    embedDescription: 'embed_description',
    embedColor:       'embed_color',
    embedImage:       'embed_image',
    embedThumbnail:   'embed_thumbnail',
    embedFooter:      'embed_footer',
  };

  const setClauses = ['updated_at = unixepoch()'];
  const vals       = [];

  for (const [jsKey, sqlCol] of Object.entries(fieldMap)) {
    if (jsKey in patch) {
      setClauses.push(`${sqlCol} = ?`);
      vals.push(patch[jsKey] ?? null);
    }
  }

  if (setClauses.length === 1) return existing; // nada a atualizar

  vals.push(id, guildId);
  db.prepare(`UPDATE custom_panels SET ${setClauses.join(', ')} WHERE id = ? AND guild_id = ?`).run(...vals);

  return getPanel(guildId, id);
}

/**
 * Marca um painel como publicado (salva channel_id e message_id).
 *
 * @param {string} guildId
 * @param {string} id
 * @param {string} channelId
 * @param {string} messageId
 * @returns {object|null}
 */
export function markPublished(guildId, id, channelId, messageId) {
  const db = getDb();
  db.prepare(`
    UPDATE custom_panels
       SET status = 'published', channel_id = ?, message_id = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(channelId, messageId, id, guildId);
  return getPanel(guildId, id);
}

/**
 * Marca um painel como rascunho (remove channel_id e message_id).
 * Usado quando a mensagem publicada é apagada.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function markUnpublished(guildId, id) {
  const db = getDb();
  db.prepare(`
    UPDATE custom_panels
       SET status = 'draft', channel_id = NULL, message_id = NULL, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(id, guildId);
  return getPanel(guildId, id);
}

/**
 * Exclui um painel e todos os seus botões.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deletePanel(guildId, id) {
  const db      = getDb();
  const changes = db.prepare('DELETE FROM custom_panels WHERE id = ? AND guild_id = ?').run(id, guildId).changes;
  if (changes > 0) {
    db.prepare('DELETE FROM panel_buttons WHERE panel_id = ? AND guild_id = ?').run(id, guildId);
  }
  return changes > 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOTÕES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona um botão a um painel.
 *
 * @param {string} guildId
 * @param {string} panelId
 * @param {{ label: string, style?: string, emoji?: string,
 *           actionType: string, actionData?: object }} params
 * @returns {object|null} — null se limite de botões atingido ou painel inexistente
 */
export function addButton(guildId, panelId, { label, style = 'Primary', emoji = null, actionType, actionData = {} }) {
  const db = getDb();

  if (!getPanel(guildId, panelId)) return null;

  const current = countButtons(guildId, panelId);
  if (current >= MAX_BUTTONS) return null;

  const id  = randomUUID();
  const pos = current; // next available position

  db.prepare(`
    INSERT INTO panel_buttons (id, panel_id, guild_id, label, style, emoji, action_type, action_data, position, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(id, panelId, guildId, label, style, emoji, actionType, JSON.stringify(actionData), pos);

  return getButton(guildId, panelId, id);
}

/**
 * Retorna um botão pelo ID.
 *
 * @param {string} guildId
 * @param {string} panelId
 * @param {string} buttonId
 * @returns {object|null}
 */
export function getButton(guildId, panelId, buttonId) {
  const row = getDb()
    .prepare('SELECT * FROM panel_buttons WHERE id = ? AND panel_id = ? AND guild_id = ?')
    .get(buttonId, panelId, guildId);
  return row ? normalizeButton(row) : null;
}

/**
 * Lista todos os botões de um painel, ordenados por posição.
 *
 * @param {string} guildId
 * @param {string} panelId
 * @returns {object[]}
 */
export function listButtons(guildId, panelId) {
  return getDb()
    .prepare('SELECT * FROM panel_buttons WHERE panel_id = ? AND guild_id = ? ORDER BY position ASC')
    .all(panelId, guildId)
    .map(normalizeButton);
}

/**
 * Conta botões de um painel.
 *
 * @param {string} guildId
 * @param {string} panelId
 * @returns {number}
 */
export function countButtons(guildId, panelId) {
  return getDb()
    .prepare('SELECT COUNT(*) as total FROM panel_buttons WHERE panel_id = ? AND guild_id = ?')
    .get(panelId, guildId)?.total ?? 0;
}

/**
 * Remove um botão de um painel.
 *
 * @param {string} guildId
 * @param {string} panelId
 * @param {string} buttonId
 * @returns {boolean}
 */
export function deleteButton(guildId, panelId, buttonId) {
  const changes = getDb()
    .prepare('DELETE FROM panel_buttons WHERE id = ? AND panel_id = ? AND guild_id = ?')
    .run(buttonId, panelId, guildId).changes;
  return changes > 0;
}

// ── Normalizadores internos ───────────────────────────────────────────────────

function normalizePanel(row) {
  return {
    id:               row.id,
    guildId:          row.guild_id,
    name:             row.name,
    embedTitle:       row.embed_title       ?? null,
    embedDescription: row.embed_description ?? null,
    embedColor:       row.embed_color       ?? '#5865F2',
    embedImage:       row.embed_image       ?? null,
    embedThumbnail:   row.embed_thumbnail   ?? null,
    embedFooter:      row.embed_footer      ?? null,
    status:           row.status,
    channelId:        row.channel_id        ?? null,
    messageId:        row.message_id        ?? null,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

function normalizeButton(row) {
  let actionData = {};
  try { actionData = JSON.parse(row.action_data ?? '{}'); } catch { /* mantém {} */ }
  return {
    id:         row.id,
    panelId:    row.panel_id,
    guildId:    row.guild_id,
    label:      row.label,
    style:      row.style      ?? 'Primary',
    emoji:      row.emoji      ?? null,
    actionType: row.action_type,
    actionData,
    position:   row.position   ?? 0,
    createdAt:  row.created_at,
  };
}
