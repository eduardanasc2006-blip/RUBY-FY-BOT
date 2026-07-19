/**
 * Módulo de Tickets — Handler de interações do usuário (namespace 'tkt').
 *
 * Responsável por todas as ações que NÃO são de configuração admin:
 *   - Abrir um novo ticket (clique no botão do painel publicado)
 *   - Confirmar/cancelar fechamento
 *   - Fechar ticket
 *   - Adicionar/remover usuários do canal
 *
 * CustomIds gerenciados:
 *   tkt:open                        — usuário clica em "Abrir Ticket"
 *   tkt:close_confirm:<ticketId>    — abre confirmação de fechamento
 *   tkt:close_do:<ticketId>         — confirma e executa fechamento
 *   tkt:close_cancel                — cancela fechamento (fecha o ephemeral)
 *   tkt:add_user:<ticketId>         — abre select de usuário para adicionar
 *   tkt:user_select_add:<ticketId>  — usuário selecionado para adicionar
 *   tkt:rem_user:<ticketId>         — abre select de usuário para remover
 *   tkt:user_select_rem:<ticketId>  — usuário selecionado para remover
 */

import {
  ActionRowBuilder,
  UserSelectMenuBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';
import { getTicketConfig } from '../../database/repositories/Tickets.mjs';
import {
  createTicket,
  getTicket,
  getOpenTicketByUser,
  getTicketByChannel,
  closeTicket,
  reopenTicket,
} from '../../database/repositories/Tickets.mjs';
import {
  sanitizeChannelName,
  buildWelcomePayload,
  buildCloseConfirmPayload,
  createTicketChannel,
  archiveTicketChannel,
  sendTicketLog,
  isTicketModerator,
  generateTranscript,
  sendTranscriptLog,
} from './flow.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleTktComponent(interaction, action, partes) {
  const ticketId = partes[0] ?? null;

  switch (action) {
    case 'open':             return handleOpen(interaction);
    case 'close_confirm':   return handleCloseConfirm(interaction, ticketId);
    case 'close_do':        return handleCloseDo(interaction, ticketId);
    case 'close_cancel':    return handleCloseCancel(interaction);
    case 'add_user':        return handleAddUser(interaction, ticketId);
    case 'user_select_add': return handleUserSelectAdd(interaction, ticketId);
    case 'rem_user':        return handleRemUser(interaction, ticketId);
    case 'user_select_rem': return handleUserSelectRem(interaction, ticketId);
    case 'reopen':          return handleReopen(interaction, ticketId);
    default:
      logger.warn(`[Tickets/tkt] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abrir ticket ──────────────────────────────────────────────────────────────

async function handleOpen(interaction) {
  const { guildId, user, guild } = interaction;

  if (!guildId || !guild) {
    return safeReply(interaction, '⚠️ Este botão só funciona dentro de um servidor.');
  }

  // Deferimos ephemeral antes de qualquer operação assíncrona
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = getTicketConfig(guildId);

  // Sistema desativado
  if (!config.enabled) {
    return interaction.editReply({ content: '❌ O sistema de tickets está desativado neste servidor.' });
  }

  // Categoria não configurada
  if (!config.category_id) {
    return interaction.editReply({ content: '⚠️ O sistema de tickets ainda não foi configurado. Avise um administrador.' });
  }

  // Já tem ticket aberto?
  const existing = getOpenTicketByUser(guildId, user.id);
  if (existing) {
    return interaction.editReply({
      content: `⚠️ Você já possui um ticket aberto: <#${existing.channelId}>\nPor favor, utilize o canal existente ou aguarde ele ser fechado.`,
    });
  }

  try {
    // Cria canal Discord
    const member       = await guild.members.fetch(user.id).catch(() => null);
    const displayName  = member?.displayName ?? user.username;
    const channelName  = sanitizeChannelName(displayName);

    const channel = await createTicketChannel(guild, config, user, channelName);

    // Persiste no banco
    const ticket = createTicket(guildId, { channelId: channel.id, userId: user.id });

    // Envia mensagem de boas-vindas dentro do ticket
    const welcomePayload = buildWelcomePayload(ticket, user, config);
    await channel.send(welcomePayload);

    // Menciona o usuário para notificação (mensagem separada, deletável)
    await channel.send({ content: `<@${user.id}>`, flags: MessageFlags.SuppressNotifications })
      .catch(() => {});

    // Log
    await sendTicketLog(guild, config, ticket, 'opened', user);

    logger.info(`[Tickets] Ticket aberto: ${ticket.id} | user: ${user.id} | canal: ${channel.id} | guild: ${guildId}`);

    return interaction.editReply({
      content: `✅ Seu ticket foi criado: ${channel}\nUm membro da equipe irá atendê-lo em breve.`,
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao criar ticket:', err);
    return interaction.editReply({
      content: '❌ Não foi possível criar seu ticket. Verifique se o bot tem permissões para criar canais.',
    });
  }
}

// ── Confirmação de fechamento ─────────────────────────────────────────────────

async function handleCloseConfirm(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return safeReply(interaction, '⚠️ Ticket não encontrado.');

  // Verifica se a interação veio do canal correto (segurança anti-spoofing)
  if (ticket.channelId !== interaction.channelId) {
    return safeReply(interaction, '⚠️ Esta ação só pode ser executada dentro do canal do ticket.');
  }

  const config = getTicketConfig(interaction.guildId);
  const member = interaction.member;

  if (!isTicketModerator(member, ticket, config)) {
    return safeReply(interaction, '⚠️ Você não tem permissão para fechar este ticket.');
  }

  if (ticket.status === 'closed') {
    return safeReply(interaction, '⚠️ Este ticket já está fechado.');
  }

  return safeReply(interaction, null, buildCloseConfirmPayload(ticketId));
}

// ── Executar fechamento ───────────────────────────────────────────────────────

async function handleCloseDo(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) {
    return interaction.update({ content: '⚠️ Ticket não encontrado.', components: [] });
  }

  const config = getTicketConfig(interaction.guildId);
  const member = interaction.member;

  if (!isTicketModerator(member, ticket, config)) {
    return interaction.update({ content: '⚠️ Você não tem permissão para fechar este ticket.', components: [] });
  }

  if (ticket.status === 'closed') {
    return interaction.update({ content: '⚠️ Este ticket já está fechado.', components: [] });
  }

  // Atualiza o ephemeral de confirmação imediatamente
  await interaction.update({
    content: '🔒 Fechando ticket...',
    components: [],
  });

  // Fecha no banco
  const closed = closeTicket(interaction.guildId, ticketId, interaction.user.id);
  if (!closed) {
    return interaction.editReply({ content: '❌ Erro ao fechar o ticket no banco de dados.' });
  }

  // 15G: gera transcrição antes de deletar o canal
  const ticketChannel = interaction.guild.channels.cache.get(closed.channelId)
    ?? await interaction.guild.channels.fetch(closed.channelId).catch(() => null);

  if (ticketChannel) {
    const transcript = await generateTranscript(ticketChannel, closed);
    if (transcript) {
      await sendTranscriptLog(interaction.guild, config, closed, transcript);
    }
  }

  // Log antes de deletar o canal (channel ainda existe)
  await sendTicketLog(
    interaction.guild,
    config,
    closed,
    'closed',
    interaction.user,
  );

  logger.info(`[Tickets] Ticket fechado: ${ticketId} | por: ${interaction.user.id} | guild: ${interaction.guildId}`);

  // Remove canal (usa ID do ticket no banco, não da interação — anti-spoofing)
  await archiveTicketChannel(interaction.guild, closed.channelId);
}

// ── Reabrir ticket (15G) ──────────────────────────────────────────────────────

async function handleReopen(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return safeReply(interaction, '⚠️ Ticket não encontrado.');

  if (ticket.status !== 'closed') {
    return safeReply(interaction, '⚠️ Este ticket não está fechado.');
  }

  const config = getTicketConfig(interaction.guildId);

  // Apenas moderadores podem reabrir
  if (!isTicketModerator(interaction.member, ticket, config)) {
    return safeReply(interaction, '⚠️ Você não tem permissão para reabrir este ticket.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Busca o usuário original do ticket
    const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
    if (!user) {
      return interaction.editReply({ content: '❌ Usuário original do ticket não encontrado.' });
    }

    // Cria novo canal Discord
    const member      = await interaction.guild.members.fetch(user.id).catch(() => null);
    const displayName = member?.displayName ?? user.username;
    const channelName = sanitizeChannelName(displayName);

    const newChannel = await createTicketChannel(interaction.guild, config, user, channelName);

    // Atualiza o ticket no banco
    const reopened = reopenTicket(interaction.guildId, ticketId, newChannel.id);
    if (!reopened) {
      await newChannel.delete('Erro ao reabrir ticket — rollback').catch(() => {});
      return interaction.editReply({ content: '❌ Erro ao reabrir o ticket no banco de dados.' });
    }

    // Mensagem de boas-vindas no novo canal
    const welcomePayload = buildWelcomePayload(reopened, user, config);
    await newChannel.send(welcomePayload);

    // Notifica o usuário da reabertura
    await newChannel.send({
      content: `<@${user.id}> Seu ticket foi **reaberto** por <@${interaction.user.id}>.`,
    }).catch(() => {});

    // Log no canal configurado
    await sendTicketLog(interaction.guild, config, reopened, 'opened', interaction.user);

    logger.info(`[Tickets] Ticket ${ticketId} reaberto | por: ${interaction.user.id} | novo canal: ${newChannel.id} | guild: ${interaction.guildId}`);

    return interaction.editReply({
      content: `✅ Ticket reaberto com sucesso: ${newChannel}`,
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao reabrir ticket:', err);
    return interaction.editReply({ content: `❌ Erro ao reabrir o ticket: ${err.message}` });
  }
}

// ── Cancelar fechamento ───────────────────────────────────────────────────────

async function handleCloseCancel(interaction) {
  return interaction.update({
    content: '✅ Fechamento cancelado. O ticket continua aberto.',
    components: [],
  });
}

// ── Adicionar usuário ─────────────────────────────────────────────────────────

async function handleAddUser(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return safeReply(interaction, '⚠️ Ticket não encontrado.');

  if (ticket.channelId !== interaction.channelId) {
    return safeReply(interaction, '⚠️ Esta ação só pode ser executada dentro do canal do ticket.');
  }

  const config = getTicketConfig(interaction.guildId);
  if (!isTicketModerator(interaction.member, ticket, config)) {
    return safeReply(interaction, '⚠️ Você não tem permissão para adicionar usuários neste ticket.');
  }

  if (ticket.status === 'closed') {
    return safeReply(interaction, '⚠️ Não é possível adicionar usuários a um ticket fechado.');
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(build('tkt', 'user_select_add', ticketId))
      .setPlaceholder('Selecione um usuário para adicionar...')
      .setMinValues(1)
      .setMaxValues(1),
  );

  return safeReply(interaction, null, {
    content: '👤 Selecione o usuário que deseja adicionar ao ticket:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleUserSelectAdd(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return interaction.update({ content: '⚠️ Ticket não encontrado.', components: [] });

  const config = getTicketConfig(interaction.guildId);
  if (!isTicketModerator(interaction.member, ticket, config)) {
    return interaction.update({ content: '⚠️ Sem permissão.', components: [] });
  }

  if (ticket.status === 'closed') {
    return interaction.update({ content: '⚠️ Ticket já fechado.', components: [] });
  }

  const targetUserId = interaction.values?.[0];
  if (!targetUserId) return interaction.update({ content: '⚠️ Nenhum usuário selecionado.', components: [] });

  try {
    const channel = interaction.guild.channels.cache.get(ticket.channelId)
      ?? await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel) {
      return interaction.update({ content: '⚠️ Canal do ticket não encontrado.', components: [] });
    }

    await channel.permissionOverwrites.create(targetUserId, {
      ViewChannel:        true,
      SendMessages:       true,
      ReadMessageHistory: true,
      AttachFiles:        true,
    });

    logger.info(`[Tickets] Usuário ${targetUserId} adicionado ao ticket ${ticketId}`);
    return interaction.update({
      content: `✅ <@${targetUserId}> foi adicionado ao ticket com sucesso.`,
      components: [],
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao adicionar usuário:', err?.message);
    return interaction.update({ content: '❌ Não foi possível adicionar o usuário.', components: [] });
  }
}

// ── Remover usuário ───────────────────────────────────────────────────────────

async function handleRemUser(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return safeReply(interaction, '⚠️ Ticket não encontrado.');

  if (ticket.channelId !== interaction.channelId) {
    return safeReply(interaction, '⚠️ Esta ação só pode ser executada dentro do canal do ticket.');
  }

  const config = getTicketConfig(interaction.guildId);
  if (!isTicketModerator(interaction.member, ticket, config)) {
    return safeReply(interaction, '⚠️ Você não tem permissão para remover usuários neste ticket.');
  }

  if (ticket.status === 'closed') {
    return safeReply(interaction, '⚠️ Não é possível remover usuários de um ticket fechado.');
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(build('tkt', 'user_select_rem', ticketId))
      .setPlaceholder('Selecione um usuário para remover...')
      .setMinValues(1)
      .setMaxValues(1),
  );

  return safeReply(interaction, null, {
    content: '👤 Selecione o usuário que deseja remover do ticket:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleUserSelectRem(interaction, ticketId) {
  if (!ticketId) return safeReply(interaction, '⚠️ ID do ticket inválido.');

  const ticket = getTicket(interaction.guildId, ticketId);
  if (!ticket) return interaction.update({ content: '⚠️ Ticket não encontrado.', components: [] });

  const config = getTicketConfig(interaction.guildId);
  if (!isTicketModerator(interaction.member, ticket, config)) {
    return interaction.update({ content: '⚠️ Sem permissão.', components: [] });
  }

  if (ticket.status === 'closed') {
    return interaction.update({ content: '⚠️ Ticket já fechado.', components: [] });
  }

  const targetUserId = interaction.values?.[0];
  if (!targetUserId) return interaction.update({ content: '⚠️ Nenhum usuário selecionado.', components: [] });

  // Proteção: não permite remover o dono do ticket
  if (targetUserId === ticket.userId) {
    return interaction.update({
      content: '⚠️ Não é possível remover o dono do ticket.',
      components: [],
    });
  }

  try {
    const channel = interaction.guild.channels.cache.get(ticket.channelId)
      ?? await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel) {
      return interaction.update({ content: '⚠️ Canal do ticket não encontrado.', components: [] });
    }

    await channel.permissionOverwrites.delete(targetUserId);

    logger.info(`[Tickets] Usuário ${targetUserId} removido do ticket ${ticketId}`);
    return interaction.update({
      content: `✅ <@${targetUserId}> foi removido do ticket.`,
      components: [],
    });
  } catch (err) {
    logger.error('[Tickets] Erro ao remover usuário:', err?.message);
    return interaction.update({ content: '❌ Não foi possível remover o usuário.', components: [] });
  }
}

// ── Utilitário ────────────────────────────────────────────────────────────────

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
