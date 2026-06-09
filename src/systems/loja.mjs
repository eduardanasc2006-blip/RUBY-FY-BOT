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

/* =========================
   DB
========================= */

const db = getDB();

/* =========================
   ITENS
========================= */

const ITENS = [
  { id: 'moldura_ouro', nome: '🖼️ Moldura Dourada', tipo: 'moldura', preco: 500, desc: 'Moldura dourada para o perfil.' },
  { id: 'moldura_neon', nome: '🔮 Moldura Neon', tipo: 'moldura', preco: 800, desc: 'Moldura neon colorida.' },
  { id: 'moldura_foguete', nome: '🚀 Moldura Galáxia', tipo: 'moldura', preco: 1200, desc: 'Moldura espacial premium.' },

  { id: 'badge_estrela', nome: '⭐ Badge Estrela', tipo: 'badge', preco: 300, desc: 'Badge de estrela.' },
  { id: 'badge_fogo', nome: '🔥 Badge Chama', tipo: 'badge', preco: 400, desc: 'Badge de chama.' },
  { id: 'badge_coroa', nome: '👑 Badge Realeza', tipo: 'badge', preco: 700, desc: 'Badge realeza.' },

  { id: 'efeito_confete', nome: '🎊 Efeito Confete', tipo: 'efeito', preco: 600, desc: 'Confetes no perfil.' },
  { id: 'efeito_aurora', nome: '🌌 Efeito Aurora', tipo: 'efeito', preco: 900, desc: 'Aurora boreal.' },

  { id: 'xp_boost_mini', nome: '⚡ XP Boost Mini', tipo: 'consumivel', preco: 200, desc: '+50 XP' },
  { id: 'xp_boost_max', nome: '🚀 XP Boost Max', tipo: 'consumivel', preco: 500, desc: '+150 XP' },
];

const ITENS_POR_PAGINA = 5;

/* =========================
   PREVIEW
========================= */

async function renderPreviewPerfil(userId, item) {
  const canvas = createCanvas(700, 350);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, 700, 350);

  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(20, 20, 660, 310);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Sans';
  ctx.fillText('Preview do Perfil', 200, 80);

  ctx.fillStyle = '#00a2ff';
  ctx.font = '18px Sans';
  ctx.fillText(item.nome, 200, 120);

  ctx.fillStyle = '#aaa';
  ctx.fillText(item.desc, 200, 150);

  ctx.fillStyle = '#00ff88';
  ctx.fillText(`${item.preco} XP`, 200, 190);

  if (item.tipo === 'moldura') {
    try {
      const frame = await loadImage(`assets/frames/${item.id}.png`);
      ctx.drawImage(frame, 0, 0, 700, 350);
    } catch {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, 650, 300);
    }
  }

  if (item.tipo === 'badge') {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px Sans';
    ctx.fillText(`🏅 ${item.nome}`, 200, 230);
  }

  if (item.tipo === 'efeito') {
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(Math.random() * 700, Math.random() * 350, 2, 2);
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   EMBED
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
      name: '🔎 Preview',
      value: `**${itemAtual.nome}**\n${itemAtual.desc}\n💰 ${itemAtual.preco} XP`,
    })
    .setFooter({ text: `Página ${page + 1} | Item ${index + 1}/${ITENS.length}` });
}

/* =========================
   BOTÕES
========================= */

function _buildNavRow(userId, index) {
  return new ActionRowBuilder().addComponents(
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
      components: [_buildNavRow(msg.author.id, 0)],
    });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [type, userId, value] = interaction.customId.split(':');

    if (interaction.user.id !== userId)
      return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });

    let index = parseInt(value);

    if (type === 'shop_next') index = Math.min(ITENS.length - 1, index + 1);
    if (type === 'shop_prev') index = Math.max(0, index - 1);

    const item = ITENS[index];
    const buffer = await renderPreviewPerfil(userId, item);

    /* =========================
       COMPRA (SQLITE FIX)
    ========================= */

    if (type === 'shop_buy') {
      const ok = await gastarXP(userId, interaction.guild.id, item.preco, `shop_${item.id}`);

      if (!ok)
        return interaction.reply({ content: '❌ XP insuficiente.', flags: 64 });

      const user = db.prepare(`
        SELECT * FROM usuarios WHERE userId = ? AND guildId = ?
      `).get(userId, interaction.guild.id);

      if (item.tipo === 'moldura') {
        db.prepare(`
          UPDATE usuarios
          SET moldura = ?
          WHERE userId = ? AND guildId = ?
        `).run(item.id, userId, interaction.guild.id);
      }

      if (item.tipo === 'badge') {
        const badges = user?.badges ? JSON.parse(user.badges) : [];
        badges.push(item.id);

        db.prepare(`
          UPDATE usuarios
          SET badges = ?
          WHERE userId = ? AND guildId = ?
        `).run(JSON.stringify(badges), userId, interaction.guild.id);
      }

      if (item.tipo === 'efeito') {
        const efeitos = user?.efeitos ? JSON.parse(user.efeitos) : [];
        efeitos.push(item.id);

        db.prepare(`
          UPDATE usuarios
          SET efeitos = ?
          WHERE userId = ? AND guildId = ?
        `).run(JSON.stringify(efeitos), userId, interaction.guild.id);
      }

      return interaction.update({
        content: `✅ Comprou **${item.nome}**`,
        files: [],
        components: [],
      });
    }

    return interaction.update({
      embeds: [embedLoja(0, index)],
      files: [new AttachmentBuilder(buffer, { name: 'preview.png' })],
      components: [_buildNavRow(userId, index)],
    });
  });
}

export const comandos = [
  { cmd: '!loja', desc: 'Loja com preview real do perfil.' },
];
