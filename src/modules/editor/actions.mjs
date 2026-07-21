/**
 * Núcleo de navegação do Editor Visual.
 * Recebe todas as interações do namespace 'editor' via componentHandler
 * e despacha para a lógica correta.
 */

import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getSession, updateSession, finalizeSession, cancelSession } from '../../core/sessionManager.mjs';
import { renderPanel } from './renderer.mjs';
import { getFieldTypeHandler, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE } from './fieldTypes.mjs';
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

export function getDefinition(sessionId) {
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
    case 'edit':        return handleEdit(interaction, session, definition, fieldKey);
    case 'pick':        return handlePick(interaction, session, definition);
    case 'select':      return handleSelectSubmit(interaction, session, definition, fieldKey);
    case 'modal':       return handleModalSubmit(interaction, session, definition, fieldKey);
    case 'image_action': return handleImageAction(interaction, session, definition, fieldKey);
    case 'image_url':   return handleImageUrlSubmit(interaction, session, definition, fieldKey);
    case 'preview':     return handlePreview(interaction, session, definition);
    case 'back':        return handleBack(interaction, session, definition);
    case 'confirm':     return handleConfirm(interaction, session, definition);
    case 'cancel':      return handleCancel(interaction, session);
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
    await interaction.deferUpdate();
    const current = session.data[fieldKey] ?? false;
    updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [fieldKey]: !current });
    const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
    return interaction.editReply(renderPanel(updated, definition));
  }

  // Modal (text, paragraph) — deferir para poder usar editReply após submit
  if (handler.isModal) {
    await interaction.deferUpdate();
    const modal = handler.build(field, session.sessionId, session.data[fieldKey]);
    return interaction.showModal(modal);
  }

  // Select em linha (select, color, image)
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

  // Atualiza a mensagem original usando editReply (já deferido em handleEdit)
  return interaction.editReply(renderPanel(updated, definition));
}

// ── Handlers de imagem (URL, Upload, Remove) ──────────────────────────────────

/** Action do select de imagem (url, upload, remove) */
async function handleImageAction(interaction, session, definition, fieldKey) {
  const field = definition.fields.find(f => f.key === fieldKey);
  if (!field) return safeReply(interaction, '⚠️ Campo não encontrado.');

  const action = interaction.values?.[0];
  if (!action) return safeReply(interaction, '⚠️ Nenhuma ação selecionada.');

  switch (action) {
    case 'url':
      return handleImageUrl(interaction, session, definition, field);
    case 'upload':
      return handleImageUpload(interaction, session, definition, field);
    case 'remove':
      return handleImageRemove(interaction, session, definition, field);
    default:
      return safeReply(interaction, '⚠️ Ação desconhecida.');
  }
}

/** Abre modal para inserir URL de imagem */
async function handleImageUrl(interaction, session, definition, field) {
  await interaction.deferUpdate();

  const modal = new ModalBuilder()
    .setCustomId(build('editor', 'image_url', session.sessionId, field.key))
    .setTitle(`Editar: ${field.label}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(field.label)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(512)
          .setPlaceholder('https://... (URL HTTPS da imagem)')
          .setValue(session.data[field.key]?.startsWith('http') ? session.data[field.key] : ''),
      ),
    );

  return interaction.showModal(modal);
}

/** Submit do modal de URL de imagem */
async function handleImageUrlSubmit(interaction, session, definition, fieldKey) {
  const field = definition.fields.find(f => f.key === fieldKey);
  if (!field) return safeReply(interaction, '⚠️ Campo não encontrado.');

  const value = interaction.fields.getTextInputValue('value')?.trim();
  if (!value) return safeReply(interaction, '⚠️ A URL é obrigatória.');

  // Validar HTTPS
  if (!value.startsWith('https://')) {
    return safeReply(interaction, '⚠️ A URL deve começar com `https://`.');
  }

  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [fieldKey]: value });
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.editReply(renderPanel(updated, definition));
}

/** Solicita que o usuário envie um arquivo de imagem */
async function handleImageUpload(interaction, session, definition, field) {
  await interaction.deferUpdate();

  // Solicitar que o usuário envie a imagem
  await interaction.editReply({
    content: `📎 **Enviar imagem para "${field.label}"**\n\n` +
      `Envie uma imagem nos formatos: **PNG, JPG, JPEG, GIF, WEBP**\n` +
      `Tamanho máximo: **8 MB**\n\n` +
      `⏱️ Você tem **60 segundos** para enviar.`,
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(build('editor', 'cancel_upload', session.sessionId, field.key))
          .setLabel('Cancelar')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      ),
    ],
  });

  // Coletar a mensagem com o attachment
  try {
    const collected = await interaction.channel.awaitMessages({
      filter: (msg) => msg.author.id === interaction.user.id && msg.attachments.size > 0,
      max: 1,
      time: 60_000,
    });

    const msg = collected.first();
    if (!msg) {
      const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
      return interaction.editReply(renderPanel(updated, definition));
    }

    const attachment = msg.attachments.first();
    if (!attachment) {
      const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
      return interaction.editReply(renderPanel(updated, definition));
    }

    // Validar extensão
    const ext = '.' + attachment.name.split('.').pop().toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
      await msg.delete().catch(() => {});
      await interaction.editReply({
        ...renderPanel(updated, definition),
        content: `⚠️ Formato **${ext}** não permitido. Use: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
      }).catch(() => {});
      return;
    }

    // Validar tamanho
    if (attachment.size > MAX_IMAGE_SIZE) {
      const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
      await msg.delete().catch(() => {});
      await interaction.editReply({
        ...renderPanel(updated, definition),
        content: `⚠️ Imagem muito grande (${(attachment.size / 1024 / 1024).toFixed(2)} MB). Máximo: 8 MB.`,
      }).catch(() => {});
      return;
    }

    // Salvar o attachment URL na sessão
    // Usamos um objeto para distinguir de URLs normais
    updateSession(session.sessionId, interaction.user.id, interaction.guildId, {
      [field.key]: { type: 'attachment', url: attachment.url, name: attachment.name },
    });

    // Limpar mensagem do usuário e atualizar painel
    await msg.delete().catch(() => {});
    const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
    return interaction.editReply(renderPanel(updated, definition));

  } catch (err) {
    logger.warn('[Editor] Timeout ou erro ao coletar imagem:', err?.message);
    const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
    return interaction.editReply(renderPanel(updated, definition));
  }
}

/** Remove a imagem (URL ou attachment) */
async function handleImageRemove(interaction, session, definition, field) {
  await interaction.deferUpdate();
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { [field.key]: null });
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.editReply(renderPanel(updated, definition));
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
