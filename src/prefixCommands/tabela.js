const { comandoPode } = require('../utils/permissions');
const { publishOrUpdatePanel } = require('../utils/panelStore');
const { autoDelete } = require('../utils/autoDelete');

module.exports = {
  name: 'tabela',
  description: 'Publica (ou atualiza) o painel de conversão no canal (somente administradores)',
  usage: '!tabela',

  async execute(message, args) {
    if (!message.guild) {
      return message.reply('🔒 O painel de conversão só pode ser publicado no servidor.');
    }

    // Mesma permissão do /tabela: owner, Administrator ou cargo com permissão no grupo de Taxas.
    if (!comandoPode(message.member, message.author.id, 'tabela')) {
      return message.reply('🔒 Somente administradores podem publicar o painel de conversão.');
    }

    // Suporte canal: !tabela [nova] [#canal] — publica no canal mencionado, ou no atual.
    const canalAlvo = message.mentions?.channels?.first() || message.channel;
    const forcarNovo = args[0] === 'nova' || args[0] === 'novo';
    const { atualizado } = await publishOrUpdatePanel(canalAlvo, forcarNovo);

    // Confirma um sume apos alguns segundos para nao poluir o canal
    const confirmacao = await message.reply(
      atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.'
    );
    autoDelete(confirmacao, 5000);
    autoDelete(message, 5000);
    return;
  },
};
