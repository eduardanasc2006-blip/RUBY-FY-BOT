/**
 * Comando /comandos
 *
 * Abre o gerenciador de comandos personalizados do servidor.
 *
 * Comandos personalizados permitem que cada servidor crie seus próprios comandos
 * que são executados quando um usuário envia uma mensagem com o prefixo do bot.
 * Exemplo: /pix, /regras, /horario
 *
 * Permissão: 'comandos' (módulo) ou Administrator.
 */

import {
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';
import { hasModulePermission, buildDeniedMessage } from '../modules/permissions/index.mjs';
import { openCommandsPanel } from '../modules/customcommands/index.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Gerencie os comandos personalizados do servidor (/pix, /regras, etc).'),

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

    if (!hasModulePermission(interaction.member, interaction.guildId, 'comandos')) {
      return interaction.reply({
        content: buildDeniedMessage('comandos'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    return openCommandsPanel(interaction);
  },
};
