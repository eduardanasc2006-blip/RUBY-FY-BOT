const { EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  name: 'taxa',
  aliases: ['taxas'],
  description: 'Mostra as taxas atuais de conversão',
  usage: '!taxa',

  async execute(message) {
    const taxa = Math.round(rates.GAMEPASS_FEE * 100);

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
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
          value: `Roblox desconta ${taxa}% — você recebe ${100 - taxa}%`,
        }
      );

    return message.reply({ embeds: [embed] });
  },
};
