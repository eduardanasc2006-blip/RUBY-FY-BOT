import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';

import { gastarXP } from './xpSystem.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getDB } from '../db/sqlite.mjs';

const db = getDB();

/* =========================
   ITENS (ATUALIZADO COM SEUS ARQUIVOS)
========================= */

const ITENS = [
  { id: 'moldura_ouro', nome: '🖼️ Moldura Dourada', tipo: 'moldura', preco: 500, desc: 'Moldura dourada brilhante.' },
  { id: 'moldura_neon', nome: '🔮 Moldura Neon', tipo: 'moldura', preco: 800, desc: 'Moldura colorida neon.' },
  { id: 'moldura_galaxia', nome: '🚀 Moldura Galáxia', tipo: 'moldura', preco: 1200, desc: 'Moldura espacial premium.' },
  { id: 'moldura_gelo', nome: '❄️ Moldura de Gelo', tipo: 'moldura', preco: 1500, desc: 'Moldura de cristal gelado.' },
  { id: 'moldura_sombrio', nome: '🌑 Moldura Sombria', tipo: 'moldura', preco: 1800, desc: 'Moldura de magia antiga.' },

  { id: 'badge_estrela', nome: '⭐ Badge Estrela', tipo: 'badge', preco: 300, desc: 'Badge de conquista.' },
  { id: 'badge_fogo', nome: '🔥 Badge Chama', tipo: 'badge', preco: 400, desc: 'Badge de bravura.' },
  { id: 'badge_coroa', nome: '👑 Badge Realeza', tipo: 'badge', preco: 700, desc: 'Badge exclusivo.' },

  { id: 'efeito_confete', nome: '🎊 Efeito Confete', tipo: 'efeito', preco: 600, desc: 'Confetes leves no perfil.' },
  { id: 'efeito_aurora', nome: '🌌 Efeito Aurora', tipo: 'efeito', preco: 900, desc: 'Luzes boreais mágicas.' },
];

/* =========================
   PREVIEW COMPATÍVEL COM !meuperfil
========================= */

async function renderPreviewPerfil(userId, item) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // fundo igual ao perfil
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#11141b';
  ctx.fillRect(20, 20, 760, 380);

  /* =========================
     TEXTO
  ========================= */
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Preview do Perfil', 220, 90);

  ctx.fillStyle = '#00a2ff';
  ctx.font = '20px Arial';
  ctx.fillText(item.nome, 220, 140);

  ctx.fillStyle = '#aaa';
  ctx.fillText(item.desc, 220, 170);

  ctx.fillStyle = '#00ff88';
  ctx.fillText(`${item.preco} XP`, 220, 210);

  /* =========================
     MOLDURA
  ========================= */
  if (item.tipo === 'moldura') {
    try {
      const frame = await loadImage(`assets/frames/${item.id}.png`);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, 750, 370);
    }
  }

  /* =========================
     BADGE (IMAGEM NA PREVIEW)
  ========================= */
  if (item.tipo === 'badge') {
    try {
      const badgeImg = await loadImage(`assets/badges/${item.id}.png`);
      ctx.drawImage(badgeImg, 220, 220, 40, 40);
      ctx.fillStyle = '#ffd700';
      ctx.font = '20px Arial';
      ctx.fillText(`🏅 Adicionado ao perfil`, 270, 250);
    } catch (err) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '20px Arial';
      ctx.fillText(`🏅 Será exibido no !meuperfil`, 220, 250);
    }
  }

  /* =========================
     EFEITO (IMAGEM REAL NA PREVIEW)
  ========================= */
  if (item.tipo === 'efeito') {
    try {
      const efeitoImg = await loadImage(`assets/frames/${item.id}.png`);
      ctx.globalAlpha = 0.8; // leve transparência para ver texto
      ctx.drawImage(efeitoImg, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } catch (err) {
      // fallback caso não ache
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(Math.random() * 800, Math.random() * 420, 2, 2);
      }
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   EMBED
========================= */

function embedLoja(page = 0, index = 0) {
  const perPage = 5;
  const start = page * perPage;
  const itens = ITENS.slice(start, start + perPage);
  const itemAtual = ITENS[index];

  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      itens.map(i => `🛒 **${i.nome}** — ${i.preco} XP`).join('\n\n')
    )
    .addFields({
      name: '🔎 Preview',
      value: itemAtual
        ? `**${itemAtual.nome}**\n${itemAtual.desc}\n💰 ${itemAtual.preco} XP`
        : 'Nenhum item',
    })
    .setFooter({
      text: `Item ${index + 1}/${ITENS.length} | Página ${page + 1}`,
    });
}

/* =========================
   BOTÕES
========================= */

function buildRow(userId, index, page = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_prev:${userId}:${index}:${page}`)
      .setLabel('⬅')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index <= 0),

    new ButtonBuilder()
      .setCustomId(`shop_next:${userId}:${index}:${page}`)
      .setLabel('➡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index >= ITENS.length - 1),

    new ButtonBuilder()
      .setCustomId(`shop_buy:${userId}:${index}:${page}`)
      .setLabel('Comprar')
      .setStyle(ButtonStyle.Success),
  );
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  if (client.__lojaRegistrado) return;
  client.__lojaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;
    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/)[0];
    if (cmd !== 'loja') return;

    const buffer = await renderPreviewPerfil(msg.author.id, ITENS[0]);
    return msg.reply({
      embeds: [embedLoja(0, 0)],
      files: [new AttachmentBuilder(buffer, { name: 'preview.png' })],
      components: [buildRow(msg.author.id, 0, 0)],
    });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [type, userId, value, pageStr] = interaction.customId.split(':');
    const page = parseInt(pageStr) || 0;

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Não é seu menu.',
        flags: 64,
      });
    }

    let index = parseInt(value);

    if (type === 'shop_next') index = Math.min(ITENS.length - 1, index + 1);
    if (type === 'shop_prev') index = Math.max(0, index - 1);

    const item = ITENS[index];
    const buffer = await renderPreviewPerfil(userId, item);

    /* =========================
       COMPRA
    ========================= */
    if (type === 'shop_buy') {
      const ok = await gastarXP(
        userId,
        interaction.guild.id,
        item.preco,
        `shop_${item.id}`
      );

      if (!ok) {
        return interaction.reply({
          content: '❌ XP insuficiente.',
          flags: 64,
        });
      }

      const user = db
        .prepare(`SELECT * FROM usuarios WHERE userId = ? AND guildId = ?`)
        .get(userId, interaction.guild.id);

      if (item.tipo === 'moldura') {
        db.prepare(`UPDATE usuarios SET moldura = ? WHERE userId = ? AND guildId = ?`)
          .run(item.id, userId, interaction.guild.id);
      }

      if (item.tipo === 'badge') {
        const badges = user?.badges ? JSON.parse(user.badges) : [];
        if (!badges.includes(item.id)) { // evitar duplicata
          badges.push(item.id);
          db.prepare(`UPDATE usuarios SET badges = ? WHERE userId = ? AND guildId = ?`)
            .run(JSON.stringify(badges), userId, interaction.guild.id);
        }
      }

      if (item.tipo === 'efeito') {
        const efeitos = user?.efeitos ? JSON.parse(user.efeitos) : [];
        if (!efeitos.includes(item.id)) { // evitar duplicata
          efeitos.push(item.id);
          db.prepare(`UPDATE usuarios SET efeitos = ? WHERE userId = ? AND guildId = ?`)
            .run(JSON.stringify(efeitos), userId, interaction.guild.id);
        }
      }

      return interaction.update({
        content: `✅ Comprou **${item.nome}** com sucesso!`,
        embeds: [],
        files: [],
        components: [],
      });
    }

    return interaction.update({
      embeds: [embedLoja(page, index)],
      files: [new AttachmentBuilder(buffer, { name: 'preview.png' })],
      components: [buildRow(userId, index, page)],
    });
  });
}

export const comandos = [
  { cmd: '!loja', desc: 'Loja de molduras, badges e efeitos para perfil.' },
];
