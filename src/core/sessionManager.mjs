import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.mjs';

/**
 * Gerenciador de sessões temporárias do Editor Visual Privado.
 *
 * Sessões são armazenadas em memória (Map) — não persistem entre reinicializações.
 * Cada sessão é identificada por um sessionId único.
 * userId e guildId são verificados em toda operação para garantir isolamento.
 *
 * Permite múltiplas sessões simultâneas por usuário/servidor,
 * diferenciadas por sessionId e/ou editorType.
 */

// ── Configuração ─────────────────────────────────────────────────────────────

/** Tempo de vida padrão de uma sessão em ms (15 minutos) */
const TTL_MS = 15 * 60 * 1000;

/** Intervalo de limpeza automática em ms (5 minutos) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// ── Armazenamento interno ────────────────────────────────────────────────────

/** Map<sessionId, sessão> */
const sessions = new Map();

// ── Criação ──────────────────────────────────────────────────────────────────

/**
 * Cria uma nova sessão temporária.
 *
 * @param {string} userId      - ID do usuário Discord
 * @param {string} guildId     - ID do servidor Discord
 * @param {string} editorType  - Tipo de editor: 'embed', 'mensagem', 'botao', etc.
 * @param {object} initialData - Dados iniciais do editor (opcional)
 * @returns {object} Sessão criada (com sessionId)
 */
export function createSession(userId, guildId, editorType, initialData = {}) {
  if (!userId || !guildId || !editorType) {
    throw new Error('[SessionManager] userId, guildId e editorType são obrigatórios.');
  }

  const now = Date.now();
  const session = {
    sessionId:  randomUUID(),
    userId,
    guildId,
    editorType,
    data:       { ...initialData },
    createdAt:  now,
    updatedAt:  now,
    expiresAt:  now + TTL_MS,
  };

  sessions.set(session.sessionId, session);
  logger.info(`[SessionManager] Sessão criada — id: ${session.sessionId} | tipo: ${editorType} | user: ${userId} | guild: ${guildId}`);

  return session;
}

// ── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Retorna uma sessão, verificando propriedade e validade.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} guildId
 * @returns {object|null} Sessão ou null se não encontrada/expirada/não autorizada
 */
export function getSession(sessionId, userId, guildId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Verifica propriedade
  if (session.userId !== userId || session.guildId !== guildId) {
    logger.warn(`[SessionManager] Tentativa de acesso não autorizado à sessão ${sessionId} por user: ${userId}`);
    return null;
  }

  // Verifica expiração
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    logger.info(`[SessionManager] Sessão ${sessionId} expirou e foi removida.`);
    return null;
  }

  return session;
}

/**
 * Verifica se uma sessão existe, é válida e pertence ao usuário/servidor.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean}
 */
export function hasSession(sessionId, userId, guildId) {
  return getSession(sessionId, userId, guildId) !== null;
}

/**
 * Retorna todas as sessões ativas de um usuário em um servidor.
 * Útil para listar editores abertos.
 *
 * @param {string} userId
 * @param {string} guildId
 * @returns {object[]}
 */
export function getSessionsByUser(userId, guildId) {
  const now = Date.now();
  const result = [];

  for (const [id, session] of sessions) {
    if (session.userId !== userId || session.guildId !== guildId) continue;
    if (now > session.expiresAt) {
      sessions.delete(id);
      continue;
    }
    result.push(session);
  }

  return result;
}

// ── Atualização ──────────────────────────────────────────────────────────────

/**
 * Atualiza os dados de uma sessão (merge parcial).
 * Renova o TTL a cada atualização.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} guildId
 * @param {object} partialData - Campos a mesclar em session.data
 * @returns {object|null} Sessão atualizada ou null se inválida
 */
export function updateSession(sessionId, userId, guildId, partialData) {
  const session = getSession(sessionId, userId, guildId);
  if (!session) return null;

  Object.assign(session.data, partialData);
  session.updatedAt = Date.now();
  session.expiresAt = Date.now() + TTL_MS; // renova TTL

  return session;
}

// ── Finalização ──────────────────────────────────────────────────────────────

/**
 * Finaliza uma sessão (confirmar/publicar): retorna os dados e remove a sessão.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} guildId
 * @returns {object|null} Sessão finalizada (com dados) ou null se inválida
 */
export function finalizeSession(sessionId, userId, guildId) {
  const session = getSession(sessionId, userId, guildId);
  if (!session) return null;

  sessions.delete(sessionId);
  logger.info(`[SessionManager] Sessão ${sessionId} finalizada (tipo: ${session.editorType}).`);

  return session;
}

// ── Cancelamento ─────────────────────────────────────────────────────────────

/**
 * Cancela e remove uma sessão imediatamente.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean} true se a sessão existia e foi removida, false caso contrário
 */
export function cancelSession(sessionId, userId, guildId) {
  const session = getSession(sessionId, userId, guildId);
  if (!session) return false;

  sessions.delete(sessionId);
  logger.info(`[SessionManager] Sessão ${sessionId} cancelada (tipo: ${session.editorType}).`);

  return true;
}

// ── Limpeza automática ───────────────────────────────────────────────────────

/**
 * Inicia o intervalo de limpeza automática de sessões expiradas.
 * Deve ser chamado uma vez no boot do bot (src/index.mjs).
 */
export function startSessionCleanup() {
  const interval = setInterval(() => {
    const now = Date.now();
    let removed = 0;

    for (const [id, session] of sessions) {
      if (now > session.expiresAt) {
        sessions.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`[SessionManager] Limpeza automática: ${removed} sessão(ões) expirada(s) removida(s).`);
    }
  }, CLEANUP_INTERVAL_MS);

  // Não impede o encerramento do processo
  interval.unref();

  logger.info(`[SessionManager] Limpeza automática iniciada (intervalo: ${CLEANUP_INTERVAL_MS / 60000} min, TTL: ${TTL_MS / 60000} min).`);
}

// ── Utilitário de diagnóstico (desenvolvimento) ───────────────────────────────

/**
 * Retorna a contagem de sessões ativas no momento.
 * @returns {number}
 */
export function getSessionCount() {
  return sessions.size;
}
