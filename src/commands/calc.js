const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { calcular } = require('../utils/calculadora');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('🧮 Calculadora: faça cálculos simples')
    .addStringOption((o) => o.setName('expressao').setDescription('Ex.: 150 * 2 +  50').setRequired(true)),

  async execute(interaction) {
    const expr = interaction.options.getString('expressao') || '';
    const res = calcular(expr);
    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('🧮 Calculadora')
      .setDescription(res.erro
        ? `➜ **Erro:** ${res.erro}`
        : `➜ **Resultado:** \`${expr}\` = **${res.valor}**`);
    return interaction.reply({ embeds: [embed] });
  },
};
