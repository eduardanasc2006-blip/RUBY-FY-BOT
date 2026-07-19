/**
 * Registry de Ações do Sistema de Conexões.
 *
 * Separado do executor (index.mjs) para evitar importações circulares.
 * Módulos externos registram ações aqui; o painel visual (actions.mjs)
 * lista as ações disponíveis daqui; o executor (index.mjs) consulta
 * callbacks registrados daqui.
 *
 * Uso:
 *   import { registerAction, getRegisteredActions } from './registry.mjs';
 *
 *   registerAction('proof', {
 *     label:       'Prova de Venda',
 *     description: 'Disparado quando uma venda é comprovada',
 *   });
 */

import { logger } from '../../utils/logger.mjs';

/** @type {Map<string, { name: string, label: string, description: string, onExecuted: Function|null }>} */
const actionRegistry = new Map();

/**
 * Registra uma ação disponível no sistema de conexões.
 *
 * @param {string} name - Identificador único (ex: 'proof', 'ticket_closed')
 * @param {{
 *   label?:       string,
 *   description?: string,
 *   onExecuted?:  (payload: object) => Promise<void>,
 * }} opts
 */
export function registerAction(name, opts = {}) {
  if (!name || typeof name !== 'string') throw new Error('[Connections] Nome de ação inválido.');
  actionRegistry.set(name, {
    name,
    label:       opts.label       ?? name,
    description: opts.description ?? '',
    onExecuted:  typeof opts.onExecuted === 'function' ? opts.onExecuted : null,
  });
  logger.info(`[Connections] Ação registrada: '${name}'`);
}

/**
 * Retorna todas as ações registradas (para listar no painel visual).
 * @returns {Array<{ name: string, label: string, description: string }>}
 */
export function getRegisteredActions() {
  return [...actionRegistry.values()].map(({ name, label, description }) => ({ name, label, description }));
}

/**
 * Retorna uma ação pelo nome (para o executor consultar o callback).
 * @param {string} name
 * @returns {{ name: string, label: string, description: string, onExecuted: Function|null }|null}
 */
export function getAction(name) {
  return actionRegistry.get(name) ?? null;
}
