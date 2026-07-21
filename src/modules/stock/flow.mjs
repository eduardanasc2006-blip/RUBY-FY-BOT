/**
 * Stock — Funções de fluxo puras.
 *
 * IMPORTANTE: Este arquivo NÃO importa database/client.mjs nem config/bot.mjs.
 * Todas as funções são puras e testáveis sem banco de dados.
 *
 * Responsabilidades:
 *   - buildStockReportEmbed     — Embed do relatório de estoque
 *   - buildStockListEmbed      — Embed da lista de estoque
 *   - buildMovementHistoryEmbed — Embed do histórico de movimentações
 *   - buildMovementRow          — Linha de movimentação formatada
 *   - buildStockComponents      — Componentes do painel de estoque
 *   - buildAdjustmentModal      — Modal para ajuste de estoque
 *   - buildReplenishModal      — Modal para reposição de estoque
 *   - buildLowStockAlert       — Embed de alerta de estoque baixo
 *   - shortId                  — Utilitário de ID curto
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Limite baixo padrão para alertas */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/** Status de estoque */
export const STOCK_STATUS_LABELS = {
  in_stock:      '✅ Em Estoque',
  low_stock:     '⚠️ Estoque Baixo',
  out_of_stock:  '🚫 Sem Estoque',
};

/** Cores por status de estoque */
export const STOCK_STATUS_COLORS = {
  in_stock:      0x57F287,  // verde
  low_stock:     0xFEE75C,  // amarelo
  out_of_stock:  0xED4245,  // vermelho
};

/** Rótulos para tipos de movimento */
export const MOVEMENT_TYPE_LABELS = {
  entry:         '📥 Entrada',
  exit:          '📤 Saída',
  adjustment:    '⚙️ Ajuste',
  replenishment: '🔄 Reposição',
};

/** Cores para tipos de movimento */
export const MOVEMENT_TYPE_COLORS = {
  entry:         0x57F287,  // verde
  exit:          0xED4245,  // vermelho
  adjustment:    0xFEE75C,  // amarelo
  replenishment: 0x0099FF,  // azul
};

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Retorna os primeiros N caracteres do UUID como ID curto.
 * @param {string} id
 * @param {number} len
 * @returns {string}
 */
export function shortId(id, len = 8) {
  return id?.slice(0, len) ?? '?';
}

/**
 * Determina o status de estoque com base na quantidade.
 * @param {number} stock
 * @param {number} threshold
 * @returns {'in_stock'|'low_stock'|'out_of_stock'}
 */
export function getStockStatus(stock, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (stock === 0) return 'out_of_stock';
  if (stock <= threshold) return 'low_stock';
  return 'in_stock';
}

/**
 * Formata uma quantidade com emoji de tendência.
 * @param {number} quantity
 * @param {string} type
 * @returns {string}
 */
export function formatQuantityChange(quantity, type) {
  switch (type) {
    case 'entry':
    case 'replenishment':
      return `+${quantity}`;
    case 'exit':
      return `-${quantity}`;
    case 'adjustment':
      return quantity > 0 ? `+${quantity}` : `${quantity}`;
    default:
      return quantity.toString();
  }
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Constrói o embed do relatório de estoque geral.
 *
 * @param {object} report { inStock, lowStock, outOfStock }
 * @param {number} threshold
 * @returns {EmbedBuilder}
 */
export function buildStockReportEmbed(report, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const { inStock, lowStock, outOfStock } = report;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📦 Relatório de Estoque')
    .setTimestamp();

  const total = inStock.length + lowStock.length + outOfStock.length;

  embed.setDescription(
    `**Total de produtos:** ${total}\n` +
    `✅ Em estoque: ${inStock.length}\n` +
    `⚠️ Estoque baixo: ${lowStock.length}\n` +
    `🚫 Sem estoque: ${outOfStock.length}`
  );

  // Lista produtos em estoque
  if (inStock.length > 0) {
    const lines = inStock.slice(0, 10).map(p =>
      `• **${p.name}** — ${p.stock} unidades`
    );
    embed.addFields({
      name: `✅ Em Estoque (${inStock.length})`,
      value: lines.join('\n') + (inStock.length > 10 ? '\n*... e mais*' : ''),
      inline: false,
    });
  }

  // Lista produtos com estoque baixo
  if (lowStock.length > 0) {
    const lines = lowStock.slice(0, 10).map(p =>
      `⚠️ **${p.name}** — ${p.stock} unidades`
    );
    embed.addFields({
      name: `⚠️ Estoque Baixo (${lowStock.length})`,
      value: lines.join('\n') + (lowStock.length > 10 ? '\n*... e mais*' : ''),
      inline: false,
    });
  }

  // Lista produtos sem estoque
  if (outOfStock.length > 0) {
    const lines = outOfStock.slice(0, 10).map(p =>
      `🚫 **${p.name}**`
    );
    embed.addFields({
      name: `🚫 Sem Estoque (${outOfStock.length})`,
      value: lines.join('\n') + (outOfStock.length > 10 ? '\n*... e mais*' : ''),
      inline: false,
    });
  }

  if (total === 0) {
    embed.setDescription('Nenhum produto cadastrado neste servidor.');
  }

  return embed;
}

/**
 * Constrói o embed de alerta de estoque baixo.
 *
 * @param {object[]} lowStockProducts
 * @param {number} threshold
 * @returns {EmbedBuilder}
 */
export function buildLowStockAlert(lowStockProducts, threshold) {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('⚠️ Alerta de Estoque Baixo')
    .setTimestamp();

  if (!lowStockProducts || lowStockProducts.length === 0) {
    embed.setDescription('Nenhum produto com estoque baixo no momento. ✅');
    return embed;
  }

  const lines = lowStockProducts.slice(0, 15).map(p =>
    `• **${p.name}**: ${p.stock} unidades (limite: ${threshold})`
  );

  embed.setDescription(
    `Os seguintes produtos estão com estoque baixo:\n\n` +
    lines.join('\n')
  );

  if (lowStockProducts.length > 15) {
    embed.setFooter({ text: `... e mais ${lowStockProducts.length - 15} produtos` });
  }

  return embed;
}

/**
 * Constrói o embed do histórico de movimentações.
 *
 * @param {object[]} movements
 * @param {string} productName
 * @param {object} summary
 * @returns {EmbedBuilder}
 */
export function buildMovementHistoryEmbed(movements, productName, summary) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Histórico — ${productName}`)
    .setTimestamp();

  // Resumo
  embed.setDescription(
    `**Resumo (últimos 30 dias):**\n` +
    `📥 Entradas: ${summary.entries}\n` +
    `📤 Saídas: ${summary.exits}\n` +
    `⚙️ Ajustes: ${summary.adjustments}\n` +
    `📊 Saldo: ${summary.net >= 0 ? '+' : ''}${summary.net}`
  );

  // Lista de movimentações
  if (!movements || movements.length === 0) {
    embed.addFields({
      name: 'Histórico',
      value: 'Nenhuma movimentação registrada.',
      inline: false,
    });
    return embed;
  }

  const lines = movements.slice(0, 20).map(m => {
    const typeLabel = MOVEMENT_TYPE_LABELS[m.type] ?? m.type;
    const qtyChange = formatQuantityChange(m.quantity, m.type);
    const date = new Date(m.createdAt * 1000).toLocaleDateString('pt-BR');
    const time = new Date(m.createdAt * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let line = `**${typeLabel}** ${qtyChange} — ${date} ${time}`;
    if (m.reason) line += `\n   └ ${m.reason}`;

    return line;
  });

  embed.addFields({
    name: 'Movimentações Recentes',
    value: lines.join('\n\n'),
    inline: false,
  });

  return embed;
}

// ── Componentes ────────────────────────────────────────────────────────────────

/**
 * Constrói os componentes do painel de estoque.
 *
 * @param {string} guildId
 * @param {string} productId
 * @param {string} sessionId
 * @returns {ActionRowBuilder[]}
 */
export function buildStockComponents(guildId, productId, sessionId) {
  const rows = [];

  // Seletor de produtos
  const selectOptions = [
    { label: '📦 Ver Estoque', value: `view:${productId}`, description: 'Ver relatório geral' },
    { label: '📥 Adicionar Estoque', value: `add:${productId}`, description: 'Repor estoque' },
    { label: '⚙️ Ajustar Estoque', value: `adjust:${productId}`, description: 'Definir quantidade' },
    { label: '📋 Ver Histórico', value: `history:${productId}`, description: 'Movimentações' },
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`stock:select:${sessionId}`)
    .setPlaceholder('Selecione uma ação...')
    .addOptions(selectOptions);

  rows.push(new ActionRowBuilder().addComponents(select));

  // Botão voltar
  const backBtn = new ButtonBuilder()
    .setCustomId(`stock:back:${sessionId}`)
    .setLabel('Voltar')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary);

  rows.push(new ActionRowBuilder().addComponents(backBtn));

  return rows;
}

/**
 * Constrói o payload do painel de estoque.
 *
 * @param {string} sessionId
 * @param {object} report
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildStockPayload(sessionId, report) {
  const embed = buildStockReportEmbed(report);

  const selectOptions = [
    { label: '📦 Relatório Geral', value: 'report', description: 'Ver todos os produtos' },
    { label: '⚠️ Estoque Baixo', value: 'low', description: 'Produtos com estoque baixo' },
    { label: '🚫 Sem Estoque', value: 'out', description: 'Produtos sem estoque' },
    { label: '📋 Todas Movimentações', value: 'all_movements', description: 'Histórico geral' },
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`stock:main_select:${sessionId}`)
    .setPlaceholder('Selecione uma opção...')
    .addOptions(selectOptions);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

// ── Modais ────────────────────────────────────────────────────────────────────

/**
 * Constrói o modal para ajuste de estoque.
 *
 * @param {string} productId
 * @param {string} productName
 * @param {number} currentStock
 * @returns {ModalBuilder}
 */
export function buildAdjustmentModal(productId, productName, currentStock) {
  const modal = new ModalBuilder()
    .setCustomId(`stock:adjust_modal:${productId}`)
    .setTitle(`⚙️ Ajustar — ${productName}`)
    .setComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('new_quantity')
          .setLabel('Nova Quantidade')
          .setPlaceholder(`Quantidade atual: ${currentStock}`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Motivo (opcional)')
          .setPlaceholder('Ex: Correção de inventário')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200),
      ),
    );

  return modal;
}

/**
 * Constrói o modal para reposição de estoque.
 *
 * @param {string} productId
 * @param {string} productName
 * @param {number} currentStock
 * @returns {ModalBuilder}
 */
export function buildReplenishModal(productId, productName, currentStock) {
  const modal = new ModalBuilder()
    .setCustomId(`stock:replenish_modal:${productId}`)
    .setTitle(`📥 Repor — ${productName}`)
    .setComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantity')
          .setLabel('Quantidade a Adicionar')
          .setPlaceholder('Ex: 10')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Motivo (opcional)')
          .setPlaceholder('Ex: Compra de fornecedor')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200),
      ),
    );

  return modal;
}

/**
 * Constrói o modal para adicionar/remover estoque de um pedido.
 *
 * @param {string} productId
 * @param {string} productName
 * @param {number} currentStock
 * @param {boolean} isRemoval Se é para remover (pedido) vs adicionar
 * @returns {ModalBuilder}
 */
export function buildStockChangeModal(productId, productName, currentStock, isRemoval = true) {
  const action = isRemoval ? 'remover' : 'adicionar';
  const modal = new ModalBuilder()
    .setCustomId(`stock:change_modal:${productId}:${isRemoval ? '1' : '0'}`)
    .setTitle(`${isRemoval ? '📤' : '📥'} ${action.charAt(0).toUpperCase() + action.slice(1)} — ${productName}`)
    .setComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantity')
          .setLabel('Quantidade')
          .setPlaceholder(`Quantidade atual: ${currentStock}`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
    );

  return modal;
}

// ── Payloads de Sucesso/Erro ─────────────────────────────────────────────────

/**
 * Payload de sucesso após ajuste de estoque.
 *
 * @param {object} product
 * @param {number} previousStock
 * @param {number} newStock
 * @returns {{ embeds: EmbedBuilder[], flags: number }}
 */
export function buildStockSuccessPayload(product, previousStock, newStock) {
  const status = getStockStatus(newStock);
  const statusLabel = STOCK_STATUS_LABELS[status];
  const color = STOCK_STATUS_COLORS[status];

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`✅ Estoque Atualizado — ${product.name}`)
    .setTimestamp()
    .addFields(
      { name: 'Estoque Anterior', value: previousStock.toString(), inline: true },
      { name: 'Novo Estoque', value: newStock.toString(), inline: true },
      { name: 'Status', value: statusLabel, inline: true },
    );

  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

/**
 * Payload de erro para operações de estoque.
 *
 * @param {string} message
 * @returns {{ content: string, flags: number }}
 */
export function buildStockErrorPayload(message) {
  return { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
}

/**
 * Payload de alerta de estoque baixo.
 *
 * @param {object[]} products
 * @param {number} threshold
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[], flags: number }}
 */
export function buildLowStockPayload(products, threshold) {
  const embed = buildLowStockAlert(products, threshold);

  // Seletor para adicionar estoque rapidamente
  if (products.length > 0) {
    const options = products.slice(0, 25).map(p => ({
      label: `${p.name} (${p.stock})`,
      value: p.id,
      description: `Repor ${p.name}`,
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId('stock:quick_replenish')
      .setPlaceholder('Repor estoque de...')
      .addOptions(options);

    return {
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    };
  }

  return {
    embeds: [embed],
    components: [],
    flags: MessageFlags.Ephemeral,
  };
}
