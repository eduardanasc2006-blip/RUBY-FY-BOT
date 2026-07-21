/**
 * Repositório de Produtos e Estoque (Etapa 17B).
 *
 * Responsabilidades:
 *   1. CRUD de produtos do catálogo por guildId
 *   2. Controle de estoque (adjustStock, setStock)
 *   3. Busca por nome (exata e fuzzy via LIKE)
 *   4. Log de compras (logPurchase / listPurchaseLogs)
 *
 * status possíveis: 'active' | 'inactive' | 'out_of_stock'
 *
 * Isolamento: todas as funções recebem guildId como primeiro argumento.
 */

import { randomUUID } from 'node:crypto';
import { getDb }      from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Constantes ─────────────────────────────────────────────────────────────────

export const PRODUCT_STATUS = Object.freeze({
  ACTIVE:       'active',
  INACTIVE:     'inactive',
  OUT_OF_STOCK: 'out_of_stock',
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria um produto no catálogo.
 *
 * @param {string} guildId
 * @param {{ name: string, price?: string, stock?: number,
 *           description?: string, imageUrl?: string }} params
 * @returns {object}
 */
export function createProduct(guildId, {
  name, price = null, stock = 0,
  description = null, imageUrl = null,
}) {
  const db = getDb();
  getOrCreate(guildId);

  const id     = randomUUID();
  const status = stock > 0 ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.OUT_OF_STOCK;

  db.prepare(`
    INSERT INTO products (id, guild_id, name, price, stock, description, image_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `).run(id, guildId, name, price, stock, description, imageUrl, status);

  return getProduct(guildId, id);
}

/**
 * Retorna um produto pelo ID, isolado pelo guildId.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getProduct(guildId, id) {
  const row = getDb()
    .prepare('SELECT * FROM products WHERE id = ? AND guild_id = ?')
    .get(id, guildId);
  return row ? normalize(row) : null;
}

/**
 * Busca produto por nome exato (case-insensitive).
 *
 * @param {string} guildId
 * @param {string} name
 * @returns {object|null}
 */
export function findProductByExactName(guildId, name) {
  const row = getDb()
    .prepare('SELECT * FROM products WHERE guild_id = ? AND LOWER(name) = LOWER(?)')
    .get(guildId, name);
  return row ? normalize(row) : null;
}

/**
 * Busca produto por nome parcial (LIKE, case-insensitive).
 * Retorna o primeiro resultado por ordem de criação.
 *
 * @param {string} guildId
 * @param {string} query
 * @returns {object|null}
 */
export function findProductByName(guildId, query) {
  if (!query?.trim()) return null;
  // Tenta exato primeiro
  const exact = findProductByExactName(guildId, query);
  if (exact) return exact;

  // Fuzzy via LIKE
  const row = getDb()
    .prepare("SELECT * FROM products WHERE guild_id = ? AND LOWER(name) LIKE LOWER(?) ORDER BY created_at ASC LIMIT 1")
    .get(guildId, `%${query.trim()}%`);
  return row ? normalize(row) : null;
}

/**
 * Lista produtos do servidor.
 *
 * @param {string} guildId
 * @param {{ status?: string, limit?: number, offset?: number }} opts
 * @returns {object[]}
 */
export function listProducts(guildId, { status, limit = 25, offset = 0 } = {}) {
  const db   = getDb();
  let sql    = 'SELECT * FROM products WHERE guild_id = ?';
  const args = [guildId];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  args.push(limit, offset);
  return db.prepare(sql).all(...args).map(normalize);
}

/**
 * Conta produtos do servidor.
 *
 * @param {string} guildId
 * @param {{ status?: string }} opts
 * @returns {number}
 */
export function countProducts(guildId, { status } = {}) {
  const db   = getDb();
  let sql    = 'SELECT COUNT(*) as total FROM products WHERE guild_id = ?';
  const args = [guildId];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  return db.prepare(sql).get(...args)?.total ?? 0;
}

/**
 * Atualiza campos de um produto existente.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {{ name?: string, price?: string, description?: string, imageUrl?: string, status?: string }} patch
 * @returns {object|null}
 */
export function updateProduct(guildId, id, patch) {
  const db = getDb();
  if (!getProduct(guildId, id)) return null;

  const fieldMap = {
    name:        'name',
    price:       'price',
    description: 'description',
    imageUrl:    'image_url',
    status:      'status',
  };

  const setClauses = ['updated_at = unixepoch()'];
  const vals       = [];

  for (const [jsKey, sqlCol] of Object.entries(fieldMap)) {
    if (jsKey in patch) {
      setClauses.push(`${sqlCol} = ?`);
      vals.push(patch[jsKey] ?? null);
    }
  }

  if (setClauses.length === 1) return getProduct(guildId, id);

  vals.push(id, guildId);
  db.prepare(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ? AND guild_id = ?`).run(...vals);
  return getProduct(guildId, id);
}

/**
 * Exclui um produto do catálogo.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {boolean}
 */
export function deleteProduct(guildId, id) {
  const changes = getDb()
    .prepare('DELETE FROM products WHERE id = ? AND guild_id = ?')
    .run(id, guildId).changes;
  return changes > 0;
}

// ── Controle de estoque ───────────────────────────────────────────────────────

/**
 * Ajusta o estoque de um produto (delta positivo = adicionar, negativo = remover).
 *
 * @param {string} guildId
 * @param {string} id
 * @param {number} delta — pode ser negativo (compra/retirada)
 * @returns {{ ok: boolean, product?: object, reason?: string }}
 */
export function adjustStock(guildId, id, delta) {
  const db      = getDb();
  const product = getProduct(guildId, id);
  if (!product) return { ok: false, reason: 'product_not_found' };

  const newStock = product.stock + delta;
  if (newStock < 0) return { ok: false, reason: 'insufficient_stock', stock: product.stock };

  const newStatus = newStock === 0
    ? PRODUCT_STATUS.OUT_OF_STOCK
    : product.status === PRODUCT_STATUS.OUT_OF_STOCK ? PRODUCT_STATUS.ACTIVE : product.status;

  db.prepare(`
    UPDATE products SET stock = ?, status = ?, updated_at = unixepoch()
    WHERE id = ? AND guild_id = ?
  `).run(newStock, newStatus, id, guildId);

  // Registra movimentação de estoque no sistema de histórico
  try {
    const { recordMovement, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = require('./Stock.mjs');
    recordMovement(guildId, {
      productId: id,
      type: delta < 0 ? STOCK_MOVEMENT_TYPE.EXIT : STOCK_MOVEMENT_TYPE.ENTRY,
      quantity: Math.abs(delta),
      previousStock: product.stock,
      newStock,
      referenceType: STOCK_REFERENCE_TYPE.ORDER,
      reason: delta < 0 ? 'Venda via catálogo' : 'Entrada manual',
    });
  } catch {
    // Erro no registro de movimentação não deve bloquear a operação
  }

  return { ok: true, product: getProduct(guildId, id) };
}

/**
 * Define o estoque de um produto diretamente.
 *
 * @param {string} guildId
 * @param {string} id
 * @param {number} qty — deve ser ≥ 0
 * @returns {object|null}
 */
export function setStock(guildId, id, qty) {
  const db = getDb();
  if (!getProduct(guildId, id)) return null;
  if (qty < 0) return null;

  const newStatus = qty === 0 ? PRODUCT_STATUS.OUT_OF_STOCK : PRODUCT_STATUS.ACTIVE;

  db.prepare(`
    UPDATE products SET stock = ?, status = ?, updated_at = unixepoch()
    WHERE id = ? AND guild_id = ?
  `).run(qty, newStatus, id, guildId);

  return getProduct(guildId, id);
}

// ── Log de compras ────────────────────────────────────────────────────────────

/**
 * Registra uma compra no log.
 *
 * @param {string} guildId
 * @param {{ productId: string, buyerId: string, quantity: number, unitPrice?: string, orderId?: string }} params
 * @returns {number} — ID inserido
 */
export function logPurchase(guildId, { productId, buyerId, quantity, unitPrice = null, orderId = null }) {
  const result = getDb().prepare(`
    INSERT INTO purchase_log (guild_id, product_id, buyer_id, quantity, unit_price, order_id, purchased_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())
  `).run(guildId, productId, buyerId, quantity, unitPrice, orderId);
  return result.lastInsertRowid;
}

/**
 * Lista o histórico de compras de um produto.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {{ limit?: number }} opts
 * @returns {object[]}
 */
export function listPurchaseLogs(guildId, productId, { limit = 20 } = {}) {
  return getDb()
    .prepare('SELECT * FROM purchase_log WHERE guild_id = ? AND product_id = ? ORDER BY purchased_at DESC LIMIT ?')
    .all(guildId, productId, limit);
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO COM ESTOQUE (Stock.mjs)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Atualiza o estoque de um produto (sem registrar movimentação).
 * Use addStock/removeStock/setStock de Stock.mjs para registrar movimentações.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} newStock Novo valor de estoque
 * @returns {{ ok: boolean, product?: object, reason?: string }}
 */
export function updateProductStock(guildId, productId, newStock) {
  const product = getProduct(guildId, productId);
  if (!product) return { ok: false, reason: 'product_not_found' };
  if (newStock < 0) return { ok: false, reason: 'invalid_quantity' };

  const previousStock = product.stock;
  const finalStock = Math.max(0, newStock);

  // Atualiza estoque do produto
  const db = getDb();
  const newStatus = finalStock === 0
    ? PRODUCT_STATUS.OUT_OF_STOCK
    : (previousStock === 0 && finalStock > 0 ? PRODUCT_STATUS.ACTIVE : product.status);

  db.prepare(`
    UPDATE products SET stock = ?, status = ?, updated_at = unixepoch()
    WHERE id = ? AND guild_id = ?
  `).run(finalStock, newStatus, productId, guildId);

  return {
    ok: true,
    product: getProduct(guildId, productId),
  };
}

/**
 * Processa uma venda (baixa de estoque por pedido).
 * Verifica estoque antes de vender.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} quantity
 * @param {{ orderId?: string, buyerId?: string }} opts
 * @returns {{ ok: boolean, product?: object, reason?: string, available?: number }}
 */
export function processSale(guildId, productId, quantity, opts = {}) {
  const product = getProduct(guildId, productId);
  if (!product) return { ok: false, reason: 'product_not_found' };

  // Verifica se há estoque suficiente
  if (product.stock < quantity) {
    return {
      ok: false,
      reason: 'insufficient_stock',
      available: product.stock,
    };
  }

  // Verifica se produto está ativo
  if (product.status === PRODUCT_STATUS.INACTIVE) {
    return { ok: false, reason: 'product_inactive' };
  }

  // Atualiza estoque com baixa (novo estoque = estoque atual - quantidade)
  const newStock = Math.max(0, product.stock - quantity);
  const result = updateProductStock(guildId, productId, newStock);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  // Log da compra
  try {
    logPurchase(guildId, {
      productId,
      buyerId: opts.buyerId ?? 'unknown',
      quantity,
      unitPrice: product.price,
      orderId: opts.orderId ?? null,
    });
  } catch {
    // Erro no log não deve bloquear a venda
  }

  return {
    ok: true,
    product: result.product,
  };
}

/**
 * Verifica se um produto precisa de reposição (estoque baixo).
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {number} threshold
 * @returns {{ needsReplenishment: boolean, stock: number, threshold: number }}
 */
export function checkStockLevel(guildId, productId, threshold = 5) {
  const product = getProduct(guildId, productId);
  if (!product) return { needsReplenishment: false, stock: 0, threshold };

  return {
    needsReplenishment: product.stock > 0 && product.stock <= threshold,
    stock: product.stock,
    threshold,
  };
}

// ── Normalizador interno ──────────────────────────────────────────────────────

function normalize(row) {
  return {
    id:          row.id,
    guildId:     row.guild_id,
    name:        row.name,
    price:       row.price       ?? null,
    stock:       row.stock       ?? 0,
    description: row.description ?? null,
    imageUrl:    row.image_url   ?? null,
    status:      row.status,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}
