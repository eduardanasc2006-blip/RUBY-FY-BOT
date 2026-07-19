/**
 * Tickets — Lógica central do fluxo de tickets.
 *
 * Funções reutilizadas tanto pelo handler de componentes (tkt)
 * quanto pelo comando /ticket e pelo painel de publicação (tcfg).
 *
 * Responsabilidades:
 *   - sanitizeChannelName        — nome de canal Discord válido
 *   - buildOpenPanelPayload       — embed + botão "Abrir Ticket" para publicação
 *   - buildWelcomePayload         — mensagem de boas-vindas dentro do ticket
 *   - buildCloseConfirmPayload    — confirmação de fechamento (ephemeral)
 *   - createTicketChannel         — cria canal Discord com permissões corretas
 *   - archiveTicketChannel        — deleta o canal ao fechar
 *   - sendTicketLog               — envia log ao canal configurado
 *   - isTicketModerator           — verifica se o usuário pode fechar/gerenciar
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Nome de canal ─────────────────────────────────────────────────────────────

/**
 * Sanitiza o nome de usuário para um nome de canal Discord válido.
 * Formato: ticket-nome (1-80 chars, minúsculas, hífens, sem caracteres especiais).
 *
 * @param {string} username
 * @returns {string}
 */
export function sanitizeChannelName(username) {
  const base = (username ?? 'usuario')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\-_]/g, '-')   // caracteres inválidos → hífen
    .replace(/-{2,}/g, '-')           // múltiplos hífens → 1
    .replace(/^-+|-+$/g, '')          // hífens no início/fim
    .slice(0, 70)                     // deixa espaço para prefixo
    || 'usuario';

  return `ticket-${base}`.slice(0, 100);
}

// ── Painel de abertura ────────────────────────────────────────────────────────

/**
 * Monta o payload do painel público de abertura de tickets.
 * Este é o embed enviado pelo admin a um canal do servidor,
 * com o botão "Abrir Ticket" que os usuários clicam.
 *
 * @param {{ intro_message?: string|null }} config
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildOpenPanelPayload(config = {}) {
  const description = config.intro_message?.trim()
    || 'Clique no botão abaixo para abrir um ticket e falar com nossa equipe.\nResponderemos o mais rápido possível.';

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Suporte / Atendimento')
    .setDescription(description);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tkt', 'open'))
      .setLabel('Abrir Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

// ── Mensagem dentro do ticket ─────────────────────────────────────────────────

/**
 * Monta a mensagem de boas-vindas enviada dentro do canal do ticket.
 * Inclui botão "Fechar Ticket" e "Adicionar Usuário".
 *
 * @param {{ id: string, createdAt: number }} ticket
 * @param {import('discord.js').User} user
 * @param {{ intro_message?: string|null }} config
 * @returns {{ content: string, embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildWelcomePayload(ticket, user, config) {
  const intro = config.intro_message?.trim()
    ? config.intro_message.replace(/\{usuario\}/g, `<@${user.id}>`)
    : `Olá <@${user.id}>! Um membro da equipe irá atendê-lo em breve.\nPor favor, descreva seu problema com detalhes.`;

  const ts = ticket.createdAt
    ? `<t:${ticket.createdAt}:f>`
    : new Date().toLocaleString('pt-BR');

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🎫 Ticket Aberto')
    .setDescription(intro)
    .addFields(
      { name: '👤 Usuário',        value: `<@${user.id}>`,   inline: true },
      { name: '🆔 ID do Usuário',  value: `\`${user.id}\``,  inline: true },
      { name: '🕐 Aberto em',      value: ts,                 inline: false },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tkt', 'close_confirm', ticket.id))
      .setLabel('Fechar Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(build('tkt', 'add_user', ticket.id))
      .setLabel('Adicionar Usuário')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('tkt', 'rem_user', ticket.id))
      .setLabel('Remover Usuário')
      .setEmoji('➖')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

// ── Confirmação de fechamento ─────────────────────────────────────────────────

/**
 * Payload ephemeral de confirmação de fechamento.
 *
 * @param {string} ticketId
 * @returns {{ content: string, components: ActionRowBuilder[], flags: number }}
 */
export function buildCloseConfirmPayload(ticketId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('tkt', 'close_do', ticketId))
      .setLabel('Confirmar Fechamento')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(build('tkt', 'close_cancel'))
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    content: '⚠️ Tem certeza que deseja **fechar este ticket**? O canal será removido.',
    components: [row],
    flags: MessageFlags.Ephemeral,
  };
}

// ── Criação de canal ──────────────────────────────────────────────────────────

/**
 * Cria o canal privado do ticket no servidor Discord.
 *
 * Permissões aplicadas:
 *   - @everyone: sem acesso (VIEW_CHANNEL negado)
 *   - usuário do ticket: VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY, ATTACH_FILES, EMBED_LINKS
 *   - cargo de suporte (se configurado): VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY, MANAGE_MESSAGES, ATTACH_FILES
 *   - bot: VIEW_CHANNEL, SEND_MESSAGES, MANAGE_CHANNELS, MANAGE_MESSAGES
 *
 * @param {import('discord.js').Guild} guild
 * @param {{ category_id?: string|null, support_role_id?: string|null }} config
 * @param {import('discord.js').User} user
 * @param {string} channelName
 * @returns {Promise<import('discord.js').TextChannel>}
 */
export async function createTicketChannel(guild, config, user, channelName) {
  const permissionOverwrites = [
    // Bloqueia @everyone
    {
      id:   guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // Permite o dono do ticket
    {
      id:    user.id,
      type:  OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  // Cargo de suporte (se configurado e existir no guild)
  if (config.support_role_id && guild.roles.cache.has(config.support_role_id)) {
    permissionOverwrites.push({
      id:    config.support_role_id,
      type:  OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  const channelOptions = {
    name:                channelName,
    type:                ChannelType.GuildText,
    topic:               `Ticket de suporte — ${user.tag} (${user.id})`,
    permissionOverwrites,
  };

  // Categoria (se configurada e existir)
  if (config.category_id && guild.channels.cache.has(config.category_id)) {
    channelOptions.parent = config.category_id;
  }

  const channel = await guild.channels.create(channelOptions);
  logger.info(`[Tickets] Canal criado: #${channel.name} (${channel.id}) para user ${user.id} em guild ${guild.id}`);
  return channel;
}

// ── Remoção de canal ──────────────────────────────────────────────────────────

/**
 * Exclui o canal do ticket, tratando graciosamente canais já removidos.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} channelId
 * @returns {Promise<void>}
 */
export async function archiveTicketChannel(guild, channelId) {
  try {
    const channel = guild.channels.cache.get(channelId)
      ?? await guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      logger.warn(`[Tickets] Canal ${channelId} não encontrado ao tentar remover (já deletado?).`);
      return;
    }

    await channel.delete('Ticket fechado');
    logger.info(`[Tickets] Canal ${channelId} removido (ticket fechado).`);
  } catch (err) {
    logger.error(`[Tickets] Erro ao remover canal ${channelId}:`, err?.message);
  }
}

// ── Logs ──────────────────────────────────────────────────────────────────────

/**
 * Envia um log de ticket ao canal configurado.
 *
 * @param {import('discord.js').Guild} guild
 * @param {{ log_channel_id?: string|null }} config
 * @param {object} ticket
 * @param {'opened'|'closed'} action
 * @param {import('discord.js').User} actor - quem abriu/fechou
 * @returns {Promise<void>}
 */
export async function sendTicketLog(guild, config, ticket, action, actor) {
  if (!config.log_channel_id) return;

  const logChannel = guild.channels.cache.get(config.log_channel_id)
    ?? await guild.channels.fetch(config.log_channel_id).catch(() => null);

  if (!logChannel?.isTextBased()) {
    logger.warn(`[Tickets] Canal de log ${config.log_channel_id} não encontrado ou não é de texto.`);
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const isOpen = action === 'opened';

  const embed = new EmbedBuilder()
    .setColor(isOpen ? 0x57F287 : 0xED4245)
    .setTitle(isOpen ? '🟢 Ticket Aberto' : '🔴 Ticket Fechado')
    .addFields(
      { name: '🆔 ID do Ticket',   value: `\`${ticket.id}\``,          inline: false },
      { name: '👤 Dono do Ticket', value: `<@${ticket.userId}>`,        inline: true  },
      { name: isOpen ? '✅ Aberto por' : '🔒 Fechado por',
        value: `<@${actor.id}>`,                                         inline: true  },
      { name: '📌 Canal',
        value: ticket.channelId ? `<#${ticket.channelId}>` : '*(removido)*', inline: true },
      { name: isOpen ? '🕐 Aberto em' : '🕐 Fechado em',
        value: `<t:${now}:f>`,                                           inline: true  },
    );

  if (!isOpen && ticket.createdAt) {
    const durationSec = now - ticket.createdAt;
    embed.addFields({
      name: '⏱️ Duração',
      value: formatDuration(durationSec),
      inline: true,
    });
  }

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`[Tickets] Erro ao enviar log ao canal ${config.log_channel_id}:`, err?.message);
  }
}

// ── Transcrições (15G) ────────────────────────────────────────────────────────

/**
 * Gera uma transcrição textual do canal do ticket.
 * Busca as últimas 100 mensagens antes do fechamento.
 * Retorna null em caso de erro (não bloqueia o fechamento).
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticket
 * @returns {Promise<string|null>}
 */
export async function generateTranscript(channel, ticket) {
  if (!channel) return null;

  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const sorted  = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const lines = [
      `╔════════════════════════════════════════╗`,
      `║     TRANSCRIÇÃO DE TICKET — Ruby FY    ║`,
      `╚════════════════════════════════════════╝`,
      ``,
      `ID do Ticket : ${ticket.id}`,
      `Servidor     : ${ticket.guildId}`,
      `Canal        : #${channel.name}`,
      `Usuário      : ${ticket.userId}`,
      `Aberto em    : ${ticket.createdAt ? new Date(ticket.createdAt * 1000).toISOString() : 'N/A'}`,
      `Total de msgs: ${sorted.length}`,
      ``,
      `─────────────────────────────────────────`,
      ``,
    ];

    for (const msg of sorted) {
      const ts      = new Date(msg.createdTimestamp).toISOString();
      const author  = `${msg.author.username}${msg.author.bot ? ' [BOT]' : ''}`;
      const content = msg.content?.trim() || null;

      if (content) {
        lines.push(`[${ts}] ${author}: ${content}`);
      } else if (msg.embeds.length > 0) {
        const title = msg.embeds[0]?.title ?? 'embed';
        lines.push(`[${ts}] ${author}: [embed: ${title}]`);
      } else if (msg.attachments.size > 0) {
        lines.push(`[${ts}] ${author}: [attachment]`);
      } else {
        lines.push(`[${ts}] ${author}: [mensagem vazia]`);
      }

      // Arquivos anexados
      for (const att of msg.attachments.values()) {
        lines.push(`           → ${att.name}: ${att.url}`);
      }
    }

    lines.push(``, `─────────────────────────────────────────`);
    lines.push(`Fim da transcrição — gerado por Ruby FY`);

    return lines.join('\n');
  } catch (err) {
    logger.error(`[Tickets] Erro ao gerar transcrição do ticket ${ticket.id}:`, err?.message);
    return null;
  }
}

/**
 * Envia a transcrição como arquivo .txt ao canal de log configurado.
 *
 * @param {import('discord.js').Guild} guild
 * @param {{ log_channel_id?: string|null }} config
 * @param {object} ticket
 * @param {string} transcript
 * @returns {Promise<void>}
 */
export async function sendTranscriptLog(guild, config, ticket, transcript) {
  if (!config.log_channel_id || !transcript) return;

  const logChannel = guild.channels.cache.get(config.log_channel_id)
    ?? await guild.channels.fetch(config.log_channel_id).catch(() => null);

  if (!logChannel?.isTextBased()) {
    logger.warn(`[Tickets] Canal de log ${config.log_channel_id} não encontrado para envio de transcrição.`);
    return;
  }

  try {
    const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
      name: `transcript-${ticket.id}.txt`,
    });

    await logChannel.send({
      content: `📄 Transcrição do ticket \`${ticket.id}\` — <@${ticket.userId}>`,
      files:   [attachment],
    });
  } catch (err) {
    logger.error(`[Tickets] Erro ao enviar transcrição ao canal de log:`, err?.message);
  }
}

// ── Verificação de permissão ──────────────────────────────────────────────────

/**
 * Verifica se o membro tem permissão para gerenciar (fechar/add/rem) um ticket.
 * Pode fechar se for: o dono do ticket, um mod (ManageChannels), ou tiver o cargo de suporte.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {object} ticket
 * @param {{ support_role_id?: string|null }} config
 * @returns {boolean}
 */
export function isTicketModerator(member, ticket, config) {
  if (!member) return false;
  // Dono do ticket sempre pode fechar/gerenciar o próprio
  if (member.id === ticket.userId) return true;
  // ManageChannels → moderador
  if (member.permissions?.has(PermissionFlagsBits.ManageChannels)) return true;
  // Cargo de suporte configurado
  if (config.support_role_id && member.roles?.cache?.has(config.support_role_id)) return true;
  return false;
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
