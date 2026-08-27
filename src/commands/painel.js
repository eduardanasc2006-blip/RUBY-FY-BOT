const { SlashCommandBuilder } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildPainelCentral, privar } = require('../utils/painelCenter');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o gerenciador central de painéis (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'painel')) {
      return interaction.reply(privar('🔒 Somente administradores podem usar este comando.'));
    }
    return interaction.reply(buildPainelCentral());
  },
};