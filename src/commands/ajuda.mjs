import { SlashCommandBuilder } from 'discord.js';
import { buildHelpMenu, buildSimpleHelpEmbed } from '../utils/helpBuilder.mjs';

export default {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe todos os comandos disponíveis do bot.'),

  async execute(interaction) {
    const payload = buildHelpMenu(interaction.client, interaction);
    await interaction.reply(payload);
  },

  name: 'ajuda',
  aliases: ['help'],

  async executePrefix(message) {
    const { config } = await import('../config/bot.mjs');
    const embed = buildSimpleHelpEmbed(message.client, config.prefix);
    await message.reply({ embeds: [embed] });
  },
};
