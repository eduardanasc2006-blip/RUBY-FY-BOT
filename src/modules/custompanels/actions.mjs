/**
 * Sistema de Painéis Personalizados — Handler de componentes do editor (namespace 'cpnl').
 *
 * Gerencia o painel de administração para criar, editar e publicar painéis.
 *
 * Ações roteadas:
 *   cpnl:list:sid          — lista paginada de painéis
 *   cpnl:view:sid:panelId  — visualiza e edita um painel
 *   cpnl:new               — abre modal de criação
 *   cpnl:new_modal         — submit do modal de criação
 *   cpnl:edit_embed:sid:id — abre modal de edição do embed
 *   cpnl:edit_modal:id     — submit do modal de edição
 *   cpnl:add_btn:panelId   — abre modal para adicionar botão
 *   cpnl:add_btn_modal:id  — submit do modal de botão
 *   cpnl:del_btn:pid:bid   — remove botão (com confirmação inline)
 *   cpnl:publish:panelId   — abre seletor de canal para publicar
 *   cpnl:pub_sel:panelId   — submit do seletor de canal
 *   cpnl:delete:panelId    — confirma exclusão do painel
 *   cpnl:delete_ok:panelId — executa exclusão
 *   cpnl:back:sid          — voltar para a lista
 *   cpnl:cancel:sid        — fechar painel
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { build }                from '../../utils/customId.mjs';
import { logger }               from '../../utils/logger.mjs';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import {
  createPanel, getPanel, listPanels, countPanels,
  updatePanel, deletePanel, markPublished,
  addButton, deleteButton, listButtons, countButtons,
  MAX_BUTTONS, VALID_ACTION_TYPES, VALID_STYLES,
} from '../../database/repositories/CustomPanels.mjs';
import {
  buildPanelEmbed, buildPublishedPayload, buildEditorPayload, validateActionData,
} from './flow.mjs';

const PER_PAGE = 6;

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleCpnlComponent(interaction, action, partes) {
  switch (action) {
    case 'list':       return handleList(interaction, partes[0]);
    case 'view':       return handleView(interaction, partes[0], partes[1]);
    case 'new':        return handleNew(interaction);
    case 'new_modal':  return handleNewModal(interaction);
    case 'edit_embed': return handleEditEmbed(interaction, partes[0], partes[1]);
    case 'edit_modal': return handleEditModal(interaction, partes[0]);
    case 'add_btn':    return handleAddBtn(interaction, partes[0]);
    case 'add_btn_modal': return handleAddBtnModal(interaction, partes[0]);
    case 'del_btn':    return handleDelBtn(interaction, partes[0], partes[1]);
    case 'publish':    return handlePublish(interaction, partes[0]);
    case 'pub_sel':    return handlePubSel(interaction, partes[0]);
    case 'delete':     return handleDeleteConfirm(interaction, partes[0]);
    case 'delete_ok':  return handleDeleteOk(interaction, partes[0]);
    case 'back':       return handleBack(interaction, partes[0]);
    case 'cancel':     return handleCancel(interaction, partes[0]);
    default:
      logger.warn(`[CustomPanels] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abrir painel de gestão ────────────────────────────────────────────────────

export async function openCustomPanelsManager(interaction) {
  const session = createSession(interaction.user.id, interaction.guildId, 'cpnl', { page: 0 });
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
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada. Use `/paineis` novamente.');
  const payload = buildListPayload(sessionId, interaction.guildId, session.data);
  return interaction.update(payload);
}

async function handleView(interaction, sessionId, panelId) {
  if (!sessionId || !panelId) return safeReply(interaction, '⚠️ Parâmetros inválidos.');
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada.');

  const panel = getPanel(interaction.guildId, panelId);
  if (!panel)   return safeReply(interaction, '⚠️ Painel não encontrado.');

  const payload = buildEditorPayload(sessionId, panel, interaction.guildId);
  return interaction.update(payload);
}

async function handleNew(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('cpnl:new_modal')
    .setTitle('✨ Criar Novo Painel')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('Nome do painel (interno, não aparece na publicação)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
          .setPlaceholder('Ex: Painel de Regras, Menu de Serviços...'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_title')
          .setLabel('Título do embed (visível na publicação)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)
          .setPlaceholder('Ex: 📋 Bem-vindo ao Servidor!'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_description')
          .setLabel('Descrição do embed')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(2000)
          .setPlaceholder('Texto principal que aparecerá no painel...'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_color')
          .setLabel('Cor (hex, ex: #5865F2)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(7)
          .setPlaceholder('#5865F2'),
      ),
    );
  return interaction.showModal(modal);
}

async function handleNewModal(interaction) {
  const name        = interaction.fields.getTextInputValue('name')?.trim();
  const embedTitle  = interaction.fields.getTextInputValue('embed_title')?.trim()       || null;
  const embedDesc   = interaction.fields.getTextInputValue('embed_description')?.trim() || null;
  const embedColor  = interaction.fields.getTextInputValue('embed_color')?.trim()       || '#5865F2';

  if (!name) return safeReply(interaction, '⚠️ O nome do painel é obrigatório.');

  const panel = createPanel(interaction.guildId, {
    name,
    embedTitle,
    embedDescription: embedDesc,
    embedColor: /^#[0-9A-Fa-f]{6}$/.test(embedColor) ? embedColor : '#5865F2',
  });

  logger.info(`[CustomPanels] Painel criado | id: ${panel.id} | guild: ${interaction.guildId}`);

  const session = createSession(interaction.user.id, interaction.guildId, 'cpnl', { page: 0 });
  const payload = buildEditorPayload(session.sessionId, panel, interaction.guildId);

  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function handleEditEmbed(interaction, sessionId, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  const modal = new ModalBuilder()
    .setCustomId(build('cpnl', 'edit_modal', panelId))
    .setTitle('✏️ Editar Embed')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_title')
          .setLabel('Título')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)
          .setValue(panel.embedTitle ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_description')
          .setLabel('Descrição')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(2000)
          .setValue(panel.embedDescription ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_color')
          .setLabel('Cor (hex)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(7)
          .setValue(panel.embedColor ?? '#5865F2'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_footer')
          .setLabel('Rodapé (opcional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200)
          .setValue(panel.embedFooter ?? ''),
      ),
    );
  return interaction.showModal(modal);
}

async function handleEditModal(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  const embedTitle  = interaction.fields.getTextInputValue('embed_title')?.trim()       || null;
  const embedDesc   = interaction.fields.getTextInputValue('embed_description')?.trim() || null;
  const rawColor    = interaction.fields.getTextInputValue('embed_color')?.trim();
  const embedColor  = /^#[0-9A-Fa-f]{6}$/.test(rawColor ?? '') ? rawColor : panel.embedColor;
  const embedFooter = interaction.fields.getTextInputValue('embed_footer')?.trim()      || null;

  const updated = updatePanel(interaction.guildId, panelId, { embedTitle, embedDescription: embedDesc, embedColor, embedFooter });

  const session = createSession(interaction.user.id, interaction.guildId, 'cpnl', { page: 0 });
  const payload = buildEditorPayload(session.sessionId, updated, interaction.guildId);

  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function handleAddBtn(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  if (countButtons(interaction.guildId, panelId) >= MAX_BUTTONS) {
    return safeReply(interaction, `⚠️ Limite de ${MAX_BUTTONS} botões atingido.`);
  }

  const modal = new ModalBuilder()
    .setCustomId(build('cpnl', 'add_btn_modal', panelId))
    .setTitle('➕ Adicionar Botão')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('label')
          .setLabel('Texto do botão')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('style')
          .setLabel('Estilo: Primary | Secondary | Success | Danger')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(10)
          .setValue('Primary'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('action_type')
          .setLabel('Ação: message | give_role | take_role | toggle_role | open_ticket')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(30),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('action_data')
          .setLabel('Dados da ação (JSON) — ex: {"content":"Olá!"} ou {"role_id":"..."}')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
          .setValue('{}'),
      ),
    );
  return interaction.showModal(modal);
}

async function handleAddBtnModal(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  const label      = interaction.fields.getTextInputValue('label')?.trim();
  const rawStyle   = interaction.fields.getTextInputValue('style')?.trim() || 'Primary';
  const actionType = interaction.fields.getTextInputValue('action_type')?.trim();
  const rawData    = interaction.fields.getTextInputValue('action_data')?.trim() || '{}';

  if (!label) return safeReply(interaction, '⚠️ O texto do botão é obrigatório.');

  const style = VALID_STYLES.includes(rawStyle) ? rawStyle : 'Primary';

  let actionData = {};
  try { actionData = JSON.parse(rawData); } catch {
    return safeReply(interaction, '⚠️ Os dados da ação devem ser JSON válido. Ex: `{"content":"Olá!"}`');
  }

  const validation = validateActionData(actionType, actionData);
  if (!validation.valid) return safeReply(interaction, `⚠️ ${validation.reason}`);

  const btn = addButton(interaction.guildId, panelId, { label, style, actionType, actionData });
  if (!btn) return safeReply(interaction, `⚠️ Limite de ${MAX_BUTTONS} botões atingido ou painel não encontrado.`);

  logger.info(`[CustomPanels] Botão adicionado | painel: ${panelId} | label: ${label} | ação: ${actionType}`);

  const session = createSession(interaction.user.id, interaction.guildId, 'cpnl', { page: 0 });
  const updated = getPanel(interaction.guildId, panelId);
  const payload = buildEditorPayload(session.sessionId, updated, interaction.guildId);

  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function handleDelBtn(interaction, panelId, buttonId) {
  if (!panelId || !buttonId) return safeReply(interaction, '⚠️ Parâmetros inválidos.');

  const deleted = deleteButton(interaction.guildId, panelId, buttonId);
  if (!deleted) return safeReply(interaction, '⚠️ Botão não encontrado.');

  const panel = getPanel(interaction.guildId, panelId);
  if (!panel)  return safeReply(interaction, '⚠️ Painel não encontrado.');

  const session = createSession(interaction.user.id, interaction.guildId, 'cpnl', { page: 0 });
  const payload = buildEditorPayload(session.sessionId, panel, interaction.guildId);
  return interaction.update(payload);
}

async function handlePublish(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  if (countButtons(interaction.guildId, panelId) === 0) {
    return safeReply(interaction, '⚠️ Adicione pelo menos um botão antes de publicar.');
  }

  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(build('cpnl', 'pub_sel', panelId))
      .setPlaceholder('Selecione o canal onde o painel será publicado...')
      .addChannelTypes(ChannelType.GuildText),
  );

  return interaction.update({
    content:    `📢 **Publicar painel "${panel.name}"**\nSelecione o canal de destino:`,
    embeds:     [],
    components: [row],
  });
}

async function handlePubSel(interaction, panelId) {
  const channelId = interaction.values?.[0];
  if (!channelId) return safeReply(interaction, '⚠️ Nenhum canal selecionado.');

  const panel = getPanel(interaction.guildId, panelId);
  if (!panel)  return safeReply(interaction, '⚠️ Painel não encontrado.');

  const channel = interaction.guild?.channels?.cache?.get(channelId);
  if (!channel) return safeReply(interaction, '⚠️ Canal não encontrado no servidor.');

  // Verifica permissão de envio
  const me = interaction.guild?.members?.me;
  if (me && !channel.permissionsFor(me)?.has('SendMessages')) {
    return safeReply(interaction, `⚠️ Sem permissão para enviar mensagens em ${channel.name}.`);
  }

  const payload = buildPublishedPayload(panel, interaction.guildId);

  try {
    // Primeiro tenta editar mensagem existente
    if (panel.channelId && panel.messageId) {
      try {
        const existingMsg = await channel.messages.fetch(panel.messageId);
        await existingMsg.edit(payload);
        markPublished(interaction.guildId, panelId, channelId, panel.messageId);
        logger.info(`[CustomPanels] Painel atualizado | id: ${panelId} | canal: ${channelId} | msg: ${panel.messageId}`);

        return interaction.update({
          content:    `✅ Painel **"${panel.name}"** atualizado em <#${channelId}>!`,
          embeds:     [],
          components: [],
        });
      } catch (fetchErr) {
        // Mensagem não existe mais, vamos criar uma nova
        if (fetchErr?.code !== 10008) {
          logger.warn(`[CustomPanels] Erro ao buscar mensagem existente: ${fetchErr?.message}`);
        }
      }
    }

    // Criar nova mensagem
    const msg = await channel.send(payload);
    markPublished(interaction.guildId, panelId, channelId, msg.id);
    logger.info(`[CustomPanels] Painel publicado | id: ${panelId} | canal: ${channelId} | msg: ${msg.id}`);

    return interaction.update({
      content:    `✅ Painel **"${panel.name}"** publicado em <#${channelId}>!`,
      embeds:     [],
      components: [],
    });
  } catch (err) {
    logger.error('[CustomPanels] Erro ao publicar painel:', err?.message);
    return safeReply(interaction, '❌ Erro ao publicar o painel. Verifique as permissões do bot.');
  }
}

async function handleDeleteConfirm(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  if (!panel) return safeReply(interaction, '⚠️ Painel não encontrado.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'delete_ok', panelId))
      .setLabel('✅ Confirmar Exclusão')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cpnl:cancel_del')
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  return interaction.update({
    content:    `⚠️ **Excluir painel "${panel.name}"?**\nEsta ação é irreversível e remove todos os botões configurados.`,
    embeds:     [],
    components: [row],
  });
}

async function handleDeleteOk(interaction, panelId) {
  const panel = getPanel(interaction.guildId, panelId);
  const name  = panel?.name ?? 'desconhecido';

  deletePanel(interaction.guildId, panelId);
  logger.info(`[CustomPanels] Painel excluído | id: ${panelId} | guild: ${interaction.guildId}`);

  return interaction.update({
    content:    `✅ Painel **"${name}"** excluído com sucesso.`,
    embeds:     [],
    components: [],
  });
}

function handleBack(interaction, sessionId) {
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session)  return safeReply(interaction, '⚠️ Sessão expirada. Use `/paineis` novamente.');
  const payload = buildListPayload(sessionId, interaction.guildId, session.data);
  return interaction.update(payload);
}

function handleCancel(interaction, sessionId) {
  if (sessionId) cancelSession(sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ content: '❌ Painel de gestão fechado.', embeds: [], components: [] });
}

// ── Construtor de lista ───────────────────────────────────────────────────────

function buildListPayload(sessionId, guildId, data) {
  const { page = 0 } = data;
  const total  = countPanels(guildId);
  const pages  = Math.max(1, Math.ceil(total / PER_PAGE));
  const safeP  = Math.min(page, pages - 1);
  const panels = listPanels(guildId, { limit: PER_PAGE, offset: safeP * PER_PAGE });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎨 Painéis Personalizados')
    .setDescription(
      total === 0
        ? '*Nenhum painel criado ainda. Clique em **✨ Novo Painel** para começar!*'
        : `Mostrando página **${safeP + 1}/${pages}** — total: **${total}**`,
    );

  for (const p of panels) {
    const status = p.status === 'published' ? '🟢' : '⚫';
    const btns   = countButtons(guildId, p.id);
    embed.addFields({
      name:  `${status} ${p.name}`,
      value: `Botões: ${btns} | Criado: <t:${p.createdAt}:R>`,
      inline: false,
    });
  }

  // Botão Novo Painel + nav
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cpnl:new')
      .setLabel('✨ Novo Painel')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'cancel', sessionId))
      .setLabel('❌ Fechar')
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [actionRow];

  // Botões de acesso a painéis individuais (máx 5)
  if (panels.length > 0) {
    const viewBtns = panels.slice(0, 5).map(p =>
      new ButtonBuilder()
        .setCustomId(build('cpnl', 'view', sessionId, p.id))
        .setLabel(p.name.slice(0, 20))
        .setStyle(ButtonStyle.Primary),
    );
    components.unshift(new ActionRowBuilder().addComponents(viewBtns));
  }

  return { content: null, embeds: [embed], components };
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
