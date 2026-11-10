const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const {
  parseValor,
  parseQuantidade,
  lancarVenda,
  resumoCliente,
  embedLancamento,
  embedResumoCliente,
  painelRemoverLancamento,
} = require('../utils/vendaPanel');

const clienteOpt = (o, obrigatorio = true) =>
  o.setName('cliente').setDescription('Cliente da venda').setRequired(obrigatorio);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('venda')
    .setDescription('Lançar, consultar ou remover uma venda feita fora do /comprar')
    // Subcomandos: aparecem como opções claras ao digitar /venda, então "remover"
    // fica visível de imediato (antes, com tudo em opções opcionais, o remover se
    // escondia no fim da lista e dava a impressão de não existir).
    .addSubcommand((s) =>
      s
        .setName('lancar')
        .setDescription('Lança uma venda (credita no gasto do cliente e nas metas)')
        .addUserOption((o) => clienteOpt(o))
        .addStringOption((o) =>
          o.setName('valor').setDescription('Valor em reais (ex: 10,50)').setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName('quantidade').setDescription('Quantas vendas contar (padrão: 1)').setRequired(false).setMinValue(1)
        )
        .addStringOption((o) =>
          o.setName('descricao').setDescription('Descrição opcional (ex: pix fora do ticket)').setRequired(false).setMaxLength(200)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('consultar')
        .setDescription('Mostra o gasto acumulado do cliente, sem lançar nada')
        .addUserOption((o) => clienteOpt(o))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Abre a lista de lançamentos manuais do cliente para remover')
        .addUserOption((o) => clienteOpt(o))
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'venda')) {
      return interaction.reply({
        content: '🔒 Somente administradores ou equipe autorizada.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'consultar') {
      const alvo = interaction.options.getUser('cliente');
      const resumo = resumoCliente(interaction.guildId, alvo.id);
      return interaction.reply({
        embeds: [embedResumoCliente(alvo.id, resumo)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'remover') {
      const alvo = interaction.options.getUser('cliente');
      return interaction.reply({
        ...painelRemoverLancamento(interaction.guildId, alvo.id, 0),
        flags: MessageFlags.Ephemeral,
      });
    }

    // sub === 'lancar'
    const cliente = interaction.options.getUser('cliente');
    const valor = parseValor(interaction.options.getString('valor'));
    if (valor == null) {
      return interaction.reply({ content: '❌ Valor inválido. Use um número, ex: `10,50`.', flags: MessageFlags.Ephemeral });
    }

    const quantidade = parseQuantidade(interaction.options.getInteger('quantidade'));
    const descricao = (interaction.options.getString('descricao') || '').trim();

    const { lancamento, conquistadas, acumulado } = await lancarVenda(interaction.client, interaction.guild, {
      clienteId: cliente.id,
      clienteTag: `<@${cliente.id}>`,
      valor,
      quantidade,
      descricao,
      registradoPor: interaction.user.id,
    });

    return interaction.reply({
      embeds: [embedLancamento(lancamento, conquistadas, acumulado, `<@${cliente.id}>`)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
