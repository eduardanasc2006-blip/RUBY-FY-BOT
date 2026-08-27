const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { lucroEmGamepass, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('receber')
    .setDescription('Quanto cobrar no Game Pass para lucrar um valor em Reais (já descontando a taxa do Roblox)')
    .addNumberOption((option) =>
      option
        .setName('lucro')
        .setDescription('Valor em Reais (R$) que você quer lucrar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const lucro = interaction.options.getNumber('lucro');

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

    return interaction.reply({ embeds: [embed] });
  },
};