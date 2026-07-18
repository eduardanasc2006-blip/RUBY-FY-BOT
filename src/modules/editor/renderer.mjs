/**
 * Renderizador do Editor Visual.
 * Constrói o painel principal (embed + botões/select) a partir de
 * uma sessão e uma definição de módulo, sem conhecer lógica específica.
 */

import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { config } from '../../config/bot.mjs';
import { build } from '../../utils/customId.mjs';
import { getFieldTypeHandler } from './fieldTypes.mjs';

/** Máximo de botões de campo por linha (requisito visual) */
const BUTTONS_PER_ROW = 4;

/** Número de linhas disponíveis para campos (1 reservada para ações) */
const MAX_FIELD_ROWS = 4;

/** Máximo de campos com botões individuais antes de usar select menu */
const MAX_FIELDS_AS_BUTTONS = BUTTONS_PER_ROW * MAX_FIELD_ROWS; // 16

// ── Valor de campo formatado ──────────────────────────────────────────────────

/**
 * Converte um valor de campo para string legível no painel.
 * Se o tipo de campo tiver renderValue(), usa essa função customizada.
 *
 * @param {object} field
 * @param {*} value
 * @returns {string}
 */
export function renderFieldValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return '`não configurado`';
  }
  if (typeof value === 'boolean') {
    return value ? '`✅ ativado`' : '`❌ desativado`';
  }

  // Delega para renderValue() customizado do tipo de campo (ex: channel → <#ID>)
  const handler = getFieldTypeHandler(field.type);
  if (typeof handler?.renderValue === 'function') {
    return handler.renderValue(value);
  }

  const str = String(value);
  if (str.length > 60) return `\`${str.slice(0, 57)}...\``;
  return `\`${str}\``;
}

// ── Painel principal ──────────────────────────────────────────────────────────

/**
 * Renderiza o painel principal do editor.
 * Retorna { embeds, components } pronto para envio via Discord.js.
 *
 * @param {object} session    - Sessão do sessionManager
 * @param {object} definition - Definição do módulo (name, fields, ...)
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function renderPanel(session, definition) {
  const { data } = session;
  const { name, fields } = definition;

  // ── Embed ───────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`🛠️ ${name}`)
    .setDescription('Selecione um campo para editar ou utilize os botões abaixo.')
    .setFooter({
      text: 'Alterações salvas somente ao confirmar  •  Sessão expira em 15 min',
    });

  for (const field of fields) {
    embed.addFields({
      name:   `${field.emoji ?? '📝'} ${field.label}`,
      value:  renderFieldValue(field, data[field.key]),
      inline: true,
    });
  }

  // ── Componentes de campo ────────────────────────────────────────────────────
  const components = [];

  if (fields.length <= MAX_FIELDS_AS_BUTTONS) {
    // Botão por campo, agrupados em linhas de BUTTONS_PER_ROW
    for (const chunk of chunkArray(fields, BUTTONS_PER_ROW)) {
      const row = new ActionRowBuilder();
      for (const field of chunk) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(build('editor', 'edit', session.sessionId, field.key))
            .setLabel(field.label)
            .setEmoji(field.emoji ?? '✏️')
            .setStyle(ButtonStyle.Secondary),
        );
      }
      components.push(row);
    }
  } else {
    // Muitos campos: select menu para escolher qual editar
    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(build('editor', 'pick', session.sessionId))
        .setPlaceholder('Escolha um campo para editar...')
        .addOptions(
          fields.map(f => ({
            label: f.label,
            value: f.key,
            emoji: f.emoji ?? '✏️',
          }))
        ),
    );
    components.push(selectRow);
  }

  // ── Linha de ações (sempre presente) ────────────────────────────────────────
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(build('editor', 'preview', session.sessionId))
        .setLabel('Prévia')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(build('editor', 'confirm', session.sessionId))
        .setLabel('Confirmar')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(build('editor', 'cancel', session.sessionId))
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return { embeds: [embed], components };
}

// ── Utilitário ────────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
