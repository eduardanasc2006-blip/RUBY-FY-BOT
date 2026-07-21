/**
 * Registro de tipos de campo do Editor Visual.
 *
 * Cada tipo define como o campo é editado (modal, select, direto).
 * Novos tipos podem ser adicionados via registerFieldType() sem alterar
 * o restante do editor.
 *
 * Tipos implementados: text, paragraph, select, color, toggle, channel, image
 * Tipos futuros previstos: role, user, url, number, emoji, multi_select
 */

import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  AttachmentBuilder,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';

/** Extensões de imagem permitidas para upload */
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

/** Tamanho máximo de imagem em bytes (8 MB) */
export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

// ── Registro interno ──────────────────────────────────────────────────────────

/**
 * Map<type, handler>
 * handler: {
 *   isModal:      boolean   — true se editar abre um Modal
 *   isDirect:     boolean   — true se editar altera a sessão sem janela extra (toggle)
 *   build:        (field, sessionId, currentValue) => ModalBuilder | ActionRowBuilder | null
 *   getValue:     (interaction) => any | null
 *   renderValue?: (value) => string  — opcional: exibição personalizada no painel
 * }
 */
const registry = new Map();

/**
 * Registra um novo tipo de campo.
 * Pode ser chamado por qualquer módulo para estender os tipos disponíveis.
 *
 * @param {string} type    - Identificador único do tipo (ex: 'channel', 'role')
 * @param {object} handler - Objeto com isModal, isDirect, build, getValue, renderValue?
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

// channel — seletor nativo de canal do Discord (ChannelSelectMenuBuilder)
registerFieldType('channel', {
  isModal:  false,
  isDirect: false,

  build(field, sessionId) {
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(build('editor', 'select', sessionId, field.key))
      .setPlaceholder(`Selecione o canal: ${field.label}`)
      .setChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      )
      .setMinValues(1)
      .setMaxValues(1);

    return new ActionRowBuilder().addComponents(menu);
  },

  getValue(interaction) {
    return interaction.values?.[0] ?? null;
  },

  renderValue(value) {
    if (!value) return '`não configurado`';
    return `<#${value}>`;
  },
});

// image — seletor com URL, Upload ou Remover de imagem
// O valor pode ser:
//   - Uma URL (string começando com http)
//   - Um objeto { type: 'attachment', attachmentId: string }
//   - null (não configurado)
registerFieldType('image', {
  isModal:  false,
  isDirect: false,

  build(field, sessionId) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(build('editor', 'image_action', sessionId, field.key))
      .setPlaceholder(`Selecione uma ação: ${field.label}`)
      .addOptions([
        { label: '🔗 Inserir URL',      value: 'url',    description: 'Inserir URL HTTPS da imagem' },
        { label: '📎 Enviar Arquivo',   value: 'upload', description: 'Enviar imagem do seu computador' },
        { label: '🗑️ Remover',          value: 'remove', description: 'Remover imagem' },
      ]);

    return new ActionRowBuilder().addComponents(menu);
  },

  getValue(interaction) {
    return interaction.values?.[0] ?? null;
  },

  renderValue(value) {
    if (!value) return '`não configurado`';
    if (typeof value === 'string' && value.startsWith('http')) {
      return `\`🔗 URL\``;
    }
    if (value?.type === 'attachment') {
      return `\`📎 Upload\``;
    }
    return '`não configurado`';
  },
});

// image_url — modal para inserir URL de imagem (subtipo de text)
registerFieldType('image_url', {
  isModal:  true,
  isDirect: false,

  build(field, sessionId, currentValue) {
    const input = new TextInputBuilder()
      .setCustomId('value')
      .setLabel(field.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(field.maxLength ?? 512);

    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (currentValue && typeof currentValue === 'string') {
      input.setValue(currentValue.slice(0, field.maxLength ?? 512));
    }

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
