/**
 * Sistema de Produtos — Handler de componentes do painel admin (namespace 'prod').
 *
 * Ações roteadas:
 *   prod:list:sid          — lista paginada de produtos
 *   prod:view:sid:pid      — visualiza um produto
 *   prod:new               — abre modal de criação
 *   prod:new_modal         — submit do modal de criação
 *   prod:edit_modal:pid    — submit do modal de edição
 *   prod:stock_modal:pid   — submit do modal de ajuste de estoque
 *   prod:toggle:pid        — ativa/desativa produto
 *   prod:delete:pid        — confirmação de exclusão
 *   prod:delete_ok:pid     — executa exclusão
 *   prod:back:sid          — volta para a lista
 *   prod:cancel:sid        — fecha painel
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { build }           from '../../utils/customId.mjs';
import { logger }          from '../../utils/logger.mjs';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import {
  createProduct, getProduct, listProducts, countProducts,
  updateProduct, deleteProduct, setStock, PRODUCT_STATUS,
} from '../../database/repositories/Products.mjs';
import { buildProductEmbed, buildProductListEmbed } from './flow.mjs';

const PER_PAGE = 8;

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleProdComponent(interaction, action, partes) {
  switch (action) {
    case 'list':        return handleList(interaction, partes[0]);
    case 'view':        return handleView(interaction, partes[0], partes[1]);
    case 'new':         return handleNew(interaction);
    case 'new_modal':   return handleNewModal(interaction);
    case 'edit_modal':  return handleEditModal(interaction, partes[0]);
    case 'stock_modal': return handleStockModal(interaction, partes[0]);
    case 'toggle':      return handleToggle(interaction, partes[0]);
    case 'delete':      return handleDeleteConfirm(interaction, partes[0]);
    case 'delete_ok':   return handleDeleteOk(interaction, partes[0]);
    case 'back':        return handleBack(interaction, partes[0]);
    case 'cancel':      return handleCancel(interaction, partes[0]);
    default:
      logger.warn(`[Products] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abertura pública ──────────────────────────────────────────────────────────

export async function openProductsManager(interaction) {
  const session = createSession(interaction.user.id, interaction.guildId, 'prod', { page: 0 });
  const payload = buildListPayload(session.sessionId, interaction.guildId, session.data);
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
}

// ── Handlers internos ─────────────────────────────────────────────────────────

function handleList(interaction, sessionId) {
  if (!sessionId) return safeReply(interaction, '⚠️ Sessão inválida.');
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada. Use `/produto` novamente.');
  return interaction.update(buildListPayload(sessionId, interaction.guildId, session.data));
}

async function handleView(interaction, sessionId, productId) {
  if (!sessionId || !productId) return safeReply(interaction, '⚠️ Parâmetros inválidos.');
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada.');
  const product = getProduct(interaction.guildId, productId);
  if (!product)  return safeReply(interaction, '⚠️ Produto não encontrado.');
  return interaction.update(buildViewPayload(sessionId, product));
}

async function handleNew(interaction) {
  // Deferir para permitir editReply após o modal submit
  await interaction.deferUpdate();
  
  return interaction.showModal(
    new ModalBuilder()
      .setCustomId('prod:new_modal')
      .setTitle('➕ Cadastrar Produto')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name').setLabel('Nome do produto').setStyle(TextInputStyle.Short)
            .setRequired(true).setMaxLength(100),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('price').setLabel('Preço (ex: R$ 25,00)').setStyle(TextInputStyle.Short)
            .setRequired(false).setMaxLength(50),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('stock').setLabel('Estoque inicial').setStyle(TextInputStyle.Short)
            .setRequired(false).setMaxLength(10).setValue('0'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description').setLabel('Descrição (opcional)').setStyle(TextInputStyle.Paragraph)
            .setRequired(false).setMaxLength(500),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('image_url').setLabel('URL da imagem (opcional)').setStyle(TextInputStyle.Short)
            .setRequired(false).setMaxLength(300).setPlaceholder('https://...'),
        ),
      ),
  );
}

async function handleNewModal(interaction) {
  const name        = interaction.fields.getTextInputValue('name')?.trim();
  const price       = interaction.fields.getTextInputValue('price')?.trim()       || null;
  const rawStock    = interaction.fields.getTextInputValue('stock')?.trim();
  const description = interaction.fields.getTextInputValue('description')?.trim() || null;
  const imageUrl    = interaction.fields.getTextInputValue('image_url')?.trim()   || null;

  if (!name) return safeReply(interaction, '⚠️ O nome do produto é obrigatório.');

  const stock   = parseInt(rawStock ?? '0', 10);
  const product = createProduct(interaction.guildId, {
    name, price, stock: isNaN(stock) ? 0 : Math.max(0, stock), description, imageUrl,
  });

  logger.info(`[Products] Produto criado | id: ${product.id} | guild: ${interaction.guildId}`);

  const session = createSession(interaction.user.id, interaction.guildId, 'prod', { page: 0 });
  // Atualiza a mensagem original (já deferido em handleNew)
  return interaction.editReply({ ...buildViewPayload(session.sessionId, product), flags: MessageFlags.Ephemeral });
}

async function handleEditModal(interaction, productId) {
  const product = getProduct(interaction.guildId, productId);
  if (!product) return safeReply(interaction, '⚠️ Produto não encontrado.');

  const name        = interaction.fields.getTextInputValue('name')?.trim()        || null;
  const price       = interaction.fields.getTextInputValue('price')?.trim()       || null;
  const description = interaction.fields.getTextInputValue('description')?.trim() || null;
  const imageUrl    = interaction.fields.getTextInputValue('image_url')?.trim()   || null;

  const updated = updateProduct(interaction.guildId, productId, { name, price, description, imageUrl });
  const session = createSession(interaction.user.id, interaction.guildId, 'prod', { page: 0 });
  return interaction.reply({ ...buildViewPayload(session.sessionId, updated ?? product), flags: MessageFlags.Ephemeral });
}

async function handleStockModal(interaction, productId) {
  const product = getProduct(interaction.guildId, productId);
  if (!product) return safeReply(interaction, '⚠️ Produto não encontrado.');

  const rawQty = interaction.fields.getTextInputValue('quantity')?.trim();
  const qty    = parseInt(rawQty ?? '0', 10);

  if (isNaN(qty) || qty < 0) return safeReply(interaction, '⚠️ Quantidade inválida. Use um número ≥ 0.');

  const updated = setStock(interaction.guildId, productId, qty);
  logger.info(`[Products] Estoque atualizado | id: ${productId} | stock: ${qty}`);

  const session = createSession(interaction.user.id, interaction.guildId, 'prod', { page: 0 });
  return interaction.reply({ ...buildViewPayload(session.sessionId, updated ?? product), flags: MessageFlags.Ephemeral });
}

async function handleToggle(interaction, productId) {
  const product = getProduct(interaction.guildId, productId);
  if (!product) return safeReply(interaction, '⚠️ Produto não encontrado.');

  const newStatus = product.status === PRODUCT_STATUS.INACTIVE
    ? PRODUCT_STATUS.ACTIVE
    : PRODUCT_STATUS.INACTIVE;

  const updated = updateProduct(interaction.guildId, productId, { status: newStatus });
  const session = createSession(interaction.user.id, interaction.guildId, 'prod', { page: 0 });
  return interaction.update(buildViewPayload(session.sessionId, updated ?? product));
}

async function handleDeleteConfirm(interaction, productId) {
  const product = getProduct(interaction.guildId, productId);
  if (!product) return safeReply(interaction, '⚠️ Produto não encontrado.');

  return interaction.update({
    content: `⚠️ **Excluir produto "${product.name}"?**\nEsta ação é irreversível.`,
    embeds:  [],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(build('prod', 'delete_ok', productId))
          .setLabel('✅ Confirmar Exclusão')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('prod:cancel_del')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleDeleteOk(interaction, productId) {
  const product = getProduct(interaction.guildId, productId);
  const name    = product?.name ?? 'desconhecido';
  deleteProduct(interaction.guildId, productId);
  logger.info(`[Products] Produto excluído | id: ${productId} | guild: ${interaction.guildId}`);
  return interaction.update({ content: `✅ Produto **"${name}"** excluído.`, embeds: [], components: [] });
}

function handleBack(interaction, sessionId) {
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada.');
  return interaction.update(buildListPayload(sessionId, interaction.guildId, session.data));
}

function handleCancel(interaction, sessionId) {
  if (sessionId) cancelSession(sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ content: '❌ Painel de produtos fechado.', embeds: [], components: [] });
}

// ── Construtores de payload ───────────────────────────────────────────────────

function buildListPayload(sessionId, guildId, data) {
  const { page = 0 } = data;
  const total    = countProducts(guildId);
  const pages    = Math.max(1, Math.ceil(total / PER_PAGE));
  const safeP    = Math.min(page, pages - 1);
  const products = listProducts(guildId, { limit: PER_PAGE, offset: safeP * PER_PAGE });

  const embed    = buildProductListEmbed(products, { page: safeP, total, perPage: PER_PAGE });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prod:new').setLabel('➕ Novo Produto').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(build('prod', 'cancel', sessionId)).setLabel('❌ Fechar').setStyle(ButtonStyle.Secondary),
  );

  const components = [actionRow];

  if (products.length > 0) {
    const viewBtns = products.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(build('prod', 'view', sessionId, p.id))
        .setLabel(p.name.slice(0, 20))
        .setStyle(p.status === PRODUCT_STATUS.ACTIVE ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
    components.unshift(new ActionRowBuilder().addComponents(viewBtns));
  }

  return { content: null, embeds: [embed], components };
}

function buildViewPayload(sessionId, product) {
  const embed   = buildProductEmbed(product);
  const isActive = product.status !== PRODUCT_STATUS.INACTIVE;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('prod', 'toggle', product.id))
      .setLabel(product.status === PRODUCT_STATUS.INACTIVE ? '▶️ Ativar' : '⏸️ Desativar')
      .setStyle(product.status === PRODUCT_STATUS.INACTIVE ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('prod', 'delete', product.id))
      .setLabel('🗑️ Excluir')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(build('prod', 'back', sessionId))
      .setLabel('← Voltar')
      .setStyle(ButtonStyle.Secondary),
  );

  // Botão para ajustar estoque (abre modal via customId especial — não suportado diretamente)
  // Usando botão que abre modal via interação
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('prod', 'stock_btn', product.id))
      .setLabel('📦 Ajustar Estoque')
      .setStyle(ButtonStyle.Primary),
  );

  return { content: null, embeds: [embed], components: [row2, row1] };
}

// ── Utilitário ────────────────────────────────────────────────────────────────

async function safeReply(interaction, content) {
  try {
    const payload = { content, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* ignorado */ }
}
