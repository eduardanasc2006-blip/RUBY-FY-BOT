/**
 * Módulo de Embeds — Registro de componentes interativos.
 *
 * Registra o handler do namespace 'embed' no componentHandler global.
 * Chamado uma única vez em src/index.mjs, após registerEditorHandler().
 */

import { register } from '../../handlers/componentHandler.mjs';
import { handleEmbedComponent } from './fieldsPanel.mjs';

/**
 * Registra o handler 'embed' no roteador de componentes.
 * Cobre todos os customIds do painel de Fields:
 *   embed:fields_open:*  embed:fields_add:*  embed:add_modal:*
 *   embed:edit_select:*  embed:edit_modal:*  embed:remove_select:*
 *   embed:fields_back:*  embed:fields_cancel:*
 */
export function registerEmbedHandler() {
  register('embed', handleEmbedComponent);
}
