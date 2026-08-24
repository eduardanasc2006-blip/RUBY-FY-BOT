const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const rates = require('../config/rates');
const { formatBRL } = require('./robuxConverter');

function buildConfigPanel() {
  const taxaGamepass = Math.round(rates.GAMEPASS_FEE * 100);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('💜 RUBY FY — CONFIGURAÇÃO DE TAXAS')
    .addFields(
      {
        name: '🎮 100–999 Robux',
        value: `**${formatBRL(rates.TIER1_PRICE_PER_100)}** por 100 Robux`,
      },
      {
        name: '🎮 1.000+ Robux',
        value: `**${formatBRL(rates.TIER2_PRICE_PER_1000)}** por 1.000 Robux`,
      },
      {
        name: '🎟️ Game Pass',
        value: `**${taxaGamepass}%** de desconto (você recebe ${100 - taxaGamepass}%)`,
      }
    )
    .setFooter({ text: 'Painel privado • alterações valem na hora e ficam salvas' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cfg:tier1')
      .setLabel('Alterar 100–999')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:tier2')
      .setLabel('Alterar 1.000+')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:gamepass')
      .setLabel('Alterar Game Pass')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg:refresh')
      .setLabel('Atualizar')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cfg:close')
      .setLabel('Fechar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildConfigPanel };
