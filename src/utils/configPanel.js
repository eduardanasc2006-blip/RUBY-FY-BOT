const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { formatBRL } = require('./robuxConverter');

function buildConfigPanel() {
  const taxaGamepass = Math.round(rates.GAMEPASS_FEE * 100);

  const embed = new EmbedBuilder()
    .setColor(0xa8c6fa)
    .setTitle('☁️ RUBY FY  •  Configuração de Taxas')
    .setDescription('Clique em um botão para alterar. A mudança vale na hora e fica salva.')
    .addFields(
      {
        name: 'Faixa 1 — 100 a 999 Robux',
        value: `**${formatBRL(rates.TIER1_PRICE_PER_100)}** a cada 100 Robux`,
      },
      {
        name: 'Faixa 2 — 1.000 Robux ou mais',
        value: `**${formatBRL(rates.TIER2_PRICE_PER_1000)}** a cada 1.000 Robux`,
      },
      {
        name: 'Game Pass',
        value: `Roblox desconta **${taxaGamepass}%** (você recebe ${100 - taxaGamepass}%)`,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cfg:tier1')
      .setLabel('Alterar Faixa 1')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:tier2')
      .setLabel('Alterar Faixa 2')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:gamepass')
      .setLabel('Alterar Game Pass')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:refresh')
      .setLabel('Atualizar')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cfg:close')
      .setLabel('Fechar')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildConfigPanel };
