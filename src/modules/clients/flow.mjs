/**
 * Clients — Funções de fluxo puras.
 *
 * IMPORTANTE: Este arquivo NÃO importa database/client.mjs nem config/bot.mjs.
 * Todas as funções são puras e testáveis sem banco de dados.
 *
 * Responsabilidades:
 *   - resolveClientDiscordId  — extrai snowflake de menção ou ID puro
 *   - buildClientModal        — ModalBuilder para registro de cliente
 *   - parseClientModal        — extrai campos do modal submetido
 *   - buildClientEmbed        — embed de detalhes do cliente (com stats opcionais)
 *   - buildClientListEmbed    — embed de listagem de clientes
 *   - buildClientPickRow      — StringSelectMenu para selecionar cliente
 *   - buildClientViewComponents — botões de gerenciamento
 *   - buildDeleteConfirmPayload — payload de confirmação de exclusão
 *   - buildSuccessPayload     — payload ephemeral de sucesso
 *   - buildErrorPayload       — payload ephemeral de erro
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags,
} from 'discord.js';

// ── Constantes ────────────────────────────────────────────────────────────────

/** CustomId do modal de registro de cliente. */
export const MODAL_CUSTOM_ID = 'clients:modal_submit';

// ── Utilitário de ID ──────────────────────────────────────────────────────────

/**
 * Resolve uma menção Discord ou ID numérico puro para um userId.
 * Aceita: <@123>, <@!123>, ou string de 17–20 dígitos.
 * Retorna null se não for possível resolver.
 *
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export function resolveClientDiscordId(input) {
  if (!input) return null;
  const str = String(input).trim();

  // Menção <@ID> ou <@!ID>
  const mention = str.match(/^<@!?(\d{17,20})>$/);
  if (mention) return mention[1];

  // ID numérico puro
  if (/^\d{17,20}$/.test(str)) return str;

  return null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Constrói o modal de registro de cliente.
 *
 * Campos (5):
 *   1. name    — nome de exibição (obrigatório)
 *   2. discord — menção ou ID do Discord (opcional)
 *   3. email   — e-mail de contato (opcional)
 *   4. phone   — telefone de contato (opcional)
 *   5. notas   — observações (opcional, parágrafo)
 *
 * @returns {ModalBuilder}
 */
export function buildClientModal(defaults = {}) {
  const modal = new ModalBuilder()
    .setCustomId(MODAL_CUSTOM_ID)
    .setTitle('👤 Registrar Cliente');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Nome de Exibição')
        .setPlaceholder('Ex: João Silva')
        .setValue(defaults.name ?? '')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('discord')
        .setLabel('Discord (opcional)')
        .setPlaceholder('@usuário ou ID do Discord')
        .setValue(defaults.discord ?? '')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('email')
        .setLabel('E-mail (opcional)')
        .setPlaceholder('cliente@email.com')
        .setValue(defaults.email ?? '')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('phone')
        .setLabel('Telefone (opcional)')
        .setPlaceholder('(11) 99999-9999')
        .setValue(defaults.phone ?? '')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('notas')
        .setLabel('Observações (opcional)')
        .setValue(defaults.notas ?? '')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500),
    ),
  );

  return modal;
}

// ── Parse do modal ────────────────────────────────────────────────────────────

/**
 * Extrai e sanitiza os campos do modal de cliente.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @returns {{
 *   name:      string,
 *   discord:   string|null,
 *   email:     string|null,
 *   phone:     string|null,
 *   notas:     string|null,
 * }}
 */
export function parseClientModal(interaction) {
  const get = (id) => {
    try { return interaction.fields.getTextInputValue(id)?.trim() || null; }
    catch { return null; }
  };
  return {
    name:    get('name') ?? '',
    discord: get('discord') || null,
    email:   get('email')   || null,
    phone:   get('phone')   || null,
    notas:   get('notas')   || null,
  };
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Constrói o embed de detalhes de um cliente.
 *
 * @param {object} client       Objeto normalizado do repositório
 * @param {{ proofs: number, orders: number }} [stats]  Estatísticas opcionais
 * @returns {EmbedBuilder}
 */
export function buildClientEmbed(client, stats = null) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`👤 ${client.displayName}`)
    .setTimestamp(new Date(client.createdAt * 1000));

  const fields = [];

  if (client.discordId) {
    fields.push({ name: '🎮 Discord', value: `<@${client.discordId}>`, inline: true });
  }
  if (client.email) {
    fields.push({ name: '📧 E-mail', value: client.email, inline: true });
  }
  if (client.phone) {
    fields.push({ name: '📱 Telefone', value: client.phone, inline: true });
  }
  if (client.notas) {
    fields.push({ name: '📝 Observações', value: client.notas, inline: false });
  }

  if (stats) {
    fields.push(
      { name: '📋 Provas de Venda', value: String(stats.proofs ?? 0), inline: true },
      { name: '🛒 Pedidos',         value: String(stats.orders ?? 0), inline: true },
    );
  }

  if (fields.length > 0) embed.addFields(fields);
  embed.setFooter({ text: `ID: ${client.id}` });
  return embed;
}

/**
 * Constrói o embed de listagem de clientes.
 *
 * @param {object[]} clients
 * @returns {EmbedBuilder}
 */
export function buildClientListEmbed(clients) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('👥 Clientes Cadastrados')
    .setTimestamp();

  if (!clients || clients.length === 0) {
    embed.setDescription('Nenhum cliente cadastrado ainda neste servidor.');
    return embed;
  }

  const lines = clients.slice(0, 25).map((c, i) => {
    const discord = c.discordId ? ` — <@${c.discordId}>` : '';
    return `**${i + 1}.** ${c.displayName}${discord}`;
  });

  embed.setDescription(lines.join('\n'));

  if (clients.length > 25) {
    embed.setFooter({ text: `Mostrando 25 de ${clients.length} clientes` });
  }

  return embed;
}

// ── Componentes ───────────────────────────────────────────────────────────────

/**
 * Select menu para escolher um cliente da lista.
 * Retorna null se não houver clientes.
 *
 * @param {object[]} clients
 * @returns {ActionRowBuilder|null}
 */
export function buildClientPickRow(clients) {
  if (!clients || clients.length === 0) return null;

  const options = clients.slice(0, 25).map(c => ({
    label:       c.displayName.slice(0, 100),
    description: c.discordId ? `Discord: ${c.discordId}` : (c.email ?? 'Sem contato'),
    value:       c.id,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('clients:pick')
    .setPlaceholder('Selecione um cliente para ver detalhes')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

/**
 * Botões de gerenciamento do cliente.
 *
 * @param {object} client
 * @returns {ActionRowBuilder[]}
 */
export function buildClientViewComponents(client) {
  const id = client.id;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`clients:delete:${id}`)
      .setLabel('Remover Cliente')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
  );

  return [row];
}

/**
 * Payload de confirmação de exclusão.
 *
 * @param {object} client
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[], flags: number }}
 */
export function buildDeleteConfirmPayload(client) {
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`⚠️ Remover Cliente`)
    .setDescription(
      `Tem certeza que deseja remover o cliente **${client.displayName}**?\n\n` +
      '⚠️ Esta ação **não pode ser desfeita**.',
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`clients:delete_ok:${client.id}`)
      .setLabel('Confirmar Remoção')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`clients:view:${client.id}`)
      .setLabel('Voltar')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

// ── Payloads ──────────────────────────────────────────────────────────────────

/**
 * Payload ephemeral de sucesso após registrar cliente.
 */
export function buildSuccessPayload(client) {
  const embed = buildClientEmbed(client);
  embed.setTitle(`✅ Cliente Registrado`);
  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

/**
 * Payload ephemeral de erro.
 */
export function buildErrorPayload(message) {
  return { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
}
