const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { gamepassPrice, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamepass')
    .setDescription('Quanto colocar no Game Pass para receber uma quantidade de Robux')
    .addIntegerOption((option) =>
      option
        .setName('robux')
        .setDescription('Quantidade de Robux que você quer receber')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const robux = interaction.options.getInteger('robux');
    const gamepass = gamepassPrice(robux);
    const taxa = Math.round(rates.GAMEPASS_FEE * 100);

    const embed = new EmbedBuilder()
      .setColor(0xa8c6fa)
      .setTitle('🎮 Game Pass')
      .setDescription(
        `Para receber **${formatRobux(robux)} Robux**, crie um Game Pass de **${formatRobux(gamepass)} Robux**`
      )
      .setFooter({ text: `Roblox desconta ${taxa}% — você recebe ${100 - taxa}%` });

    return interaction.reply({ embeds: [embed] });
  },
};
