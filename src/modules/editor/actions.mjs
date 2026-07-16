/**
 * Núcleo de navegação do Editor Visual.
 * Recebe todas as interações do namespace 'editor' via componentHandler
 * e despacha para a lógica correta.
 */

import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getSession, updateSession, finalizeSession, cancelSession } from '../../core/sessionManager.mjs';
import { renderPanel } from './renderer.mjs';
import { getFieldTypeHandler } from './fieldTypes.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Definições (em memória, junto com as sessões) ─────────────────────────────

/** Map<sessionId, definition> */
const definitions = new Map();

export function setDefinition(sessionId, definition) {
  definitions.set(sessionId, definition);
}

export function removeDefinition(sessionId) {
  definitions.delete(sessionId);
}

function getDefinition(sessionId) {
  return definitions.get(sessionId) ?? null;
}

// ── Handler principal ─────────────────────────────────────────────────────────

/**
 * Recebe todas as interações do namespace 'editor' do componentHandler.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} action
 * @param {string[]} partes
 */
export async function handleComponent(interaction, action, partes) {
  const sessionId = partes[0];
  const fieldKey  = partes[1] ?? null;

  if (!sessionId) {
    return safeReply(interaction, '⚠️ Sessão inválida.');
  }

  // ── Controle de acesso ──────────────────────────────────────────────────────
  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    return safeReply(interaction, '⚠️ Esta sessão expirou ou não pertence a você.');
  }

  const definition = getDefinition(sessionId);
  if (!definition) {
    return safeReply(interaction, '⚠️ Definição do editor não encontrada. Abra o editor novamente.');
  }

  // ── Roteamento por action ───────────────────────────────────────────────────
  switch (action) {
    case 'edit':    return handleEdit(interaction, session, definition, fieldKey);
    case 'pick':    return handlePick(interaction, session, definition);
    case 'select':  return handleSelectSubmit(interaction, session, definition, fieldKey);
    case 'modal':   return handleModalSubmit(interaction, session, definition, fieldKey);
    case 'preview': return handlePreview(interaction, session, definition);
    case 'back':    return handleBack(interaction, session, definition);
    case 'confirm': return handleConfirm(interaction, session, definition);
    case 'cancel':  return handleCancel(interaction, session);
    default:
      logger.warn(`[Editor] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Handlers individuais ──────────────────────────────────────────────────────

/** Botão de campo clicado — abre modal, select ou faz toggle direto */
async function handleEdit(interaction, session, definition, fieldKey) {
  const field = definition.fields.find(f => f.key === fieldKey);
  if (!field) return safeReply(interaction, '⚠️ Campo não encontrado.');

  const handler = getFieldTypeHandler(field.type);
  if (!handler) return safeReply(interaction, `⚠️ Tipo de campo desconhecido: \`${field.type}\``);

  // Toggle direto
  if (handler.isDirect) {
    const current = session.data[fieldKey] ?? false;
    updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [fieldKey]: !current });
    const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
    return interaction.update(renderPanel(updated, definition));
  }

  // Modal (text, paragraph)
  if (handler.isModal) {
    const modal = handler.build(field, session.sessionId, session.data[fieldKey]);
    return interaction.showModal(modal);
  }

  // Select em linha (select, color)
  const selectRow = handler.build(field, session.sessionId);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('editor', 'back', session.sessionId))
      .setLabel('Voltar ao editor')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );
  return interaction.update({ components: [selectRow, backRow] });
}

/** Select menu de escolha de campo (quando há muitos campos) */
async function handlePick(interaction, session, definition) {
  const fieldKey = interaction.values?.[0];
  if (!fieldKey) return safeReply(interaction, '⚠️ Nenhum campo selecionado.');

  // Delega para handleEdit usando um "interaction" que tem o fieldKey
  return handleEdit(interaction, session, definition, fieldKey);
}

/** Submit de select menu de campo (select, color) */
async function handleSelectSubmit(interaction, session, definition, fieldKey) {
  const field = definition.fields.find(f => f.key === fieldKey);
  if (!field) return safeReply(interaction, '⚠️ Campo não encontrado.');

  const handler = getFieldTypeHandler(field.type);
  if (!handler) return safeReply(interaction, `⚠️ Tipo de campo desconhecido: \`${field.type}\``);

  const value = handler.getValue(interaction);
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [fieldKey]: value });

  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update(renderPanel(updated, definition));
}

/** Submit de modal (text, paragraph) */
async function handleModalSubmit(interaction, session, definition, fieldKey) {
  const field = definition.fields.find(f => f.key === fieldKey);
  if (!field) return safeReply(interaction, '⚠️ Campo não encontrado.');

  const handler = getFieldTypeHandler(field.type);
  if (!handler) return safeReply(interaction, `⚠️ Tipo de campo desconhecido: \`${field.type}\``);

  const value = handler.getValue(interaction);
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [fieldKey]: value });

  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);

  // Modal submit não permite update() — envia novo ephemeral com o painel atualizado
  return interaction.reply({
    ...renderPanel(updated, definition),
    flags: MessageFlags.Ephemeral,
  });
}

/** Botão Prévia */
async function handlePreview(interaction, session, definition) {
  let previewPayload;

  try {
    previewPayload = await definition.renderPreview(session.data);
  } catch (err) {
    logger.error('[Editor] Erro em renderPreview:', err);
    return safeReply(interaction, '❌ Erro ao gerar a prévia. Verifique os dados e tente novamente.');
  }

  // Garante que o payload é um objeto com pelo menos content ou embeds
  const payload = normalizePreviewPayload(previewPayload);

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('editor', 'back', session.sessionId))
      .setLabel('Voltar ao editor')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );

  return interaction.update({
    ...payload,
    components: [...(payload.components ?? []), backRow],
  });
}

/** Botão Voltar ao editor (vindo da prévia ou de um select de campo) */
async function handleBack(interaction, session, definition) {
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  if (!updated) return safeReply(interaction, '⚠️ Sessão expirou enquanto você estava na prévia.');
  return interaction.update(renderPanel(updated, definition));
}

/** Botão Confirmar */
async function handleConfirm(interaction, session, definition) {
  // 1. Validação (opcional)
  if (typeof definition.validate === 'function') {
    let validationResult;
    try {
      validationResult = definition.validate(session.data);
    } catch (err) {
      logger.error('[Editor] Erro em validate:', err);
      return safeReply(interaction, '❌ Erro interno na validação. Tente novamente.');
    }

    if (!validationResult?.ok) {
      const reason = validationResult?.reason ?? 'Dados inválidos.';
      return safeReply(interaction, `⚠️ ${reason}`);
    }
  }

  // 2. onConfirm do módulo
  try {
    await definition.onConfirm(interaction, { ...session.data });
  } catch (err) {
    logger.error('[Editor] Erro em onConfirm:', err);
    // Sessão NÃO é finalizada — admin pode tentar novamente
    return safeReply(interaction, '❌ Erro ao salvar a configuração. Seus dados foram mantidos. Tente novamente.');
  }

  // 3. Finaliza sessão apenas após onConfirm bem-sucedido
  finalizeSession(session.sessionId, interaction.user.id, interaction.guildId);
  removeDefinition(session.sessionId);

  return interaction.update({
    embeds: [],
    components: [],
    content: '✅ Configuração salva com sucesso!',
  });
}

/** Botão Cancelar */
async function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  removeDefinition(session.sessionId);

  return interaction.update({
    embeds: [],
    components: [],
    content: '❌ Configuração cancelada. Nenhuma alteração foi salva.',
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Normaliza o retorno de renderPreview para um payload Discord seguro.
 * Aceita: string, EmbedBuilder, { content?, embeds?, components? }
 */
function normalizePreviewPayload(raw) {
  if (!raw) return { content: '*(prévia vazia)*' };
  if (typeof raw === 'string') return { content: raw };
  // EmbedBuilder ou objeto com toJSON
  if (typeof raw.toJSON === 'function') return { embeds: [raw] };
  // Objeto genérico { content?, embeds?, components? }
  if (typeof raw === 'object') return raw;
  return { content: String(raw) };
}

/** Responde à interação de forma segura, independente do estado */
async function safeReply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else if (typeof interaction.update === 'function' && !interaction.isModalSubmit?.()) {
      await interaction.reply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // Interação expirada ou já respondida — não trava o bot
  }
}
