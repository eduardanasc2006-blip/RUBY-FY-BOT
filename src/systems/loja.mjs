import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import {
  molduras,
  efeitos,
  fundos,
  badges
} from '../systems/perfilConfig.mjs';

const abas = {
  molduras: '🪟 Molduras',
  efeitos: '✨ Efeitos',
  fundos: '🎨 Fundos',
  badges: '🏅 Badges'
};

function getCatalogo(aba) {
  switch (aba) {
    case 'molduras': return molduras;
    case 'efeitos': return efeitos;
    case 'fundos': return fundos;
    case 'badges': return badges;
    default: return molduras;
  }
}

function gerarLoja(aba) {
  const catalogo = Object.entries(getCatalogo(aba)).slice(0, 5); // 🔥 limite 5 itens

  return new EmbedBuilder()
    .setTitle(`🏪 Loja - ${abas[aba]}`)
    .setColor('#00d4ff')
    .setDescription(
      catalogo.map(([id, item]) => {
        const preco = item.preco ?? '—';
        const raridade = item.raridade ? ` | ${item.raridade}` : '';

        return `**${item.nome}** (\`${id}\`)${raridade}\n💰 ${preco} XP`;
      }).join('\n\n')
    );
}

function gerarBotoesItens(aba) {
  const catalogo = Object.entries(getCatalogo(aba)).slice(0, 5);

  const row = new ActionRowBuilder();

  catalogo.forEach(([id, item]) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_${aba}_${id}`)
        .setLabel(item.nome)
        .setStyle(ButtonStyle.Primary)
    );
  });

  return row;
}

function gerarBotoesAbas() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('loja_molduras')
      .setLabel('Molduras')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('loja_efeitos')
      .setLabel('Efeitos')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('loja_fundos')
      .setLabel('Fundos')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('loja_badges')
      .setLabel('Badges')
      .setStyle(ButtonStyle.Danger)
  );
}
