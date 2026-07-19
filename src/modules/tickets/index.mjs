/**
 * Módulo de Tickets — Ponto de entrada público.
 *
 * Uso:
 *   import { registerTicketsHandler } from '../modules/tickets/index.mjs';
 *   import { openTicketsPanel }       from '../modules/tickets/index.mjs';
 */

import { register } from '../../handlers/componentHandler.mjs';
import { handleTcfgComponent, openTicketsPanel } from './actions.mjs';
import { logger } from '../../utils/logger.mjs';

/**
 * Registra o namespace 'tcfg' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerTicketsHandler() {
  register('tcfg', handleTcfgComponent);
  logger.info('[Tickets] Handler registrado no namespace "tcfg".');
}

export { openTicketsPanel };
