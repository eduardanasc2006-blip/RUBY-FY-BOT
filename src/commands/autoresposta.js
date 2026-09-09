const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { painelCentral } = require('../utils/autoRespostaPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresposta')
    .setDescription('Gerencia respostas automaticas por palavra-chave (admin)'),
  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'autoresposta')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const menu = painelCentral(interaction.guildId, interaction.guild);
    if (!menu.components.length) return interaction.reply({ content: menu.content, flags: MessageFlags.Ephemeral });
    return interaction.reply({ content: menu.content, components: menu.components, flags: MessageFlags.Ephemeral });
  },
};
