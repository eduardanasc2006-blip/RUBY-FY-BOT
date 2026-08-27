const { isAdmin } = require('./settaxa');

module.exports = {
  name: 'limpar',
  aliases: ['clear', 'clean'],
  description: 'Apaga mensagens do canal (restrito a administradores)',
  usage: '!limpar <quantidade>',

  async execute(message, args) {
    if (!message.guild || !isAdmin(message.member, message.author.id)) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const qtd = parseInt(args[0], 10);
    if (isNaN(qtd) || qtd < 1 || qtd > 100) {
      return message.reply('❌ Use: `!limpar <1-100>` — ex: `!limpar 20`');
    }

    try {
      // +1 para incluir a mensagem do comando
      const apagadas = await message.channel.bulkDelete(qtd + 1, true);
      const aviso = await message.channel.send(`🧹 ${apagadas.size - 1} mensagens apagadas.`);
      setTimeout(() => aviso.delete().catch(() => {}), 4000);
    } catch (error) {
      console.error('[Limpar]', error);
      // Mensagens com mais de 14 dias quebram o bulkDelete inteiro. Remove as
      // mais recentes primeiro e preserva o maximo possivel nao excluido.
      try {
        const mensagens = await message.channel.messages.fetch({ limit: Math.min(qtd + 1, 100) });
        const apagaveis = mensagens
          .filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000)
          .first(qtd + 1);
        if (!apagaveis.length) {
          return message.reply('⚠️ Nenhuma mensagem recente para apagar (as mais antigas que 14 dias não podem ser removidas em massa).');
        }
        await message.channel.bulkDelete(apagaveis, true);
        const aviso = await message.channel.send(`🧹 ${apagaveis.length} mensagens recentes apagadas.`);
        setTimeout(() => aviso.delete().catch(() => {}), 4000);
      } catch (e2) {
        console.error('[Limpar] fallback', e2);
        return message.reply('❌ Não consegui apagar. Mensagens com mais de 14 dias não podem ser removidas em massa.');
      }
    }
  },
};
