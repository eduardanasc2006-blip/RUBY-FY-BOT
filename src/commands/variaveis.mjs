/**
 * Comando /variaveis
 *
 * Abre o gerenciador de variáveis personalizadas do servidor.
 *
 * Variáveis personalizadas são placeholders como {pix}, {loja}, {horario}
 * que podem ser usados em mensagens, embeds e modelos.
 *
 * Permissão: 'variaveis' (módulo) ou Administrator.
 */

import {
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';
import { hasModulePermission, buildDeniedMessage } from '../modules/permissions/index.mjs';
import { openVariablesPanel } from '../modules/variables/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('variaveis')
    .setDescription('Gerencie as variáveis personalizadas do servidor ({pix}, {loja}, etc).'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em servidores.',
        flags:   MessageFlags.Ephemeral,
      });
    }

    if (!hasModulePermission(interaction.member, interaction.guildId, 'variaveis')) {
      return interaction.reply({
        content: buildDeniedMessage('variaveis'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    return openVariablesPanel(interaction);
  },
};
