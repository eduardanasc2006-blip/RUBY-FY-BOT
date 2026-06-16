import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

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

function gerarLoja(aba) {
  let lista = [];

  switch (aba) {
    case 'molduras':
      lista = Object.entries(molduras);
      break;

    case 'efeitos':
      lista = Object.entries(efeitos);
      break;

    case 'fundos':
      lista = Object.entries(fundos);
      break;

    case 'badges':
      lista = Object.entries(badges);
      break;

    default:
      lista = Object.entries(molduras);
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏪 Loja - ${abas[aba]}`)
    .setColor('#00d4ff')
    .setDescription(
      lista
        .map(([id, item]) => {
          const preco = item.preco ?? '—';
          const raridade = item.raridade ? ` | ${item.raridade}` : '';

          return `**${item.nome}** (\`${id}\`)${raridade}\n💰 Preço: ${preco}`;
        })
        .join('\n\n')
    )
    .setFooter({ text: 'Use os botões abaixo para navegar pela loja' });

  return embed;
}

function gerarBotoes() {
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

export async function lojaCommand(message) {
  let abaAtual = 'molduras';

  const msg = await message.channel.send({
    embeds: [gerarLoja(abaAtual)],
    components: [gerarBotoes()]
  });

  const collector = msg.createMessageComponentCollector({
    time: 10 * 60 * 1000
  });

  collector.on('collect', async (interaction) => {
    if (!interaction.customId.startsWith('loja_')) return;
    if (interaction.user.id !== message.author.id) return;

    const aba = interaction.customId.replace('loja_', '');
    abaAtual = aba;

    await interaction.update({
      embeds: [gerarLoja(abaAtual)],
      components: [gerarBotoes()]
    });
  });

  collector.on('end', async () => {
    try {
      await msg.edit({
        components: []
      });
    } catch (err) {}
  });
}
