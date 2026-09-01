const { getSessaoWelcome, buildWelcomePainel } = require('../utils/welcomePainel');
const welcomeStore = require('../utils/welcomeStore');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'setwelcome',
  description: 'Abre o painel de configuracao das boas-vindas (admin)',
  usage: '!setwelcome',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'embed')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const sessao = getSessaoWelcome(message.author.id, message.guild.id);
    const existente = welcomeStore.obter(message.guild.id);
    if (!existente) {
      const novaConf = welcomeStore.padrao(message.channel.id);
      welcomeStore.salvar(message.guild.id, novaConf);
    }

    const painel = buildWelcomePainel(message.author.id, message.guild.id);
    return message.reply({
      embeds: painel.embeds,
      components: painel.components,
    });
  },
};