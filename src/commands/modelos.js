const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildModelosPainel } = require('../utils/modelosPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modelos')
    .setDescription('Abre o painel de modelos de embed (admin)'),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'embed')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const painel = buildModelosPainel(interaction.guild.id, interaction.user.id);
    return interaction.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};