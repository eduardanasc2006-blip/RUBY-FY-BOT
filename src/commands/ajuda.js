const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildDescricao } = require('../prefixCommands/ajuda');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra o menu de ajuda com todos os comandos do bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setDescription(buildDescricao(!interaction.guild));

    return interaction.reply({ embeds: [embed] });
  },
};
