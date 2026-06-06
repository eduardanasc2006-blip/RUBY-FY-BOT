import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import { gastarXP } from './xpSystem.mjs';
import { createCanvas } from '@napi-rs/canvas';

/* =========================
   ITENS
========================= */

const ITENS = [
  { id: 'moldura_ouro', nome: '🖼️ Moldura Dourada', tipo: 'moldura', preco: 500, desc: 'Moldura dourada para o perfil.' },
  { id: 'moldura_neon', nome: '🔮 Moldura Neon', tipo: 'moldura', preco: 800, desc: 'Moldura com efeito neon colorido.' },
  { id: 'moldura_foguete', nome: '🚀 Moldura Galáxia', tipo: 'moldura', preco: 1200, desc: 'Moldura espacial premium.' },

  { id: 'badge_estrela', nome: '⭐ Badge Estrela', tipo: 'badge', preco: 300, desc: 'Badge de estrela para o perfil.' },
  { id: 'badge_fogo', nome: '🔥 Badge Chama', tipo: 'badge', preco: 400, desc: 'Badge de chama ardente.' },
  { id: 'badge_coroa', nome: '👑 Badge Realeza', tipo: 'badge', preco: 700, desc: 'Badge exclusivo de realeza.' },
  { id: 'badge_diamante', nome: '💎 Badge Diamante', tipo: 'badge', preco: 1000, desc: 'Badge raro de diamante.' },

  { id: 'efeito_confete', nome: '🎊 Efeito Confete', tipo: 'efeito', preco: 600, desc: 'Confetes no perfil.' },
  { id: 'efeito_aurora', nome: '🌌 Efeito Aurora', tipo: 'efeito', preco: 900, desc: 'Aurora boreal no perfil.' },

  { id: 'xp_boost_mini', nome: '⚡ XP Boost Mini', tipo: 'consumivel', preco: 200, desc: '+50 XP instantâneos.' },
  { id: 'xp_boost_max', nome: '🚀 XP Boost Max', tipo: 'consumivel', preco: 500, desc: '+150 XP instantâneos.' },
];

const ITENS_POR_PAGINA = 5;

/* =========================
   PREVIEW PERFIL
========================= */

async function renderPreviewPerfil(userId, item) {
  const canvas = createCanvas(700, 350);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, 700, 350);

  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(20, 20, 660, 310);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(`Usuário ${userId}`, 60, 80);

  // HEADER ITEM (NOVO)
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#00a2ff';
  ctx.fillText(`Preview: ${item.nome}`, 60, 120);

  ctx.font = '16px Sans';
  ctx.fillStyle = '#aaa';
  ctx.fillText(item.desc, 60, 150);

  ctx.fillStyle = '#00ff88';
  ctx.fillText(`${item.preco} XP`, 60, 180);

  // efeitos visuais simples por tipo
  if (item.tipo === 'moldura') {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 640, 290);
  }

  if (item.tipo === 'efeito') {
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(Math.random() * 700, Math.random() * 350, 3, 3);
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   LOJA EMBED
========================= */

function embedLoja(page = 0, index = 0) {
  const start = page * ITENS_POR_PAGINA;
  const itens = ITENS.slice(start, start + ITENS_POR_PAGINA);

  const itemAtual = ITENS[index];

  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      itens.map(i => `🛒 **${i.nome}** — ${i.preco} XP`).join('\n\n')
    )
    .addFields({
      name: '🔎 Item selecionado',
      value: `**${itemAtual.nome}**\n${itemAtual.desc}\n💰 ${itemAtual.preco} XP`
    })
    .setFooter({ text: `Página ${page + 1} | Item ${index + 1}/${ITENS.length}` });
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'loja') return;

    const index = 0;
    const page = 0;

    const itens = ITENS.slice(0, ITENS_POR_PAGINA);
    const itemAtual = ITENS[index];

    const buffer = await renderPreviewPerfil(msg.author.id, itemAtual);
    const file = new AttachmentBuilder(buffer, { name: 'preview.png' });

    const rowItens = new ActionRowBuilder().addComponents(
      itens.map((item, i) =>
        new ButtonBuilder()
          .setCustomId(`shop_select:${msg.author.id}:${i}`)
          .setLabel(item.nome.slice(0, 12))
          .setStyle(ButtonStyle.Primary)
      )
    );

    const rowNav = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_prev:${msg.author.id}:${index}`)
        .setLabel('⬅')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index <= 0),

      new ButtonBuilder()
        .setCustomId(`shop_next:${msg.author.id}:${index}`)
        .setLabel('➡')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index >= ITENS.length - 1),

      new ButtonBuilder()
        .setCustomId(`shop_buy:${msg.author.id}:${index}`)
        .setLabel('Comprar')
        .setStyle(ButtonStyle.Success),
    );

    return msg.reply({
      embeds: [embedLoja(page, index)],
      files: [file],
      components: [rowItens, rowNav],
    });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [type, userId, value] = interaction.customId.split(':');

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Não é seu menu.', ephemeral: true });
    }

    let index = parseInt(value);

    /* =========================
       SELEÇÃO
    ========================= */

    if (type === 'shop_select') {
      const item = ITENS[index];

      const buffer = await renderPreviewPerfil(userId, item);
      const file = new AttachmentBuilder(buffer, { name: 'preview.png' });

      const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_prev:${userId}:${index}`)
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index <= 0),

        new ButtonBuilder()
          .setCustomId(`shop_next:${userId}:${index}`)
          .setLabel('➡')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index >= ITENS.length - 1),

        new ButtonBuilder()
          .setCustomId(`shop_buy:${userId}:${index}`)
          .setLabel('Comprar')
          .setStyle(ButtonStyle.Success),
      );

      return interaction.update({
        embeds: [embedLoja(0, index)],
        files: [file],
        components: [rowNav],
      });
    }

    /* =========================
       PRÓXIMO ITEM
    ========================= */

    if (type === 'shop_next') {
      index = Math.min(ITENS.length - 1, index + 1);
    }

    /* =========================
       ITEM ANTERIOR
    ========================= */

    if (type === 'shop_prev') {
      index = Math.max(0, index - 1);
    }

    if (type === 'shop_prev' || type === 'shop_next') {
      const item = ITENS[index];

      const buffer = await renderPreviewPerfil(userId, item);
      const file = new AttachmentBuilder(buffer, { name: 'preview.png' });

      const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_prev:${userId}:${index}`)
          .setLabel('⬅')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index <= 0),

        new ButtonBuilder()
          .setCustomId(`shop_next:${userId}:${index}`)
          .setLabel('➡')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index >= ITENS.length - 1),

        new ButtonBuilder()
          .setCustomId(`shop_buy:${userId}:${index}`)
          .setLabel('Comprar')
          .setStyle(ButtonStyle.Success),
      );

      return interaction.update({
        embeds: [embedLoja(0, index)],
        files: [file],
        components: [rowNav],
      });
    }

    /* =========================
       COMPRA
    ========================= */

    if (type === 'shop_buy') {
      const item = ITENS[index];

      const ok = await gastarXP(userId, interaction.guild.id, item.preco, `shop_${item.id}`);

      if (!ok) {
        return interaction.reply({ content: '❌ XP insuficiente.', ephemeral: true });
      }

      return interaction.update({
        content: `✅ Comprado: **${item.nome}**`,
        components: [],
        files: [],
      });
    }
  });
    }

  export const comandos = [
    { cmd: '!loja', desc: 'Abre a loja de itens cosméticos do perfil.' },
  ];
