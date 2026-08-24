const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { robuxToReais, formatBRL, formatRobux } = require('./robuxConverter');

// Valores de referência exibidos no painel — sempre calculados com as taxas atuais
const REFERENCIAS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000];

function buildPanel() {
  const linhas = REFERENCIAS.map(
    (r) => `\`${formatRobux(r)} Robux\` → **${formatBRL(robuxToReais(r))}**`
  );

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('💜 RUBY FY — CONVERSOR DE ROBUX')
    .setDescription('Escolha uma opção abaixo:\n\n' + linhas.join('\n'))
    .setFooter({ text: 'Clique em um botão • a resposta é privada, só você vê' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel:robux')
      .setLabel('Robux → R$')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel:reais')
      .setLabel('R$ → Robux')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('panel:gamepass')
      .setLabel('Game Pass')
      .setEmoji('🎟️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:taxas')
      .setLabel('Ver Taxas')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildPanel };
