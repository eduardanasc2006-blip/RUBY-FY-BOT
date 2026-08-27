const { buildPainelCentral } = require('../utils/painelCenter');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('./settaxa');
const { autoDelete } = require('../utils/autoDelete');

module.exports = {
  name: 'painel',
  description: 'Abre o gerenciador central de painéis (conversão, estoque, categorias)',
  usage: '!painel',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'painel')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }
    autoDelete(message, 5000);

    return message.reply({ ...buildPainelCentral(), allowedMentions: { repliedUser: false } });
  },
};