/**
 * Stock — Handler de componentes (namespace 'stock').
 *
 * Ações roteadas:
 *   select:<sid>       — seleção de ação no painel principal
 *   main_select:<sid>  — seleção no menu principal
 *   view:<pid>         — ver detalhes de estoque do produto
 *   add:<pid>          — abrir modal para adicionar estoque
 *   adjust:<pid>       — abrir modal para ajustar estoque
 *   history:<pid>      — ver histórico de movimentações
 *   back:<sid>         — voltar ao painel principal
 *   quick_replenish    — reposição rápida via select
 *
 * Modais:
 *   stock:adjust_modal:<pid>     — submit do ajuste
 *   stock:replenish_modal:<pid>  — submit da reposição
 *   stock:change_modal:<pid>:<isRemoval> — submit de alteração rápida
 */

import { MessageFlags } from 'discord.js';
import {
  getStockReport,
  getLowStockProducts,
  getOutOfStockProducts,
  getProduct,
  listProducts,
  addStock,
  removeStock,
  setStock,
  listMovements,
  getMovementSummary,
  normalizeMovement,
  STOCK_REFERENCE_TYPE,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../../database/repositories/Stock.mjs';
import { logAudit } from '../../modules/audit/index.mjs';
import {
  buildStockPayload,
  buildStockComponents,
  buildAdjustmentModal,
  buildReplenishModal,
  buildStockSuccessPayload,
  buildStockErrorPayload,
  buildMovementHistoryEmbed,
  buildLowStockPayload,
  getStockStatus,
  STOCK_STATUS_LABELS,
  shortId,
} from './flow.mjs';
import { createSession, getSession } from '../../core/sessionManager.mjs';
import { logger } from '../../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';

const MODULE_NAME = 'stock';

/**
 * Verifica permissão do módulo stock para o usuário.
 * Retorna true se o usuário tem permissão, false caso contrário.
 */
function checkPermission(interaction) {
  if (!interaction.member || !interaction.guildId) {
    return false;
  }
  return hasModulePermission(interaction.guildId, MODULE_NAME, interaction.member);
}

// ── Roteador ──────────────────────────────────────────────────────────────────

export async function handleStockComponent(interaction, action, partes) {
  // main_select:<sessionId>
  if (action === 'main_select') {
    return handleMainSelect(interaction, partes[0]);
  }

  // select:<sessionId>
  if (action === 'select') {
    return handleSelect(interaction, partes[0]);
  }

  // quick_replenish
  if (action === 'quick_replenish') {
    return handleQuickReplenish(interaction);
  }

  const [firstAction, ...rest] = action.split('_');
  const sessionId = partes[0];
  const productId = firstAction === 'back' ? null : action.split(':')[1]?.split('_')[0];

  switch (firstAction) {
    case 'view':
      return handleView(interaction, rest[0]);
    case 'add':
      return handleAdd(interaction, rest[0]);
    case 'adjust':
      return handleAdjust(interaction, rest[0]);
    case 'history':
      return handleHistory(interaction, rest[0]);
    case 'back':
      return handleBack(interaction, sessionId);
    default:
      logger.warn(`[Stock] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Handlers de Select ────────────────────────────────────────────────────────

async function handleMainSelect(interaction, sessionId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const value = interaction.values?.[0];
  if (!value) {
    await safeUpdate(interaction, { content: '⚠️ Nenhuma opção selecionada.', components: [] });
    return;
  }

  const guildId = interaction.guildId;

  switch (value) {
    case 'report':
      // Já está mostrando o relatório geral
      await safeUpdate(interaction, { content: '📦 Você já está vendo o relatório geral.' });
      return;

    case 'low': {
      const lowStock = getLowStockProducts(guildId, 20);
      const payload = buildLowStockPayload(lowStock, DEFAULT_LOW_STOCK_THRESHOLD);
      await safeUpdate(interaction, payload);
      return;
    }

    case 'out': {
      const outOfStock = getOutOfStockProducts(guildId);
      const embed = buildStockPayload(null, {
        inStock: [],
        lowStock: [],
        outOfStock,
      }).embeds[0];

      await safeUpdate(interaction, {
        embeds: [embed],
        components: [],
      });
      return;
    }

    case 'all_movements': {
      // Mostra todas as movimentações recentes
      const { listAllMovements } = await import('../../database/repositories/Stock.mjs');
      const movements = listAllMovements(guildId, { limit: 50 });

      const embed = new (await import('discord.js')).EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Todas as Movimentações')
        .setTimestamp();

      if (movements.length === 0) {
        embed.setDescription('Nenhuma movimentação registrada.');
      } else {
        const lines = movements.slice(0, 20).map(m => {
          const typeLabel = {
            entry: '📥',
            exit: '📤',
            adjustment: '⚙️',
            replenishment: '🔄',
          }[m.type] ?? '📦';
          const date = new Date(m.created_at * 1000).toLocaleDateString('pt-BR');
          const name = m.product_name ?? shortId(m.product_id);
          return `${typeLabel} **${name}** — ${m.quantity} unidades — ${date}`;
        });
        embed.setDescription(lines.join('\n'));
      }

      await safeUpdate(interaction, {
        embeds: [embed],
        components: [],
      });
      return;
    }

    default:
      await safeUpdate(interaction, { content: '⚠️ Opção não reconhecida.' });
  }
}

async function handleSelect(interaction, sessionId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const value = interaction.values?.[0];
  if (!value) {
    await safeUpdate(interaction, { content: '⚠️ Nenhuma opção selecionada.', components: [] });
    return;
  }

  const [action, productId] = value.split(':');
  const guildId = interaction.guildId;

  switch (action) {
    case 'view':
    case 'add':
    case 'adjust':
    case 'history':
      // Redireciona para o handler apropriado
      return handleStockAction(interaction, action, productId);
    default:
      await safeUpdate(interaction, { content: '⚠️ Ação não reconhecida.' });
  }
}

async function handleStockAction(interaction, action, productId) {
  const guildId = interaction.guildId;

  switch (action) {
    case 'view':
      return handleView(interaction, productId);
    case 'add':
      return handleAdd(interaction, productId);
    case 'adjust':
      return handleAdjust(interaction, productId);
    case 'history':
      return handleHistory(interaction, productId);
    default:
      await safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Handlers de Ação ─────────────────────────────────────────────────────────

async function handleView(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const guildId = interaction.guildId;

  const product = getProduct(guildId, productId);
  if (!product) {
    await safeReply(interaction, '⚠️ Produto não encontrado.');
    return;
  }

  const sessionId = createSession(interaction.user.id, guildId, MODULE_NAME, { productId }).sessionId;
  const report = getStockReport(guildId);
  const payload = buildStockPayload(sessionId, report);

  // Mostra detalhes do produto selecionado
  const status = getStockStatus(product.stock);
  const statusLabel = STOCK_STATUS_LABELS[status];

  const detailEmbed = new (await import('discord.js')).EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📦 ${product.name}`)
    .setDescription(`**Estoque atual:** ${product.stock} unidades\n**Status:** ${statusLabel}`)
    .setTimestamp();

  const components = buildStockComponents(guildId, productId, sessionId);

  await interaction.update({
    embeds: [detailEmbed, payload.embeds[0]],
    components,
  });
}

async function handleAdd(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const guildId = interaction.guildId;

  const product = getProduct(guildId, productId);
  if (!product) {
    await safeReply(interaction, '⚠️ Produto não encontrado.');
    return;
  }

  const modal = buildReplenishModal(productId, product.name, product.stock);
  await interaction.showModal(modal);
}

async function handleAdjust(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const guildId = interaction.guildId;

  const product = getProduct(guildId, productId);
  if (!product) {
    await safeReply(interaction, '⚠️ Produto não encontrado.');
    return;
  }

  const modal = buildAdjustmentModal(productId, product.name, product.stock);
  await interaction.showModal(modal);
}

async function handleHistory(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const guildId = interaction.guildId;

  const product = getProduct(guildId, productId);
  if (!product) {
    await safeReply(interaction, '⚠️ Produto não encontrado.');
    return;
  }

  const movements = listMovements(guildId, productId, { limit: 20 });
  const summary = getMovementSummary(guildId, productId);

  const normalizedMovements = movements.map(normalizeMovement);
  const embed = buildMovementHistoryEmbed(normalizedMovements, product.name, summary);

  await interaction.update({
    embeds: [embed],
    components: [],
  });
}

async function handleBack(interaction, sessionId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const guildId = interaction.guildId;
  const report = getStockReport(guildId);
  const payload = buildStockPayload(sessionId, report);

  await interaction.update(payload);
}

// ── Quick Replenish ───────────────────────────────────────────────────────────

async function handleQuickReplenish(interaction) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const productId = interaction.values?.[0];
  if (!productId) {
    await safeReply(interaction, '⚠️ Nenhum produto selecionado.');
    return;
  }

  // Abre modal para adicionar quantidade
  const product = getProduct(interaction.guildId, productId);
  if (!product) {
    await safeReply(interaction, '⚠️ Produto não encontrado.');
    return;
  }

  const modal = buildReplenishModal(productId, product.name, product.stock);
  await interaction.showModal(modal);
}

// ── Modais ────────────────────────────────────────────────────────────────────

/**
 * Processa o modal de ajuste de estoque.
 */
export async function handleStockAdjustModal(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    await interaction.reply({
      content: buildDeniedMessage(MODULE_NAME),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const newQuantityStr = interaction.fields.getTextInputValue('new_quantity');
    const reason = interaction.fields.getTextInputValue('reason') || null;

    const newQuantity = parseInt(newQuantityStr, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      await interaction.editReply({ content: '❌ Quantidade inválida. Digite um número maior ou igual a 0.' });
      return;
    }

    const product = getProduct(guildId, productId);
    if (!product) {
      await interaction.editReply({ content: '❌ Produto não encontrado.' });
      return;
    }

    const previousStock = product.stock;

    const result = setStock(guildId, productId, newQuantity, {
      reason,
      actorId: interaction.user.id,
    });

    if (!result.ok) {
      await interaction.editReply({ content: `❌ Não foi possível ajustar o estoque: ${result.reason}` });
      return;
    }

    // Log de auditoria
    logAudit(guildId, {
      actorId: interaction.user.id,
      module: MODULE_NAME,
      action: 'stock_adjusted',
      entity: 'product',
      entityId: productId,
      beforeData: { stock: previousStock },
      afterData: { stock: newQuantity },
    });

    logger.info(`[Stock] Estoque ajustado | guild: ${guildId} | produto: ${product.name} | ${previousStock} → ${newQuantity}`);

    const payload = buildStockSuccessPayload(result.product, previousStock, newQuantity);
    await interaction.editReply(payload);

  } catch (err) {
    logger.error('[Stock] Erro ao ajustar estoque:', err);
    await interaction.editReply({ content: '❌ Erro interno ao ajustar estoque.' });
  }
}

/**
 * Processa o modal de reposição de estoque.
 */
export async function handleStockReplenishModal(interaction, productId) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    await interaction.reply({
      content: buildDeniedMessage(MODULE_NAME),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const quantityStr = interaction.fields.getTextInputValue('quantity');
    const reason = interaction.fields.getTextInputValue('reason') || null;

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      await interaction.editReply({ content: '❌ Quantidade inválida. Digite um número maior que 0.' });
      return;
    }

    const product = getProduct(guildId, productId);
    if (!product) {
      await interaction.editReply({ content: '❌ Produto não encontrado.' });
      return;
    }

    const previousStock = product.stock;

    const result = addStock(guildId, productId, quantity, {
      referenceType: STOCK_REFERENCE_TYPE.MANUAL,
      reason,
      actorId: interaction.user.id,
    });

    if (!result.ok) {
      await interaction.editReply({ content: `❌ Não foi possível repor o estoque: ${result.reason}` });
      return;
    }

    // Log de auditoria
    logAudit(guildId, {
      actorId: interaction.user.id,
      module: MODULE_NAME,
      action: 'stock_replenished',
      entity: 'product',
      entityId: productId,
      beforeData: { stock: previousStock },
      afterData: { stock: result.product.stock },
    });

    logger.info(`[Stock] Estoque reposto | guild: ${guildId} | produto: ${product.name} | +${quantity}`);

    const payload = buildStockSuccessPayload(result.product, previousStock, result.product.stock);
    await interaction.editReply(payload);

  } catch (err) {
    logger.error('[Stock] Erro ao repor estoque:', err);
    await interaction.editReply({ content: '❌ Erro interno ao repor estoque.' });
  }
}

/**
 * Processa o modal de alteração de estoque (adição ou remoção).
 */
export async function handleStockChangeModal(interaction, productId, isRemovalStr) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    await interaction.reply({
      content: buildDeniedMessage(MODULE_NAME),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const isRemoval = isRemovalStr === '1';
    const quantityStr = interaction.fields.getTextInputValue('quantity');

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      await interaction.editReply({
        content: `❌ Quantidade inválida. Digite um número maior que 0.`,
      });
      return;
    }

    const product = getProduct(guildId, productId);
    if (!product) {
      await interaction.editReply({ content: '❌ Produto não encontrado.' });
      return;
    }

    const previousStock = product.stock;
    let result;

    if (isRemoval) {
      result = removeStock(guildId, productId, quantity, {
        referenceType: STOCK_REFERENCE_TYPE.MANUAL,
        actorId: interaction.user.id,
      });
    } else {
      result = addStock(guildId, productId, quantity, {
        referenceType: STOCK_REFERENCE_TYPE.MANUAL,
        actorId: interaction.user.id,
      });
    }

    if (!result.ok) {
      if (result.reason === 'insufficient_stock') {
        await interaction.editReply({
          content: `❌ Estoque insuficiente. Disponível: ${result.available}, solicitado: ${result.requested}`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Não foi possível ${isRemoval ? 'remover' : 'adicionar'} estoque: ${result.reason}`,
        });
      }
      return;
    }

    // Log de auditoria
    logAudit(guildId, {
      actorId: interaction.user.id,
      module: MODULE_NAME,
      action: isRemoval ? 'stock_removed' : 'stock_added',
      entity: 'product',
      entityId: productId,
      beforeData: { stock: previousStock },
      afterData: { stock: result.product.stock },
    });

    logger.info(`[Stock] Estoque ${isRemoval ? 'removido' : 'adicionado'} | guild: ${guildId} | produto: ${product.name} | ${isRemoval ? '-' : '+'}${quantity}`);

    const payload = buildStockSuccessPayload(result.product, previousStock, result.product.stock);
    await interaction.editReply(payload);

  } catch (err) {
    logger.error('[Stock] Erro ao alterar estoque:', err);
    await interaction.editReply({ content: '❌ Erro interno ao alterar estoque.' });
  }
}

// ── Utilitários ────────────────────────────────────────────────────────────────

async function safeReply(interaction, content) {
  const payload = typeof content === 'string' ? { content, flags: MessageFlags.Ephemeral } : content;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* expirada */ }
}

async function safeUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else if (typeof interaction.update === 'function') {
      await interaction.update(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch { /* expirada */ }
}
