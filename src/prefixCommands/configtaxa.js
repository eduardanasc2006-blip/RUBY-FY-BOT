const { buildConfigPanel } = require('../utils/configPanel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'configtaxa',
  description: 'Abre o painel de configuração de taxas (restrito a administradores)',
  usage: '!configtaxa',

  async execute(message) {
    if (!message.guild) {
      return message.reply('🔒 Este comando só pode ser usado no servidor.');
    }

    if (!comandoPode(message.member, message.author.id, 'configtaxa')) {
      return message.reply('🔒 Somente administradores podem configurar as taxas.');
    }

    // Painel de uso pessoal do admin; quem clicar nos botões passa por nova verificação de permissão
    return message.reply({ ...buildConfigPanel(), allowedMentions: { repliedUser: false } });
  },
};
