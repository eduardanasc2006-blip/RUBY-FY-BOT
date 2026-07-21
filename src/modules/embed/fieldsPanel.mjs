/**
 * Módulo de Embeds — Gerenciamento de Fields.
 *
 * Painel interativo para adicionar, editar e remover embed fields.
 * Registrado no namespace 'embed' do componentHandler.
 *
 * CustomIds utilizados:
 *   embed:fields_open:sessionId          — abre o painel
 *   embed:fields_add:sessionId           — botão → abre modal de adição
 *   embed:add_modal:sessionId            — submit do modal de adição
 *   embed:edit_select:sessionId          — select → abre modal de edição
 *   embed:edit_modal:sessionId:index     — submit do modal de edição
 *   embed:remove_select:sessionId        — select → remove o field
 *   embed:fields_back:sessionId          — volta ao Editor Visual
 *   embed:fields_cancel:sessionId        — cancela tudo
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import { getSession, updateSession, cancelSession } from '../../core/sessionManager.mjs';
import { renderPanel } from '../editor/renderer.mjs';
import { getDefinition, removeDefinition } from '../editor/actions.mjs';
import { build } from '../../utils/customId.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Handler principal (registrado no namespace 'embed') ───────────────────────

/**
 * Recebe interações do namespace 'embed' vindas do componentHandler.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} action
 * @param {string[]} partes
 */
export async function handleEmbedComponent(interaction, action, partes) {
  const sessionId = partes[0];
  const extraPart = partes[1] ?? null; // índice do field para edit_modal

  if (!sessionId) return safeReply(interaction, '⚠️ Sessão inválida.');

  const session = getSession(sessionId, interaction.user.id, interaction.guildId);
  if (!session) {
    return safeReply(interaction, '⚠️ Esta sessão expirou ou não pertence a você.');
  }

  switch (action) {
    case 'fields_open':    return showFieldsPanel(interaction, session);
    case 'fields_add':     return showAddModal(interaction, session);
    case 'add_modal':      return handleAddModal(interaction, session);
    case 'edit_select':    return handleEditSelect(interaction, session);
    case 'edit_modal':     return handleEditModal(interaction, session, extraPart);
    case 'remove_select':  return handleRemoveSelect(interaction, session);
    case 'fields_back':    return handleBack(interaction, session);
    case 'fields_cancel':  return handleCancel(interaction, session);
    default:
      logger.warn(`[EmbedFields] Ação desconhecida: '${action}'`);
      return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }
}

// ── Painel de gerenciamento ───────────────────────────────────────────────────

/**
 * Constrói o payload completo do painel de gerenciamento de fields.
 * @param {object} session
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildFieldsPanelPayload(session) {
  const fields    = getFields(session);
  const sessionId = session.sessionId;

  // ── Embed ──────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Gerenciar Fields da Embed')
    .setFooter({ text: `${fields.length}/25 fields  •  Sessão expira em 15 min` });

  if (fields.length === 0) {
    embed.setDescription(
      'Nenhum field configurado ainda.\n' +
      'Clique em **➕ Adicionar Field** para começar.',
    );
  } else {
    embed.setDescription(`**${fields.length} field(s) configurado(s):**`);
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      embed.addFields({
        name:   `Field ${i + 1}: ${truncate(f.name, 40)}`,
        value:  `📝 ${truncate(f.value, 60)}\n🔀 Inline: ${f.inline ? '✅ sim' : '❌ não'}`,
        inline: false,
      });
    }
  }

  // ── Componentes ────────────────────────────────────────────────────────────
  const components = [];

  if (fields.length > 0) {
    // Select de edição
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(build('embed', 'edit_select', sessionId))
          .setPlaceholder('✏️ Selecione um field para editar...')
          .addOptions(
            fields.map((f, i) => ({
              label: truncate(`Field ${i + 1}: ${f.name}`, 100),
              value: String(i),
            })),
          ),
      ),
    );

    // Select de remoção
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(build('embed', 'remove_select', sessionId))
          .setPlaceholder('🗑️ Selecione um field para remover...')
          .addOptions(
            fields.map((f, i) => ({
              label: truncate(`Field ${i + 1}: ${f.name}`, 100),
              value: String(i),
            })),
          ),
      ),
    );
  }

  // Botões de ação
  const buttons = [];
  if (fields.length < 25) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(build('embed', 'fields_add', sessionId))
        .setLabel('Adicionar Field')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(build('embed', 'fields_back', sessionId))
      .setLabel('Voltar ao Editor')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('embed', 'fields_cancel', sessionId))
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );
  components.push(new ActionRowBuilder().addComponents(...buttons));

  return { embeds: [embed], components };
}

/** Exibe o painel de gerenciamento de fields. */
async function showFieldsPanel(interaction, session) {
  return interaction.update(buildFieldsPanelPayload(session));
}

// ── Adicionar field ───────────────────────────────────────────────────────────

async function showAddModal(interaction, session) {
  const fields = getFields(session);
  if (fields.length >= 25) {
    return safeReply(interaction, '⚠️ A embed já possui **25 fields** — o máximo permitido pelo Discord.');
  }

  // Deferir para permitir update após o modal submit
  await interaction.deferUpdate();

  const modal = new ModalBuilder()
    .setCustomId(build('embed', 'add_modal', session.sessionId))
    .setTitle('Adicionar Field')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_name')
          .setLabel('Nome do Field')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256)
          .setPlaceholder('Ex: Regras'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_value')
          .setLabel('Valor do Field')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1024)
          .setPlaceholder('Ex: Leia as regras do servidor.'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_inline')
          .setLabel('Inline? (sim / não)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(3)
          .setPlaceholder('sim ou não  (padrão: não)'),
      ),
    );

  return interaction.showModal(modal);
}

async function handleAddModal(interaction, session) {
  const name      = interaction.fields.getTextInputValue('field_name')?.trim();
  const value     = interaction.fields.getTextInputValue('field_value')?.trim();
  const inlineRaw = interaction.fields.getTextInputValue('field_inline')?.trim().toLowerCase();
  const inline    = inlineRaw === 'sim' || inlineRaw === 's' || inlineRaw === 'yes';

  // Validações
  if (!name)            return safeReply(interaction, '⚠️ O **nome** do field é obrigatório.');
  if (!value)           return safeReply(interaction, '⚠️ O **valor** do field é obrigatório.');
  if (name.length  > 256)  return safeReply(interaction, '⚠️ O nome do field não pode exceder **256 caracteres**.');
  if (value.length > 1024) return safeReply(interaction, '⚠️ O valor do field não pode exceder **1024 caracteres**.');

  const fields = getFields(session);
  if (fields.length >= 25) {
    return safeReply(interaction, '⚠️ A embed já possui **25 fields** — o máximo permitido.');
  }

  fields.push({ name, value, inline });
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { fields });

  // Atualiza a mensagem original usando editReply (já deferido em showAddModal)
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.editReply(buildFieldsPanelPayload(updated));
}

// ── Editar field ──────────────────────────────────────────────────────────────

async function handleEditSelect(interaction, session) {
  const indexStr = interaction.values?.[0];
  const index    = parseInt(indexStr, 10);
  const fields   = getFields(session);

  if (isNaN(index) || index < 0 || index >= fields.length) {
    return safeReply(interaction, '⚠️ Field inválido.');
  }

  const field = fields[index];

  // Deferir para permitir update após o modal submit
  await interaction.deferUpdate();

  const modal = new ModalBuilder()
    .setCustomId(build('embed', 'edit_modal', session.sessionId, String(index)))
    .setTitle(`Editar Field ${index + 1}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_name')
          .setLabel('Nome do Field')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256)
          .setValue(field.name),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_value')
          .setLabel('Valor do Field')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1024)
          .setValue(field.value),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('field_inline')
          .setLabel('Inline? (sim / não)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(3)
          .setValue(field.inline ? 'sim' : 'não'),
      ),
    );

  return interaction.showModal(modal);
}

async function handleEditModal(interaction, session, indexStr) {
  const index  = parseInt(indexStr, 10);
  const fields = getFields(session);

  if (isNaN(index) || index < 0 || index >= fields.length) {
    return safeReply(interaction, '⚠️ Field inválido.');
  }

  const name      = interaction.fields.getTextInputValue('field_name')?.trim();
  const value     = interaction.fields.getTextInputValue('field_value')?.trim();
  const inlineRaw = interaction.fields.getTextInputValue('field_inline')?.trim().toLowerCase();
  const inline    = inlineRaw === 'sim' || inlineRaw === 's' || inlineRaw === 'yes';

  if (!name)            return safeReply(interaction, '⚠️ O **nome** do field é obrigatório.');
  if (!value)           return safeReply(interaction, '⚠️ O **valor** do field é obrigatório.');
  if (name.length  > 256)  return safeReply(interaction, '⚠️ O nome do field não pode exceder **256 caracteres**.');
  if (value.length > 1024) return safeReply(interaction, '⚠️ O valor do field não pode exceder **1024 caracteres**.');

  // Substitui apenas o field alvo — os demais ficam intactos
  const newFields = fields.map((f, i) => i === index ? { name, value, inline } : f);
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { fields: newFields });

  // Atualiza a mensagem original usando editReply (já deferido em handleEditSelect)
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.editReply(buildFieldsPanelPayload(updated));
}

// ── Remover field ─────────────────────────────────────────────────────────────

async function handleRemoveSelect(interaction, session) {
  const indexStr = interaction.values?.[0];
  const index    = parseInt(indexStr, 10);
  const fields   = getFields(session);

  if (isNaN(index) || index < 0 || index >= fields.length) {
    return safeReply(interaction, '⚠️ Field inválido.');
  }

  // Remove e reindexar automaticamente via splice
  const newFields = [...fields];
  newFields.splice(index, 1);
  updateSession(session.sessionId, interaction.user.id, interaction.guildId, { fields: newFields });

  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update(buildFieldsPanelPayload(updated));
}

// ── Voltar / Cancelar ─────────────────────────────────────────────────────────

async function handleBack(interaction, session) {
  const definition = getDefinition(session.sessionId);
  if (!definition) {
    return safeReply(
      interaction,
      '⚠️ Definição do editor não encontrada. Feche este painel e abra **/embed** novamente.',
    );
  }
  const updated = getSession(session.sessionId, interaction.user.id, interaction.guildId);
  return interaction.update(renderPanel(updated, definition));
}

async function handleCancel(interaction, session) {
  cancelSession(session.sessionId, interaction.user.id, interaction.guildId);
  removeDefinition(session.sessionId);
  return interaction.update({
    embeds:     [],
    components: [],
    content:    '❌ Configuração cancelada. Nenhuma alteração foi salva.',
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/** Retorna cópia do array de fields da sessão (nunca mutável diretamente). */
function getFields(session) {
  return Array.isArray(session.data.fields) ? [...session.data.fields] : [];
}

/** Trunca uma string para exibição, adicionando '...' se necessário. */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/** Responde de forma segura independente do estado da interação. */
async function safeReply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // interação expirada ou já respondida — não trava o bot
  }
}
