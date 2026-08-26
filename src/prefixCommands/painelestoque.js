const { publicarOuAtualizar } = require('../utils/estoquePanelStore');
const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'painelestoque',
  description: 'Publica (ou atualiza) o painel fixo de estoque no canal (restrito a administradores)',
  usage: '!painelestoque',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem publicar o painel de estoque.');
    }

    const forcarNovo = args[0] === 'nova' || args[0] === 'novo';
    const { atualizado } = await publicarOuAtualizar(message.channel, forcarNovo);

    // Confirma um sume apos 4 segundos para nao poluir o canal
    const confirmacao = await message.reply(
      atualizado
        ? '✅ Painel de estoque **atualizado**.'
        : '✅ Painel de estoque publicado! Qualquer pessoa pode clicar nas categorias — cada um vê a lista de forma privada.'
    );
    setTimeout(() => confirmacao.delete().catch(() => {}), 4000);
    return;
  },
};
