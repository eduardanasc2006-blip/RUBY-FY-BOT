/**
 * Flow de Comandos Personalizados.
 *
 * Contém validações, builders de UI e lógica de apresentação.
 */

import { randomUUID } from 'node:crypto';
import { CONTENT_TYPES } from '../../database/repositories/CustomCommands.mjs';

// ── Validação ─────────────────────────────────────────────────────────────────

/**
 * Valida o nome de um comando.
 * Regras:
 *   - Não vazio
 *   - 1-30 caracteres
 *   - Apenas letras, números e sublinhados
 *   - Deve começar com letra ou sublinhado
 *   - Sem espaços ou caracteres especiais
 *
 * @param {string} name
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return 'O nome do comando é obrigatório.';
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return 'O nome do comando é obrigatório.';
  }

  if (trimmed.length < 1) {
    return 'O nome do comando deve ter pelo menos 1 caractere.';
  }

  if (trimmed.length > 30) {
    return 'O nome do comando deve ter no máximo 30 caracteres.';
  }

  // Deve começar com letra ou sublinhado
  if (!/^[a-zA-Z_]/.test(trimmed)) {
    return 'O nome do comando deve começar com uma letra ou sublinhado.';
  }

  // Apenas letras, números e sublinhados
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return 'O nome do comando só pode conter letras, números e sublinhados.';
  }

  // Não pode ser apenas números
  if (/^\d+$/.test(trimmed)) {
    return 'O nome do comando não pode ser apenas números.';
  }

  return null;
}

/**
 * Valida a descrição de um comando.
 *
 * @param {string} description
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateDescription(description) {
  if (description === null || description === undefined) {
    return null; // descrição é opcional
  }

  if (typeof description !== 'string') {
    return 'A descrição deve ser um texto.';
  }

  if (description.length > 200) {
    return 'A descrição deve ter no máximo 200 caracteres.';
  }

  return null;
}

/**
 * Valida o conteúdo de texto.
 *
 * @param {string} content
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateTextContent(content) {
  if (!content || typeof content !== 'string') {
    return 'O conteúdo de texto é obrigatório.';
  }

  if (content.trim().length === 0) {
    return 'O conteúdo de texto não pode estar vazio.';
  }

  if (content.length > 2000) {
    return 'O conteúdo de texto deve ter no máximo 2000 caracteres.';
  }

  return null;
}

/**
 * Valida os dados de embed.
 *
 * @param {object} data
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateEmbedContent(data) {
  if (!data || typeof data !== 'object') {
    return 'Dados de embed inválidos.';
  }

  // Validação de campos de embed
  const MAX_DESC_LENGTH = 4096;
  const MAX_TITLE_LENGTH = 256;
  const MAX_FOOTER_LENGTH = 2048;
  const MAX_AUTHOR_LENGTH = 256;
  const MAX_FIELD_NAME = 256;
  const MAX_FIELD_VALUE = 1024;
  const MAX_FIELDS = 25;

  if (data.titulo && data.titulo.length > MAX_TITLE_LENGTH) {
    return `O título do embed deve ter no máximo ${MAX_TITLE_LENGTH} caracteres.`;
  }

  if (data.descricao && data.descricao.length > MAX_DESC_LENGTH) {
    return `A descrição do embed deve ter no máximo ${MAX_DESC_LENGTH} caracteres.`;
  }

  if (data.rodape_texto && data.rodape_texto.length > MAX_FOOTER_LENGTH) {
    return `O footer do embed deve ter no máximo ${MAX_FOOTER_LENGTH} caracteres.`;
  }

  if (data.autor_nome && data.autor_nome.length > MAX_AUTHOR_LENGTH) {
    return `O autor do embed deve ter no máximo ${MAX_AUTHOR_LENGTH} caracteres.`;
  }

  if (data.fields && data.fields.length > MAX_FIELDS) {
    return `O embed pode ter no máximo ${MAX_FIELDS} campos.`;
  }

  if (data.fields) {
    for (let i = 0; i < data.fields.length; i++) {
      const field = data.fields[i];
      if (field.name && field.name.length > MAX_FIELD_NAME) {
        return `O nome do campo ${i + 1} deve ter no máximo ${MAX_FIELD_NAME} caracteres.`;
      }
      if (field.value && field.value.length > MAX_FIELD_VALUE) {
        return `O valor do campo ${i + 1} deve ter no máximo ${MAX_FIELD_VALUE} caracteres.`;
      }
    }
  }

  return null;
}

// ── Builders de UI ─────────────────────────────────────────────────────────────

/**
 * Constrói o embed da lista de comandos.
 *
 * @param {object[]} commands
 * @param {string} guildName
 * @returns {object}
 */
export function buildCommandsListEmbed(commands, guildName) {
  const embed = {
    title: '📝 Comandos Personalizados',
    color: 0x5865F2,
    footer: { text: guildName ? `${guildName} • RUBY FY` : 'RUBY FY' },
    timestamp: new Date().toISOString(),
  };

  if (commands.length === 0) {
    embed.description = 'Nenhum comando personalizado criado.\n\nUse o botão abaixo para criar um!';
    return { embeds: [embed] };
  }

  const lines = commands.map(cmd => {
    const status = cmd.enabled ? '✅' : '❌';
    const desc   = cmd.description ? ` — ${cmd.description}` : '';
    return `${status} \`${cmd.name}\`${desc}`;
  });

  embed.description = lines.join('\n');
  embed.fields = [
    {
      name: 'Total',
      value: `${commands.length} comando(s)`,
      inline: true,
    },
  ];

  return { embeds: [embed] };
}

/**
 * Constrói o embed de detalhes de um comando.
 *
 * @param {object} command
 * @param {string} guildName
 * @returns {object}
 */
export function buildCommandDetailEmbed(command, guildName) {
  const embed = {
    title: `📝 Comando: ${command.name}`,
    color: command.enabled ? 0x57F287 : 0xED4245,
    footer: { text: guildName ? `${guildName} • RUBY FY` : 'RUBY FY' },
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: 'Status',
        value: command.enabled ? '✅ Ativado' : '❌ Desativado',
        inline: true,
      },
      {
        name: 'Tipo',
        value: command.contentType === CONTENT_TYPES.TEXT ? '📝 Texto' : '📋 Embed',
        inline: true,
      },
      {
        name: 'Usos',
        value: `${command.useCount} vez(es)`,
        inline: true,
      },
    ],
  };

  if (command.description) {
    embed.fields.push({
      name: 'Descrição',
      value: command.description,
      inline: false,
    });
  }

  // Preview do conteúdo
  if (command.contentType === CONTENT_TYPES.TEXT) {
    embed.fields.push({
      name: 'Conteúdo',
      value: command.contentData.text?.substring(0, 200) || '_vazio_',
      inline: false,
    });
  } else if (command.contentType === CONTENT_TYPES.EMBED) {
    if (command.contentData.titulo) {
      embed.fields.push({
        name: 'Título do Embed',
        value: command.contentData.titulo,
        inline: false,
      });
    }
    if (command.contentData.descricao) {
      embed.fields.push({
        name: 'Descrição do Embed',
        value: command.contentData.descricao.substring(0, 100) + (command.contentData.descricao.length > 100 ? '...' : ''),
        inline: false,
      });
    }
  }

  return { embeds: [embed] };
}

/**
 * Constrói o modal de criação de comando.
 *
 * @param {string} customId
 * @returns {import('discord.js').Modal}
 */
export async function buildCreateModal(customId = 'comandos:modal_create') {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Criar Comando Personalizado')
    .addComponents(
      new TextInputBuilder()
        .setCustomId('comandos:name')
        .setLabel('Nome do Comando')
        .setPlaceholder('Ex: pix, regras, suporte')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30),
      new TextInputBuilder()
        .setCustomId('comandos:description')
        .setLabel('Descrição (opcional)')
        .setPlaceholder('Uma breve descrição')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200),
      new TextInputBuilder()
        .setCustomId('comandos:content')
        .setLabel('Conteúdo')
        .setPlaceholder('O conteúdo que será enviado (texto ou {variavel})')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000),
    );
}

/**
 * Constrói o modal de edição de comando.
 *
 * @param {object} command
 * @returns {import('discord.js').Modal}
 */
export async function buildEditModal(command, customIdPrefix = 'comandos:modal_edit') {
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');

  const customId = `${customIdPrefix}:${command.id}`;

  let contentValue = '';
  if (command.contentType === CONTENT_TYPES.TEXT) {
    contentValue = command.contentData.text || '';
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(`Editar: ${command.name}`)
    .addComponents(
      new TextInputBuilder()
        .setCustomId('comandos:name')
        .setLabel('Nome do Comando')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
        .setValue(command.name),
      new TextInputBuilder()
        .setCustomId('comandos:description')
        .setLabel('Descrição (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200)
        .setValue(command.description || ''),
      new TextInputBuilder()
        .setCustomId('comandos:content')
        .setLabel('Conteúdo')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000)
        .setValue(contentValue),
    );
}

/**
 * Constrói os botões de ação para a lista de comandos.
 *
 * @returns {import('discord.js').ActionRowBuilder}
 */
export async function buildListButtons() {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('comandos:create')
      .setLabel('➕ Criar')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('comandos:refresh')
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Constrói os botões de ação para um comando específico.
 *
 * @param {object} command
 * @returns {import('discord.js').ActionRowBuilder[]}
 */
export async function buildDetailButtons(command) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`comandos:edit:${command.id}`)
      .setLabel('✏️ Editar')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`comandos:toggle:${command.id}`)
      .setLabel(command.enabled ? '⏸️ Desativar' : '▶️ Ativar')
      .setStyle(command.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`comandos:delete:${command.id}`)
      .setLabel('🗑️ Excluir')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('comandos:back')
      .setLabel('⬅️ Voltar')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Constrói o seletor de comandos para o menu de contexto.
 *
 * @param {object[]} commands
 * @returns {import('discord.js').StringSelectMenuBuilder|null}
 */
export async function buildCommandSelectMenu(commands) {
  if (commands.length === 0) return null;

  const { StringSelectMenuBuilder } = await import('discord.js');

  const options = commands.map(cmd => ({
    label: cmd.name,
    description: cmd.description?.substring(0, 100) || `${cmd.contentType === CONTENT_TYPES.TEXT ? 'Texto' : 'Embed'}`,
    value: cmd.id,
  }));

  return new StringSelectMenuBuilder()
    .setCustomId('comandos:select')
    .setPlaceholder('Selecione um comando...')
    .addOptions(options);
}
