/**
 * Módulo de Auditoria — Handlers de interação (Etapa 18).
 *
 * Gerencia as interações do comando /auditoria:
 *   - Paginação de resultados
 *   - Detalhamento de entradas
 *   - Exportação de logs
 */

import { MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { listAuditLogs, exportAuditLogs } from '../../database/repositories/AuditLog.mjs';
import { buildAuditEmbed } from './flow.mjs';
import { build as buildId } from '../../utils/customId.mjs';

// ── Paginação ──────────────────────────────────────────────────────────────────

/**
 * Constrói a ActionRow de paginação para o embed de auditoria.
 *
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {string} filterKey — identificador compacto para preservar contexto
 * @returns {ActionRowBuilder|null}
 */
export function buildPaginationRow(currentPage, totalPages, filterKey = '') {
  if (totalPages <= 1) return null;

  const prev = new ButtonBuilder()
    .setCustomId(buildId('audit', 'page', String(currentPage - 1), filterKey))
    .setLabel('◀ Anterior')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage <= 1);

  const next = new ButtonBuilder()
    .setCustomId(buildId('audit', 'page', String(currentPage + 1), filterKey))
    .setLabel('Próxima ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage >= totalPages);

  return new ActionRowBuilder().addComponents(prev, next);
}

/**
 * Exibe o resultado da consulta de auditoria em uma interação.
 * Usado tanto pelo comando inicial quanto pela paginação.
 *
 * @param {object} interaction
 * @param {string} guildId
 * @param {object} filters
 * @param {boolean} edit — se true, usa editReply; caso contrário, reply
 */
export async function showAuditLogs(interaction, guildId, filters = {}, edit = false) {
  const result  = listAuditLogs(guildId, filters);
  const embed   = buildAuditEmbed(result, filters);
  const pageRow = buildPaginationRow(result.page, result.totalPages);

  const payload = {
    embeds:     [embed],
    components: pageRow ? [pageRow] : [],
  };

  if (edit) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
}

/**
 * Handler do botão de paginação.
 *
 * customId: audit:page:<pageNumber>:<filterKey>
 */
export async function handleAuditPage(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const [, , pageStr] = interaction.customId.split(':');
  const page = parseInt(pageStr, 10) || 1;

  await interaction.deferUpdate();

  const result  = listAuditLogs(guildId, { page });
  const embed   = buildAuditEmbed(result, {});
  const pageRow = buildPaginationRow(result.page, result.totalPages);

  await interaction.editReply({
    embeds:     [embed],
    components: pageRow ? [pageRow] : [],
  });
}

// ── Exportação ─────────────────────────────────────────────────────────────────

/**
 * Executa exportação de logs e responde com arquivo em attachment.
 *
 * @param {object} interaction
 * @param {string} guildId
 * @param {object} filters
 * @param {'txt'|'csv'|'json'} format
 */
export async function handleAuditExport(interaction, guildId, filters = {}, format = 'txt') {
  const { content, filename, count } = exportAuditLogs(guildId, filters, format);

  if (count === 0) {
    return interaction.editReply({
      content: '⚠️ Nenhum registro encontrado para exportar com os filtros aplicados.',
    });
  }

  const buffer = Buffer.from(content, 'utf-8');

  return interaction.editReply({
    content:     `✅ Exportação concluída: **${count}** registro(s) em formato \`${format.toUpperCase()}\`.`,
    files: [{
      attachment: buffer,
      name:       filename,
    }],
  });
}
