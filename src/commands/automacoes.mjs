/**
 * Comando /automacoes
 *
 * Abre o painel de gerenciamento de automações visuais do servidor.
 * Permite criar, editar, ativar/desativar e excluir automações.
 *
 * Requer permissão ManageGuild.
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { openAutomationsPanel } from '../modules/automations/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('automacoes')
    .setDescription('Gerencie as automações visuais do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openAutomationsPanel(interaction);
  },
};
