const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { buildConfigPanel } = require('../utils/configPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configtaxa')
    .setDescription('Abre o painel de configuração de taxas (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply(buildConfigPanel());
  },
};
