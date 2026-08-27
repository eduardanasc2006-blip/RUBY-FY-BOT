const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
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
        // Sem setMinValue fixo: o mínimo muda junto com a taxa (!settaxa).
        // A validação dinâmica fica no execute abaixo, sempre lendo a taxa atual.
    ),

  async execute(interaction) {
    const reais = interaction.options.getNumber('valor');
    const minimo = rates.TIER1_PRICE_PER_100;

    if (reais < minimo) {
      return interaction.reply({
        content: `❌ O valor mínimo é **${formatBRL(minimo)}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const robux = reaisToRobux(reais);

    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('💵 Reais → Robux')
      .setDescription(`**${formatBRL(reais)}** = **${formatRobux(robux)} Robux**`)
      .setFooter({ text: 'Valor aproximado, calculado com as taxas atuais' });

    return interaction.reply({ embeds: [embed] });
  },
};
