const { EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { robuxToReais, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  name: 'robux',
  description: 'Converte Robux para Reais (R$)',
  usage: '!robux <quantidade>',

  async execute(message, args) {
    const robux = parseInt(args[0], 10);

    if (!args[0] || isNaN(robux) || robux < 1) {
      return message.reply('❌ Use: **!robux <quantidade>** — exemplo: **!robux 500**');
    }

    if (robux < rates.MIN_ROBUX) {
      return message.reply(`❌ O valor mínimo é **${formatRobux(rates.MIN_ROBUX)} Robux**.`);
    }

    const reais = robuxToReais(robux);
    const taxa =
      robux <= rates.TIER1_MAX_ROBUX
        ? `${formatBRL(rates.TIER1_PRICE_PER_100)} a cada 100 Robux`
        : `${formatBRL(rates.TIER2_PRICE_PER_1000)} a cada 1.000 Robux`;

    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('💎 Robux → Reais')
      .setDescription(`**${formatRobux(robux)} Robux** = **${formatBRL(reais)}**`)
      .setFooter({ text: `Taxa aplicada: ${taxa}` });

    return message.reply({ embeds: [embed] });
  },
};
