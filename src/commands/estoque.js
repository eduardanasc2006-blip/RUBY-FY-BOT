const { SlashCommandBuilder } = require('discord.js');
const { publicoCategorias } = require('../utils/estoquePanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('estoque')
    .setDescription('Mostra o estoque de produtos'),

  async execute(interaction) {
    return interaction.reply(publicoCategorias());
  },
};
