const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildMetasPainel } = require('../utils/metasPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metas')
    .setDescription('Configura metas de cargos para clientes (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'metas')) {
      return interaction.reply({
        content: '🔒 Somente administradores ou equipe autorizada podem configurar metas.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({
      ...buildMetasPainel(interaction.guild, interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  },
};