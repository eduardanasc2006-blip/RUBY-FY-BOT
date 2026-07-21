/**
 * Módulo de Tickets — Handler do painel de configuração visual (/tickets).
 *
 * Registrado no namespace 'tcfg' do componentHandler.
 *
 * Permite ao administrador configurar o sistema de tickets do servidor:
 *   - Ativar/desativar o sistema
 *   - Definir categoria dos canais de ticket
 *   - Definir canal de logs
 *   - Definir cargo de suporte
 *   - Definir mensagem de boas-vindas do ticket
 *   - Publicar painel de abertura em um canal
 *
 * CustomIds utilizados:
 *   tcfg:open:sid              — painel principal
 *   tcfg:toggle:sid            — ativa/desativa o sistema
 *   tcfg:set_category:sid      — abre select de categoria
 *   tcfg:cat_select:sid        — categoria selecionada
 *   tcfg:set_log:sid           — abre select de canal de log
 *   tcfg:log_select:sid        — canal de log selecionado
 *   tcfg:set_role:sid          — abre select de cargo de suporte
 *   tcfg:role_select:sid       — cargo de suporte selecionado
 *   tcfg:set_message:sid       — abre modal de mensagem
 *   tcfg:msg_submit:sid        — modal de mensagem submetido
 *   tcfg:publish:sid           — abre select de canal para publicar painel
 *   tcfg:pub_select:sid        — canal selecionado, publica painel
 *   tcfg:clear_category:sid    — limpa categoria configurada
 *   tcfg:clear_log:sid         — limpa canal de log configurado
 *   tcfg:clear_role:sid        — limpa cargo de suporte configurado
 *   tcfg:cancel:sid            — fecha o painel
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import { getTicketConfig, setTicketConfig, countOpenTickets } from '../../database/repositories/Tickets.mjs';
import { buildOpenPanelPayload } from './flow.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';

const MODULE_NAME = 'tickets';

// ── Verificação de Permissão ─────────────────────────────────────────────────

function checkPermission(interaction) {
  return hasModulePermission(interaction.guildId, MODULE_NAME, interaction.member);
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleTcfgComponent(interaction, action, partes) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  const sessionId = partes[0];

  if (!sessionId) return safeReply(interaction, '⚠️ Sessão inválida.');

  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    return safeReply(interaction, '⚠️ Esta sessão expirou ou não pertence a você. Use `/tickets` para abrir novamente.');
  }

  switch (action) {
    case 'open':           return handleOpen(interaction, session);
    case 'toggle':         return handleToggle(interaction, session);
    case 'set_category':   return handleSetCategory(interaction, session);
    case 'cat_select':     return handleCatSelect(interaction, session);
    case 'set_log':        return handleSetLog(interaction, session);
    case 'log_select':     return handleLogSelect(interaction, session);
    case 'set_role':       return handleSetRole(interaction, session);
    case 'role_select':    return handleRoleSelect(interaction, session);
    case 'set_message':    return handleSetMessage(interaction, session);
    case 'msg_submit':     return handleMsgSubmit(interaction, session);
    case 'publish':        return handlePublish(interaction, session);
    case 'pub_select':     return handlePubSelect(interaction, session);
    case 'clear_category': return handleClearCategory(interaction, session);
    case 'clear_log':      return handleClearLog(interaction, session);
    case 'clear_role':     return handleClearRole(interaction, session);
    case 'clear_panel':    return handleClearPanel(interaction, session);
    case 'cancel':         return handleCancel(interaction, session);
    default:
      logger.warn(`[Tickets] Ação de config desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abertura pública (chamada pelo comando /tickets) ──────────────────────────

export async function openTicketsPanel(interaction) {
  const guildId = interaction.guildId;
  const config  = getTicketConfig(guildId);
  const session = createSession(interaction.user.id, guildId, 'tcfg', { config });

  const panel = buildMainPanel(session.sessionId, guildId, config, interaction.guild);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...panel, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleOpen(interaction, session) {
  const config = getTicketConfig(interaction.guildId);
  session.data.config = config;
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleToggle(interaction, session) {
  const config = getTicketConfig(interaction.guildId);
  setTicketConfig(interaction.guildId, { enabled: !config.enabled });
  logger.info(`[Tickets] Sistema ${!config.enabled ? 'ativado' : 'desativado'} | guild: ${interaction.guildId}`);
  const updated = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, updated, interaction.guild));
}

async function handleSetCategory(interaction, session) {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Tickets — Categoria dos Canais')
    .setDescription('Selecione a **categoria** onde os canais de ticket serão criados:');

  const components = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(build('tcfg', 'cat_select', session.sessionId))
        .setPlaceholder('Selecione uma categoria...')
        .addChannelTypes(ChannelType.GuildCategory),
    ),
    new ActionRowBuilder().addComponents(backButton(session.sessionId)),
  ];

  return interaction.update({ embeds: [embed], components, content: null });
}

async function handleCatSelect(interaction, session) {
  const categoryId = interaction.values?.[0];
  if (!categoryId) return safeReply(interaction, '⚠️ Nenhuma categoria selecionada.');
  setTicketConfig(interaction.guildId, { category_id: categoryId });
  logger.info(`[Tickets] Categoria configurada | guild: ${interaction.guildId} | categoria: ${categoryId}`);
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleSetLog(interaction, session) {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Tickets — Canal de Logs')
    .setDescription('Selecione o **canal de texto** onde os logs de tickets serão registrados:');

  const components = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(build('tcfg', 'log_select', session.sessionId))
        .setPlaceholder('Selecione um canal de logs...')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
    new ActionRowBuilder().addComponents(backButton(session.sessionId)),
  ];

  return interaction.update({ embeds: [embed], components, content: null });
}

async function handleLogSelect(interaction, session) {
  const channelId = interaction.values?.[0];
  if (!channelId) return safeReply(interaction, '⚠️ Nenhum canal selecionado.');
  setTicketConfig(interaction.guildId, { log_channel_id: channelId });
  logger.info(`[Tickets] Canal de log configurado | guild: ${interaction.guildId} | canal: ${channelId}`);
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleSetRole(interaction, session) {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Tickets — Cargo de Suporte')
    .setDescription('Selecione o **cargo** que terá acesso a todos os tickets e poderá gerenciá-los:');

  const components = [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(build('tcfg', 'role_select', session.sessionId))
        .setPlaceholder('Selecione o cargo de suporte...'),
    ),
    new ActionRowBuilder().addComponents(backButton(session.sessionId)),
  ];

  return interaction.update({ embeds: [embed], components, content: null });
}

async function handleRoleSelect(interaction, session) {
  const roleId = interaction.values?.[0];
  if (!roleId) return safeReply(interaction, '⚠️ Nenhum cargo selecionado.');
  setTicketConfig(interaction.guildId, { support_role_id: roleId });
  logger.info(`[Tickets] Cargo de suporte configurado | guild: ${interaction.guildId} | cargo: ${roleId}`);
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleSetMessage(interaction, session) {
  const config  = getTicketConfig(interaction.guildId);
  const current = config.intro_message ?? '';

  const modal = new ModalBuilder()
    .setCustomId(build('tcfg', 'msg_submit', session.sessionId))
    .setTitle('🎫 Mensagem de Boas-vindas')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ticket_message')
          .setLabel('Mensagem exibida ao abrir um ticket')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(1000)
          .setValue(current)
          .setPlaceholder('Ex: Olá {usuario}! Descreva seu problema e um membro da equipe irá atendê-lo.'),
      ),
    );

  return interaction.showModal(modal);
}

async function handleMsgSubmit(interaction, session) {
  const message = interaction.fields.getTextInputValue('ticket_message')?.trim() || null;
  setTicketConfig(interaction.guildId, { intro_message: message });
  logger.info(`[Tickets] Mensagem de boas-vindas ${message ? 'configurada' : 'removida'} | guild: ${interaction.guildId}`);

  return interaction.reply({
    content: message
      ? '✅ Mensagem de boas-vindas configurada com sucesso!'
      : '✅ Mensagem de boas-vindas removida.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handlePublish(interaction, session) {
  const config = getTicketConfig(interaction.guildId);

  if (!config.enabled) {
    return safeReply(interaction, '⚠️ Ative o sistema de tickets antes de publicar o painel.');
  }
  if (!config.category_id) {
    return safeReply(interaction, '⚠️ Configure uma categoria antes de publicar o painel.');
  }

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Tickets — Publicar Painel')
    .setDescription('Selecione o **canal** onde o painel de abertura de tickets será publicado.\n\nOs usuários clicarão no botão **"Abrir Ticket"** nesse canal.');

  const components = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(build('tcfg', 'pub_select', session.sessionId))
        .setPlaceholder('Selecione o canal para publicar...')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
    new ActionRowBuilder().addComponents(backButton(session.sessionId)),
  ];

  return interaction.update({ embeds: [embed], components, content: null });
}

async function handlePubSelect(interaction, session) {
  const channelId = interaction.values?.[0];
  if (!channelId) return safeReply(interaction, '⚠️ Nenhum canal selecionado.');

  const config  = getTicketConfig(interaction.guildId);
  const payload = buildOpenPanelPayload(config);

  // Usa MessageManager centralizado
  const { publishOrUpdate } = await import('../../utils/messageManager.mjs');

  const result = await publishOrUpdate({
    guild: interaction.guild,
    channelId,
    messageId: config.panel_message_id,
    payload,
    saveCallback: (chId, msgId) => setTicketConfig(interaction.guildId, {
      panel_channel_id: chId,
      panel_message_id: msgId,
    }),
  });

  if (result.success) {
    const successMsg = result.updated
      ? `✅ Painel atualizado em <#${channelId}>!`
      : `✅ Painel publicado em <#${channelId}>!`;

    return interaction.update(buildMainPanel(
      session.sessionId,
      interaction.guildId,
      getTicketConfig(interaction.guildId),
      interaction.guild,
      successMsg,
    ));
  }

  // Erro
  let errorMsg = `❌ Erro ao publicar o painel.`;
  if (result.channelNotFound) {
    errorMsg = `⚠️ O canal foi deletado. Selecione outro canal.`;
  } else if (result.error === 'no_permission') {
    errorMsg = `⚠️ Não tenho permissão para enviar mensagens neste canal.`;
  } else if (result.error) {
    errorMsg = `❌ Erro ao publicar o painel: ${result.error}`;
  }

  return safeReply(interaction, errorMsg);
}

async function handleClearCategory(interaction, session) {
  setTicketConfig(interaction.guildId, { category_id: null });
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleClearLog(interaction, session) {
  setTicketConfig(interaction.guildId, { log_channel_id: null });
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleClearRole(interaction, session) {
  setTicketConfig(interaction.guildId, { support_role_id: null });
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleClearPanel(interaction, session) {
  setTicketConfig(interaction.guildId, { panel_channel_id: null, panel_message_id: null });
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild, '✅ Painel removido da publicação.'));
}

function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ embeds: [], components: [], content: '❌ Painel de configuração de tickets fechado.' });
}

// ── Construtor do painel principal ────────────────────────────────────────────

function buildMainPanel(sessionId, guildId, config, guild, successMsg = null) {
  const openCount = countOpenTickets(guildId);

  const statusLabel = config.enabled ? '🟢 Ativo' : '🔴 Inativo';

  const categoryName    = resolveChannel(guild, config.category_id,   'Não configurada');
  const logName         = resolveChannel(guild, config.log_channel_id, 'Não configurado');
  const supportRoleName = resolveRole(guild, config.support_role_id,   'Não configurado');

  const fields = [
    { name: '📊 Status',           value: statusLabel,    inline: true },
    { name: '🎟️ Tickets Abertos', value: String(openCount), inline: true },
    { name: '📁 Categoria',        value: categoryName,   inline: true },
    { name: '📋 Canal de Logs',    value: logName,        inline: true },
    { name: '🛡️ Cargo de Suporte', value: supportRoleName, inline: true },
    {
      name:  '📢 Painel Publicado',
      value: config.panel_channel_id && config.panel_message_id
        ? `<#${config.panel_channel_id}> • ID: \`${config.panel_message_id}\``
        : '*Não publicado*',
      inline: false,
    },
    {
      name:  '💬 Mensagem de Boas-vindas',
      value: config.intro_message
        ? `\`\`\`${config.intro_message.slice(0, 200)}\`\`\``
        : '*Não configurada*',
      inline: false,
    },
  ];

  const embed = new EmbedBuilder()
    .setColor(config.enabled ? 0xFEE75C : 0x99AAB5)
    .setTitle('🎫 Configuração de Tickets')
    .setDescription(
      successMsg
        ? `${successMsg}\n\nConfigure o sistema de atendimento por tickets do servidor.`
        : 'Configure o sistema de atendimento por tickets do servidor.',
    )
    .addFields(fields);

  // Linha 1 — Toggle + Categoria + Log
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'toggle', sessionId))
      .setLabel(config.enabled ? 'Desativar' : 'Ativar')
      .setEmoji(config.enabled ? '🔴' : '🟢')
      .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'set_category', sessionId))
      .setLabel('Categoria')
      .setEmoji('📁')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'set_log', sessionId))
      .setLabel('Canal de Logs')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'set_role', sessionId))
      .setLabel('Cargo de Suporte')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Primary),
  );

  // Linha 2 — Mensagem + Publicar
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'set_message', sessionId))
      .setLabel('Mensagem')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'publish', sessionId))
      .setLabel('Publicar Painel')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!config.enabled || !config.category_id),
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'cancel', sessionId))
      .setLabel('Fechar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );

  // Linha 3 — Limpar configurações (somente se houver algo a limpar)
  const clearButtons = [];
  if (config.category_id) {
    clearButtons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_category', sessionId))
        .setLabel('Limpar Categoria')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }
  if (config.log_channel_id) {
    clearButtons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_log', sessionId))
        .setLabel('Limpar Log')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }
  if (config.support_role_id) {
    clearButtons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_role', sessionId))
        .setLabel('Limpar Cargo')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }
  if (config.panel_channel_id && config.panel_message_id) {
    clearButtons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_panel', sessionId))
        .setLabel('Remover Painel')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }

  const components = clearButtons.length > 0
    ? [row1, row2, new ActionRowBuilder().addComponents(clearButtons)]
    : [row1, row2];

  return { embeds: [embed], components, content: null };
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function backButton(sessionId) {
  return new ButtonBuilder()
    .setCustomId(build('tcfg', 'open', sessionId))
    .setLabel('Voltar')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary);
}

function resolveChannel(guild, channelId, fallback) {
  if (!channelId) return fallback;
  const ch = guild?.channels?.cache?.get(channelId);
  if (!ch) return `ID: ${channelId}`;
  return ch.type === ChannelType.GuildCategory ? ch.name : `<#${ch.id}>`;
}

function resolveRole(guild, roleId, fallback) {
  if (!roleId) return fallback;
  const role = guild?.roles?.cache?.get(roleId);
  return role ? `<@&${role.id}>` : `ID: ${roleId}`;
}

async function safeReply(interaction, content, payload = null) {
  const data = payload ?? { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(data);
    } else {
      await interaction.reply(data);
    }
  } catch { /* expirada ou já respondida */ }
}
