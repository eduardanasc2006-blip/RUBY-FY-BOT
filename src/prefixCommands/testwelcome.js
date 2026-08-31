const welcomeStore = require('../utils/welcomeStore');
const { buildEmbed } = require('../utils/embedPainel');
const { interpolar, interpolarEmbed } = require('../utils/interpolar');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'testwelcome',
  description: 'Envia a mensagem de boas-vindas no canal atual para testar (admin)',
  usage: '!testwelcome',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'embed')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const conf = welcomeStore.obter(message.guild.id);
    const canal = message.channel;
    const vars = { user: '<@' + message.author.id + '>', server: message.guild.name };

    if (!conf || !conf.embed) {
      // Mesmo sem embed configurada, mostra o comportamento real(so content se houver).
      const content = conf ? interpolar(conf.content || null, vars) : null;
      if (!content) {
        return message.reply('💤 Nenhuma mensagem de boas-vindas configurada ainda. Use **!setwelcome** para criar uma.');
      }
      return canal.send({ content });
    }

    const embed = buildEmbed(conf.embed);
    if (embed) interpolarEmbed(embed, vars);
    const content = interpolar(conf.content || null, vars);
    return canal.send({ embeds: embed ? [embed] : [], content });
  },
};