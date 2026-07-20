/**
 * Comando /auditoria — Etapa 18.
 *
 * Permite consultar, filtrar e exportar registros de auditoria do servidor.
 *
 * Subcomandos:
 *   /auditoria ver           — lista os registros recentes com filtros opcionais
 *   /auditoria stats         — exibe estatísticas de auditoria
 *   /auditoria exportar      — exporta registros em TXT, CSV ou JSON
 *
 * Permissão: ManageGuild (configurável via Permissions)
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';

import { hasModulePermission, buildDeniedMessage } from '../database/repositories/Permissions.mjs';
import { listAuditLogs, getAuditStats }            from '../database/repositories/AuditLog.mjs';
import {
  buildAuditEmbed,
  buildAuditStatsEmbed,
  AUDIT_FILTERS,
}                                                  from '../modules/audit/flow.mjs';
import {
  showAuditLogs,
  handleAuditExport,
  buildPaginationRow,
}                                                  from '../modules/audit/actions.mjs';
import { logger }                                  from '../utils/logger.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('auditoria')
    .setDescription('Consulta e exporta registros de auditoria do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ── Subcomando: ver ────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Lista registros de auditoria com filtros opcionais.')
        .addStringOption(opt =>
          opt.setName('modulo')
            .setDescription('Filtrar por módulo.')
            .setRequired(false)
            .addChoices(...AUDIT_FILTERS.MODULE.map(m => ({ name: m, value: m })))
        )
        .addStringOption(opt =>
          opt.setName('origem')
            .setDescription('Filtrar por origem da ação.')
            .setRequired(false)
            .addChoices(...AUDIT_FILTERS.SOURCE.map(s => ({ name: s, value: s })))
        )
        .addStringOption(opt =>
          opt.setName('resultado')
            .setDescription('Filtrar por resultado.')
            .setRequired(false)
            .addChoices(...AUDIT_FILTERS.RESULT.map(r => ({ name: r, value: r })))
        )
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Filtrar por usuário que realizou a ação.')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('acao')
            .setDescription('Filtrar por ação específica (ex: create, delete, update).')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('pagina')
            .setDescription('Número da página (padrão: 1).')
            .setRequired(false)
            .setMinValue(1)
        )
    )

    // ── Subcomando: stats ──────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Exibe estatísticas de auditoria do servidor.')
    )

    // ── Subcomando: exportar ───────────────────────────────────────────────
    .addSubcommand(sub =>
      sub
        .setName('exportar')
        .setDescription('Exporta registros de auditoria em arquivo.')
        .addStringOption(opt =>
          opt.setName('formato')
            .setDescription('Formato do arquivo exportado.')
            .setRequired(false)
            .addChoices(
              { name: 'TXT (padrão)',  value: 'txt'  },
              { name: 'CSV',           value: 'csv'  },
              { name: 'JSON',          value: 'json' },
            )
        )
        .addStringOption(opt =>
          opt.setName('modulo')
            .setDescription('Filtrar por módulo ao exportar.')
            .setRequired(false)
            .addChoices(...AUDIT_FILTERS.MODULE.map(m => ({ name: m, value: m })))
        )
        .addStringOption(opt =>
          opt.setName('origem')
            .setDescription('Filtrar por origem ao exportar.')
            .setRequired(false)
            .addChoices(...AUDIT_FILTERS.SOURCE.map(s => ({ name: s, value: s })))
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const { guildId, member, guild } = interaction;

    if (!guildId) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em servidores.',
        flags:   MessageFlags.Ephemeral,
      });
    }

    // Verifica permissão do módulo
    if (!hasModulePermission(member, guildId, 'stats')) {
      return interaction.reply({
        content: buildDeniedMessage('auditoria'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── /auditoria ver ────────────────────────────────────────────────────
    if (sub === 'ver') {
      const filters = {
        module:  interaction.options.getString('modulo')    ?? undefined,
        source:  interaction.options.getString('origem')    ?? undefined,
        result:  interaction.options.getString('resultado') ?? undefined,
        actorId: interaction.options.getUser('usuario')?.id ?? undefined,
        action:  interaction.options.getString('acao')      ?? undefined,
        page:    interaction.options.getInteger('pagina')   ?? 1,
      };

      // Remove undefined
      for (const k of Object.keys(filters)) {
        if (filters[k] === undefined) delete filters[k];
      }

      try {
        await showAuditLogs(interaction, guildId, filters);
        logger.info(`[Auditoria] Ver executado | guild:${guildId} | user:${member?.id}`);
      } catch (err) {
        logger.error('[Auditoria] Erro no subcomando ver:', err);
        await interaction.reply({
          content: '❌ Erro ao carregar registros de auditoria.',
          flags:   MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // ── /auditoria stats ──────────────────────────────────────────────────
    if (sub === 'stats') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const stats = getAuditStats(guildId);
        const embed = buildAuditStatsEmbed(stats, guild?.name ?? guildId);
        await interaction.editReply({ embeds: [embed] });
        logger.info(`[Auditoria] Stats exibido | guild:${guildId} | user:${member?.id}`);
      } catch (err) {
        logger.error('[Auditoria] Erro no subcomando stats:', err);
        await interaction.editReply({ content: '❌ Erro ao carregar estatísticas de auditoria.' });
      }
      return;
    }

    // ── /auditoria exportar ───────────────────────────────────────────────
    if (sub === 'exportar') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const format  = interaction.options.getString('formato') ?? 'txt';
        const filters = {
          module: interaction.options.getString('modulo') ?? undefined,
          source: interaction.options.getString('origem') ?? undefined,
        };

        for (const k of Object.keys(filters)) {
          if (filters[k] === undefined) delete filters[k];
        }

        await handleAuditExport(interaction, guildId, filters, format);
        logger.info(`[Auditoria] Exportação ${format} | guild:${guildId} | user:${member?.id}`);
      } catch (err) {
        logger.error('[Auditoria] Erro no subcomando exportar:', err);
        await interaction.editReply({ content: '❌ Erro ao exportar registros de auditoria.' });
      }
      return;
    }
  },
};
