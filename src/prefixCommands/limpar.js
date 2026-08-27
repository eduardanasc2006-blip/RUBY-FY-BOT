const { isAdmin } = require('./settaxa');
const { autoDelete } = require('../utils/autoDelete');

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

    const MAIOR_QUE_14_DIAS = 14 * 24 * 60 * 60 * 1000;

    // Apaga em lotes, ignorando todas as mensagens mais antigas que 14 dias
    // e mensagens fixadas. Assim uma mensagem antiga isolada nunca cancela a
    // limpeza inteira (bulkDelete falha se QUALQUER uma delas for antiga).
    async function apagarLotes(limite) {
      // Busca as (limite+1) mais recentes e apaga só as recentes (menos de 14 dias)
      // e não fixadas. Uma antiga isolada não cancela a limpeza inteira.
      const alvo = Math.min(limite + 1, 100);
      const mensagens = await message.channel.messages.fetch({ limit: alvo });
      const apagaveis = mensagens
        .filter((m) => Date.now() - m.createdTimestamp < MAIOR_QUE_14_DIAS && !m.pinned)
        .first(limite);
      if (!apagaveis.length) return 0;
      await message.channel.bulkDelete(apagaveis, true);
      return apagaveis.length;
    }

    try {
      // +1 para incluir a mensagem do comando
      const apagadas = await message.channel.bulkDelete(qtd + 1, true);
      const aviso = await message.channel.send(`🧹 ${apagadas.size - 1} mensagens apagadas.`);
      autoDelete(aviso, 4000);
    } catch (error) {
      console.error('[Limpar]', error);
      // Mensagens com mais de 14 dias quebram o bulkDelete inteiro. Remove as
      // mais recentes primeiro e preserva o maximo possivel nao excluido.
      try {
        const removidas = await apagarLotes(qtd + 1);
        if (removidas === 0) {
          return message.reply('⚠️ Nenhuma mensagem recente para apagar (as mais antigas que 14 dias não podem ser removidas em massa).');
        }
        // Desconta a mensagem do proprio comando, quando presente
        const contagem = removidas - 1;
        const aviso = await message.channel.send(`🧹 ${contagem} mensagens recentes apagadas.`);
        autoDelete(aviso, 4000);
      } catch (e2) {
        console.error('[Limpar] fallback', e2);
        return message.reply('❌ Não consegui apagar. Mensagens com mais de 14 dias não podem ser removidas em massa.');
      }
    }
  },
};
