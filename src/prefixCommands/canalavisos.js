const { definir, carregar } = require('../utils/avisos');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'canalavisos',
  description: 'Define o canal onde o bot avisa quando um produto esgota (restrito a administradores)',
  usage: '!canalavisos #canal',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'canalavisos')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const canal = message.mentions?.channels?.first() || message.channel;
    definir(canal.id);

    return message.reply(`✅ Avisos de estoque serão enviados em ${canal}.`);
  },
};
