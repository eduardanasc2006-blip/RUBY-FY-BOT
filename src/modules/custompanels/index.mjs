/**
 * Sistema de Painéis Personalizados — Ponto de entrada público (Etapa 17A).
 *
 * Registra dois namespaces no componentHandler:
 *   'cpnl'  — editor de painéis (admin)
 *   'cpnlb' — handler de botões publicados (usuários)
 *
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 *
 * Uso:
 *   import { registerCustomPanelsHandler } from '../modules/custompanels/index.mjs';
 *   import { openCustomPanelsManager }      from '../modules/custompanels/index.mjs';
 */

import { register }                                  from '../../handlers/componentHandler.mjs';
import { handleCpnlComponent, openCustomPanelsManager } from './actions.mjs';
import { handleCpnlbComponent }                      from './buttonHandler.mjs';
import { logger }                                    from '../../utils/logger.mjs';

export { openCustomPanelsManager };

/**
 * Registra os namespaces 'cpnl' e 'cpnlb' no componentHandler.
 */
export function registerCustomPanelsHandler() {
  register('cpnl',  handleCpnlComponent);
  register('cpnlb', handleCpnlbComponent);
  logger.info('[CustomPanels] Handlers registrados nos namespaces "cpnl" e "cpnlb".');
}
