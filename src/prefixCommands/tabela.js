const { publishOrUpdatePanel } = require('../utils/panelStore');

module.exports = {
  name: 'tabela',
  description: 'Publica (ou atualiza) o painel de conversão no canal',
  usage: '!tabela',

  async execute(message) {
    const { atualizado } = await publishOrUpdatePanel(message.channel);

    return message.reply(
      atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.'
    );
  },
};
