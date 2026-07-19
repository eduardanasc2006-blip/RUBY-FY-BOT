/**
 * Proofs — Funções de fluxo puras.
 *
 * IMPORTANTE: Este arquivo NÃO importa database/client.mjs nem config/bot.mjs.
 * Todas as funções são puras e testáveis sem banco de dados.
 *
 * Responsabilidades:
 *   - buildProofModal        — ModalBuilder para registro de proof
 *   - parseModalData         — extrai campos do modal submetido
 *   - resolveUserId          — resolve ID de usuário de menção ou ID simples
 *   - buildProofPreviewEmbed — embed de confirmação (ephemeral)
 *   - buildProofListEmbed    — embed de listagem de proofs
 *   - buildSuccessPayload    — payload ephemeral de sucesso
 *   - buildErrorPayload      — payload ephemeral de erro
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags,
} from 'discord.js';

// ── Constantes ────────────────────────────────────────────────────────────────

/** CustomId do modal de registro de proof. */
export const MODAL_CUSTOM_ID = 'proofs:modal_submit';

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Extrai um userId de uma menção Discord ou ID numérico simples.
 *
 * Aceita:
 *   <@123456789012345678>    → '123456789012345678'
 *   <@!123456789012345678>   → '123456789012345678'
 *   123456789012345678       → '123456789012345678'
 *
 * Retorna null se o formato for inválido.
 *
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export function resolveUserId(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // Menção Discord: <@123...> ou <@!123...>
  const mentionMatch = clean.match(/^<@!?(\d{17,20})>$/);
  if (mentionMatch) return mentionMatch[1];

  // ID numérico simples (17–20 dígitos — Snowflake)
  if (/^\d{17,20}$/.test(clean)) return clean;

  return null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Constrói o modal de registro de prova de venda.
 * O customId é 'proofs:modal_submit' (namespace:action do componentHandler).
 *
 * Campos (5 — limite máximo do Discord):
 *   1. cliente_id  — menção ou ID do cliente (obrigatório)
 *   2. produto     — nome do produto/serviço (obrigatório)
 *   3. valor       — valor da venda (obrigatório)
 *   4. ticket      — referência do ticket (opcional)
 *   5. notas       — observações adicionais (opcional, parágrafo)
 *
 * @returns {ModalBuilder}
 */
export function buildProofModal() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL_CUSTOM_ID)
    .setTitle('📋 Registrar Prova de Venda');

  const clienteRow = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('cliente_id')
      .setLabel('Cliente')
      .setPlaceholder('@usuário ou ID do Discord')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100),
  );

  const produtoRow = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('produto')
      .setLabel('Produto')
      .setPlaceholder('Nome do produto ou serviço vendido')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200),
  );

  const valorRow = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('valor')
      .setLabel('Valor')
      .setPlaceholder('Ex: R$ 50,00')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50),
  );

  const ticketRow = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('ticket')
      .setLabel('Ticket (opcional)')
      .setPlaceholder('Número ou referência do ticket')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100),
  );

  const notasRow = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('notas')
      .setLabel('Observações (opcional)')
      .setPlaceholder('Informações adicionais sobre a venda')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500),
  );

  modal.addComponents(clienteRow, produtoRow, valorRow, ticketRow, notasRow);
  return modal;
}

// ── Parse do modal ────────────────────────────────────────────────────────────

/**
 * Extrai os campos preenchidos no modal de proof.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @returns {{
 *   clienteRaw: string,
 *   produto:    string,
 *   valor:      string,
 *   ticket:     string|null,
 *   notas:      string|null,
 * }}
 */
export function parseModalData(interaction) {
  const get = (id) => {
    try {
      return interaction.fields.getTextInputValue(id)?.trim() || null;
    } catch {
      return null;
    }
  };

  return {
    clienteRaw: get('cliente_id') ?? '',
    produto:    get('produto')    ?? '',
    valor:      get('valor')      ?? '',
    ticket:     get('ticket')     || null,
    notas:      get('notas')      || null,
  };
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Constrói embed de confirmação de registro de proof (ephemeral).
 *
 * @param {{
 *   vendorId:   string,
 *   clientId:   string|null,
 *   clienteRaw: string|null,
 *   produto:    string|null,
 *   valor:      string|null,
 *   ticketId?:  string|null,
 *   notas?:     string|null,
 * }} proof
 * @returns {EmbedBuilder}
 */
export function buildProofPreviewEmbed(proof) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ Prova de Venda Registrada')
    .setTimestamp();

  const clienteDisplay = proof.clientId
    ? `<@${proof.clientId}>`
    : (proof.clienteRaw || '—');

  const fields = [
    { name: '🧑‍💼 Vendedor', value: `<@${proof.vendorId}>`,        inline: true },
    { name: '👤 Cliente',   value: clienteDisplay,                 inline: true },
    { name: '📦 Produto',   value: proof.produto   || '—',         inline: false },
    { name: '💰 Valor',     value: proof.valor     || '—',         inline: true },
  ];

  if (proof.ticketId) {
    fields.push({ name: '🎫 Ticket', value: String(proof.ticketId), inline: true });
  }
  if (proof.notas) {
    fields.push({ name: '📝 Observações', value: proof.notas, inline: false });
  }

  embed.addFields(fields);
  return embed;
}

/**
 * Constrói embed de listagem de provas recentes.
 *
 * @param {object[]} proofs
 * @returns {EmbedBuilder}
 */
export function buildProofListEmbed(proofs) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Provas de Venda Recentes')
    .setTimestamp();

  if (!proofs || proofs.length === 0) {
    embed.setDescription('Nenhuma prova registrada ainda neste servidor.');
    return embed;
  }

  const lines = proofs.slice(0, 10).map((p, i) => {
    const date    = new Date(p.createdAt * 1000).toLocaleDateString('pt-BR');
    const cliente = p.clientId ? `<@${p.clientId}>` : (p.clienteRaw || '—');
    const produto = p.produto || '—';
    const valor   = p.valor   || '—';
    return `**${i + 1}.** <@${p.vendorId}> → ${cliente} | \`${produto}\` — \`${valor}\` — ${date}`;
  });

  embed.setDescription(lines.join('\n'));

  if (proofs.length > 10) {
    embed.setFooter({ text: `Mostrando 10 de ${proofs.length} provas` });
  }

  return embed;
}

// ── Payloads prontos ──────────────────────────────────────────────────────────

/**
 * Payload ephemeral de sucesso após registro.
 *
 * @param {object} proof - Objeto de proof (com vendorId, clientId, produto, valor, etc.)
 * @returns {{ embeds: EmbedBuilder[], flags: number }}
 */
export function buildSuccessPayload(proof) {
  return {
    embeds: [buildProofPreviewEmbed(proof)],
    flags:  MessageFlags.Ephemeral,
  };
}

/**
 * Payload ephemeral de erro.
 *
 * @param {string} message
 * @returns {{ content: string, flags: number }}
 */
export function buildErrorPayload(message) {
  return {
    content: `❌ ${message}`,
    flags:   MessageFlags.Ephemeral,
  };
}
