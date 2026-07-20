/**
 * Orders — Handler do namespace 'orders' no componentHandler.
 *
 * Ações tratadas:
 *   modal_submit   — submissão do modal de criação de pedido
 *   pick           — seleção de pedido no select menu da listagem
 *   view:<id>      — visualização de um pedido (embed + botões)
 *   status_select:<id> — exibe select menu de alteração de status
 *   status_do:<id> — processa a mudança de status (via select)
 *   cancel:<id>    — exibe confirmação de cancelamento
 *   cancel_ok:<id> — confirma e executa o cancelamento
 *
 * CustomIds (todos ≤ 100 chars com UUID de 36 chars):
 *   orders:modal_submit              (fora do handler — modal submit)
 *   orders:pick                      (select da listagem)
 *   orders:view:UUID                 (botão/select → 48 chars)
 *   orders:status_select:UUID        (botão → 57 chars)
 *   orders:status_do:UUID            (select → 53 chars)
 *   orders:cancel:UUID               (botão → 50 chars)
 *   orders:cancel_ok:UUID            (botão → 53 chars)
 */

import { MessageFlags } from 'discord.js';
import {
  createOrder,
  getOrder,
  updateOrderStatus,
  cancelOrder,
} from '../../database/repositories/Orders.mjs';
import { executeConnections } from '../connections/index.mjs';
import { fireAutomationTrigger } from '../automations/index.mjs';
import {
  parseOrderModal,
  buildOrderEmbed,
  buildViewComponents,
  buildStatusSelectPayload,
  buildCancelConfirmPayload,
  buildSuccessPayload,
  buildErrorPayload,
  STATUS_ACTIONS,
  shortId,
} from './flow.mjs';
import { resolveUserId } from '../proofs/flow.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Roteador ──────────────────────────────────────────────────────────────────

export async function handleOrdersComponent(interaction, action, partes) {
  const orderId = partes[0] ?? null;

  switch (action) {
    case 'modal_submit':    return handleModalSubmit(interaction);
    case 'pick':            return handlePick(interaction);
    case 'view':            return handleView(interaction, orderId);
    case 'status_select':   return handleStatusSelect(interaction, orderId);
    case 'status_do':       return handleStatusDo(interaction, orderId);
    case 'cancel':          return handleCancel(interaction, orderId);
    case 'cancel_ok':       return handleCancelOk(interaction, orderId);
    default:
      logger.warn(`[Orders] Ação desconhecida: '${action}'`);
      await safeReply(interaction, '⚠️ Componente não reconhecido.');
  }
}

// ── Modal Submit ──────────────────────────────────────────────────────────────

async function handleModalSubmit(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply(buildErrorPayload('Este comando só pode ser usado em servidores.'));
      return;
    }

    const { clienteRaw, produto, valor, ticket, notas } = parseOrderModal(interaction);

    if (!clienteRaw) {
      await interaction.editReply(buildErrorPayload('O campo **Cliente** é obrigatório.'));
      return;
    }
    if (!produto) {
      await interaction.editReply(buildErrorPayload('O campo **Produto** é obrigatório.'));
      return;
    }

    const clientId = resolveUserId(clienteRaw);

    const order = createOrder(guildId, {
      vendorId:   interaction.user.id,
      clientId,
      clienteRaw: clientId ? null : clienteRaw,
      produto,
      valor,
      ticketId:   ticket || null,
      notas:      notas  || null,
    });

    // Dispara conexão para 'order_created'
    _fireConnection(guildId, 'order_created', order, interaction);

    logger.info(`[Orders] Pedido criado | guild: ${guildId} | id: ${order.id} | produto: ${order.produto}`);

    await interaction.editReply(buildSuccessPayload(order));

  } catch (err) {
    logger.error('[Orders] Erro em handleModalSubmit:', err);
    await safeEditReply(interaction, buildErrorPayload('Erro interno ao criar o pedido.'));
  }
}

// ── Pick (select da listagem) ─────────────────────────────────────────────────

async function handlePick(interaction) {
  const orderId = interaction.values?.[0];
  if (!orderId) {
    await safeUpdate(interaction, { content: '⚠️ Nenhum pedido selecionado.', components: [] });
    return;
  }
  await handleView(interaction, orderId);
}

// ── View ──────────────────────────────────────────────────────────────────────

async function handleView(interaction, orderId) {
  const guildId = interaction.guildId;
  if (!orderId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Pedido inválido.', components: [], embeds: [] });
    return;
  }

  const order = getOrder(guildId, orderId);
  if (!order) {
    await safeUpdate(interaction, { content: '⚠️ Pedido não encontrado.', components: [], embeds: [] });
    return;
  }

  const embed      = buildOrderEmbed(order);
  const components = buildViewComponents(order);

  await safeUpdate(interaction, { embeds: [embed], components, flags: MessageFlags.Ephemeral });
}

// ── Status Select ─────────────────────────────────────────────────────────────

async function handleStatusSelect(interaction, orderId) {
  const guildId = interaction.guildId;
  if (!orderId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Pedido inválido.', components: [], embeds: [] });
    return;
  }

  const order = getOrder(guildId, orderId);
  if (!order) {
    await safeUpdate(interaction, { content: '⚠️ Pedido não encontrado.', components: [], embeds: [] });
    return;
  }

  await safeUpdate(interaction, buildStatusSelectPayload(order));
}

// ── Status Do (select value = new status) ────────────────────────────────────

async function handleStatusDo(interaction, orderId) {
  const guildId   = interaction.guildId;
  const newStatus = interaction.values?.[0];

  if (!orderId || !guildId || !newStatus) {
    await safeUpdate(interaction, { content: '⚠️ Dados inválidos.', components: [], embeds: [] });
    return;
  }

  const result = updateOrderStatus(guildId, orderId, newStatus);

  if (!result.ok) {
    const msg = result.reason === 'not_found'          ? 'Pedido não encontrado.'
              : result.reason === 'terminal_status'    ? 'Este pedido está em um status terminal.'
              : result.reason === 'invalid_transition' ? 'Transição de status inválida.'
              : 'Não foi possível alterar o status.';
    await safeUpdate(interaction, { content: `❌ ${msg}`, components: [], embeds: [] });
    return;
  }

  const order = result.order;
  const action = STATUS_ACTIONS[newStatus] ?? `order_${newStatus}`;

  // Dispara conexão para o novo status
  _fireConnection(guildId, action, order, interaction);

  // Etapa 16: hook de automações para pedido pago — fire-and-forget
  if (newStatus === 'paid') {
    fireAutomationTrigger('order_paid', {
      guildId,
      userId:      interaction.user.id,
      orderId:     order.id,
      orderStatus: 'paid',
      produto:     order.produto,
    }, interaction.client).catch(err => {
      logger.warn('[Orders] Automation hook error:', err?.message);
    });
  }

  logger.info(`[Orders] Status alterado | guild: ${guildId} | id: ${order.id} | status: ${newStatus}`);

  // Volta ao view do pedido atualizado
  const embed      = buildOrderEmbed(order);
  const components = buildViewComponents(order);
  await safeUpdate(interaction, { embeds: [embed], components, flags: MessageFlags.Ephemeral });
}

// ── Cancel ────────────────────────────────────────────────────────────────────

async function handleCancel(interaction, orderId) {
  const guildId = interaction.guildId;
  if (!orderId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Pedido inválido.', components: [], embeds: [] });
    return;
  }

  const order = getOrder(guildId, orderId);
  if (!order) {
    await safeUpdate(interaction, { content: '⚠️ Pedido não encontrado.', components: [], embeds: [] });
    return;
  }

  await safeUpdate(interaction, buildCancelConfirmPayload(order));
}

// ── Cancel OK ─────────────────────────────────────────────────────────────────

async function handleCancelOk(interaction, orderId) {
  const guildId = interaction.guildId;
  if (!orderId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Pedido inválido.', components: [], embeds: [] });
    return;
  }

  const result = cancelOrder(guildId, orderId);
  if (!result.ok) {
    const msg = result.reason === 'not_found'       ? 'Pedido não encontrado.'
              : result.reason === 'terminal_status' ? 'Este pedido já está em um status terminal.'
              : 'Não foi possível cancelar o pedido.';
    await safeUpdate(interaction, { content: `❌ ${msg}`, components: [], embeds: [] });
    return;
  }

  const order = result.order;

  // Dispara conexão para order_cancelled
  _fireConnection(guildId, 'order_cancelled', order, interaction);

  logger.info(`[Orders] Pedido cancelado | guild: ${guildId} | id: ${order.id}`);

  const embed = buildOrderEmbed(order);
  await safeUpdate(interaction, {
    embeds:     [embed],
    components: [],
    flags:      MessageFlags.Ephemeral,
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/** Dispara executeConnections em background (fire-and-forget). */
function _fireConnection(guildId, action, order, interaction) {
  const context = {
    guildId,
    vendedor:   interaction.user,
    cliente:    order.clientId ?? order.clienteRaw,
    produto:    order.produto,
    valor:      order.valor,
    ticket:     order.ticketId,
    pedido_id:  order.id,
    pedido:     shortId(order.id),
    status:     order.status,
    channel:    interaction.channel,
  };
  executeConnections(action, context, interaction.client).catch(err => {
    logger.error(`[Orders] Erro ao executar conexão '${action}':`, err?.message ?? err);
  });
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

async function safeEditReply(interaction, content) {
  try { await interaction.editReply(content); }
  catch { await safeReply(interaction, content); }
}
