/**
 * Orders — Ponto de entrada público do módulo.
 *
 * Exporta:
 *   registerOrdersHandler  — registra namespace + ações de Connection (boot)
 *   openOrdersList         — responde ao /pedido listar
 *   buildOrderModal        — constrói o modal de criação
 *   MODAL_CUSTOM_ID        — customId do modal
 *
 * Uso em src/index.mjs:
 *   import { registerOrdersHandler } from './modules/orders/index.mjs';
 *   registerOrdersHandler();
 */

import { MessageFlags } from 'discord.js';
import { register }                from '../../handlers/componentHandler.mjs';
import { registerAction }          from '../connections/index.mjs';
import { handleOrdersComponent }   from './actions.mjs';
import { listOrders }              from '../../database/repositories/Orders.mjs';
import { registerVariable }        from '../variables/index.mjs';
import {
  buildOrderModal,
  buildOrderListEmbed,
  buildOrderPickRow,
  MODAL_CUSTOM_ID,
  STATUS_ACTIONS,
  STATUS_LABELS,
} from './flow.mjs';
import { logger } from '../../utils/logger.mjs';

// Re-exporta para uso externo
export { buildOrderModal, MODAL_CUSTOM_ID };

// ── Boot ──────────────────────────────────────────────────────────────────────

/**
 * Registra o módulo de pedidos no boot do bot.
 * Deve ser chamado UMA ÚNICA VEZ em src/index.mjs.
 *
 * Registra:
 *   - Ações de Connection para cada evento de pedido
 *   - Namespace 'orders' no componentHandler
 *   - Variáveis {pedido}, {pedido_id}, {status} no sistema de variáveis
 */
export function registerOrdersHandler() {
  // Registra todas as ações de Connection de pedidos
  const actionDefs = [
    { name: 'order_created',          label: '🛒 Pedido Criado',               description: 'Disparado quando um novo pedido é criado' },
    { name: 'order_awaiting_payment', label: '💳 Aguardando Pagamento',        description: 'Disparado quando o pedido aguarda pagamento' },
    { name: 'order_paid',             label: '✅ Pedido Pago',                  description: 'Disparado quando o pagamento é confirmado' },
    { name: 'order_processing',       label: '⚙️ Pedido em Processamento',     description: 'Disparado quando o pedido entra em processamento' },
    { name: 'order_delivered',        label: '📦 Pedido Entregue',             description: 'Disparado quando o pedido é entregue' },
    { name: 'order_completed',        label: '🏆 Pedido Concluído',            description: 'Disparado quando o pedido é concluído' },
    { name: 'order_cancelled',        label: '❌ Pedido Cancelado',            description: 'Disparado quando o pedido é cancelado' },
  ];

  for (const def of actionDefs) {
    registerAction(def.name, { label: def.label, description: def.description });
  }

  // Registra namespace no componentHandler
  register('orders', handleOrdersComponent);

  // Registra variáveis específicas de pedidos
  // {pedido}    — ID curto (primeiros 8 chars do UUID)
  // {pedido_id} — UUID completo
  // {status}    — rótulo do status atual
  registerVariable('pedido',    ctx => ctx.pedido    != null ? String(ctx.pedido)    : null);
  registerVariable('pedido_id', ctx => ctx.pedido_id != null ? String(ctx.pedido_id) : null);
  registerVariable('status',    ctx => {
    if (ctx.status == null) return null;
    return STATUS_LABELS[ctx.status] ?? String(ctx.status);
  });

  logger.info('[Orders] Handler registrado. 7 ações de Connection registradas. Variáveis {pedido}, {pedido_id}, {status} disponíveis.');
}

// ── Comando /pedido listar ────────────────────────────────────────────────────

/**
 * Responde ao /pedido listar com embed + select menu de seleção.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openOrdersList(interaction) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: '❌ Este comando só pode ser usado em servidores.',
      flags:   MessageFlags.Ephemeral,
    });
    return;
  }

  const orders    = listOrders(guildId, { limit: 25 });
  const embed     = buildOrderListEmbed(orders);
  const pickRow   = buildOrderPickRow(orders);
  const components = pickRow ? [pickRow] : [];

  await interaction.reply({
    embeds:     [embed],
    components,
    flags:      MessageFlags.Ephemeral,
  });
}
