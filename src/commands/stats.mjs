/**
 * Comando /stats
 *
 * Exibe estatísticas do servidor atual:
 *   - Tickets abertos / fechados
 *   - Pedidos ativos / concluídos
 *   - Provas de venda registradas
 *   - Clientes cadastrados
 *   - Conexões ativas
 *   - Modelos salvos
 *
 * Todas as consultas usam os repositories existentes — sem SQL direto no comando.
 * Permissão padrão: ManageGuild
 */

import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { countOpenTickets, countTickets }   from '../database/repositories/Tickets.mjs';
import { countOrders }                       from '../database/repositories/Orders.mjs';
import { countProofs }                       from '../database/repositories/Proofs.mjs';
import { countClients }                      from '../database/repositories/Clients.mjs';
import { listConnections }                   from '../database/repositories/Connections.mjs';
import { listTemplates }                     from '../database/repositories/Templates.mjs';
import { hasModulePermission, buildDeniedMessage } from '../database/repositories/Permissions.mjs';
import { logger }                            from '../utils/logger.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Exibe estatísticas do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'stats',

  async executePrefix(message) {
    await message.reply('📋 Use `/stats` para ver estatísticas.\n💡 Comandos slash oferecem uma interface visual completa.');
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const { guildId, member, guild } = interaction;

    if (!guildId) {
      return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores.', flags: MessageFlags.Ephemeral });
    }

    // Verifica permissão do módulo (configurável)
    if (!hasModulePermission(member, guildId, 'stats')) {
      return interaction.reply({ content: buildDeniedMessage('stats'), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const openTickets   = countOpenTickets(guildId);
      const closedTickets = countTickets(guildId, { status: 'closed' });
      const totalOrders   = countOrders(guildId);
      const doneOrders    = countOrders(guildId, { status: 'completed' });
      const activeOrders  = totalOrders - doneOrders - countOrders(guildId, { status: 'cancelled' });
      const totalProofs   = countProofs(guildId);
      const totalClients  = countClients(guildId);
      const allConns      = listConnections(guildId);
      const activeConns   = allConns.filter(c => c.enabled).length;
      const templates     = listTemplates(guildId);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 Estatísticas — ${guild?.name ?? guildId}`)
        .setDescription('Dados do servidor atualizados em tempo real.')
        .addFields(
          {
            name: '🎫 Tickets',
            value: `Abertos: **${openTickets}**\nFechados: **${closedTickets}**`,
            inline: true,
          },
          {
            name: '🛒 Pedidos',
            value: `Total: **${totalOrders}**\nAtivos: **${activeOrders}**\nConcluídos: **${doneOrders}**`,
            inline: true,
          },
          {
            name: '📋 Provas & Clientes',
            value: `Provas: **${totalProofs}**\nClientes: **${totalClients}**`,
            inline: true,
          },
          {
            name: '🔗 Conexões & Modelos',
            value: `Conexões ativas: **${activeConns}** / ${allConns.length}\nModelos salvos: **${templates.length}**`,
            inline: true,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Ruby FY' });

      await interaction.editReply({ embeds: [embed] });

      logger.info(`[Stats] Exibido | guild: ${guildId} | user: ${member?.id}`);
    } catch (err) {
      logger.error('[Stats] Erro ao gerar estatísticas:', err);
      await interaction.editReply({ content: '❌ Erro ao carregar estatísticas. Tente novamente.' });
    }
  },
};
