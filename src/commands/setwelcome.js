const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getSessao, buildPainel } = require('../utils/embedPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Abre o editor visual da mensagem de boas-vindas (admin)'),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'embed')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const sessao = getSessao(interaction.user.id);
    sessao._modoWelcome = true;
    sessao._canalWelcome = interaction.channel.id;
    const painel = buildPainel(interaction.user.id);
    return interaction.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};