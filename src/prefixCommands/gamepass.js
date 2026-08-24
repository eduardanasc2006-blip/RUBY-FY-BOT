const { EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { gamepassPrice, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  name: 'gamepass',
  description: 'Quanto colocar no Game Pass para receber uma quantidade de Robux',
  usage: '!gamepass <robux>',

  async execute(message, args) {
    const robux = parseInt(args[0], 10);

    if (!args[0] || isNaN(robux) || robux < 1) {
      return message.reply('❌ Use: `!gamepass <robux>` — exemplo: `!gamepass 1000`');
    }

    const gamepass = gamepassPrice(robux);
    const taxa = Math.round(rates.GAMEPASS_FEE * 100);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('🎮 Game Pass')
      .setDescription(
        `Para receber **${formatRobux(robux)} Robux**, crie um Game Pass de **${formatRobux(gamepass)} Robux**`
      )
      .setFooter({ text: `Roblox desconta ${taxa}% — você recebe ${100 - taxa}%` });

    return message.reply({ embeds: [embed] });
  },
};
