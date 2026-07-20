/**
 * Automações Visuais — Ponto de entrada público (Etapa 16).
 *
 * Registra o namespace 'atm' no componentHandler.
 *
 * Exporta:
 *   registerAutomationsHandler — chamado no boot (src/index.mjs)
 *   openAutomationsPanel       — chamado pelo comando /automacoes
 *   fireAutomationTrigger      — chamado pelos hooks dos módulos
 *   TRIGGERS_MAP / ACTION_TYPES / CONDITION_TYPES — definições públicas
 */

import { register }               from '../../handlers/componentHandler.mjs';
import { logger }                 from '../../utils/logger.mjs';
import { handleAtmComponent, openAutomationsPanel } from './actions.mjs';
import { fireAutomationTrigger }  from './executor.mjs';
import { TRIGGERS_MAP, ACTION_TYPES, CONDITION_TYPES } from './flow.mjs';

export { openAutomationsPanel };
export { fireAutomationTrigger };
export { TRIGGERS_MAP, ACTION_TYPES, CONDITION_TYPES };

/**
 * Registra o namespace 'atm' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerAutomationsHandler() {
  register('atm', handleAtmComponent);
  logger.info('[Automations] Handler registrado no namespace "atm".');
}
