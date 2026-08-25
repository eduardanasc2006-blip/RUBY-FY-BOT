const { publicarOuAtualizar } = require('../utils/estoquePanelStore');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'painelestoque',
  description: 'Publica (ou atualiza) o painel fixo de estoque no canal (restrito a administradores)',
  usage: '!painelestoque',

  async execute(message) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem publicar o painel de estoque.');
    }

    const { atualizado } = await publicarOuAtualizar(message.channel);
    return message.reply(
      atualizado
        ? '✅ Painel de estoque **atualizado**.'
        : '✅ Painel de estoque publicado! Qualquer pessoa pode clicar nas categorias — cada um vê a lista de forma privada.'
    );
  },
};
