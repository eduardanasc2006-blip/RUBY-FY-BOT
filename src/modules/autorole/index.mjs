/**
 * Módulo de Auto Roles — Ponto de entrada (Fase 4).
 *
 * Exports públicos para uso nos comandos e eventos.
 */

import { register } from '../../handlers/componentHandler.mjs';
import { handleAutoRoleComponent } from './flow.mjs';

export {
  openAutoRoleManager,
  handleAutoRoleComponent,
  buildAutoRoleManagerPayload,
} from './flow.mjs';

/**
 * Registra o handler de componentes no roteador central.
 * Chamado por src/index.mjs durante a inicialização.
 */
export function registerAutoRoleHandler() {
  register('ar', handleAutoRoleComponent);
}
