const { getSessao, buildPainel } = require('../utils/embedPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'setwelcome',
  description: 'Abre o editor visual da mensagem de boas-vindas (admin)',
  usage: '!setwelcome',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'embed')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const sessao = getSessao(message.author.id);
    sessao._modoWelcome = true;
    sessao._canalWelcome = message.channel.id;
    const painel = buildPainel(message.author.id);
    return message.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};