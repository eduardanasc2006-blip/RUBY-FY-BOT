/**
 * Comando /estoque
 *
 * Gerencia o controle de estoque dos produtos do servidor.
 *
 * Funcionalidades:
 *   - Ver relatório de estoque
 *   - Ver produtos com estoque baixo
 *   - Ver histórico de movimentações
 *   - Ajustar estoque manualmente
 *   - Repor estoque
 *   - Alertas de estoque baixo
 *
 * Permissão: ManageGuild (apenas administradores)
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
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
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../database/repositories/Stock.mjs';
import {
  buildStockPayload,
  buildStockReportEmbed,
  buildLowStockAlert,
  buildMovementHistoryEmbed,
  buildStockErrorPayload,
  buildLowStockPayload,
  getStockStatus,
  STOCK_STATUS_LABELS,
} from '../modules/stock/flow.mjs';
import { logAudit } from '../modules/audit/index.mjs';
import { logger } from '../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../database/repositories/Permissions.mjs';

const MODULE_NAME = 'stock';

export default {
  // ── Slash Command ─────────────────────────────────────────────────────────
  data: new SlashCommandBuilder()
    .setName('estoque')
    .setDescription('Gerencia o controle de estoque dos produtos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('relatorio')
        .setDescription('Ver relatório completo de estoque')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('baixo')
        .setDescription('Ver produtos com estoque baixo')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sem')
        .setDescription('Ver produtos sem estoque')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('historico')
        .setDescription('Ver histórico de movimentações')
        .addStringOption(option =>
          option.setName('produto')
            .setDescription('Nome do produto para ver histórico')
            .setRequired(false)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('ajustar')
        .setDescription('Ajustar estoque de um produto')
        .addSubcommand(subcommand =>
          subcommand
            .setName('produto')
            .setDescription('Ajustar estoque de um produto específico')
            .addStringOption(option =>
              option.setName('nome')
                .setDescription('Nome do produto')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption(option =>
              option.setName('quantidade')
                .setDescription('Nova quantidade de estoque')
                .setRequired(true)
                .setMinValue(0)
            )
            .addStringOption(option =>
              option.setName('motivo')
                .setDescription('Motivo do ajuste')
                .setRequired(false)
            )
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('repor')
        .setDescription('Repor estoque de um produto')
        .addSubcommand(subcommand =>
          subcommand
            .setName('produto')
            .setDescription('Repor estoque de um produto específico')
            .addStringOption(option =>
              option.setName('nome')
                .setDescription('Nome do produto')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption(option =>
              option.setName('quantidade')
                .setDescription('Quantidade a adicionar')
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption(option =>
              option.setName('motivo')
                .setDescription('Motivo da reposição')
                .setRequired(false)
            )
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        content: '⚠️ Este comando só pode ser usado em servidores.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Verifica permissão do módulo
    const member = interaction.member;
    if (member && !hasModulePermission(guildId, MODULE_NAME, member)) {
      return interaction.reply(buildDeniedMessage(MODULE_NAME, 'estoque'));
    }

    // Verifica se há produtos cadastrados
    const products = listProducts(guildId, { limit: 1 });
    if (products.length === 0) {
      return interaction.reply({
        content: '⚠️ Nenhum produto cadastrado. Use `/produto` para cadastrar.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();

    // /estoque relatorio
    if (subcommand === 'relatorio') {
      return executeRelatorio(interaction, guildId);
    }

    // /estoque baixo
    if (subcommand === 'baixo') {
      return executeBaixo(interaction, guildId);
    }

    // /estoque sem
    if (subcommand === 'sem') {
      return executeSem(interaction, guildId);
    }

    // /estoque historico
    if (subcommand === 'historico') {
      const nome = interaction.options.getString('produto');
      return executeHistorico(interaction, guildId, nome);
    }

    // /estoque ajustar produto
    if (subcommandGroup === 'ajustar' && subcommand === 'produto') {
      const nome = interaction.options.getString('nome');
      const quantidade = interaction.options.getInteger('quantidade');
      const motivo = interaction.options.getString('motivo');
      return executeAjustar(interaction, guildId, nome, quantidade, motivo);
    }

    // /estoque repor produto
    if (subcommandGroup === 'repor' && subcommand === 'produto') {
      const nome = interaction.options.getString('nome');
      const quantidade = interaction.options.getInteger('quantidade');
      const motivo = interaction.options.getString('motivo');
      return executeRepor(interaction, guildId, nome, quantidade, motivo);
    }

    // Padrão: mostra painel principal
    return executePainel(interaction, guildId);
  },

  // ── Autocomplete ──────────────────────────────────────────────────────────
  async autocomplete(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const focused = interaction.options.getFocused(true);
    if (!focused.value) return;

    const products = listProducts(guildId, { limit: 25 });
    const query = focused.value.toLowerCase();

    const filtered = products
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 25)
      .map(p => ({
        name: `${p.name} (${p.stock} un.)`,
        value: p.name,
      }));

    if (filtered.length === 0) {
      filtered.push({ name: 'Nenhum produto encontrado', value: focused.value });
    }

    await interaction.respond(filtered);
  },
};

// ── Executores de Subcomandos ───────────────────────────────────────────────

async function executePainel(interaction, guildId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const report = getStockReport(guildId);
  const payload = buildStockPayload(null, report);

  await interaction.editReply(payload);
}

async function executeRelatorio(interaction, guildId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const report = getStockReport(guildId);
  const embed = buildStockReportEmbed(report);

  await interaction.editReply({ embeds: [embed] });
}

async function executeBaixo(interaction, guildId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const lowStock = getLowStockProducts(guildId, 20);
  const payload = buildLowStockPayload(lowStock, DEFAULT_LOW_STOCK_THRESHOLD);

  await interaction.editReply(payload);
}

async function executeSem(interaction, guildId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const outOfStock = getOutOfStockProducts(guildId);

  const { EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Produtos Sem Estoque')
    .setTimestamp();

  if (outOfStock.length === 0) {
    embed.setDescription('Todos os produtos estão com estoque! ✅');
  } else {
    const lines = outOfStock.map(p => `• **${p.name}**`).join('\n');
    embed.setDescription(`**${outOfStock.length} produto(s) sem estoque:**\n\n${lines}`);
  }

  await interaction.editReply({ embeds: [embed] });
}

async function executeHistorico(interaction, guildId, nome) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { EmbedBuilder } = await import('discord.js');

  if (!nome) {
    // Mostra histórico geral
    const { listAllMovements } = await import('../database/repositories/Stock.mjs');
    const movements = listAllMovements(guildId, { limit: 30 });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Histórico de Movimentações')
      .setTimestamp();

    if (movements.length === 0) {
      embed.setDescription('Nenhuma movimentação registrada.');
    } else {
      const lines = movements.slice(0, 20).map(m => {
        const typeEmoji = { entry: '📥', exit: '📤', adjustment: '⚙️', replenishment: '🔄' }[m.type] ?? '📦';
        const date = new Date(m.created_at * 1000).toLocaleDateString('pt-BR');
        const name = m.product_name ?? m.product_id?.slice(0, 8);
        return `${typeEmoji} **${name}** — ${m.quantity} — ${date}`;
      });
      embed.setDescription(lines.join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Busca produto pelo nome
  const { findProductByName } = await import('../database/repositories/Products.mjs');
  const product = findProductByName(guildId, nome);

  if (!product) {
    await interaction.editReply({ content: `❌ Produto **"${nome}"** não encontrado.` });
    return;
  }

  const movements = listMovements(guildId, product.id, { limit: 30 });
  const summary = getMovementSummary(guildId, product.id);

  const normalizedMovements = movements.map(normalizeMovement);
  const embed = buildMovementHistoryEmbed(normalizedMovements, product.name, summary);

  await interaction.editReply({ embeds: [embed] });
}

async function executeAjustar(interaction, guildId, nome, quantidade, motivo) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { findProductByName } = await import('../database/repositories/Products.mjs');
  const product = findProductByName(guildId, nome);

  if (!product) {
    await interaction.editReply({ content: `❌ Produto **"${nome}"** não encontrado.` });
    return;
  }

  const previousStock = product.stock;

  const result = setStock(guildId, product.id, quantidade, {
    reason: motivo || 'Ajuste manual de estoque',
    actorId: interaction.user.id,
  });

  if (!result.ok) {
    await interaction.editReply({ content: `❌ Erro ao ajustar estoque: ${result.reason}` });
    return;
  }

  // Log de auditoria
  logAudit(guildId, {
    actorId: interaction.user.id,
    module: MODULE_NAME,
    action: 'stock_adjusted',
    entity: 'product',
    entityId: product.id,
    beforeData: { stock: previousStock },
    afterData: { stock: quantidade },
  });

  logger.info(`[Estoque] Ajuste | guild: ${guildId} | produto: ${product.name} | ${previousStock} → ${quantidade}`);

  const { EmbedBuilder } = await import('discord.js');
  const status = getStockStatus(quantidade);
  const color = { in_stock: 0x57F287, low_stock: 0xFEE75C, out_of_stock: 0xED4245 }[status];

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`✅ Estoque Ajustado — ${product.name}`)
    .setTimestamp()
    .addFields(
      { name: 'Anterior', value: previousStock.toString(), inline: true },
      { name: 'Novo', value: quantidade.toString(), inline: true },
      { name: 'Status', value: STOCK_STATUS_LABELS[status], inline: true },
    );

  if (motivo) {
    embed.addFields({ name: 'Motivo', value: motivo, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function executeRepor(interaction, guildId, nome, quantidade, motivo) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { findProductByName } = await import('../database/repositories/Products.mjs');
  const product = findProductByName(guildId, nome);

  if (!product) {
    await interaction.editReply({ content: `❌ Produto **"${nome}"** não encontrado.` });
    return;
  }

  const previousStock = product.stock;

  const result = addStock(guildId, product.id, quantidade, {
    reason: motivo || 'Reposição manual',
    actorId: interaction.user.id,
  });

  if (!result.ok) {
    await interaction.editReply({ content: `❌ Erro ao repor estoque: ${result.reason}` });
    return;
  }

  // Log de auditoria
  logAudit(guildId, {
    actorId: interaction.user.id,
    module: MODULE_NAME,
    action: 'stock_replenished',
    entity: 'product',
    entityId: product.id,
    beforeData: { stock: previousStock },
    afterData: { stock: result.product.stock },
  });

  logger.info(`[Estoque] Reposição | guild: ${guildId} | produto: ${product.name} | +${quantidade}`);

  const { EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`✅ Estoque Reposto — ${product.name}`)
    .setTimestamp()
    .addFields(
      { name: 'Anterior', value: previousStock.toString(), inline: true },
      { name: 'Adicionado', value: `+${quantidade}`, inline: true },
      { name: 'Novo Total', value: result.product.stock.toString(), inline: true },
    );

  if (motivo) {
    embed.addFields({ name: 'Motivo', value: motivo, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}
