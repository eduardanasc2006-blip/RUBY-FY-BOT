import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';

import Usuario from '../db/models/Usuario.mjs';
import {
  molduras,
  efeitos,
  fundos,
  badges
} from './perfilConfig.mjs';

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
  const catalogo = getCatalogo(aba);
  const entradas = Object.entries(catalogo);
  const start = pagina * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  return entradas.slice(start, end);
}

// 🔹 Embed da loja (sem imagem)
function gerarLoja(aba, pagina = 0) {
  const catalogo = getCatalogo(aba);
  const entradas = Object.entries(catalogo);
  const totalPaginas = Math.ceil(entradas.length / ITEMS_POR_PAGINA);

  return new EmbedBuilder()
    .setTitle(`🏪 Loja - ${abas[aba]} (Página ${pagina + 1}/${totalPaginas})`)
    .setColor('#00d4ff')
    .setDescription(
      getItensPaginados(aba, pagina).map(([id, item]) => {
        const preco = item.preco ?? '—';
        const raridade = item.raridade ? ` | ${item.raridade}` : '';
        return `**${item.nome}** (\`${id}\`)${raridade}\n💰 ${preco} XP`;
      }).join('\n\n')
    );
}

// 🔹 Botões dos itens: múltiplas linhas (respeita limite do Discord)
function gerarBotoesItens(aba, pagina = 0) {
  const itens = getItensPaginados(aba, pagina);
  const linhas = [];

  itens.forEach(([id, item]) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`preview_${aba}_${id}`)
        .setLabel('👁️ Ver item')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`buy_${aba}_${id}`)
        .setLabel('🛒 Comprar')
        .setStyle(ButtonStyle.Primary)
    );
    linhas.push(row);
  });

  return linhas;
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
  const catalogo = getCatalogo(aba);
  const entradas = Object.entries(catalogo);
  const maxPaginas = Math.ceil(entradas.length / ITEMS_POR_PAGINA);

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

// 🖼️ GERAR IMAGEM DE PRÉVIA COM CANVAS
// ✅ Fonte alterada para Sans-serif → funciona em qualquer servidor
async function gerarPreviewItem(item) {
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext('2d');

  // Fundo escuro
  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borda azul
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Nome do item (limitado a 25 caracteres) + fonte segura
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans-serif';
  ctx.fillText(item.nome.slice(0, 25), 30, 60);

  // Preço
  ctx.font = '20px Sans-serif';
  ctx.fillText(`Preço: ${item.preco ?? '—'} XP`, 30, 110);

  // Raridade
  ctx.fillText(`Raridade: ${item.raridade ?? 'Comum'}`, 30, 150);

  return canvas.toBuffer('image/png');
}

export async function lojaCommand(message) {
  const ownerId = message.author.id;
  let abaAtual = 'molduras';
  let paginaAtual = 0;

  const msg = await message.channel.send({
    embeds: [gerarLoja(abaAtual, paginaAtual)],
    components: [
      gerarBotoesAbas(),
      ...gerarBotoesItens(abaAtual, paginaAtual),
      gerarBotoesNav(abaAtual, paginaAtual)
    ]
  });

  const collector = msg.createMessageComponentCollector({
    time: 10 * 60 * 1000
  });

  collector.on('collect', async (interaction) => {
    // ✅ PROTEÇÃO TOTAL: só o dono pode interagir → evita spam, bots e cliques duplicados
    if (interaction.user.id !== ownerId) return;

    // 🔁 TROCAR ABA — ✅ SEGURO
    if (
      interaction.customId === 'loja_molduras' ||
      interaction.customId === 'loja_efeitos' ||
      interaction.customId === 'loja_fundos' ||
      interaction.customId === 'loja_badges'
    ) {
      const aba = interaction.customId.split('_')[1];
      abaAtual = aba;
      paginaAtual = 0;

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          ...gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // ⏭️ PRÓXIMA PÁGINA
    if (interaction.customId.startsWith('loja_next_')) {
      const parts = interaction.customId.split('_');
      const aba = parts[2];
      const pagina = parts[3];

      abaAtual = aba;
      paginaAtual = Number(pagina) + 1;

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          ...gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // ⏮️ PÁGINA ANTERIOR
    if (interaction.customId.startsWith('loja_prev_')) {
      const parts = interaction.customId.split('_');
      const aba = parts[2];
      const pagina = parts[3];

      abaAtual = aba;
      paginaAtual = Math.max(0, Number(pagina) - 1);

      return interaction.update({
        embeds: [gerarLoja(abaAtual, paginaAtual)],
        components: [
          gerarBotoesAbas(),
          ...gerarBotoesItens(abaAtual, paginaAtual),
          gerarBotoesNav(abaAtual, paginaAtual)
        ]
      });
    }

    // 👁️ PRÉVIA DO ITEM (CANVAS)
    if (interaction.customId.startsWith('preview_')) {
      const parts = interaction.customId.split('_');
      const aba = parts[1];
      const itemId = parts.slice(2).join('_');

      const catalogo = getCatalogo(aba);
      const item = catalogo[itemId];

      if (!item) {
        return interaction.reply({
          content: '❌ Item inválido.',
          ephemeral: true
        });
      }

      const imagem = await gerarPreviewItem(item);

      return interaction.reply({
        files: [{
          attachment: imagem,
          name: 'preview.png'
        }],
        ephemeral: true
      });
    }

    // 🛒 COMPRAR ITEM
    if (interaction.customId.startsWith('buy_')) {
      const parts = interaction.customId.split('_');
      const aba = parts[1];
      const itemId = parts.slice(2).join('_');

      const catalogo = getCatalogo(aba);
      const item = catalogo[itemId];

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

      if (!user) {
        return interaction.reply({
          content: '❌ Usuário não encontrado na base de dados.',
          ephemeral: true
        });
      }

      // ✅ GARANTE INVENTÁRIO SEMPRE
      user.inventario = user.inventario || {};
      const tipo = aba;
      user.inventario[tipo] = user.inventario[tipo] || [];

      const lista = user.inventario[tipo];

      if (lista.includes(itemId)) {
        return interaction.reply({
          content: '❌ Você já possui este item.',
          ephemeral: true
        });
      }

      const preco = item.preco || 0;
      const saldo = user.xpDisponivel || 0;

      if (saldo < preco) {
        return interaction.reply({
          content: `❌ XP insuficiente (necessário: ${preco} XP)`,
          ephemeral: true
        });
      }

      lista.push(itemId);
      user.xpDisponivel -= preco;
      await user.save();

      return interaction.reply({
        content: `✔ Comprou **${item.nome}** por ${preco} XP!`,
        ephemeral: true
      });
    }
  });

  // ⏳ FIM DO TEMPO
  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
}
