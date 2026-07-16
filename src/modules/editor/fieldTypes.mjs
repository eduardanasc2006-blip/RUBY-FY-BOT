/**
 * Registro de tipos de campo do Editor Visual.
 *
 * Cada tipo define como o campo é editado (modal, select, direto).
 * Novos tipos podem ser adicionados via registerFieldType() sem alterar
 * o restante do editor.
 *
 * Tipos implementados: text, paragraph, select, color, toggle
 * Tipos futuros previstos: channel, role, user, url, number, image, emoji, multi_select
 */

import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';

// ── Registro interno ──────────────────────────────────────────────────────────

/**
 * Map<type, handler>
 * handler: {
 *   isModal:    boolean   — true se editar abre um Modal
 *   isDirect:   boolean   — true se editar altera a sessão sem janela extra (toggle)
 *   build:      (field, sessionId, currentValue) => ModalBuilder | ActionRowBuilder | null
 *   getValue:   (interaction) => any | null
 * }
 */
const registry = new Map();

/**
 * Registra um novo tipo de campo.
 * Pode ser chamado por qualquer módulo para estender os tipos disponíveis.
 *
 * @param {string} type    - Identificador único do tipo (ex: 'channel', 'role')
 * @param {object} handler - Objeto com isModal, isDirect, build, getValue
 */
export function registerFieldType(type, handler) {
  registry.set(type, handler);
}

/**
 * Retorna o handler de um tipo de campo.
 * @param {string} type
 * @returns {object|null}
 */
export function getFieldTypeHandler(type) {
  return registry.get(type) ?? null;
}

/**
 * Verifica se um tipo de campo está registrado.
 * @param {string} type
 * @returns {boolean}
 */
export function isKnownFieldType(type) {
  return registry.has(type);
}

// ── Tipos built-in ────────────────────────────────────────────────────────────

// text — linha única via Modal
registerFieldType('text', {
  isModal:  true,
  isDirect: false,

  build(field, sessionId, currentValue) {
    const input = new TextInputBuilder()
      .setCustomId('value')
      .setLabel(field.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(field.required ?? false)
      .setMaxLength(field.maxLength ?? 1024);

    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (currentValue != null) input.setValue(String(currentValue).slice(0, field.maxLength ?? 1024));

    return new ModalBuilder()
      .setCustomId(build('editor', 'modal', sessionId, field.key))
      .setTitle(`Editar: ${field.label}`)
      .addComponents(new ActionRowBuilder().addComponents(input));
  },

  getValue(interaction) {
    const val = interaction.fields.getTextInputValue('value');
    return val?.trim() || null;
  },
});

// paragraph — múltiplas linhas via Modal
registerFieldType('paragraph', {
  isModal:  true,
  isDirect: false,

  build(field, sessionId, currentValue) {
    const input = new TextInputBuilder()
      .setCustomId('value')
      .setLabel(field.label)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(field.required ?? false)
      .setMaxLength(field.maxLength ?? 4000);

    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (currentValue != null) input.setValue(String(currentValue).slice(0, field.maxLength ?? 4000));

    return new ModalBuilder()
      .setCustomId(build('editor', 'modal', sessionId, field.key))
      .setTitle(`Editar: ${field.label}`)
      .addComponents(new ActionRowBuilder().addComponents(input));
  },

  getValue(interaction) {
    const val = interaction.fields.getTextInputValue('value');
    return val?.trim() || null;
  },
});

// select — menu suspenso com opções predefinidas
registerFieldType('select', {
  isModal:  false,
  isDirect: false,

  build(field, sessionId) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(build('editor', 'select', sessionId, field.key))
      .setPlaceholder(`Selecione: ${field.label}`)
      .addOptions(
        (field.options ?? []).map(opt => ({
          label:       opt.label,
          value:       opt.value,
          description: opt.description ?? undefined,
          emoji:       opt.emoji ?? undefined,
        }))
      );

    return new ActionRowBuilder().addComponents(menu);
  },

  getValue(interaction) {
    return interaction.values?.[0] ?? null;
  },
});

// color — variante semântica de select para cores
registerFieldType('color', {
  isModal:  false,
  isDirect: false,

  build(field, sessionId) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(build('editor', 'select', sessionId, field.key))
      .setPlaceholder(`Selecione a cor: ${field.label}`)
      .addOptions(
        (field.options ?? []).map(opt => ({
          label: opt.label,
          value: opt.value,
          emoji: opt.emoji ?? '🎨',
        }))
      );

    return new ActionRowBuilder().addComponents(menu);
  },

  getValue(interaction) {
    return interaction.values?.[0] ?? null;
  },
});

// toggle — alterna boolean diretamente (sem modal ou select)
registerFieldType('toggle', {
  isModal:  false,
  isDirect: true,
  build:    null,
  getValue: null,
});
