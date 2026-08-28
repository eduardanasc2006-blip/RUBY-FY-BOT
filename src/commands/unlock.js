const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloqueia um canal para membros comuns (admin)')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal para desbloquear (padrao: atual)').setRequired(false)),

  async execute(interaction ) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'unlock')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal') || interaction.channel;
    if (!canal || !canal.isTextBased() || !canal.permissionOverwrites) {

      return interaction.reply({ content: '❌ Canal inválido para desbloqueio.', flags: MessageFlags.Ephemeral });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`unlockconf:confirmar:${canal.id}`).setLabel('🔓 Confirmar desbloqueio').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('unlockconf:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: `🔓 Desbloquear ${canal}? Membros comuns voltarão a enviar mensagens.`,
      embeds: [],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
