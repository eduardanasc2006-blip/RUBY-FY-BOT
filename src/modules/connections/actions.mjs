/**
 * Módulo de Conexões — Handler do painel visual (/conexoes).
 *
 * Registrado no namespace 'conexoes' do componentHandler.
 *
 * Fluxo de criação (dados guardados na sessão):
 *   1. open          → painel principal
 *   2. create        → seleciona AÇÃO (StringSelectMenu das ações registradas)
 *   3. pick_action   → salva action na sessão → seleciona MODELO
 *   4. pick_template → salva templateId na sessão → seleciona CANAL
 *   5. pick_channel  → salva targetChannelId na sessão → confirmação
 *   6. confirm_new   → persiste no banco → painel principal
 *
 * CustomIds utilizados:
 *   conexoes:open:sid
 *   conexoes:list:sid
 *   conexoes:create:sid
 *   conexoes:pick_action:sid
 *   conexoes:pick_template:sid
 *   conexoes:pick_channel:sid
 *   conexoes:confirm_new:sid
 *   conexoes:view:sid:cid
 *   conexoes:toggle:sid:cid
 *   conexoes:del:sid:cid
 *   conexoes:del_ok:sid:cid
 *   conexoes:cancel:sid
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { createSession, getSession, cancelSession } from '../../core/sessionManager.mjs';
import { getRegisteredActions } from './registry.mjs';
import {
  createConnection,
  getConnection,
  listConnections,
  updateConnection,
  deleteConnection,
} from '../../database/repositories/Connections.mjs';
import { getTemplate, listTemplates } from '../../database/repositories/Templates.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleConexoesComponent(interaction, action, partes) {
  const sessionId = partes[0];
  const connId    = partes[1] ?? null;

  if (!sessionId) return safeReply(interaction, '⚠️ Sessão inválida.');

  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    return safeReply(interaction, '⚠️ Esta sessão expirou ou não pertence a você. Use `/conexoes` para abrir novamente.');
  }

  switch (action) {
    case 'open':          return handleOpen(interaction, session);
    case 'list':          return handleList(interaction, session);
    case 'create':        return handleCreate(interaction, session);
    case 'pick_action':   return handlePickAction(interaction, session);
    case 'pick_template': return handlePickTemplate(interaction, session);
    case 'pick_channel':  return handlePickChannel(interaction, session);
    case 'confirm_new':   return handleConfirmNew(interaction, session);
    case 'view':          return handleView(interaction, session, connId ?? interaction.values?.[0]);
    case 'toggle':        return handleToggle(interaction, session, connId);
    case 'del':           return handleDel(interaction, session, connId);
    case 'del_ok':        return handleDelOk(interaction, session, connId);
    case 'cancel':        return handleCancel(interaction, session);
    default:
      logger.warn(`[Conexões] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Abertura pública (chamada pelo comando /conexoes) ─────────────────────────

export async function openConexoesPanel(interaction) {
  const session = createSession(interaction.user.id, interaction.guildId, 'conexoes', {});
  const panel   = buildMainPanel(session.sessionId);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...panel, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleOpen(interaction, session) {
  return interaction.update(buildMainPanel(session.sessionId));
}

function handleList(interaction, session) {
  const conns = listConnections(interaction.guildId);
  return interaction.update(buildListPanel(session.sessionId, conns, interaction.guildId));
}

function handleCreate(interaction, session) {
  const actions = getRegisteredActions();
  if (actions.length === 0) {
    return safeReply(interaction, '⚠️ Nenhuma ação registrada. Registre ações com `registerAction()` antes de criar conexões.');
  }
  // Limpa dados de criação anteriores na sessão
  session.data._newAction     = null;
  session.data._newTemplateId = null;
  session.data._newChannelId  = null;
  return interaction.update(buildPickActionPanel(session.sessionId, actions));
}

function handlePickAction(interaction, session) {
  const action = interaction.values?.[0];
  if (!action) return safeReply(interaction, '⚠️ Nenhuma ação selecionada.');

  session.data._newAction = action;

  const templates = listTemplates(interaction.guildId);
  if (templates.length === 0) {
    return safeReply(interaction, '⚠️ Nenhum modelo encontrado. Crie um modelo com `/modelos` antes de criar uma conexão.');
  }

  return interaction.update(buildPickTemplatePanel(session.sessionId, action, templates));
}

function handlePickTemplate(interaction, session) {
  const templateId = interaction.values?.[0];
  if (!templateId) return safeReply(interaction, '⚠️ Nenhum modelo selecionado.');

  session.data._newTemplateId = templateId;

  return interaction.update(buildPickChannelPanel(session.sessionId, session.data._newAction));
}

function handlePickChannel(interaction, session) {
  const channelId = interaction.values?.[0];
  if (!channelId) return safeReply(interaction, '⚠️ Nenhum canal selecionado.');

  session.data._newChannelId = channelId;

  const action     = session.data._newAction;
  const templateId = session.data._newTemplateId;
  const template   = getTemplate(interaction.guildId, templateId);
  const channel    = interaction.guild?.channels?.cache?.get(channelId);

  return interaction.update(buildConfirmNewPanel(session.sessionId, {
    action,
    templateName: template?.name ?? templateId,
    channelName:  channel ? `#${channel.name}` : channelId,
  }));
}

async function handleConfirmNew(interaction, session) {
  const { _newAction: action, _newTemplateId: templateId, _newChannelId: targetChannelId } = session.data;

  if (!action || !templateId || !targetChannelId) {
    return safeReply(interaction, '⚠️ Dados incompletos para criar a conexão. Comece novamente.');
  }

  const conn = createConnection(interaction.guildId, { action, templateId, targetChannelId });
  logger.info(`[Conexões] Conexão criada | guild: ${interaction.guildId} | id: ${conn.id} | ação: ${action}`);

  // Limpa dados temporários da sessão
  delete session.data._newAction;
  delete session.data._newTemplateId;
  delete session.data._newChannelId;

  const conns = listConnections(interaction.guildId);
  return interaction.update({
    ...buildListPanel(session.sessionId, conns, interaction.guildId),
    content: `✅ Conexão criada! Ação **${action}** → ligada ao modelo e canal configurados.`,
  });
}

async function handleView(interaction, session, connId) {
  if (!connId) return safeReply(interaction, '⚠️ ID da conexão ausente.');
  const conn = getConnection(interaction.guildId, connId);
  if (!conn) return safeReply(interaction, '⚠️ Conexão não encontrada.');

  const template = getTemplate(interaction.guildId, conn.templateId);
  const channel  = interaction.guild?.channels?.cache?.get(conn.targetChannelId);

  return interaction.update(buildViewPanel(session.sessionId, conn, {
    templateName: template?.name ?? '⚠️ Modelo excluído',
    channelName:  channel ? `#${channel.name}` : `ID: ${conn.targetChannelId}`,
  }));
}

async function handleToggle(interaction, session, connId) {
  if (!connId) return safeReply(interaction, '⚠️ ID da conexão ausente.');
  const conn = getConnection(interaction.guildId, connId);
  if (!conn) return safeReply(interaction, '⚠️ Conexão não encontrada.');

  const updated = updateConnection(interaction.guildId, connId, { enabled: !conn.enabled });
  logger.info(`[Conexões] Conexão ${updated.enabled ? 'ativada' : 'desativada'} | guild: ${interaction.guildId} | id: ${connId}`);

  const template = getTemplate(interaction.guildId, updated.templateId);
  const channel  = interaction.guild?.channels?.cache?.get(updated.targetChannelId);

  return interaction.update(buildViewPanel(session.sessionId, updated, {
    templateName: template?.name ?? '⚠️ Modelo excluído',
    channelName:  channel ? `#${channel.name}` : `ID: ${updated.targetChannelId}`,
  }));
}

async function handleDel(interaction, session, connId) {
  if (!connId) return safeReply(interaction, '⚠️ ID da conexão ausente.');
  const conn = getConnection(interaction.guildId, connId);
  if (!conn) return safeReply(interaction, '⚠️ Conexão não encontrada.');
  return interaction.update(buildDeletePanel(session.sessionId, conn));
}

async function handleDelOk(interaction, session, connId) {
  if (!connId) return safeReply(interaction, '⚠️ ID da conexão ausente.');
  const deleted = deleteConnection(interaction.guildId, connId);
  if (!deleted) return safeReply(interaction, '⚠️ Conexão não encontrada ou já foi excluída.');

  logger.info(`[Conexões] Conexão excluída | guild: ${interaction.guildId} | id: ${connId}`);
  const conns = listConnections(interaction.guildId);
  return interaction.update({
    ...buildListPanel(session.sessionId, conns, interaction.guildId),
    content: '🗑️ Conexão excluída com sucesso.',
  });
}

function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update({ embeds: [], components: [], content: '❌ Painel de conexões fechado.' });
}

// ── Construtores de painel ────────────────────────────────────────────────────

function buildMainPanel(sessionId) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔗 Conexões')
    .setDescription(
      'Conecte **ações** a **modelos** e **canais** para automatizar mensagens no servidor.\n\n' +
      '**➕ Nova Conexão** — cria uma ligação ação → modelo → canal\n' +
      '**📋 Ver Conexões** — visualiza, ativa/desativa e exclui conexões',
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'create', sessionId))
        .setLabel('Nova Conexão')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'list', sessionId))
        .setLabel('Ver Conexões')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'cancel', sessionId))
        .setLabel('Fechar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildPickActionPanel(sessionId, actions) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔗 Nova Conexão — Passo 1/3')
    .setDescription('Selecione a **ação** que disparará esta conexão:');

  const options = actions.slice(0, 25).map(a => ({
    label:       a.label.slice(0, 100),
    value:       a.name,
    description: a.description ? a.description.slice(0, 100) : undefined,
    emoji:       '⚡',
  }));

  const components = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(build('conexoes', 'pick_action', sessionId))
        .setPlaceholder('Selecione uma ação...')
        .addOptions(options),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'open', sessionId))
        .setLabel('Cancelar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildPickTemplatePanel(sessionId, action, templates) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔗 Nova Conexão — Passo 2/3')
    .setDescription(`Ação selecionada: **${action}**\n\nSelecione o **modelo** que será enviado:`);

  const options = templates.slice(0, 25).map(t => ({
    label:       t.name.slice(0, 100),
    value:       t.id,
    description: (t.description ?? `Tipo: ${t.type}`).slice(0, 100),
    emoji:       '📦',
  }));

  const components = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(build('conexoes', 'pick_template', sessionId))
        .setPlaceholder('Selecione um modelo...')
        .addOptions(options),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'create', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildPickChannelPanel(sessionId, action) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔗 Nova Conexão — Passo 3/3')
    .setDescription(`Ação: **${action}**\n\nSelecione o **canal** onde a mensagem será enviada:`);

  const components = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(build('conexoes', 'pick_channel', sessionId))
        .setPlaceholder('Selecione um canal de texto...')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'create', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildConfirmNewPanel(sessionId, { action, templateName, channelName }) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🔗 Confirmar Nova Conexão')
    .addFields(
      { name: '⚡ Ação',    value: action,       inline: true },
      { name: '📦 Modelo',  value: templateName, inline: true },
      { name: '📢 Canal',   value: channelName,  inline: true },
    )
    .setDescription('Confirme os dados da conexão:');

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'confirm_new', sessionId))
        .setLabel('Confirmar')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'open', sessionId))
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildListPanel(sessionId, conns, guildId) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('📋 Conexões do Servidor')
    .setFooter({ text: `${conns.length} conexão(ões)` });

  const components = [];

  if (conns.length === 0) {
    embed.setDescription('Nenhuma conexão configurada.\nClique em **➕ Nova Conexão** para criar uma.');
  } else {
    const lines = conns.slice(0, 25).map((c, i) => {
      const status = c.enabled ? '🟢' : '🔴';
      return `${status} \`${i + 1}.\` **${c.action}** → <#${c.targetChannelId}>`;
    });
    embed.setDescription(lines.join('\n'));

    const options = conns.slice(0, 25).map((c, i) => ({
      label:       `${i + 1}. ${c.action}`.slice(0, 100),
      value:       c.id,
      description: `Canal: ${c.targetChannelId} | ${c.enabled ? 'Ativa' : 'Inativa'}`,
      emoji:       c.enabled ? '🟢' : '🔴',
    }));

    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(build('conexoes', 'view', sessionId))
          .setPlaceholder('Selecione uma conexão para gerenciar...')
          .addOptions(options),
      ),
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'create', sessionId))
        .setLabel('Nova Conexão')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'open', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { embeds: [embed], components };
}

function buildViewPanel(sessionId, conn, { templateName, channelName }) {
  const statusLabel = conn.enabled ? '🟢 Ativa' : '🔴 Inativa';

  const embed = new EmbedBuilder()
    .setColor(conn.enabled ? 0x57F287 : 0xED4245)
    .setTitle(`🔗 Conexão — ${conn.action}`)
    .addFields(
      { name: '⚡ Ação',    value: conn.action,  inline: true },
      { name: '📦 Modelo',  value: templateName, inline: true },
      { name: '📢 Canal',   value: channelName,  inline: true },
      { name: '📊 Status',  value: statusLabel,  inline: true },
      { name: '🕐 Criada',  value: formatDate(conn.createdAt), inline: true },
    );

  const toggleLabel = conn.enabled ? 'Desativar' : 'Ativar';
  const toggleEmoji = conn.enabled ? '🔴' : '🟢';
  const toggleStyle = conn.enabled ? ButtonStyle.Secondary : ButtonStyle.Success;

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'toggle', sessionId, conn.id))
        .setLabel(toggleLabel)
        .setEmoji(toggleEmoji)
        .setStyle(toggleStyle),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'del', sessionId, conn.id))
        .setLabel('Excluir')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'list', sessionId))
        .setLabel('Voltar')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

function buildDeletePanel(sessionId, conn) {
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar Exclusão')
    .setDescription(
      `Tem certeza que deseja excluir a conexão da ação **${conn.action}**?\n\n` +
      '⚠️ Esta ação **não pode ser desfeita**.',
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'del_ok', sessionId, conn.id))
        .setLabel('Confirmar Exclusão')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(build('conexoes', 'view', sessionId, conn.id))
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components, content: null };
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatDate(unixSeconds) {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
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
