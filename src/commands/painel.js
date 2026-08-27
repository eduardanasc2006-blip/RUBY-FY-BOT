const { SlashCommandBuilder } = require('discord.js');
const { buildPainelCentral, privar } = require('../utils/painelCenter');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o gerenciador central de painéis (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply(privar('🔒 Somente administradores podem usar este comando.'));
    }
    return interaction.reply(buildPainelCentral());
  },
};