const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloqueia um canal para membros comuns (admin)')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal para bloquear (padrao: atual)').setRequired(false)),

  async execute(interaction ) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'lock')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal') || interaction.channel;
    if (!canal || !canal.isTextBased() || !canal.permissionOverwrites) {

      return interaction.reply({ content: '❌ Canal inválido para bloqueio.', flags: MessageFlags.Ephemeral });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`lockconf:confirmar:${canal.id}`).setLabel('🔒 Confirmar bloqueio').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('lockconf:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: `🔒 Bloquear ${canal}? Membros comuns perderão o envio de mensagens.`,
      embeds: [],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
