/**
 * Variáveis — Construtores de UI (flow).
 *
 * Funções puras que constroem embeds, modais e componentes
 * para o gerenciamento de variáveis de servidor.
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
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';

// ── Constantes ────────────────────────────────────────────────────────────────

export const MODAL_CREATE_ID = 'variaveis:modal_create';
export const MODAL_EDIT_ID   = 'variaveis:modal_edit';

/** Regex para nomes válidos de variáveis (mesmo padrão do VARIABLE_PATTERN). */
export const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,29}$/;

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Embed da lista de variáveis do servidor.
 *
 * @param {object[]} variables
 * @returns {EmbedBuilder}
 */
export function buildVariablesListEmbed(variables) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔧 Variáveis Personalizadas');

  if (variables.length === 0) {
    embed.setDescription(
      'Nenhuma variável cadastrada.\n\n' +
      'Crie variáveis para usar em mensagens, embeds e modelos.\n' +
      'Exemplo: `{pix}`, `{loja}`, `{horario}`',
    );
    return embed;
  }

  const lines = variables.slice(0, 25).map(v =>
    `\`{${v.name}}\` → \`${truncate(v.value, 60)}\``,
  );

  embed.setDescription(lines.join('\n'));

  if (variables.length > 25) {
    embed.setFooter({ text: `Mostrando 25 de ${variables.length} variáveis.` });
  } else {
    embed.setFooter({ text: `${variables.length} variável(is) cadastrada(s).` });
  }

  return embed;
}

/**
 * Embed de detalhe de uma variável.
 *
 * @param {object} variable
 * @returns {EmbedBuilder}
 */
export function buildVariableDetailEmbed(variable) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`🔧 Variável: {${variable.name}}`)
    .addFields(
      { name: 'Nome',  value: `\`{${variable.name}}\``,  inline: true },
      { name: 'Valor', value: `\`${truncate(variable.value, 200)}\``, inline: false },
    )
    .setFooter({ text: `ID: ${variable.id}` })
    .setTimestamp(variable.updatedAt * 1000);
}

/**
 * Embed de confirmação de exclusão.
 *
 * @param {object} variable
 * @returns {EmbedBuilder}
 */
export function buildDeleteConfirmEmbed(variable) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar Exclusão')
    .setDescription(
      `Tem certeza que deseja remover a variável **\`{${variable.name}}\`**?\n\n` +
      'Esta ação não pode ser desfeita.',
    );
}

// ── Modais ────────────────────────────────────────────────────────────────────

/**
 * Modal para criar nova variável.
 *
 * @returns {ModalBuilder}
 */
export function buildCreateModal() {
  return new ModalBuilder()
    .setCustomId(MODAL_CREATE_ID)
    .setTitle('Nova Variável')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('Nome da variável (sem chaves)')
          .setPlaceholder('Ex: pix, loja, horario, chave_pix')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(30),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Valor')
          .setPlaceholder('Ex: 123.456.789-00, Ruby FY Store, Seg-Sex 9h-18h')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(500),
      ),
    );
}

/**
 * Modal para editar uma variável existente (valor pré-preenchido).
 *
 * @param {object} variable
 * @returns {ModalBuilder}
 */
export function buildEditModal(variable) {
  return new ModalBuilder()
    .setCustomId(`${MODAL_EDIT_ID}:${variable.id}`)
    .setTitle(`Editar: {${variable.name}}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel('Novo valor')
          .setValue(variable.value)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(500),
      ),
    );
}

// ── Componentes ───────────────────────────────────────────────────────────────

/**
 * Select menu para escolher uma variável da lista.
 * Retorna null se a lista estiver vazia.
 *
 * @param {object[]} variables
 * @returns {ActionRowBuilder|null}
 */
export function buildVariablePickRow(variables) {
  if (variables.length === 0) return null;

  const options = variables.slice(0, 25).map(v =>
    new StringSelectMenuOptionBuilder()
      .setValue(v.id)
      .setLabel(`{${v.name}}`)
      .setDescription(truncate(v.value, 50)),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('variaveis:pick')
    .setPlaceholder('Selecione uma variável para ver, editar ou excluir')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

/**
 * Linha de botões para a lista de variáveis.
 *
 * @returns {ActionRowBuilder}
 */
export function buildListButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('variaveis:new')
      .setLabel('Nova Variável')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('variaveis:cancel')
      .setLabel('Fechar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Linha de botões para detalhe de uma variável.
 *
 * @param {object} variable
 * @returns {ActionRowBuilder}
 */
export function buildDetailButtons(variable) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`variaveis:edit:${variable.id}`)
      .setLabel('Editar')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`variaveis:delete:${variable.id}`)
      .setLabel('Excluir')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('variaveis:list')
      .setLabel('Voltar')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Linha de botões de confirmação de exclusão.
 *
 * @param {object} variable
 * @returns {ActionRowBuilder}
 */
export function buildDeleteConfirmButtons(variable) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`variaveis:delete_ok:${variable.id}`)
      .setLabel('Sim, excluir')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`variaveis:view:${variable.id}`)
      .setLabel('Cancelar')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Payloads compostos ────────────────────────────────────────────────────────

/**
 * Payload completo da lista de variáveis.
 *
 * @param {object[]} variables
 * @returns {{ embeds, components }}
 */
export function buildListPayload(variables) {
  const embed    = buildVariablesListEmbed(variables);
  const pickRow  = buildVariablePickRow(variables);
  const btnRow   = buildListButtons();
  const components = pickRow ? [pickRow, btnRow] : [btnRow];
  return { embeds: [embed], components };
}

/**
 * Payload de detalhe de uma variável.
 *
 * @param {object} variable
 * @returns {{ embeds, components }}
 */
export function buildDetailPayload(variable) {
  return {
    embeds:     [buildVariableDetailEmbed(variable)],
    components: [buildDetailButtons(variable)],
  };
}

/**
 * Payload de confirmação de exclusão.
 *
 * @param {object} variable
 * @returns {{ embeds, components }}
 */
export function buildDeletePayload(variable) {
  return {
    embeds:     [buildDeleteConfirmEmbed(variable)],
    components: [buildDeleteConfirmButtons(variable)],
  };
}

/**
 * Payload de sucesso simples.
 * @param {string} message
 * @returns {{ content, flags }}
 */
export function buildSuccessPayload(message) {
  return { content: `✅ ${message}`, flags: MessageFlags.Ephemeral };
}

/**
 * Payload de erro simples.
 * @param {string} message
 * @returns {{ content, flags }}
 */
export function buildErrorPayload(message) {
  return { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
}

// ── Validação ────────────────────────────────────────────────────────────────

/**
 * Valida o nome de uma variável.
 * Retorna null se válido, ou uma string de erro se inválido.
 *
 * @param {string} name
 * @returns {string|null}
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return 'O nome é obrigatório.';
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'O nome não pode estar vazio.';
  if (!NAME_PATTERN.test(trimmed)) {
    return (
      'Nome inválido. Use apenas letras, números e sublinhado. ' +
      'Deve começar com letra ou sublinhado. Máximo 30 caracteres.\n' +
      'Exemplos válidos: `pix`, `chave_pix`, `nome_loja`'
    );
  }
  return null;
}

/**
 * Valida o valor de uma variável.
 * @param {string} value
 * @returns {string|null}
 */
export function validateValue(value) {
  if (!value || typeof value !== 'string') return 'O valor é obrigatório.';
  if (value.trim().length === 0) return 'O valor não pode estar vazio.';
  if (value.length > 500) return 'O valor não pode ultrapassar 500 caracteres.';
  return null;
}

// ── Utilitário ────────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
