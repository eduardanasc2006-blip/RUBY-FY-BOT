const { comandoPode } = require('../utils/permissions');
const comprasStore = require('../utils/comprasStore');
const {
  parseValor,
  parseQuantidade,
  lancarVenda,
  resumoCliente,
  embedLancamento,
  embedResumoCliente,
  painelRemoverLancamento,
  embedRemocaoFeita,
} = require('../utils/vendaPanel');

const REMOVER = ['remover', 'excluir', 'apagar'];

module.exports = {
  name: 'venda',
  description: 'Lança uma venda feita fora do /comprar (credita no gasto e nas metas)',
  usage:
    '!venda @cliente 10,50 [| descrição]\n' +
    '!venda consultar @cliente  — mostra o gasto acumulado\n' +
    '!venda remover @cliente    — abre a lista para escolher\n' +
    '!venda remover <id>        — remove o lançamento #id direto\n' +
    '!venda remover <id> uma    — remove só UMA venda do lançamento #id',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'venda')) {
      return message.reply('🔒 Somente administradores ou equipe autorizada podem lançar vendas.');
    }

    const mencao = message.mentions?.users?.first() || null;

    // ----- !venda remover ... -----
    if (args[0] && REMOVER.includes(args[0].toLowerCase())) {
      // !venda remover <id> [uma] — remove por ID, sem precisar marcar o cliente.
      const idArg = args.find((a) => /^\d+$/.test(a));
      if (idArg) {
        return removerPorId(message, idArg, args.some((a) => /^(uma|1)$/i.test(a)));
      }
      // !venda remover @cliente — abre a lista para escolher.
      if (!mencao) {
        return message.reply(
          '❌ Marque o cliente (`!venda remover @cliente`) ou informe o ID (`!venda remover <id>`).'
        );
      }
      return message.reply({
        ...painelRemoverLancamento(message.guildId, mencao.id, 0),
        allowedMentions: { repliedUser: false },
      });
    }

    // ----- !venda consultar @cliente -----
    if (args[0] && ['consultar', 'gasto', 'total'].includes(args[0].toLowerCase())) {
      if (!mencao) {
        return message.reply('❌ Marque o cliente: `!venda consultar @cliente`.');
      }
      const resumo = resumoCliente(message.guildId, mencao.id);
      return message.reply({
        embeds: [embedResumoCliente(mencao.id, resumo)],
        allowedMentions: { repliedUser: false },
      });
    }

    if (!mencao) {
      return message.reply(
        '❌ Marque o cliente e informe o valor.\n' +
        'Ex: `!venda @cliente 10,50` ou `!venda @cliente 10,50 | pix fora do ticket`\n' +
        'Para consultar o gasto: `!venda consultar @cliente`.'
      );
    }

    // Aceita "!venda @cliente 10,50 | descrição" — a descrição vem depois do pipe.
    const semMencao = args.filter((a) => !/^<@!?\d+>$/.test(a));
    const bruto = semMencao.join(' ');
    const [parteValor, ...parteDesc] = bruto.split('|');

    const camposValor = (parteValor || '').trim().split(/\s+/).filter(Boolean);
    const valor = parseValor(camposValor[0]);
    if (valor == null) {
      return message.reply('❌ Valor inválido. Ex: `!venda @cliente 10,50`.');
    }
    // "!venda @cliente 10,50 2" conta 2 vendas pelo mesmo valor.
    const quantidade = camposValor[1] ? parseQuantidade(camposValor[1]) : 1;
    const descricao = parteDesc.join('|').trim();

    const { lancamento, conquistadas, acumulado } = await lancarVenda(message.client, message.guild, {
      clienteId: mencao.id,
      clienteTag: `<@${mencao.id}>`,
      valor,
      quantidade,
      descricao,
      registradoPor: message.author.id,
    });

    return message.reply({
      embeds: [embedLancamento(lancamento, conquistadas, acumulado, `<@${mencao.id}>`)],
      allowedMentions: { repliedUser: false },
    });
  },
};

// Remove um lançamento pelo ID. Com `uma = true`, tira só UMA venda (remoção
// parcial) em vez do lançamento inteiro.
function removerPorId(message, lancamentoId, uma) {
  const l = comprasStore.obterLancamento(message.guildId, lancamentoId);
  if (!l) {
    return message.reply(`❌ Não achei o lançamento **#${lancamentoId}**. Use \`!venda remover @cliente\` para ver a lista.`);
  }

  const resultado = uma
    ? comprasStore.removerVendaParcial(message.guildId, lancamentoId)
    : comprasStore.removerLancamento(message.guildId, lancamentoId);

  if (!resultado) {
    return message.reply(`❌ Não consegui remover o lançamento **#${lancamentoId}**.`);
  }

  const resumo = resumoCliente(message.guildId, l.clienteId);
  return message.reply({
    embeds: [embedRemocaoFeita(resultado, l.clienteId, resumo)],
    allowedMentions: { repliedUser: false },
  });
}
