const { publicarOuAtualizar } = require('../utils/estoquePanelStore');
const { comandoPode } = require('../utils/permissions');
const { autoDelete } = require('../utils/autoDelete');

module.exports = {
  name: 'painelestoque',
  description: 'Publica (ou atualiza) o painel fixo de estoque no canal (restrito a administradores)',
  usage: '!painelestoque',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'painelestoque')) {
      return message.reply('🔒 Somente administradores podem publicar o painel de estoque.');
    }

    // Suporte canal: !painelestoque [nova] [#canal] — publica no canal mencionado, ou no atual.
    const canalAlvo = message.mentions?.channels?.first() || message.channel;
    const forcarNovo = args[0] === 'nova' || args[0] === 'novo';
    const { atualizado } = await publicarOuAtualizar(canalAlvo, forcarNovo);

    // Confirma um sume apos 4 segundos para nao poluir o canal
    const confirmacao = await message.reply(
      atualizado
        ? '✅ Painel de estoque **atualizado**.'
        : '✅ Painel de estoque publicado! Qualquer pessoa pode clicar nas categorias — cada um vê a lista de forma privada.'
    );
    autoDelete(confirmacao, 4000);
    autoDelete(message, 5000);
    return;
  },
};
