/**
 * Stock — Index do módulo.
 *
 * Exporta funções utilitárias para uso em outros módulos.
 * Registra o namespace 'stock' no componentHandler para roteamento de componentes.
 */

import { register } from '../../handlers/componentHandler.mjs';
import {
  handleStockComponent,
  handleStockAdjustModal,
  handleStockReplenishModal,
  handleStockChangeModal,
} from './actions.mjs';

// ── Registro de Namespace ─────────────────────────────────────────────────────

/**
 * Inicializa o módulo stock.
 * Chamado pelo index.mjs principal durante o boot do bot.
 */
export function initStockModule() {
  // Registra handlers para o namespace 'stock'
  register('stock', handleStockComponent);

  // Registra handlers para modais específicos
  register('stock:adjust', handleStockAdjustModal);
  register('stock:replenish', handleStockReplenishModal);
  register('stock:change', handleStockChangeModal);

  return true;
}

// Re-exporta handlers para uso direto
export {
  handleStockComponent,
  handleStockAdjustModal,
  handleStockReplenishModal,
  handleStockChangeModal,
} from './actions.mjs';

export {
  getStockReport,
  getLowStockProducts,
  getOutOfStockProducts,
  addStock,
  removeStock,
  setStock,
  listMovements,
  getMovementSummary,
  checkLowStock,
  normalizeMovement,
  STOCK_MOVEMENT_TYPE,
  STOCK_REFERENCE_TYPE,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../../database/repositories/Stock.mjs';

export {
  buildStockPayload,
  buildStockReportEmbed,
  buildLowStockAlert,
  buildMovementHistoryEmbed,
  buildStockComponents,
  buildAdjustmentModal,
  buildReplenishModal,
  buildStockChangeModal,
  buildStockSuccessPayload,
  buildStockErrorPayload,
  buildLowStockPayload,
  getStockStatus,
  STOCK_STATUS_LABELS,
  shortId,
} from './flow.mjs';
