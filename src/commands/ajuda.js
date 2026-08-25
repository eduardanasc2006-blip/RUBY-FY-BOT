const { SlashCommandBuilder } = require('discord.js');
const { buildAjuda } = require('../utils/ajudaPanel');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra o menu de ajuda interativo'),

  async execute(interaction) {
    const admin = interaction.guild ? isAdmin(interaction.member, interaction.user.id) : false;
    return interaction.reply(buildAjuda('inicio', admin));
  },
};
