/**
 * Sistema de Produtos e Estoque — Ponto de entrada público (Etapa 17B).
 *
 * Registra o namespace 'prod' no componentHandler.
 * O handler 'stock_btn' abre um modal de ajuste de estoque inline.
 *
 * Uso:
 *   import { registerProductsHandler } from '../modules/products/index.mjs';
 *   import { openProductsManager }      from '../modules/products/index.mjs';
 *   import { processPurchase }          from '../modules/products/index.mjs';
 */

import { register }   from '../../handlers/componentHandler.mjs';
import { logger }     from '../../utils/logger.mjs';
import {
  handleProdComponent,
  openProductsManager,
} from './actions.mjs';
import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { build }  from '../../utils/customId.mjs';
import { getProduct } from '../../database/repositories/Products.mjs';

export { openProductsManager };
export { processPurchase, buildProductEmbed, buildPurchaseEmbed, formatStock } from './flow.mjs';
export { findProductByName, findProductByExactName } from '../../database/repositories/Products.mjs';

/**
 * Registra o namespace 'prod' no componentHandler.
 * Também intercepta 'prod:stock_btn' para abrir o modal de estoque.
 */
export function registerProductsHandler() {
  // Handler combinado: trata stock_btn (abre modal) e delega o resto
  register('prod', async (interaction, action, partes) => {
    if (action === 'stock_btn') {
      return handleStockBtn(interaction, partes[0]);
    }
    return handleProdComponent(interaction, action, partes);
  });

  logger.info('[Products] Handler registrado no namespace "prod".');
}

// ── Handler especial de botão de estoque ──────────────────────────────────────

async function handleStockBtn(interaction, productId) {
  if (!productId) return safeReply(interaction, '⚠️ ID do produto inválido.');
  const product = getProduct(interaction.guildId, productId);
  if (!product)  return safeReply(interaction, '⚠️ Produto não encontrado.');

  // Deferir para permitir editReply após o modal submit
  await interaction.deferUpdate();

  return interaction.showModal(
    new ModalBuilder()
      .setCustomId(build('prod', 'stock_modal', productId))
      .setTitle(`📦 Estoque: ${product.name.slice(0, 40)}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel(`Novo estoque (atual: ${product.stock})`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10)
            .setValue(`${product.stock}`),
        ),
      ),
  );
}

async function safeReply(interaction, content) {
  try {
    const payload = { content, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* ignorado */ }
}
