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

  // ── Prefix command ───────────────────────────────────────────────────────
  name: 'automacoes',

  async executePrefix(message) {
    await message.reply('📋 Use `/automacoes` para gerenciar automações.\n💡 Comandos slash oferecem uma interface visual completa.');
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await openAutomationsPanel(interaction);
  },
};
