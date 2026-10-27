const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { parseValor, parseQuantidade, lancarVenda, resumoCliente, embedLancamento, embedResumoCliente } = require('../utils/vendaPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('venda')
    .setDescription('Lança uma venda que aconteceu fora do /comprar (credita no gasto do cliente e nas metas)')
    .addUserOption((o) =>
      o.setName('cliente').setDescription('Cliente que comprou (obrigatório ao lançar)').setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('valor').setDescription('Valor em reais (ex: 10,50) — obrigatório ao lançar').setRequired(false)
    )
    .addIntegerOption((o) =>
      o
        .setName('quantidade')
        .setDescription('Quantas vendas contar (padrão: 1)')
        .setRequired(false)
        .setMinValue(1)
    )
    .addStringOption((o) =>
      o
        .setName('descricao')
        .setDescription('Descrição opcional (ex: pagou no pix fora do ticket)')
        .setRequired(false)
        .setMaxLength(200)
    )
    .addUserOption((o) =>
      o
        .setName('consultar')
        .setDescription('Só consulta o gasto deste cliente, sem lançar nada')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'venda')) {
      return interaction.reply({
        content: '🔒 Somente administradores ou equipe autorizada.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Modo consulta: mostra o gasto acumulado sem lançar venda.
    const consulta = interaction.options.getUser('consultar');
    if (consulta) {
      const resumo = resumoCliente(interaction.guildId, consulta.id);
      return interaction.reply({
        embeds: [embedResumoCliente(consulta.id, resumo)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const cliente = interaction.options.getUser('cliente');
    const brutoValor = interaction.options.getString('valor');
    if (!cliente || !brutoValor) {
      return interaction.reply({
        content:
          '❌ Informe o cliente e o valor para lançar.\n' +
          'Ex: `/venda cliente:@fulano valor:10,50`\n' +
          'Para só consultar o gasto: `/venda consultar:@fulano`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const valor = parseValor(brutoValor);
    if (valor == null) {
      return interaction.reply({
        content: '❌ Valor inválido. Use um número, ex: `10,50`.',
        flags: MessageFlags.Ephemeral,
      });
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
