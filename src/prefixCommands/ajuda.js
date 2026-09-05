const { buildAjuda } = require('../utils/ajudaPanel');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'menu'],
  description: 'Mostra o menu de ajuda interativo',
  usage: '!ajuda',

  async execute(message) {
    const admin = message.guild ? isAdmin(message.member, message.author.id) : false;
    return message.reply({ ...buildAjuda('inicio', admin, message.guildId || null), allowedMentions: { repliedUser: false } });
  },
};
