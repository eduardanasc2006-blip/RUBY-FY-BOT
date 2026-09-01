const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getSessaoWelcome, buildWelcomePainel } = require('../utils/welcomePainel');
const welcomeStore = require('../utils/welcomeStore');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Abre o editor visual da mensagem de boas-vindas (admin)'),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'embed')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const sessao = getSessaoWelcome(interaction.user.id, interaction.guild.id);
    const existente = welcomeStore.obter(interaction.guild.id);
    if (!existente) {
      const novaConf = welcomeStore.padrao(interaction.channel.id);
      welcomeStore.salvar(interaction.guild.id, novaConf);
    }
    const painel = buildWelcomePainel(interaction.user.id, interaction.guild.id);
    return interaction.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};