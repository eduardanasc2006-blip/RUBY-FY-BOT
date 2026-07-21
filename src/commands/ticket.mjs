/**
 * Comando /ticket
 *
 * Subcomandos para gerenciar tickets dentro de um canal de ticket.
 *
 *   /ticket fechar              — fecha o ticket do canal atual (mods/dono)
 *   /ticket adicionar <usuário> — adiciona um usuário ao canal (mods/dono)
 *   /ticket remover <usuário>   — remove um usuário do canal (mods/dono)
 *
 * Todos os subcomandos verificam:
 *   - que estão sendo executados dentro de um canal de ticket real
 *   - que o executor tem permissão (dono, ManageChannels ou cargo de suporte)
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import {
  getTicketConfig,
  getTicketByChannel,
  closeTicket,
} from '../database/repositories/Tickets.mjs';
import {
  buildCloseConfirmPayload,
  archiveTicketChannel,
  sendTicketLog,
  isTicketModerator,
} from '../modules/tickets/flow.mjs';
import { logger } from '../utils/logger.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gerencia o ticket no canal atual.')
    .addSubcommand(sub =>
      sub
        .setName('fechar')
        .setDescription('Fecha este ticket (com confirmação).'),
    )
    .addSubcommand(sub =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona um usuário a este ticket.')
        .addUserOption(opt =>
          opt
            .setName('usuario')
            .setDescription('Usuário a adicionar')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub
        .setName('remover')
        .setDescription('Remove um usuário deste ticket.')
        .addUserOption(opt =>
          opt
            .setName('usuario')
            .setDescription('Usuário a remover')
            .setRequired(true),
        ),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '⚠️ Este comando só pode ser usado em servidores.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    // Busca ticket pelo canal atual
    const ticket = getTicketByChannel(interaction.guildId, interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        content: '⚠️ Este canal não é um canal de ticket ativo.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = getTicketConfig(interaction.guildId);

    // Verifica permissão para todas as ações
    if (!isTicketModerator(interaction.member, ticket, config)) {
      return interaction.reply({
        content: '⚠️ Você não tem permissão para gerenciar este ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (sub) {
      case 'fechar':    return handleFechar(interaction, ticket, config);
      case 'adicionar': return handleAdicionar(interaction, ticket, config);
      case 'remover':   return handleRemover(interaction, ticket, config);
    }
  },
};

// ── Fechar ────────────────────────────────────────────────────────────────────

async function handleFechar(interaction, ticket, config) {
  if (ticket.status === 'closed') {
    return interaction.reply({
      content: '⚠️ Este ticket já está fechado.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Mostra confirmação (reutiliza o mesmo payload do botão)
  return interaction.reply(buildCloseConfirmPayload(ticket.id));
}

// ── Adicionar ─────────────────────────────────────────────────────────────────

async function handleAdicionar(interaction, ticket, config) {
  if (ticket.status === 'closed') {
    return interaction.reply({
      content: '⚠️ Não é possível adicionar usuários a um ticket fechado.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser('usuario');
  if (!targetUser) {
    return interaction.reply({ content: '⚠️ Usuário inválido.', flags: MessageFlags.Ephemeral });
  }

  try {
    const channel = interaction.guild.channels.cache.get(ticket.channelId)
      ?? await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: '⚠️ Canal do ticket não encontrado.', flags: MessageFlags.Ephemeral });
    }

    await channel.permissionOverwrites.create(targetUser.id, {
      ViewChannel:        true,
      SendMessages:       true,
      ReadMessageHistory: true,
      AttachFiles:        true,
    });

    logger.info(`[Tickets] /ticket adicionar: ${targetUser.id} → ticket ${ticket.id}`);

    return interaction.reply({
      content:  `✅ <@${targetUser.id}> foi adicionado ao ticket.`,
      flags:    MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao adicionar usuário via comando:', err?.message);
    return interaction.reply({
      content: '❌ Não foi possível adicionar o usuário.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ── Remover ───────────────────────────────────────────────────────────────────

async function handleRemover(interaction, ticket, config) {
  if (ticket.status === 'closed') {
    return interaction.reply({
      content: '⚠️ Não é possível remover usuários de um ticket fechado.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser('usuario');
  if (!targetUser) {
    return interaction.reply({ content: '⚠️ Usuário inválido.', flags: MessageFlags.Ephemeral });
  }

  // Não permite remover o dono do ticket
  if (targetUser.id === ticket.userId) {
    return interaction.reply({
      content: '⚠️ Não é possível remover o dono do ticket.',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const channel = interaction.guild.channels.cache.get(ticket.channelId)
      ?? await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: '⚠️ Canal do ticket não encontrado.', flags: MessageFlags.Ephemeral });
    }

    await channel.permissionOverwrites.delete(targetUser.id);

    logger.info(`[Tickets] /ticket remover: ${targetUser.id} → ticket ${ticket.id}`);

    return interaction.reply({
      content: `✅ <@${targetUser.id}> foi removido do ticket.`,
      flags:   MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao remover usuário via comando:', err?.message);
    return interaction.reply({
      content: '❌ Não foi possível remover o usuário.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
