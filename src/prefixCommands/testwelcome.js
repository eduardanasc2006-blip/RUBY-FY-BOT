const welcomeStore = require('../utils/welcomeStore');
const welcomeVars = require('../utils/welcomeVars');
const welcomePainel = require('../utils/welcomePainel');
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
    if (!conf || !conf.ativo || !conf.canalId) {
      return message.reply('💤 Boas-vindas desativadas ou sem canal configurado. Use **!setwelcome** para configurar.');
    }

    const membroTeste = {
      id: message.author.id,
      username: message.author.username,
      displayName: message.member?.displayName || message.author.username,
      displayAvatarURL: () => message.author.displayAvatarURL(),
    };

    const canal = message.channel || (await message.guild.channels.fetch(conf.canalId).catch(() => null));
    if (!canal || !canal.isTextBased()) return message.reply('❌ Canal invalido para envio.');

    const mensagem = conf.tipo === 'embed' ? null : welcomeVars.interpolar(conf.mensagem || '', membroTeste, message.guild);
    const embed = conf.tipo === 'embed' ? welcomePainel.buildWelcomeEmbed(conf, message.author.displayAvatarURL()) : null;
    if (embed) welcomeVars.interpolarEmbed(embed, membroTeste, message.guild);

    return canal.send({
      content: mensagem || undefined,
      embeds: embed ? [embed] : [],
      allowedMentions: { parse: ['users'] },
    });
  },
};