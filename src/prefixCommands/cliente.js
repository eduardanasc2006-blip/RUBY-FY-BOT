const { EmbedBuilder } = require('discord.js');
const { cargosDoCliente } = require('../utils/comprasStore');

const COR = 0xbeb6ff;

module.exports = {
  name: 'cliente',
  description: 'Mostra os cargos de cliente conquistados',
  usage: '!cliente [@usuario]',

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('❌ Use este comando dentro de um servidor.');
    }

    const alvo = message.mentions?.users?.first() || message.author;
    const cargos = cargosDoCliente(message.guildId, alvo.id);

    const embed = new EmbedBuilder()
      .setColor(COR)
      .setTitle('🏆 PERFIL DO CLIENTE')
      .setDescription(
        `👤 Cliente: <@${alvo.id}>\n\n` +
        `**🏆 Cargos conquistados:**\n` +
        (cargos.length ? cargos.map((c) => `• ${c}`).join('\n') : '*Nenhum cargo conquistado ainda.*')
      );

    // Resposta pública: o perfil do cliente é visível para todos no canal.
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
