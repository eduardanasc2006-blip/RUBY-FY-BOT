const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { eDono } = require('../utils/permissions');
const { buildPermissionsPanel } = require('../utils/permissionsPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permissoes')
    .setDescription('Gerencia permissões por cargo nos grupos de comandos (admin)'),

  async execute(interaction) {
    // Só quem tem Administrator ou está no ADMIN_IDS gerencia permissões.
    const admin = isAdmin(interaction.member, interaction.user.id) || eDono(interaction.user.id);
    if (!interaction.guild || !admin) {
      return interaction.reply({ content: '🔒 Somente administradores podem gerenciar permissões.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ ...buildPermissionsPanel(interaction.guild, interaction.user.id), flags: MessageFlags.Ephemeral });
  },
};