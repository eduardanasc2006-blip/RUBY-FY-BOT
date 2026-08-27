const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const rates = require('../config/rates');
const { robuxToReais, formatBRL, formatRobux } = require('../utils/robuxConverter');
const { refreshSavedPanel } = require('../utils/panelStore');
const { isAdmin } = require('../prefixCommands/settaxa');

const FAIXAS = {
  100: { chave: 'TIER1_PRICE_PER_100', descricao: '100–999 Robux (por 100)' },
  1000: { chave: 'TIER2_PRICE_PER_1000', descricao: '1.000+ Robux (por 1.000)' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settaxa')
    .setDescription('Altera as taxas de conversão (admin)')
    .addStringOption((o) =>
      o
        .setName('faixa')
        .setDescription('Faixa de Robux a alterar')
        .setRequired(true)
        .addChoices(
          { name: '100 a 999 Robux', value: '100' },
          { name: '1.000+ Robux', value: '1000' }
        )
    )
    .addStringOption((o) =>
      o
        .setName('valor')
        .setDescription('Novo valor em reais (ex: 3,50 ou 3.50)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id) && !comandoPode(interaction.member, interaction.user.id, 'settaxa')) {
      return interaction.reply({ content: '🔒 Somente administradores podem alterar as taxas.', flags: MessageFlags.Ephemeral });
    }

    const faixaValor = interaction.options.getString('faixa');
    const faixa = FAIXAS[faixaValor];
    const valor = parseFloat((interaction.options.getString('valor') || '').replace(',', '.'));

    if (!faixa || isNaN(valor) || valor <= 0) {
      return interaction.reply({
        content: '❌ Valor inválido. Use `/settaxa` com faixa (100 ou 1000) e um valor como 3,50.',
        flags: MessageFlags.Ephemeral,
      });
    }

    rates.setOverride(faixa.chave, valor);

    // Atualiza o status do bot com a nova taxa
    try {
      interaction.client.user.setActivity(
        `☁️ ${formatBRL(rates.TIER1_PRICE_PER_100)} / 100 Robux | !ajuda`,
        { type: 3 }
      );
    } catch {}

    const painelAtualizado = await refreshSavedPanel(interaction.client);

    const exemploQtd = faixaValor === '100' ? 100 : 1000;
    const embed = {
      color: 0xbeb6ff,
      title: '✅ Taxa atualizada',
      fields: [
        { name: 'Faixa alterada', value: faixa.descricao },
        { name: 'Novo valor', value: formatBRL(valor) },
        { name: 'Exemplo', value: `${formatRobux(exemploQtd)} Robux → ${formatBRL(robuxToReais(exemploQtd))}` },
      ],
      footer: {
        text: painelAtualizado
          ? 'Painel/tabela atualizado automaticamente'
          : 'A taxa já vale para todos os comandos',
      },
    };

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};