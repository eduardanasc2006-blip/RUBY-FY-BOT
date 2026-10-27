const { comandoPode } = require('../utils/permissions');
const { parseValor, parseQuantidade, lancarVenda, resumoCliente, embedLancamento, embedResumoCliente } = require('../utils/vendaPanel');

module.exports = {
  name: 'venda',
  description: 'Lança uma venda feita fora do /comprar (credita no gasto e nas metas)',
  usage:
    '!venda @cliente 10,50 [| descrição]\n' +
    '!venda consultar @cliente  — mostra o gasto acumulado',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'venda')) {
      return message.reply('🔒 Somente administradores ou equipe autorizada podem lançar vendas.');
    }

    const mencao = message.mentions?.users?.first() || null;

    // !venda consultar @cliente — só consulta, não lança nada.
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
