/**
 * Módulo de Auditoria — Fluxos de UI (Etapa 18).
 *
 * Responsável por construir embeds e formatar entradas para exibição.
 */

import { EmbedBuilder } from 'discord.js';

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Filtros disponíveis no comando /auditoria */
export const AUDIT_FILTERS = Object.freeze({
  MODULE: [
    'templates', 'conexoes', 'pedidos', 'clientes', 'tickets',
    'proofs', 'products', 'custompanels', 'automations', 'permissions',
    'discord_events', 'stats',
  ],
  SOURCE: ['admin', 'discord_event', 'system'],
  RESULT: ['success', 'error', 'skipped'],
});

const SOURCE_EMOJI = {
  admin:         '🛡️',
  discord_event: '📡',
  system:        '⚙️',
};

const RESULT_EMOJI = {
  success: '✅',
  error:   '❌',
  skipped: '⏭️',
};

const COLOR = {
  success: 0x57F287,
  error:   0xED4245,
  skipped: 0xFEE75C,
  default: 0x5865F2,
};

// ── Formatação de entradas ─────────────────────────────────────────────────────

/**
 * Formata uma entrada de auditoria como texto de uma linha.
 *
 * @param {object} entry
 * @returns {string}
 */
export function formatAuditEntry(entry) {
  const date    = new Date(entry.createdAt * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const src     = SOURCE_EMOJI[entry.source]  ?? '❓';
  const res     = RESULT_EMOJI[entry.result]  ?? '❓';
  const actor   = entry.actorId ? `<@${entry.actorId}>` : '`sistema`';
  const entity  = entry.entity  ? ` • ${entry.entity}${entry.entityId ? ` \`${entry.entityId.slice(0, 8)}\`` : ''}` : '';

  return `${src} ${res} \`${date}\` **${entry.module}/${entry.action}** por ${actor}${entity}`;
}

// ── Embeds ─────────────────────────────────────────────────────────────────────

/**
 * Constrói o embed principal de listagem de auditoria.
 *
 * @param {object} result — retorno de listAuditLogs
 * @param {object} filters — filtros aplicados
 * @returns {EmbedBuilder}
 */
export function buildAuditEmbed(result, filters = {}) {
  const { entries, total, page, totalPages } = result;

  const embed = new EmbedBuilder()
    .setColor(COLOR.default)
    .setTitle('📋 Registros de Auditoria')
    .setFooter({ text: `Página ${page}/${totalPages} • ${total} registro(s) total • Ruby FY` })
    .setTimestamp();

  // Filtros aplicados
  const filterParts = [];
  if (filters.actorId)  filterParts.push(`Usuário: <@${filters.actorId}>`);
  if (filters.module)   filterParts.push(`Módulo: \`${filters.module}\``);
  if (filters.action)   filterParts.push(`Ação: \`${filters.action}\``);
  if (filters.entity)   filterParts.push(`Entidade: \`${filters.entity}\``);
  if (filters.source)   filterParts.push(`Origem: \`${filters.source}\``);
  if (filters.result)   filterParts.push(`Resultado: \`${filters.result}\``);
  if (filters.from)     filterParts.push(`De: \`${new Date(filters.from * 1000).toLocaleDateString('pt-BR')}\``);
  if (filters.to)       filterParts.push(`Até: \`${new Date(filters.to * 1000).toLocaleDateString('pt-BR')}\``);

  if (filterParts.length > 0) {
    embed.setDescription(`**Filtros:** ${filterParts.join(' • ')}`);
  }

  if (entries.length === 0) {
    embed.addFields({ name: 'Sem registros', value: 'Nenhum registro encontrado com os filtros aplicados.' });
    return embed;
  }

  // Lista de entradas (máx 10 por página, Discord limita 25 fields por embed)
  const lines = entries.slice(0, 10).map(formatAuditEntry);
  embed.addFields({ name: `Registros (${entries.length})`, value: lines.join('\n').slice(0, 1024) });

  return embed;
}

/**
 * Constrói o embed de detalhes de uma única entrada de auditoria.
 *
 * @param {object} entry
 * @returns {EmbedBuilder}
 */
export function buildAuditEntryEmbed(entry) {
  const date   = new Date(entry.createdAt * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const color  = COLOR[entry.result] ?? COLOR.default;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${RESULT_EMOJI[entry.result] ?? '❓'} Detalhe — ${entry.module}/${entry.action}`)
    .addFields(
      { name: 'Data/Hora',  value: date,                                  inline: true },
      { name: 'Origem',     value: `${SOURCE_EMOJI[entry.source] ?? ''} ${entry.source}`, inline: true },
      { name: 'Resultado',  value: entry.result,                          inline: true },
      { name: 'Módulo',     value: entry.module,                          inline: true },
      { name: 'Ação',       value: entry.action,                          inline: true },
      { name: 'Servidor',   value: `\`${entry.guildId}\``,                inline: true },
    )
    .setFooter({ text: `ID: ${entry.id}` });

  if (entry.actorId) {
    embed.addFields({ name: 'Executado por', value: `<@${entry.actorId}>`, inline: true });
  }

  if (entry.entity) {
    const entityVal = entry.entity + (entry.entityId ? ` \`${entry.entityId}\`` : '');
    embed.addFields({ name: 'Entidade', value: entityVal, inline: true });
  }

  if (entry.before) {
    const val = JSON.stringify(entry.before, null, 2).slice(0, 1020);
    embed.addFields({ name: '🔴 Antes', value: `\`\`\`json\n${val}\n\`\`\`` });
  }

  if (entry.after) {
    const val = JSON.stringify(entry.after, null, 2).slice(0, 1020);
    embed.addFields({ name: '🟢 Depois', value: `\`\`\`json\n${val}\n\`\`\`` });
  }

  if (entry.details) {
    const val = JSON.stringify(entry.details, null, 2).slice(0, 1020);
    embed.addFields({ name: '📝 Detalhes', value: `\`\`\`json\n${val}\n\`\`\`` });
  }

  return embed;
}

/**
 * Constrói o embed de estatísticas de auditoria.
 *
 * @param {object} stats — retorno de getAuditStats
 * @param {string} guildName
 * @returns {EmbedBuilder}
 */
export function buildAuditStatsEmbed(stats, guildName = 'Servidor') {
  const embed = new EmbedBuilder()
    .setColor(COLOR.default)
    .setTitle(`📊 Estatísticas de Auditoria — ${guildName}`)
    .setTimestamp()
    .setFooter({ text: 'Ruby FY — Etapa 18' });

  embed.addFields(
    {
      name:   '🔢 Totais',
      value:  `Total: **${stats.total}**\nÚltimas 24h: **${stats.last24h}**\nÚltimos 7 dias: **${stats.last7d}**`,
      inline: true,
    },
    {
      name:   `${RESULT_EMOJI.success} Resultados`,
      value:  Object.entries(stats.byResult).length > 0
        ? Object.entries(stats.byResult)
            .map(([k, v]) => `${RESULT_EMOJI[k] ?? k}: **${v}**`)
            .join('\n')
        : '(sem dados)',
      inline: true,
    },
    {
      name:   '📡 Origens',
      value:  Object.entries(stats.bySource).length > 0
        ? Object.entries(stats.bySource)
            .map(([k, v]) => `${SOURCE_EMOJI[k] ?? k}: **${v}**`)
            .join('\n')
        : '(sem dados)',
      inline: true,
    },
  );

  const moduleEntries = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (moduleEntries.length > 0) {
    embed.addFields({
      name:  '📦 Por módulo (top 8)',
      value: moduleEntries.map(([k, v]) => `\`${k}\`: **${v}**`).join(' • '),
    });
  }

  return embed;
}
