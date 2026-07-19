/**
 * Módulo de Tickets — Ponto de entrada público.
 *
 * Registra dois namespaces no componentHandler:
 *   'tcfg' — painel de configuração admin (/tickets)
 *   'tkt'  — interações de usuário (abrir, fechar, add/rem usuário)
 *
 * Uso:
 *   import { registerTicketsHandler } from '../modules/tickets/index.mjs';
 *   import { openTicketsPanel }       from '../modules/tickets/index.mjs';
 *   import { buildOpenPanelPayload }   from '../modules/tickets/index.mjs';
 */

import { register }                from '../../handlers/componentHandler.mjs';
import { handleTcfgComponent, openTicketsPanel } from './actions.mjs';
import { handleTktComponent }      from './userHandler.mjs';
import { buildOpenPanelPayload }   from './flow.mjs';
import { logger }                  from '../../utils/logger.mjs';

/**
 * Registra os namespaces 'tcfg' e 'tkt' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerTicketsHandler() {
  register('tcfg', handleTcfgComponent);
  register('tkt',  handleTktComponent);
  logger.info('[Tickets] Handlers registrados nos namespaces "tcfg" e "tkt".');
}

export { openTicketsPanel, buildOpenPanelPayload };
