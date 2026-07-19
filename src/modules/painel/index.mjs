/**
 * Painel Central — Ponto de entrada público.
 *
 * O /painel é o HUB visual do Ruby FY.
 * Oferece acesso rápido a todos os módulos do bot.
 *
 * Registra o namespace 'painel' no componentHandler.
 * Deve ser chamado uma única vez no boot (src/index.mjs).
 *
 * Uso:
 *   import { registerPainelHandler, openPainel } from './modules/painel/index.mjs';
 *   registerPainelHandler();
 */

import { register }        from '../../handlers/componentHandler.mjs';
import { handlePainelComponent, openPainel } from './actions.mjs';
import { logger }          from '../../utils/logger.mjs';

export { openPainel };

/**
 * Registra o namespace 'painel' no componentHandler.
 */
export function registerPainelHandler() {
  register('painel', handlePainelComponent);
  logger.info('[Painel] Handler registrado no namespace "painel".');
}
