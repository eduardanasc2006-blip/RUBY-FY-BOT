const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { robuxToReais, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robux')
    .setDescription('Converte Robux para Reais (R$)')
    .addIntegerOption((option) =>
      option
        .setName('quantidade')
        .setDescription('Quantidade de Robux')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const robux = interaction.options.getInteger('quantidade');

    if (robux < rates.MIN_ROBUX) {
      return interaction.reply({
        content: `❌ O valor mínimo é **${formatRobux(rates.MIN_ROBUX)} Robux**.`,
        ephemeral: true,
      });
    }

    const reais = robuxToReais(robux);
    const taxa =
      robux <= rates.TIER1_MAX_ROBUX
        ? `${formatBRL(rates.TIER1_PRICE_PER_100)} a cada 100 Robux`
        : `${formatBRL(rates.TIER2_PRICE_PER_1000)} a cada 1.000 Robux`;

    const embed = new EmbedBuilder()
      .setColor(0xa8c6fa)
      .setTitle('💎 Robux → Reais')
      .setDescription(`**${formatRobux(robux)} Robux** = **${formatBRL(reais)}**`)
      .setFooter({ text: `Taxa aplicada: ${taxa}` });

    return interaction.reply({ embeds: [embed] });
  },
};
