/**
 * Stock — Index do módulo.
 *
 * Exporta funções utilitárias para uso em outros módulos.
 */

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
