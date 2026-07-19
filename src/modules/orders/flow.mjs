/**
 * Orders — Funções de fluxo puras.
 *
 * IMPORTANTE: Este arquivo NÃO importa database/client.mjs nem config/bot.mjs.
 * Todas as funções são puras e testáveis sem banco de dados.
 *
 * Responsabilidades:
 *   - STATUS_LABELS          — mapeamento status → rótulo humano
 *   - STATUS_COLORS          — mapeamento status → cor do embed
 *   - VALID_TRANSITIONS      — mapeamento status → próximos estados válidos
 *   - STATUS_ACTIONS         — mapeamento status → ação de Connection
 *   - isValidTransition      — valida se uma transição é permitida
 *   - isTerminal             — verifica se o status é terminal
 *   - buildOrderModal        — ModalBuilder para criação de pedido
 *   - parseOrderModal        — extrai campos do modal submetido
 *   - buildOrderEmbed        — embed de detalhes de um pedido
 *   - buildOrderListEmbed    — embed de listagem de pedidos
 *   - buildOrderListComponents — componentes da listagem (select menu)
 *   - buildViewComponents    — botões de gerenciamento do pedido
 *   - buildStatusSelectPayload — select menu para alterar status
 *   - buildCancelConfirmPayload — confirmação de cancelamento
 *   - buildSuccessPayload    — payload ephemeral de sucesso
 *   - buildErrorPayload      — payload ephemeral de erro
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags,
} from 'discord.js';

// ── Constantes ────────────────────────────────────────────────────────────────

/** CustomId do modal de criação de pedido. */
export const MODAL_CUSTOM_ID = 'orders:modal_submit';

/** Rótulos legíveis para cada status. */
export const STATUS_LABELS = {
  pending:          '⏳ Pendente',
  awaiting_payment: '💳 Aguardando Pagamento',
  paid:             '✅ Pago',
  processing:       '⚙️ Em Processamento',
  delivered:        '📦 Entregue',
  completed:        '🏆 Concluído',
  cancelled:        '❌ Cancelado',
};

/** Cores do embed por status. */
export const STATUS_COLORS = {
  pending:          0xFEE75C,  // amarelo
  awaiting_payment: 0xEB459E,  // rosa
  paid:             0x57F287,  // verde
  processing:       0x0099FF,  // azul claro
  delivered:        0x9B59B6,  // roxo
  completed:        0x57F287,  // verde
  cancelled:        0xED4245,  // vermelho
};

/**
 * Transições de status válidas.
 * Um status terminal (completed, cancelled) tem array vazio.
 */
export const VALID_TRANSITIONS = {
  pending:          ['awaiting_payment', 'paid', 'processing', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid:             ['processing', 'delivered', 'completed', 'cancelled'],
  processing:       ['delivered', 'completed', 'cancelled'],
  delivered:        ['completed', 'cancelled'],
  completed:        [],
  cancelled:        [],
};

/**
 * Ação de Connection disparada ao entrar em cada status.
 * order_created é disparado na criação (status inicial = pending).
 */
export const STATUS_ACTIONS = {
  pending:          'order_created',
  awaiting_payment: 'order_awaiting_payment',
  paid:             'order_paid',
  processing:       'order_processing',
  delivered:        'order_delivered',
  completed:        'order_completed',
  cancelled:        'order_cancelled',
};

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Verifica se a transição de status é permitida.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Verifica se o status é terminal (sem transições possíveis).
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminal(status) {
  const transitions = VALID_TRANSITIONS[status];
  return Array.isArray(transitions) && transitions.length === 0;
}

/**
 * Retorna os primeiros N caracteres do UUID como ID curto de exibição.
 * @param {string} id UUID completo
 * @param {number} len Comprimento desejado (padrão: 8)
 * @returns {string}
 */
export function shortId(id, len = 8) {
  return id?.slice(0, len) ?? '?';
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Constrói o modal de criação de pedido.
 *
 * Campos (5):
 *   1. cliente_id  — menção ou ID do cliente (obrigatório)
 *   2. produto     — nome do produto/serviço (obrigatório)
 *   3. valor       — valor do pedido (opcional)
 *   4. ticket      — referência do ticket relacionado (opcional)
 *   5. notas       — observações adicionais (opcional, parágrafo)
 *
 * @returns {ModalBuilder}
 */
export function buildOrderModal() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL_CUSTOM_ID)
    .setTitle('🛒 Criar Pedido');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cliente_id')
        .setLabel('Cliente')
        .setPlaceholder('@usuário ou ID do Discord')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('produto')
        .setLabel('Produto')
        .setPlaceholder('Nome do produto ou serviço')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Valor (opcional)')
        .setPlaceholder('Ex: R$ 50,00')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ticket')
        .setLabel('Ticket relacionado (opcional)')
        .setPlaceholder('ID ou número do ticket')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('notas')
        .setLabel('Observações (opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500),
    ),
  );

  return modal;
}

// ── Parse do modal ────────────────────────────────────────────────────────────

/**
 * Extrai e sanitiza os campos do modal de pedido.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @returns {{
 *   clienteRaw: string,
 *   produto:    string,
 *   valor:      string|null,
 *   ticket:     string|null,
 *   notas:      string|null,
 * }}
 */
export function parseOrderModal(interaction) {
  const get = (id) => {
    try { return interaction.fields.getTextInputValue(id)?.trim() || null; }
    catch { return null; }
  };
  return {
    clienteRaw: get('cliente_id') ?? '',
    produto:    get('produto')    ?? '',
    valor:      get('valor')      || null,
    ticket:     get('ticket')     || null,
    notas:      get('notas')      || null,
  };
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Constrói o embed de detalhes de um pedido.
 *
 * @param {object} order  Pedido normalizado do repositório
 * @returns {EmbedBuilder}
 */
export function buildOrderEmbed(order) {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const color       = STATUS_COLORS[order.status]  ?? 0x5865F2;
  const sid         = shortId(order.id);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🛒 Pedido #${sid}`)
    .setTimestamp(new Date(order.createdAt * 1000));

  const clienteDisplay = order.clientId
    ? `<@${order.clientId}>`
    : (order.clienteRaw || '—');

  const fields = [
    { name: '📋 Status',   value: statusLabel,                      inline: true  },
    { name: '🧑‍💼 Vendedor', value: `<@${order.vendorId}>`,           inline: true  },
    { name: '👤 Cliente',  value: clienteDisplay,                   inline: true  },
    { name: '📦 Produto',  value: order.produto   || '—',           inline: false },
  ];

  if (order.valor) {
    fields.push({ name: '💰 Valor', value: order.valor, inline: true });
  }
  if (order.ticketId) {
    fields.push({ name: '🎫 Ticket', value: String(order.ticketId), inline: true });
  }
  if (order.notas) {
    fields.push({ name: '📝 Observações', value: order.notas, inline: false });
  }

  embed.addFields(fields);
  embed.setFooter({ text: `ID: ${order.id}` });
  return embed;
}

/**
 * Constrói o embed de listagem de pedidos.
 *
 * @param {object[]} orders
 * @returns {EmbedBuilder}
 */
export function buildOrderListEmbed(orders) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🛒 Pedidos Recentes')
    .setTimestamp();

  if (!orders || orders.length === 0) {
    embed.setDescription('Nenhum pedido registrado ainda neste servidor.');
    return embed;
  }

  const lines = orders.slice(0, 25).map((o, i) => {
    const date   = new Date(o.createdAt * 1000).toLocaleDateString('pt-BR');
    const status = STATUS_LABELS[o.status] ?? o.status;
    const sid    = shortId(o.id);
    return `**${i + 1}.** \`#${sid}\` ${status} — \`${o.produto ?? '—'}\` — ${date}`;
  });

  embed.setDescription(lines.join('\n'));

  if (orders.length > 25) {
    embed.setFooter({ text: `Mostrando 25 de ${orders.length} pedidos` });
  }

  return embed;
}

// ── Componentes ───────────────────────────────────────────────────────────────

/**
 * Constrói o select menu para escolher um pedido da lista.
 * Retorna null se não houver pedidos.
 *
 * @param {object[]} orders
 * @returns {ActionRowBuilder|null}
 */
export function buildOrderPickRow(orders) {
  if (!orders || orders.length === 0) return null;

  const options = orders.slice(0, 25).map(o => ({
    label:       `#${shortId(o.id)} — ${(o.produto ?? 'Sem produto').slice(0, 50)}`,
    description: STATUS_LABELS[o.status] ?? o.status,
    value:       o.id,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('orders:pick')
    .setPlaceholder('Selecione um pedido para gerenciar')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

/**
 * Constrói os botões de ação de um pedido aberto.
 * Retorna um array vazio se o status for terminal.
 *
 * @param {object} order
 * @returns {ActionRowBuilder[]}
 */
export function buildViewComponents(order) {
  if (isTerminal(order.status)) return [];

  const id = order.id;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`orders:status_select:${id}`)
      .setLabel('Alterar Status')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`orders:cancel:${id}`)
      .setLabel('Cancelar Pedido')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );

  return [row];
}

/**
 * Constrói o payload do select menu de alteração de status.
 *
 * @param {object} order
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[], flags: number }}
 */
export function buildStatusSelectPayload(order) {
  const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];

  const embed = new EmbedBuilder()
    .setColor(STATUS_COLORS[order.status] ?? 0x5865F2)
    .setTitle(`🔄 Alterar Status — Pedido #${shortId(order.id)}`)
    .setDescription(
      `**Status atual:** ${STATUS_LABELS[order.status] ?? order.status}\n\n` +
      'Selecione o novo status abaixo:',
    );

  if (nextStatuses.length === 0) {
    return {
      embeds: [embed.setDescription('Este pedido está em um status terminal e não pode ser alterado.')],
      components: [],
      flags: MessageFlags.Ephemeral,
    };
  }

  const options = nextStatuses.map(s => ({
    label:       STATUS_LABELS[s] ?? s,
    value:       s,
    description: s === 'cancelled' ? 'Encerra o pedido definitivamente' : undefined,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`orders:status_do:${order.id}`)
    .setPlaceholder('Escolha o novo status...')
    .addOptions(options);

  const backBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`orders:view:${order.id}`)
      .setLabel('Voltar')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds:     [embed],
    components: [new ActionRowBuilder().addComponents(select), backBtn],
    flags:      MessageFlags.Ephemeral,
  };
}

/**
 * Constrói o payload de confirmação de cancelamento.
 *
 * @param {object} order
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[], flags: number }}
 */
export function buildCancelConfirmPayload(order) {
  const sid = shortId(order.id);

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`⚠️ Cancelar Pedido #${sid}`)
    .setDescription(
      `Tem certeza que deseja cancelar o pedido **#${sid}** (\`${order.produto ?? 'sem produto'}\`)?\n\n` +
      '⚠️ Esta ação **não pode ser desfeita**.',
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`orders:cancel_ok:${order.id}`)
      .setLabel('Confirmar Cancelamento')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`orders:view:${order.id}`)
      .setLabel('Voltar')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds:     [embed],
    components: [row],
    flags:      MessageFlags.Ephemeral,
  };
}

// ── Payloads ──────────────────────────────────────────────────────────────────

/**
 * Payload ephemeral de sucesso após criar pedido.
 */
export function buildSuccessPayload(order) {
  const embed = buildOrderEmbed(order);
  embed.setTitle(`✅ Pedido #${shortId(order.id)} Criado`);
  return {
    embeds: [embed],
    flags:  MessageFlags.Ephemeral,
  };
}

/**
 * Payload ephemeral de erro.
 */
export function buildErrorPayload(message) {
  return {
    content: `❌ ${message}`,
    flags:   MessageFlags.Ephemeral,
  };
}
