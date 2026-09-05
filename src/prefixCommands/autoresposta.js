const { comandoPode } = require('../utils/permissions');
const store = require('../utils/autoRespostaStore');
const { acharResposta } = require('../utils/autoRespostaHandler');

const MAX_AUTORESPOSTAS = 30;

module.exports = {
  name: 'autoresposta',
  aliases: ['auto'],
  description: 'Gerencia respostas automáticas por palavra-chave (adm)',
  usage: '!autoresposta adicionar <palavra> <resposta> | !autoresposta ver | !autoresposta remover <palavra> | !autoresposta canais [#canal]',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'autoresposta')) {

      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const args = message.content.trim().split(/\s+/).slice(1);
    const sub = (args.shift() || '' ).toLowerCase();

    if (sub === 'ver') {
      const lista = store.listar(message.guildId);
      const canaisIds = store.canais(message.guildId);
      const canaisTxt = canaisIds.length
        ? canaisIds.map((id) => `<#${id}>`).join(', ')
        : 'todos os canais';
      if (!lista.length) {
        return message.reply(
          `📭 Nenhuma auto-resposta ainda.\n**Canais:** ${canaisTxt}\nUse \`!autoresposta adicionar <palavra> <resposta>\`.`
        );
      }
      const linhas = lista.map((r, i) => `\`${i + 1}\` **${r.palavra}** → ${r.resposta}`);
      return message.reply(
        `**Auto-respostas (${lista.length}):**\n${linhas.join('\n')}\n**Canais:** ${canaisTxt}`
      );
    }

    if (sub === 'adicionar') {
      const resto = args.join(' ').trim();
      const espaco = resto.search(/\s+/);
      const palavra = espaco === -1 ? resto : resto.slice(0, espaco);
      const resposta = espaco === -1 ? '' : resto.slice(espaco).trim();
      if (!palavra || !resposta) {
        return message.reply('❌ Uso: `!autoresposta adicionar <palavra> <resposta>`\nEx: `!autoresposta adicionar estoque para visualizar estoque veja #canalestoque`');
      }
      if (store.listar(message.guildId).length >= MAX_AUTORESPOSTAS) {

        return message.reply(`❌ Máximo de ${MAX_AUTORESPOSTAS} auto-respostas por servidor.`);
      }
      const res = store.adicionar(message.guildId, palavra, resposta);
      return message.reply(res.ok ? `✅ ${res.msg}` : `❌ ${res.msg}`);
    }

    if (sub === 'remover') {
      const palavra = args.join(' ').trim();
      if (!palavra) return message.reply('❌ Informe a palavra: `!autoresposta remover <palavra>`');
      const res = store.remover(message.guildId, palavra);
      return message.reply(res.ok ? `✅ ${res.msg}` : `❌ ${res.msg}`);
    }

    if (sub === 'canais') {
      const canal = message.mentions?.channels?.first();
      const atuais = store.canais(message.guildId);
      if (!canal) {
        if (args[0] && args[0].toLowerCase() === 'limpar') {
          store.definirCanais(message.guildId, []);
          return message.reply('✅ Agora responde em **qualquer canal** do servidor.');
        }
        return message.reply(
          atuais.length
            ? `📌 **Canais atuais:** ${atuais.map((id) => `<#${id}>`).join(', ')}\nUse \`!autoresposta canais <#canal>\` para adicionar/remover, ou \`!autoresposta canais limpar\` para voltar a qualquer canal.`
            : '📌 **Canais atuais:** todos os canais\nUse `!autoresposta canais <#canal>` para restringir.'
        );
      }
      if (atuais.includes(canal.id)) {
        const nova = atuais.filter((id) => id !== canal.id);
        store.definirCanais(message.guildId, nova);
        return message.reply(`🚫 Removido ${canal}.` + (nova.length ? '' : ' Agora responde em qualquer canal.'));
      }
      const nova = [...atuais, canal.id];
      store.definirCanais(message.guildId, nova);
      return message.reply(`✅ Adicionado ${canal}.` + (nova.length === 1 ? ' Agora responde **somente** neste canal.' : ''));
    }

    return message.reply(
      '❌ Subcomando inválido.\nUso: `!autoresposta adicionar <palavra> <resposta>` | `!autoresposta remover <palavra>` | `!autoresposta canais [#canal]` | `!autoresposta ver`'
    );
  },
};