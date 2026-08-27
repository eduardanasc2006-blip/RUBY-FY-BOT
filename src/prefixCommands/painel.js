const { buildPainelCentral } = require('../utils/painelCenter');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'painel',
  description: 'Abre o gerenciador central de painéis (conversão, estoque, categorias)',
  usage: '!painel',

  async execute(message) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    return message.reply({ ...buildPainelCentral(), allowedMentions: { repliedUser: false } });
  },
};