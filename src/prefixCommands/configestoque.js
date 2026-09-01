const { adminMenu } = require('../utils/estoquePanel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'configestoque',
  description: 'Abre o painel de configuração do estoque (restrito a administradores)',
  usage: '!configestoque',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'configestoque')) {
      return message.reply('🔒 Somente administradores podem configurar o estoque.');
    }
    return message.reply({ ...adminMenu(), allowedMentions: { repliedUser: false } });
  },
};
