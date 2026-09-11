const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { escolherCategoria } = require('../utils/comprarPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Inicia uma compra pelos produtos do estoque'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Use este comando dentro de um servidor (ex.: canal de ticket).',
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply(escolherCategoria(interaction.guildId));
  },
};