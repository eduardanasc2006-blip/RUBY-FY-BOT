/**
 * Sistema de Produtos e Estoque — Lógica central (Etapa 17B).
 *
 * Funções reutilizadas pelo handler de componentes, comandos slash e prefix.
 *
 * Responsabilidades:
 *   - buildProductEmbed      — embed de exibição de um produto
 *   - buildProductListEmbed  — embed de listagem de produtos
 *   - buildPurchaseEmbed     — embed de confirmação de compra
 *   - processPurchase        — fluxo completo de compra com validações
 *   - formatStock            — formata estoque para exibição
 */

import { EmbedBuilder } from 'discord.js';
import { adjustStock, logPurchase, PRODUCT_STATUS } from '../../database/repositories/Products.mjs';
import { createOrder }                               from '../../database/repositories/Orders.mjs';
import { getClientByDiscordId }                      from '../../database/repositories/Clients.mjs';
import { logger }                                    from '../../utils/logger.mjs';

// ── buildProductEmbed ─────────────────────────────────────────────────────────

/**
 * Constrói o embed de exibição de um produto.
 *
 * @param {object} product — objeto normalizado do repositório
 * @returns {import('discord.js').EmbedBuilder}
 */
export function buildProductEmbed(product) {
  const statusColor = {
    [PRODUCT_STATUS.ACTIVE]:       0x57F287,
    [PRODUCT_STATUS.INACTIVE]:     0x99AAB5,
    [PRODUCT_STATUS.OUT_OF_STOCK]: 0xED4245,
  };
  const statusLabel = {
    [PRODUCT_STATUS.ACTIVE]:       '✅ Disponível',
    [PRODUCT_STATUS.INACTIVE]:     '⏸️ Inativo',
    [PRODUCT_STATUS.OUT_OF_STOCK]: '❌ Esgotado',
  };

  const embed = new EmbedBuilder()
    .setColor(statusColor[product.status] ?? 0x99AAB5)
    .setTitle(`🛒 ${product.name}`)
    .addFields(
      { name: '💰 Preço',   value: product.price ?? '—',  inline: true },
      { name: '📦 Estoque', value: formatStock(product), inline: true },
      { name: '📊 Status',  value: statusLabel[product.status] ?? product.status, inline: true },
    );

  if (product.description) {
    embed.setDescription(product.description.slice(0, 2048));
  }

  if (product.imageUrl) {
    try { embed.setThumbnail(product.imageUrl); } catch { /* ignorado */ }
  }

  embed.setFooter({ text: `ID: ${product.id.slice(0, 8)}...` });
  return embed;
}

// ── buildProductListEmbed ─────────────────────────────────────────────────────

/**
 * Constrói o embed de listagem de produtos.
 *
 * @param {object[]} products — lista normalizada
 * @param {{ page?: number, total?: number, perPage?: number }} opts
 * @returns {import('discord.js').EmbedBuilder}
 */
export function buildProductListEmbed(products, { page = 0, total = 0, perPage = 8 } = {}) {
  const pages = Math.max(1, Math.ceil(total / perPage));

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🛍️ Catálogo de Produtos')
    .setDescription(
      total === 0
        ? '*Nenhum produto cadastrado ainda.*'
        : `Página **${page + 1}/${pages}** — total: **${total}**`,
    );

  for (const p of products) {
    const statusEmoji = {
      [PRODUCT_STATUS.ACTIVE]:       '✅',
      [PRODUCT_STATUS.INACTIVE]:     '⏸️',
      [PRODUCT_STATUS.OUT_OF_STOCK]: '❌',
    }[p.status] ?? '•';

    embed.addFields({
      name:  `${statusEmoji} ${p.name}`,
      value: `💰 ${p.price ?? '—'} · 📦 ${formatStock(p)}`,
      inline: true,
    });
  }

  return embed;
}

// ── buildPurchaseEmbed ────────────────────────────────────────────────────────

/**
 * Constrói o embed de confirmação de compra.
 *
 * @param {object} product
 * @param {number} quantity
 * @param {{ stockBefore: number, stockAfter: number, orderId?: string }} meta
 * @returns {import('discord.js').EmbedBuilder}
 */
export function buildPurchaseEmbed(product, quantity, { stockBefore, stockAfter, orderId } = {}) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🛒 Pedido Criado')
    .addFields(
      { name: '📦 Produto',          value: product.name,          inline: true },
      { name: '🔢 Quantidade',        value: `${quantity}`,          inline: true },
      { name: '💰 Valor unitário',    value: product.price ?? '—',  inline: true },
      { name: '📊 Estoque inicial',   value: `${stockBefore} un.`,  inline: true },
      { name: '📉 Estoque restante',  value: `${stockAfter} un.`,   inline: true },
    );

  if (orderId) {
    embed.addFields({ name: '🆔 Pedido', value: `\`${orderId.slice(0, 8)}...\``, inline: true });
  }

  if (product.imageUrl) {
    try { embed.setThumbnail(product.imageUrl); } catch { /* ignorado */ }
  }

  return embed;
}

// ── processPurchase ───────────────────────────────────────────────────────────

/**
 * Processa uma compra completa.
 *
 * Fluxo:
 *   1. Valida status do produto (ativo, não inativo)
 *   2. Valida estoque suficiente para a quantidade pedida
 *   3. Reduz o estoque atomicamente
 *   4. Cria um Order no módulo de pedidos
 *   5. Tenta associar um Client pelo Discord ID do comprador
 *   6. Registra o log de compra
 *
 * @param {string} guildId
 * @param {{
 *   product:    object,
 *   buyerId:    string,
 *   buyerTag:   string,
 *   quantity:   number,
 *   vendorId?:  string,
 * }} params
 * @returns {{ ok: boolean, reason?: string, order?: object, product?: object, stockBefore: number, stockAfter: number }}
 */
export async function processPurchase(guildId, { product, buyerId, buyerTag, quantity = 1, vendorId = null }) {
  const stockBefore = product.stock;

  // 1. Produto deve estar ativo
  if (product.status === PRODUCT_STATUS.INACTIVE) {
    return { ok: false, reason: 'product_inactive', stockBefore, stockAfter: stockBefore };
  }

  // 2. Estoque suficiente
  if (product.stock < quantity) {
    return {
      ok:          false,
      reason:      'insufficient_stock',
      stock:       product.stock,
      stockBefore,
      stockAfter:  stockBefore,
    };
  }

  // 3. Reduz estoque
  const stockResult = adjustStock(guildId, product.id, -quantity);
  if (!stockResult.ok) {
    return { ok: false, reason: stockResult.reason ?? 'stock_error', stockBefore, stockAfter: stockBefore };
  }

  const stockAfter = stockResult.product.stock;

  // 4. Cria Order
  let order = null;
  try {
    // Tenta achar o cliente pelo Discord ID
    let clientId = null;
    try {
      const client = getClientByDiscordId(guildId, buyerId);
      clientId = client?.id ?? null;
    } catch { /* ignorado */ }

    order = createOrder(guildId, {
      vendorId:   vendorId ?? buyerId,
      clientId,
      clienteRaw: buyerTag,
      produto:    `${product.name}${quantity > 1 ? ` (x${quantity})` : ''}`,
      valor:      product.price,
    });
  } catch (err) {
    logger.warn('[Products] Erro ao criar Order:', err?.message);
  }

  // 5. Loga compra
  try {
    logPurchase(guildId, {
      productId:  product.id,
      buyerId,
      quantity,
      unitPrice:  product.price,
      orderId:    order?.id ?? null,
    });
  } catch (err) {
    logger.warn('[Products] Erro ao registrar log de compra:', err?.message);
  }

  logger.info(`[Products] Compra processada | produto: ${product.id} | qtd: ${quantity} | comprador: ${buyerId} | guild: ${guildId}`);

  return {
    ok:    true,
    order,
    product: stockResult.product,
    stockBefore,
    stockAfter,
  };
}

// ── Utilitário ────────────────────────────────────────────────────────────────

/**
 * Formata o estoque para exibição.
 * "Ilimitado" não está implementado nesta versão — sempre exibe número.
 *
 * @param {object} product
 * @returns {string}
 */
export function formatStock(product) {
  if (product.stock === 0) return '**0** (esgotado)';
  return `**${product.stock}** un.`;
}
