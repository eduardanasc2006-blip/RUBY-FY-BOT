/**
 * Repositório de Controle de Estoque.
 *
 * Fornece funções para gerenciar movimentações de estoque,
 * histórico completo e alertas de estoque baixo.
 *
 * Tipos de movimento:
 *   entry          — Entrada de estoque (reposição)
 *   exit           — Saída de estoque (venda/pedido)
 *   adjustment      — Ajuste manual (correção)
 *   replenishment   — Reposição via sistema
 *
 * Isolamento: todas as funções recebem guildId como primeiro argumento.
 */

import { getDb } from '../client.mjs';

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Tipos de movimento de estoque */
export const STOCK_MOVEMENT_TYPE = Object.freeze({
  ENTRY:         'entry',
  EXIT:          'exit',
  ADJUSTMENT:    'adjustment',
  REPLENISHMENT: 'replenishment',
});

/** Tipos de referência para movimentação */
export const STOCK_REFERENCE_TYPE = Object.freeze({
  ORDER:      'order',
  MANUAL:     'manual',
  SYSTEM:     'system',
  ADJUSTMENT: 'adjustment',
});

/** Status de estoque */
export const STOCK_STATUS = Object.freeze({
  IN_STOCK:      'in_stock',
  LOW_STOCK:     'low_stock',
  OUT_OF_STOCK:  'out_of_stock',
});

/** Limiar padrão para alerta de estoque baixo */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// ══════════════════════════════════════════════════════════════════════════════
// MOVIMENTAÇÕES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Registra uma movimentação de estoque.
 *
 * @param {string} guildId
 * @param {{
 *   productId: string,
 *   type: 'entry'|'exit'|'adjustment'|'replenishment',
 *   quantity: number,
 *   previousStock: number,
 *   newStock: number,
 *   referenceType?: 'order'|'manual'|'system'|'adjustment'|null,
 *   referenceId?: string|null,
 *   reason?: string|null,
 *   actorId?: string|null,
 * }} params
 * @returns {number} ID do movimento registrado
 */
export function recordMovement(guildId, {
  productId,
  type,
  quantity,
  previousStock,
  newStock,
  referenceType = null,
  referenceId = null,
  reason = null,
  actorId = null,
}) {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO stock_movements
      (guild_id, product_id, type, quantity, previous_stock, new_stock,
       reference_type, reference_id, reason, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(
    guildId,
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    referenceType,
    referenceId,
    reason,
    actorId,
  );

  return result.lastInsertRowid;
}

/**
 * Lista movimentações de estoque de um produto.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {{ limit?: number, offset?: number }} opts
 * @returns {object[]}
 */
export function listMovements(guildId, productId, { limit = 50, offset = 0 } = {}) {
  return getDb()
    .prepare(`
      SELECT * FROM stock_movements
       WHERE guild_id = ? AND product_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?
    `)
    .all(guildId, productId, limit, offset);
}

/**
 * Lista todas as movimentações de estoque de um servidor.
 *
 * @param {string} guildId
 * @param {{ limit?: number, offset?: number }} opts
 * @returns {object[]}
 */
export function listAllMovements(guildId, { limit = 100, offset = 0 } = {}) {
  return getDb()
    .prepare(`
      SELECT sm.*, p.name as product_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
       WHERE sm.guild_id = ?
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?
    `)
    .all(guildId, limit, offset);
}

/**
 * Lista movimentações por tipo.
 *
 * @param {string} guildId
 * @param {string} type
 * @param {{ limit?: number }} opts
 * @returns {object[]}
 */
export function listMovementsByType(guildId, type, { limit = 50 } = {}) {
  return getDb()
    .prepare(`
      SELECT sm.*, p.name as product_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
       WHERE sm.guild_id = ? AND sm.type = ?
       ORDER BY sm.created_at DESC
       LIMIT ?
    `)
    .all(guildId, type, limit);
}

/**
 * Conta movimentações de um produto.
 *
 * @param {string} guildId
 * @param {string} productId
 * @returns {number}
 */
export function countMovements(guildId, productId) {
  const row = getDb()
    .prepare('SELECT COUNT(*) as total FROM stock_movements WHERE guild_id = ? AND product_id = ?')
    .get(guildId, productId);
  return row?.total ?? 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTOQUE BAIXO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Obtém produtos com estoque baixo (menor ou igual ao limite).
 *
 * @param {string} guildId
 * @param {number} limit Quantidade máxima para considerar "baixo"
 * @returns {object[]}
 */
export function getLowStockProducts(guildId, limit = 5) {
  return getDb()
    .prepare(`
      SELECT id, guild_id, name, stock, status
        FROM products
       WHERE guild_id = ?
         AND stock > 0
         AND stock <= ?
         AND status != 'inactive'
       ORDER BY stock ASC
    `)
    .all(guildId, limit);
}

/**
 * Obtém produtos sem estoque (stock = 0).
 *
 * @param {string} guildId
 * @returns {object[]}
 */
export function getOutOfStockProducts(guildId) {
  return getDb()
    .prepare(`
      SELECT id, guild_id, name, stock, status
        FROM products
       WHERE guild_id = ?
         AND stock = 0
         AND status != 'inactive'
       ORDER BY name ASC
    `)
    .all(guildId);
}

/**
 * Verifica se um produto está com estoque baixo.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} threshold Limite para considerar baixo
 * @returns {{ isLow: boolean, stock: number, threshold: number }}
 */
export function checkLowStock(guildId, productId, threshold = 5) {
  const row = getDb()
    .prepare('SELECT stock FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  if (!row) return { isLow: false, stock: 0, threshold };

  const stock = row.stock ?? 0;
  return {
    isLow: stock > 0 && stock <= threshold,
    stock,
    threshold,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// OPERAÇÕES DE ESTOQUE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona estoque a um produto (reposição/entrada).
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} quantity Quantidade a adicionar
 * @param {{ referenceType?: string, referenceId?: string, reason?: string, actorId?: string }} opts
 * @returns {{ ok: boolean, product?: object, movementId?: number, reason?: string }}
 */
export function addStock(guildId, productId, quantity, opts = {}) {
  const db = getDb();

  // Busca produto atual
  const product = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  if (!product) return { ok: false, reason: 'product_not_found' };
  if (quantity <= 0) return { ok: false, reason: 'invalid_quantity' };

  const previousStock = product.stock ?? 0;
  const newStock = previousStock + quantity;

  // Atualiza estoque do produto
  const newStatus = newStock > 0 ? 'active' : 'out_of_stock';
  db.prepare(`
    UPDATE products
       SET stock = ?, status = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(newStock, newStatus, productId, guildId);

  // Registra movimentação
  const movementId = recordMovement(guildId, {
    productId,
    type: quantity > 0 ? STOCK_MOVEMENT_TYPE.ENTRY : STOCK_MOVEMENT_TYPE.REPLENISHMENT,
    quantity,
    previousStock,
    newStock,
    referenceType: opts.referenceType ?? STOCK_REFERENCE_TYPE.MANUAL,
    referenceId: opts.referenceId ?? null,
    reason: opts.reason ?? null,
    actorId: opts.actorId ?? null,
  });

  // Retorna produto atualizado
  const updated = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  return {
    ok: true,
    product: normalizeProduct(updated),
    movementId,
  };
}

/**
 * Remove estoque de um produto (saída/baixa).
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} quantity Quantidade a remover
 * @param {{ referenceType?: string, referenceId?: string, reason?: string, actorId?: string }} opts
 * @returns {{ ok: boolean, product?: object, movementId?: number, reason?: string }}
 */
export function removeStock(guildId, productId, quantity, opts = {}) {
  const db = getDb();

  // Busca produto atual
  const product = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  if (!product) return { ok: false, reason: 'product_not_found' };
  if (quantity <= 0) return { ok: false, reason: 'invalid_quantity' };

  const previousStock = product.stock ?? 0;
  const newStock = Math.max(0, previousStock - quantity);

  // Verifica se há estoque suficiente
  if (previousStock < quantity) {
    return {
      ok: false,
      reason: 'insufficient_stock',
      available: previousStock,
      requested: quantity,
    };
  }

  // Atualiza estoque do produto
  const newStatus = newStock === 0 ? 'out_of_stock' : 'active';
  db.prepare(`
    UPDATE products
       SET stock = ?, status = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(newStock, newStatus, productId, guildId);

  // Registra movimentação
  const movementId = recordMovement(guildId, {
    productId,
    type: STOCK_MOVEMENT_TYPE.EXIT,
    quantity,
    previousStock,
    newStock,
    referenceType: opts.referenceType ?? STOCK_REFERENCE_TYPE.ORDER,
    referenceId: opts.referenceId ?? null,
    reason: opts.reason ?? null,
    actorId: opts.actorId ?? null,
  });

  // Retorna produto atualizado
  const updated = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  return {
    ok: true,
    product: normalizeProduct(updated),
    movementId,
  };
}

/**
 * Ajusta estoque de um produto (pode aumentar ou diminuir).
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} newQuantity Novo valor de estoque
 * @param {{ reason?: string, actorId?: string }} opts
 * @returns {{ ok: boolean, product?: object, movementId?: number, reason?: string }}
 */
export function setStock(guildId, productId, newQuantity, opts = {}) {
  const db = getDb();

  // Busca produto atual
  const product = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  if (!product) return { ok: false, reason: 'product_not_found' };
  if (newQuantity < 0) return { ok: false, reason: 'invalid_quantity' };

  const previousStock = product.stock ?? 0;

  // Se não mudou, não faz nada
  if (previousStock === newQuantity) {
    return { ok: true, product: normalizeProduct(product), movementId: null };
  }

  const quantity = newQuantity - previousStock;

  // Atualiza estoque do produto
  const newStatus = newQuantity === 0 ? 'out_of_stock' : 'active';
  db.prepare(`
    UPDATE products
       SET stock = ?, status = ?, updated_at = unixepoch()
     WHERE id = ? AND guild_id = ?
  `).run(newQuantity, newStatus, productId, guildId);

  // Registra movimentação
  const movementId = recordMovement(guildId, {
    productId,
    type: STOCK_MOVEMENT_TYPE.ADJUSTMENT,
    quantity: Math.abs(quantity),
    previousStock,
    newStock: newQuantity,
    referenceType: STOCK_REFERENCE_TYPE.ADJUSTMENT,
    referenceId: null,
    reason: opts.reason ?? 'Ajuste manual de estoque',
    actorId: opts.actorId ?? null,
  });

  // Retorna produto atualizado
  const updated = db
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(productId, guildId);

  return {
    ok: true,
    product: normalizeProduct(updated),
    movementId,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Gera relatório de estoque de um servidor.
 *
 * @param {string} guildId
 * @returns {{ inStock: object[], lowStock: object[], outOfStock: object[] }}
 */
export function getStockReport(guildId) {
  const products = getDb()
    .prepare(`
      SELECT id, guild_id, name, stock, status
        FROM products
       WHERE guild_id = ? AND status != 'inactive'
       ORDER BY name ASC
    `)
    .all(guildId);

  const inStock = [];
  const lowStock = [];
  const outOfStock = [];

  for (const p of products) {
    if (p.stock === 0) {
      outOfStock.push(p);
    } else if (p.stock <= 5) {
      lowStock.push(p);
    } else {
      inStock.push(p);
    }
  }

  return { inStock, lowStock, outOfStock };
}

/**
 * Gera resumo de movimentações em um período.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {{ days?: number }} opts
 * @returns {{ entries: number, exits: number, adjustments: number, net: number }}
 */
export function getMovementSummary(guildId, productId, { days = 30 } = {}) {
  const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

  const movements = getDb()
    .prepare(`
      SELECT type, quantity FROM stock_movements
       WHERE guild_id = ? AND product_id = ? AND created_at >= ?
    `)
    .all(guildId, productId, cutoff);

  let entries = 0;
  let exits = 0;
  let adjustments = 0;

  for (const m of movements) {
    switch (m.type) {
      case STOCK_MOVEMENT_TYPE.ENTRY:
      case STOCK_MOVEMENT_TYPE.REPLENISHMENT:
        entries += m.quantity;
        break;
      case STOCK_MOVEMENT_TYPE.EXIT:
        exits += m.quantity;
        break;
      case STOCK_MOVEMENT_TYPE.ADJUSTMENT:
        adjustments += m.quantity;
        break;
    }
  }

  return {
    entries,
    exits,
    adjustments,
    net: entries - exits,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza produto do banco para formato consistente.
 */
function normalizeProduct(row) {
  if (!row) return null;
  return {
    id:          row.id,
    guildId:     row.guild_id,
    name:        row.name,
    price:       row.price ?? null,
    stock:       row.stock ?? 0,
    description:  row.description ?? null,
    imageUrl:    row.image_url ?? null,
    status:      row.status,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

/**
 * Normaliza movimento do banco para formato consistente.
 */
export function normalizeMovement(row) {
  if (!row) return null;
  return {
    id:             row.id,
    guildId:        row.guild_id,
    productId:      row.product_id,
    productName:    row.product_name ?? null,
    type:           row.type,
    quantity:       row.quantity,
    previousStock:  row.previous_stock,
    newStock:       row.new_stock,
    referenceType:  row.reference_type ?? null,
    referenceId:   row.reference_id ?? null,
    reason:         row.reason ?? null,
    actorId:        row.actor_id ?? null,
    createdAt:      row.created_at,
  };
}

/**
 * Rótulos legíveis para tipos de movimento.
 */
export const MOVEMENT_TYPE_LABELS = {
  [STOCK_MOVEMENT_TYPE.ENTRY]:         '📥 Entrada',
  [STOCK_MOVEMENT_TYPE.EXIT]:          '📤 Saída',
  [STOCK_MOVEMENT_TYPE.ADJUSTMENT]:    '⚙️ Ajuste',
  [STOCK_MOVEMENT_TYPE.REPLENISHMENT]:  '🔄 Reposição',
};

/**
 * Rótulos legíveis para tipos de referência.
 */
export const REFERENCE_TYPE_LABELS = {
  [STOCK_REFERENCE_TYPE.ORDER]:      'Pedido',
  [STOCK_REFERENCE_TYPE.MANUAL]:     'Manual',
  [STOCK_REFERENCE_TYPE.SYSTEM]:     'Sistema',
  [STOCK_REFERENCE_TYPE.ADJUSTMENT]: 'Ajuste',
};
