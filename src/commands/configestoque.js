const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const { adminMenu } = require('../utils/estoquePanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configestoque')
    .setDescription('Abre o painel de gerenciamento do estoque (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'configestoque')) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply(adminMenu());
  },
};
