const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { robuxToReais, formatBRL, formatRobux } = require('./robuxConverter');

const COR = 0xbeb6ff;

// Valores de referência exibidos no painel — sempre calculados com as taxas atuais
const REFERENCIAS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000];

function buildPanel() {
  const linhas = REFERENCIAS.map(
    (r) => `\`${formatRobux(r)} Robux\`  ➜  **${formatBRL(robuxToReais(r))}**`
  );

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('☁️ RUBY FY  •  Conversor de Robux')
    .setDescription(
      'Clique em um botão abaixo e informe o valor.\nSua resposta aparece somente para você.\n\n' +
        '**Tabela de referência**\n' +
        linhas.join('\n')
    )
    .setFooter({ text: 'RUBY FY • As taxas podem ser atualizadas pela administração' });

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
