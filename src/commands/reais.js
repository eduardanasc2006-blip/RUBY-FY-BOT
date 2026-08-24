const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { reaisToRobux, formatBRL, formatRobux } = require('../utils/robuxConverter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reais')
    .setDescription('Converte Reais (R$) para Robux')
    .addNumberOption((option) =>
      option
        .setName('valor')
        .setDescription('Valor em Reais (R$)')
        .setRequired(true)
        .setMinValue(0.01)
    ),

  async execute(interaction) {
    const reais = interaction.options.getNumber('valor');
    const minimo = rates.TIER1_PRICE_PER_100;

    if (reais < minimo) {
      return interaction.reply({
        content: `❌ O valor mínimo é **${formatBRL(minimo)}**.`,
        ephemeral: true,
      });
    }

    const robux = reaisToRobux(reais);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('💵 Reais → Robux')
      .setDescription(`**${formatBRL(reais)}** = **${formatRobux(robux)} Robux**`)
      .setFooter({ text: 'Valor aproximado, calculado com as taxas atuais' });

    return interaction.reply({ embeds: [embed] });
  },
};
