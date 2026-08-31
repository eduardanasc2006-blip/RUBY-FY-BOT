const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'lock',
  description: 'Bloqueia um canal para membros comuns (admin)',
  usage: '!lock [canal]',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'lock')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const canal = message.mentions?.channels?.first() || message.channel;
    if (!canal || !canal.isTextBased() || !canal.permissionOverwrites) {

      return message.reply('❌ Canal inválido para bloqueio.');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`lockconf:confirmar:${canal.id}`).setLabel('🔒 Confirmar bloqueio').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('lockconf:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
    );

    return message.reply({
      content: `🔒 Bloquear ${canal}? Membros comuns perderão o envio de mensagens.`,
      components: [row],
    });
  },
};