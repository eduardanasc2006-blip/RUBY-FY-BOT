/**
 * Comando /tickets
 *
 * Abre o painel de configuração visual do sistema de tickets do servidor.
 * Permite ao administrador configurar categoria, canal de logs, cargo de
 * suporte, mensagem de boas-vindas e ativar/desativar o sistema.
 *
 * Requer permissão ManageGuild — apenas administradores podem configurar tickets.
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { openTicketsPanel } from '../modules/tickets/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Configure o sistema de atendimento por tickets do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openTicketsPanel(interaction);
  },
};
