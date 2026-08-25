const { adminMenu } = require('../utils/estoquePanel');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'configestoque',
  description: 'Abre o painel de configuração do estoque (restrito a administradores)',
  usage: '!configestoque',

  async execute(message) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem configurar o estoque.');
    }
    return message.reply({ ...adminMenu(), allowedMentions: { repliedUser: false } });
  },
};
