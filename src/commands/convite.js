const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { linkConvite } = require('../utils/convite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('convite')
    .setDescription('Envia o link para adicionar o bot em outros servidores'),

  async execute(interaction) {
    const link = linkConvite(interaction.client.user.id);
    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('🤖 Convite do RUBY FY BOT')
      .setDescription(
        'Adicione o bot em outros servidores com este link:\n\n' +
          `${link}\n\n` +
          '*O link já inclui as permissões de que o bot precisa (mensagens, embeds, gerenciar mensagens e cargos).*'
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};