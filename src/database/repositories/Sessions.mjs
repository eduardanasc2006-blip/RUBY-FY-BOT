/**
 * Repositório de Sessões Web — Etapa 19A.
 *
 * Armazena sessões de usuários autenticados via Discord OAuth2
 * na tabela web_sessions do SQLite.
 *
 * Cada sessão contém:
 *   - token    — ID aleatório seguro (UUID v4)
 *   - userId   — Discord userId do usuário autenticado
 *   - data     — JSON com dados da sessão (user info, guilds, access_token)
 *   - expires  — timestamp unix de expiração
 *   - created  — timestamp unix de criação
 */

import { randomUUID } from 'node:crypto';
import { getDb }      from '../client.mjs';

/** Duração padrão de uma sessão: 7 dias em segundos */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// ── Escrita ───────────────────────────────────────────────────────────────────

/**
 * Cria uma nova sessão e retorna o token gerado.
 *
 * @param {{
 *   userId:  string,
 *   data:    object,
 *   ttl?:    number,  // segundos (padrão: SESSION_TTL_SECONDS)
 * }} params
 * @returns {{ token: string, expires: number }}
 */
export function createSession({ userId, data, ttl = SESSION_TTL_SECONDS }) {
  const db      = getDb();
  const token   = randomUUID();
  const now     = Math.floor(Date.now() / 1000);
  const expires = now + ttl;

  db.prepare(`
    INSERT INTO web_sessions (token, user_id, data, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, JSON.stringify(data), expires, now);

  return { token, expires };
}

/**
 * Atualiza os dados de uma sessão existente.
 * Reinicia o TTL automaticamente.
 *
 * @param {string} token
 * @param {object} data — novos dados a salvar
 * @param {number} [ttl]
 * @returns {boolean} true se a sessão existia e foi atualizada
 */
export function refreshSession(token, data, ttl = SESSION_TTL_SECONDS) {
  const db      = getDb();
  const now     = Math.floor(Date.now() / 1000);
  const expires = now + ttl;

  const result = db.prepare(`
    UPDATE web_sessions
       SET data = ?, expires_at = ?
     WHERE token = ? AND expires_at > ?
  `).run(JSON.stringify(data), expires, token, now);

  return result.changes > 0;
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna a sessão pelo token, ou null se não encontrada / expirada.
 *
 * @param {string} token
 * @returns {{ token: string, userId: string, data: object, expires: number }|null}
 */
export function getSession(token) {
  if (!token) return null;

  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);

  const row = db.prepare(`
    SELECT * FROM web_sessions
     WHERE token = ? AND expires_at > ?
  `).get(token, now);

  return row ? deserialize(row) : null;
}

/**
 * Lista todas as sessões ativas de um usuário.
 *
 * @param {string} userId
 * @returns {Array}
 */
export function listUserSessions(userId) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);

  return db.prepare(`
    SELECT * FROM web_sessions
     WHERE user_id = ? AND expires_at > ?
     ORDER BY created_at DESC
  `).all(userId, now).map(deserialize);
}

// ── Exclusão ──────────────────────────────────────────────────────────────────

/**
 * Remove uma sessão pelo token (logout).
 *
 * @param {string} token
 * @returns {boolean}
 */
export function deleteSession(token) {
  const db     = getDb();
  const result = db.prepare('DELETE FROM web_sessions WHERE token = ?').run(token);
  return result.changes > 0;
}

/**
 * Remove todas as sessões de um usuário.
 *
 * @param {string} userId
 * @returns {number} quantidade de sessões removidas
 */
export function deleteUserSessions(userId) {
  const db     = getDb();
  const result = db.prepare('DELETE FROM web_sessions WHERE user_id = ?').run(userId);
  return result.changes;
}

/**
 * Remove todas as sessões expiradas (limpeza periódica).
 *
 * @returns {number} quantidade de sessões removidas
 */
export function pruneExpiredSessions() {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM web_sessions WHERE expires_at <= ?').run(now);
  return result.changes;
}

/**
 * Conta o número de sessões ativas.
 *
 * @returns {number}
 */
export function countActiveSessions() {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);
  return db.prepare('SELECT COUNT(*) as c FROM web_sessions WHERE expires_at > ?').get(now).c;
}

// ── Utilitário interno ────────────────────────────────────────────────────────

function deserialize(row) {
  let data = {};
  try { data = JSON.parse(row.data); } catch { /* mantém {} */ }
  return {
    token:     row.token,
    userId:    row.user_id,
    data,
    expires:   row.expires_at,
    createdAt: row.created_at,
  };
}
