const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { robuxToReais, gamepassPrice, formatBRL, formatRobux } = require('./robuxConverter');

const COR = 0xbeb6ff;

// Faixas de referência: 100-1000 de 100 em 100, depois 1500-5000 de 500 em 500
const REFERENCIAS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

function buildPanel() {
  // Tabela: Robux | Preço | Game Pass necessário
  const linhas = REFERENCIAS.map((r) => {
    const preco = formatBRL(robuxToReais(r));
    const gp = formatRobux(gamepassPrice(r));
    return `${formatRobux(r)} ➜ **${preco}**  ·  ${gp} GP`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('☁️  RUBY FY  •  Conversor de Robux  ☁️')
    .setDescription(
      '✨ **Selecione um botão abaixo e informe o valor.**\n' +
        'A resposta aparece somente para você.\n\n' +
        '📋 **Tabela de referência**\n' +
        'GP = valor a criar no Game Pass\n' +
        '──────────────────────\n' +
        linhas.join('\n')
    )
    .setFooter({ text: '☁️ RUBY FY • criador: Finix.Yin • taxas pela administração ☁️' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel:robux')
      .setLabel('Robux para Reais')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel:reais')
      .setLabel('Reais para Robux')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel:gamepass')
      .setLabel('Calcular Game Pass')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:taxas')
      .setLabel('Ver Taxas')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildPanel, COR };
