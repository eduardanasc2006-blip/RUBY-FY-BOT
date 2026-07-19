/**
 * Módulo de Modelos — Ponto de entrada público.
 *
 * Uso:
 *   import { registerTemplatesHandler } from '../modules/templates/index.mjs';
 *   import { openTemplatesPanel }       from '../modules/templates/index.mjs';
 */

import { register } from '../../handlers/componentHandler.mjs';
import { handleTemplatesComponent, openTemplatesPanel } from './actions.mjs';
import { logger } from '../../utils/logger.mjs';

/**
 * Registra o namespace 'templates' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerTemplatesHandler() {
  register('templates', handleTemplatesComponent);
  logger.info('[Templates] Handler registrado no namespace "templates".');
}

export { openTemplatesPanel };
