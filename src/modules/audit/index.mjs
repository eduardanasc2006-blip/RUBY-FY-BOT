/**
 * Módulo de Auditoria — Ponto de entrada público (Etapa 18).
 *
 * Re-exporta as funções públicas do repositório e dos fluxos de auditoria,
 * e registra o handler de componentes interativos (paginação).
 *
 * Uso:
 *   import { logAudit, getAuditStats } from '../modules/audit/index.mjs';
 *   import { registerAuditHandler }    from '../modules/audit/index.mjs';
 *
 *   registerAuditHandler(); // chamado em src/index.mjs
 */

export {
  logAudit,
  logAuditError,
  getAuditEntry,
  listAuditLogs,
  getAuditStats,
  exportAuditLogs,
  AUDIT_SOURCE,
  AUDIT_RESULT,
} from '../../database/repositories/AuditLog.mjs';

export {
  buildAuditEmbed,
  buildAuditStatsEmbed,
  buildAuditEntryEmbed,
  formatAuditEntry,
  AUDIT_FILTERS,
} from './flow.mjs';

import { register } from '../../handlers/componentHandler.mjs';
import { handleAuditPage } from './actions.mjs';

let _registered = false;

/**
 * Registra o namespace 'audit' no roteador de componentes.
 * Idempotente — pode ser chamado múltiplas vezes com segurança.
 */
export function registerAuditHandler() {
  if (_registered) return;

  register('audit', async (interaction, action, partes) => {
    if (action === 'page') {
      await handleAuditPage(interaction);
      return;
    }
  });

  _registered = true;
}
