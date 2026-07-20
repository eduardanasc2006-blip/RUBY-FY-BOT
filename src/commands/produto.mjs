/**
 * Comando /produto + Prefix Command !comprar
 *
 * SLASH /produto:
 *   Abre o gerenciador de produtos do catálogo (admin).
 *   Permissão: ManageGuild
 *
 * PREFIX !comprar <nome> [quantidade]:
 *   Permite qualquer membro comprar um produto do catálogo.
 *   Fluxo: busca produto → verifica estoque → cria pedido → reduz estoque
 *
 * Exemplos prefix:
 *   !comprar Icewing
 *   !comprar Icewing 2
 *   !comprar "Produto com espaço" 3
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { openProductsManager }  from '../modules/products/index.mjs';
import { findProductByName }    from '../database/repositories/Products.mjs';
import {
  processPurchase,
  buildPurchaseEmbed,
  buildProductEmbed,
} from '../modules/products/flow.mjs';
import { PRODUCT_STATUS }       from '../database/repositories/Products.mjs';

export default {
  // ── Slash Command ─────────────────────────────────────────────────────────
  data: new SlashCommandBuilder()
    .setName('produto')
    .setDescription('Gerencia o catálogo de produtos do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await openProductsManager(interaction);
  },

  // ── Prefix Command ────────────────────────────────────────────────────────
  name: 'comprar',
  aliases: ['buy', 'compra'],

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async executePrefix(message, args) {
    if (!message.guildId) return;
    if (!args.length) {
      return message.reply({
        content: '⚠️ Uso correto: `!comprar <produto> [quantidade]`\nExemplo: `!comprar Icewing 1`',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Último argumento pode ser quantidade numérica
    let quantity = 1;
    let nameParts = [...args];

    const last = args[args.length - 1];
    if (/^\d+$/.test(last)) {
      const q = parseInt(last, 10);
      if (q > 0) {
        quantity  = q;
        nameParts = args.slice(0, -1);
      }
    }

    const productName = nameParts.join(' ').trim();
    if (!productName) {
      return message.reply('⚠️ Informe o nome do produto. Ex: `!comprar Icewing 1`');
    }

    // Limite de quantidade por transação
    const MAX_QTY = 99;
    if (quantity > MAX_QTY) {
      return message.reply(`⚠️ Quantidade máxima por compra: **${MAX_QTY}**.`);
    }

    const product = findProductByName(message.guildId, productName);

    if (!product) {
      return message.reply(
        `❌ Produto **"${productName}"** não encontrado no catálogo.\nVerifique os produtos disponíveis com \`/produto\`.`,
      );
    }

    // Produto inativo
    if (product.status === PRODUCT_STATUS.INACTIVE) {
      return message.reply(`❌ O produto **"${product.name}"** está temporariamente indisponível.`);
    }

    // Produto esgotado
    if (product.status === PRODUCT_STATUS.OUT_OF_STOCK || product.stock === 0) {
      return message.reply(
        `❌ **Item não disponível no momento.**\nEstoque: **0 unidades**.\nEntre em contato com a equipe para verificar disponibilidade.`,
      );
    }

    // Estoque insuficiente para a quantidade pedida
    if (product.stock < quantity) {
      return message.reply(
        `⚠️ Estoque insuficiente.\nDisponível: **${product.stock}** un. | Pedido: **${quantity}** un.`,
      );
    }

    // Processa a compra
    const result = await processPurchase(message.guildId, {
      product,
      buyerId:  message.author.id,
      buyerTag: message.author.tag ?? message.author.username,
      quantity,
      vendorId: null,
    });

    if (!result.ok) {
      const reasons = {
        insufficient_stock: `⚠️ Estoque insuficiente (disponível: ${result.stock} un.).`,
        product_inactive:   '❌ Produto indisponível no momento.',
        stock_error:        '❌ Erro ao processar o estoque. Tente novamente.',
      };
      return message.reply(reasons[result.reason] ?? '❌ Não foi possível concluir a compra.');
    }

    const embed = buildPurchaseEmbed(product, quantity, {
      stockBefore: result.stockBefore,
      stockAfter:  result.stockAfter,
      orderId:     result.order?.id,
    });

    return message.reply({ embeds: [embed] });
  },
};
