/**
 * Middleware de tratamento de erros da API web — Etapa 19A.
 *
 * Centraliza respostas de erro em formato JSON padronizado.
 * Nunca expõe stack traces em produção.
 */

import { logger } from '../../utils/logger.mjs';

/**
 * Handler de erro Express (4 parâmetros obrigatórios).
 *
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {Function} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  logger.error(`[WebAPI] Erro não tratado: ${err.message} | ${req.method} ${req.path}`);

  const status  = err.status ?? err.statusCode ?? 500;
  const isDev   = (process.env.NODE_ENV ?? 'development') === 'development';
  const message = status < 500
    ? err.message
    : isDev
      ? err.message
      : 'Erro interno do servidor.';

  res.status(status).json({
    error:   message,
    status,
    ...(isDev && status >= 500 ? { stack: err.stack } : {}),
  });
}

/**
 * Retorna um objeto Error com status HTTP definido.
 *
 * @param {string} message
 * @param {number} status
 * @returns {Error}
 */
export function httpError(message, status = 400) {
  const err    = new Error(message);
  err.status   = status;
  return err;
}

/**
 * Middleware para rotas não encontradas (404).
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error:  `Rota não encontrada: ${req.method} ${req.path}`,
    status: 404,
  });
}
