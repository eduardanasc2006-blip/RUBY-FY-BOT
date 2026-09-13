const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { eDono } = require('../utils/permissions');
const { buildCanalComandoPanel } = require('../utils/canalComandoPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canalcomando')
    .setDescription('Configura em quais canais cada comando pode ser usado (admin)'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '🔒 Isso só funciona no servidor.', flags: MessageFlags.Ephemeral });
    }
    const admin = isAdmin(interaction.member, interaction.user.id) || eDono(interaction.user.id);
    if (!admin) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply(buildCanalComandoPanel(interaction.guildId, interaction.user.id));
  },
};