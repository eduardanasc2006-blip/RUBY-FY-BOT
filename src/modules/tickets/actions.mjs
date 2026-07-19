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
 *
 * A configuração é persistida em guild_settings (module='tickets').
 * A tabela tickets (instâncias) é usada pela lógica de abertura/fechamento.
 *
 * CustomIds utilizados:
 *   tcfg:open:sid              — painel principal
 *   tcfg:toggle:sid            — ativa/desativa o sistema
 *   tcfg:set_category:sid      — abre select de categoria
 *   tcfg:cat_select:sid        — categoria selecionada
 *   tcfg:set_log:sid           — abre select de canal de log
 *   tcfg:log_select:sid        — canal de log selecionado
 *   tcfg:set_message:sid       — abre modal de mensagem
 *   tcfg:msg_submit:sid        — modal de mensagem submetido
 *   tcfg:clear_category:sid    — limpa categoria configurada
 *   tcfg:clear_log:sid         — limpa canal de log configurado
 *   tcfg:cancel:sid            — fecha o painel
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
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import { getTicketConfig, setTicketConfig, countOpenTickets } from '../../database/repositories/Tickets.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleTcfgComponent(interaction, action, partes) {
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
    case 'set_message':    return handleSetMessage(interaction, session);
    case 'msg_submit':     return handleMsgSubmit(interaction, session);
    case 'clear_category': return handleClearCategory(interaction, session);
    case 'clear_log':      return handleClearLog(interaction, session);
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
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'open', session.sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
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
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'open', session.sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
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
          .setPlaceholder(
            'Ex: Olá {usuario}! Descreva seu problema e um membro da equipe irá atendê-lo em breve.',
          ),
      ),
    );

  return interaction.showModal(modal);
}

async function handleMsgSubmit(interaction, session) {
  const message = interaction.fields.getTextInputValue('ticket_message')?.trim() || null;

  setTicketConfig(interaction.guildId, { intro_message: message });
  logger.info(`[Tickets] Mensagem de boas-vindas ${message ? 'configurada' : 'removida'} | guild: ${interaction.guildId}`);

  const config = getTicketConfig(interaction.guildId);
  return interaction.reply({
    content: message
      ? '✅ Mensagem de boas-vindas configurada com sucesso!'
      : '✅ Mensagem de boas-vindas removida.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleClearCategory(interaction, session) {
  setTicketConfig(interaction.guildId, { category_id: null });
  logger.info(`[Tickets] Categoria removida | guild: ${interaction.guildId}`);
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

async function handleClearLog(interaction, session) {
  setTicketConfig(interaction.guildId, { log_channel_id: null });
  logger.info(`[Tickets] Canal de log removido | guild: ${interaction.guildId}`);
  const config = getTicketConfig(interaction.guildId);
  return interaction.update(buildMainPanel(session.sessionId, interaction.guildId, config, interaction.guild));
}

function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ embeds: [], components: [], content: '❌ Painel de configuração de tickets fechado.' });
}

// ── Construtor do painel principal ────────────────────────────────────────────

function buildMainPanel(sessionId, guildId, config, guild) {
  const openCount = countOpenTickets(guildId);

  const statusLabel  = config.enabled ? '🟢 Ativo' : '🔴 Inativo';
  const toggleLabel  = config.enabled ? 'Desativar' : 'Ativar';
  const toggleStyle  = config.enabled ? ButtonStyle.Danger : ButtonStyle.Success;
  const toggleEmoji  = config.enabled ? '🔴' : '🟢';

  // Resolve nomes dos canais/categoria no cache da guild
  const categoryName  = resolveChannel(guild, config.category_id,  'Não configurada');
  const logName       = resolveChannel(guild, config.log_channel_id, 'Não configurado');

  const fields = [
    { name: '📊 Status do Sistema',  value: statusLabel,               inline: true },
    { name: '🎟️ Tickets Abertos',    value: String(openCount),          inline: true },
    { name: '📁 Categoria',          value: categoryName,               inline: true },
    { name: '📋 Canal de Logs',      value: logName,                    inline: true },
    { name: '💬 Mensagem de Boas-vindas',
      value: config.intro_message
        ? `\`\`\`${config.intro_message.slice(0, 200)}\`\`\``
        : '*Não configurada*',
      inline: false,
    },
  ];

  const embed = new EmbedBuilder()
    .setColor(config.enabled ? 0xFEE75C : 0x99AAB5)
    .setTitle('🎫 Configuração de Tickets')
    .setDescription('Configure o sistema de atendimento por tickets do servidor.')
    .addFields(fields);

  // Linha 1 — Ativar/desativar + Categoria + Log
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'toggle', sessionId))
      .setLabel(toggleLabel)
      .setEmoji(toggleEmoji)
      .setStyle(toggleStyle),
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
      .setCustomId(build('tcfg', 'set_message', sessionId))
      .setLabel('Mensagem')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary),
  );

  // Linha 2 — Limpar configurações + Fechar
  const row2Buttons = [];
  if (config.category_id) {
    row2Buttons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_category', sessionId))
        .setLabel('Limpar Categoria')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }
  if (config.log_channel_id) {
    row2Buttons.push(
      new ButtonBuilder()
        .setCustomId(build('tcfg', 'clear_log', sessionId))
        .setLabel('Limpar Canal de Log')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }
  row2Buttons.push(
    new ButtonBuilder()
      .setCustomId(build('tcfg', 'cancel', sessionId))
      .setLabel('Fechar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [row1, new ActionRowBuilder().addComponents(row2Buttons)];
  return { embeds: [embed], components, content: null };
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function resolveChannel(guild, channelId, fallback) {
  if (!channelId) return fallback;
  const ch = guild?.channels?.cache?.get(channelId);
  if (!ch) return `ID: ${channelId}`;
  return ch.type === ChannelType.GuildCategory ? ch.name : `<#${ch.id}>`;
}

async function safeReply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* expirada ou já respondida */ }
}
