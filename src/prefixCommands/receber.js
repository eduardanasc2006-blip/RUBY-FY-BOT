const { EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { lucroEmGamepass, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  name: 'receber',
  description: 'Quanto cobrar no Game Pass para lucrar um valor em Reais (já descontando a taxa do Roblox)',
  usage: '!receber <valor>',

  async execute(message, args) {
    const lucro = parseFloat(String(args[0] || '').replace(',', '.'));

    if (!args[0] || isNaN(lucro) || lucro <= 0) {
      return message.reply('❌ Use: `!receber <valor>` — exemplo: `!receber 5` ou `!receber 7,50`');
    }

    const gamepass = lucroEmGamepass(lucro);
    const taxa = Math.round(rates.GAMEPASS_FEE * 100);

    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('💸 Lucro no Game Pass')
      .setDescription(
        `Para lucrar **${formatBRL(lucro)}** (o que cai na sua conta), ` +
          `cobre **${formatRobux(gamepass)} Robux** no Game Pass.`
      )
      .setFooter({ text: `Roblox desconta ${taxa}% — você recebe ${100 - taxa}%` });

    return message.reply({ embeds: [embed] });
  },
};