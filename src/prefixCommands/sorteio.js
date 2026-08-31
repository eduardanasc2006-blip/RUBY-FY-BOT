const { buildSorteioPainel } = require('../utils/sorteioPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  name: 'sorteio',
  description: 'Cria um sorteio (admin)',
  usage: '!sorteio [canal] [cargo]',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'sorteio')) {


      return message.reply('🔒 Somente administradores podem usar este comando.');
    }
    const canal = args[0] ? message.mentions?.channels?.first() || message.guild.channels.cache.get(args[0].replace(/[<#>]/g, )) : null;
    const cargo = args[1] ? message.mentions?.roles?.first() || message.guild.roles.cache.get(args[1].replace(/[<@&>]/g, '')) : null;
    return message.reply(buildSorteioPainel(message.guild.id, message.author.id, canal ? canal.id : null, cargo ? cargo.id : null));
  },
};
