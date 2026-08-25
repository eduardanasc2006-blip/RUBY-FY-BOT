const { EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { reaisToRobux, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  name: 'reais',
  description: 'Converte Reais (R$) para Robux',
  usage: '!reais <valor>',

  async execute(message, args) {
    const reais = parseFloat(String(args[0]).replace(',', '.'));

    if (!args[0] || isNaN(reais) || reais <= 0) {
      return message.reply('❌ Use: `!reais <valor>` — exemplo: `!reais 10` ou `!reais 7,50`');
    }

    const minimo = rates.TIER1_PRICE_PER_100;
    if (reais < minimo) {
      return message.reply(`❌ O valor mínimo é **${formatBRL(minimo)}**.`);
    }

    const robux = reaisToRobux(reais);

    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('💵 Reais → Robux')
      .setDescription(`**${formatBRL(reais)}** = **${formatRobux(robux)} Robux**`)
      .setFooter({ text: 'Valor aproximado, calculado com as taxas atuais' });

    return message.reply({ embeds: [embed] });
  },
};
