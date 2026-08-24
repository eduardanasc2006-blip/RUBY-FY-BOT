const { buildConfigPanel } = require('../utils/configPanel');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'configtaxa',
  description: 'Abre o painel de configuração de taxas (restrito a administradores)',
  usage: '!configtaxa',

  async execute(message) {
    if (!isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem configurar as taxas.');
    }

    // Painel privado: só você vê, e some ao reiniciar o Discord
    return message.reply({ ...buildConfigPanel(), ephemeral: true });
  },
};
