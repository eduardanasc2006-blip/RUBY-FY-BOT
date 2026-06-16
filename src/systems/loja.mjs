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

// 🔹 Limite de itens por página
const ITEMS_POR_PAGINA = 5;

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

// 🔹 Paginação
function getItensPaginados(aba, pagina) {
  const catalogo = Object.entries(getCatalogo(aba));
  const start = pagina * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  return catalogo.slice(start, end);
}

// 🔹 Embed da loja
function gerarLoja(aba, pagina = 0) {
  const catalogo = getItensPaginados(aba, pagina);
  const totalItens = Object.entries(getCatalogo(aba)).length;
  const totalPaginas = Math.ceil(totalItens / ITEMS_POR_PAGINA);

  return new EmbedBuilder()
    .setTitle(`🏪 Loja - ${abas[aba]} (Página ${pagina + 1}/${totalPaginas})`)
    .setColor('#00d4ff')
    .setDescription(
      catalogo.map(([id, item]) => {
        const preco = item.preco ?? '—';
        const raridade = item.raridade ? ` | ${item.raridade}` : '';

        return `**${item.nome}** (\`${id}\`)${raridade}\n💰 ${preco} XP`;
      }).join('\n\n')
    );
}

// 🔹 Botões dos itens da página
function gerarBotoesItens(aba, pagina = 0) {
  const catalogo = getItensPaginados(aba, pagina);

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

// 🔹 Botões das abas
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

// 🔹 Botões de navegação
function gerarBotoesNav(aba, pagina) {
  const catalogo = Object.entries(getCatalogo(aba));
  const maxPaginas = Math.ceil(catalogo.length / ITEMS_POR_PAGINA);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`loja_prev_${aba}_${pagina}`)
      .setLabel('⬅️ Voltar')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pagina === 0),

    new ButtonBuilder()
      .setCustomId(`loja_next_${aba}_${pagina}`)
      .setLabel('➡️ Próximo')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pagina >= maxPaginas - 1)
  );

  return row;
}

export async function lojaCommand(message) {
  const ownerId = message.author.id; // 🔹 Salva o dono do menu
  let abaAtual = 'molduras';
  let paginaAtual = 0;

  const msg = await message.channel.send({
    embeds: [gerarLoja(abaAtual, paginaAtual)],
    components: [
      gerarBotoesAbas(),
      gerarBotoesItens(abaAtual, paginaAtual),
      gerarBotoesNav(abaAtual, paginaAtual)
    ]
  });

  const collector = msg.createMessageComponentCollector({
    time: 10 * 60 * 1000
  });

  collector.on('collect', async (interaction) => {
    // 🔒 TRAVA PERFEITA — NINGUÉM MEXE, SÓ QUEM PEDIU
    if (interaction.user.id !== ownerId) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '❌ Esse menu não é seu.',
          ephemeral: true
        });
      }
      return;
    }

    // 🔁 TROCAR ABA
    if (
      interaction.customId === 'loja_molduras' ||
      interaction.customId === 'loja_efeitos' ||
      interaction.customId === 'loja_fundos' ||
      interaction.customId === 'loja_badges'
    ) {
      abaAtual = interaction.customId.replace('loja_', '');
      paginaAtual = 0;

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // ⏭️ PRÓXIMA PÁGINA
    if (interaction.customId.startsWith('loja_next_')) {
      const [, , aba, pagina] = interaction.customId.split('_');
      abaAtual = aba;
      paginaAtual = Number(pagina) + 1;

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // ⏮️ PÁGINA ANTERIOR
    if (interaction.customId.startsWith('loja_prev_')) {
      const [, , aba, pagina] = interaction.customId.split('_');
      abaAtual = aba;
      paginaAtual = Number(pagina) - 1;

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // 🛒 COMPRAR ITEM
    if (interaction.customId.startsWith('buy_')) {
      const [, aba, itemId] = interaction.customId.split('_');

      const catalogo = getCatalogo(aba);
      const item = catalogo[itemId];

      // ✅ ITEM INVÁLIDO
      if (!item) {
        return interaction.reply({
          content: '❌ Item inválido.',
          ephemeral: true
        });
      }

      const user = await Usuario.findOne({
        userId: message.author.id,
        guildId: message.guild.id
      });

      // ✅ GARANTE INVENTÁRIO
      if (!user.inventario) {
        user.inventario = {
          molduras: [],
          efeitos: [],
          fundos: [],
          badges: [],
          titulos: []
        };
      }

      const tipo = aba;
      if (!user.inventario[tipo]) user.inventario[tipo] = [];

      const lista = user.inventario[tipo];

      // ✅ JÁ TEM O ITEM
      if (lista.includes(itemId)) {
        return interaction.reply({
          content: '❌ Você já possui este item.',
          ephemeral: true
        });
      }

      const preco = item.preco || 0;
      const saldo = user.xpDisponivel || 0;

      // ✅ XP INSUFICIENTE
      if (saldo < preco) {
        return interaction.reply({
          content: `❌ XP insuficiente (necessário: ${preco} XP)`,
          ephemeral: true
        });
      }

      // ✅ CONFIRMA COMPRA
      lista.push(itemId);
      user.xpDisponivel -= preco;
      await user.save();

      return interaction.reply({
        content: `✔ Comprou **${item.nome}** por ${preco} XP!`,
        ephemeral: true
      });
    }
  });

  // ⏳ FIM DO TEMPO — DESATIVA BOTÕES
  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
}
