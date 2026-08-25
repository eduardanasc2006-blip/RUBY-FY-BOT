const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taxa')
    .setDescription('Mostra as taxas atuais de conversão'),

  async execute(interaction) {
    const taxa = Math.round(rates.GAMEPASS_FEE * 100);

    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('📊 Taxas atuais')
      .addFields(
        {
          name: `${formatRobux(rates.MIN_ROBUX)}–${formatRobux(rates.TIER1_MAX_ROBUX)} Robux`,
          value: `${formatBRL(rates.TIER1_PRICE_PER_100)} / 100 Robux`,
        },
        {
          name: `${formatRobux(rates.TIER1_MAX_ROBUX + 1)}+ Robux`,
          value: `${formatBRL(rates.TIER2_PRICE_PER_1000)} / 1.000 Robux`,
        },
        {
          name: '🎮 Game Pass',
          value: `${taxa}% de desconto`,
        }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
