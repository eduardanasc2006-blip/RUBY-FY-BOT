const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'unlock',
  description: 'Desbloqueia um canal para membros comuns (admin)',
  usage: '!unlock [canal]',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'unlock')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const canal = message.mentions?.channels?.first() || message.channel;
    if (!canal || !canal.isTextBased() || !canal.permissionOverwrites) {


      return message.reply('❌ Canal inválido para desbloqueio.');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`unlockconf:confirmar:${canal.id}`).setLabel('🔓 Confirmar desbloqueio').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('unlockconf:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
    );

    return message.reply({
      content: `🔓 Desbloquear ${canal}? Membros comuns voltarão a enviar mensagens.`,
      components: [row],
    });
  },
};