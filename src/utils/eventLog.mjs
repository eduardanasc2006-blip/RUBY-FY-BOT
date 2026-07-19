/**
 * Log de Eventos Estruturado.
 *
 * Complementa o logger.mjs com contexto estruturado para eventos de negócio.
 * Não substitui o logger — usa-o internamente.
 *
 * Uso:
 *   import { logEvent } from '../utils/eventLog.mjs';
 *
 *   logEvent({
 *     module:  'orders',
 *     guildId: '123456789',
 *     userId:  '987654321',
 *     action:  'status_changed',
 *     result:  'success',
 *     data:    { orderId: 'abc', from: 'pending', to: 'paid' },
 *   });
 *
 * Campos:
 *   module   — módulo de origem (obrigatório)
 *   action   — ação executada (obrigatório)
 *   result   — 'success' | 'error' | 'skipped' (padrão: 'success')
 *   guildId  — ID do servidor (opcional)
 *   userId   — ID do usuário (opcional)
 *   data     — objeto com dados adicionais não-sensíveis (opcional)
 *   error    — mensagem de erro (opcional)
 */

import { logger } from './logger.mjs';

/**
 * Registra um evento estruturado do sistema.
 *
 * @param {{
 *   module:   string,
 *   action:   string,
 *   result?:  'success'|'error'|'skipped',
 *   guildId?: string,
 *   userId?:  string,
 *   data?:    Record<string, string|number|boolean|null>,
 *   error?:   string,
 * }} params
 */
export function logEvent({
  module,
  action,
  result  = 'success',
  guildId = null,
  userId  = null,
  data    = {},
  error   = null,
}) {
  const parts = [`[${module}]`, `action:${action}`, `result:${result}`];

  if (guildId) parts.push(`guild:${guildId}`);
  if (userId)  parts.push(`user:${userId}`);

  // Adiciona dados extras (filtra nulos)
  const extras = Object.entries(data)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}:${v}`)
    .join(' | ');

  if (extras) parts.push(extras);
  if (error)  parts.push(`error:${error}`);

  const message = parts.join(' | ');

  switch (result) {
    case 'error':   logger.error(message); break;
    case 'skipped': logger.warn(message);  break;
    default:        logger.info(message);  break;
  }
}

/**
 * Atalho para logar um evento de erro.
 *
 * @param {string} module
 * @param {string} action
 * @param {string|Error} err
 * @param {{ guildId?: string, userId?: string, data?: object }} opts
 */
export function logError(module, action, err, opts = {}) {
  logEvent({
    module,
    action,
    result: 'error',
    error:  err instanceof Error ? err.message : String(err),
    ...opts,
  });
}
