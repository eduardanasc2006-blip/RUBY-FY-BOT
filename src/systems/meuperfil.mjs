import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import { gastarXP, ganharXP } from './xpSystem.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/* =========================
   ITENS
========================= */

const ITENS = [
  { id: 'moldura_ouro',    nome: '🖼️ Moldura Dourada',  tipo: 'moldura',    preco: 500,  desc: 'Moldura dourada para o perfil.' },
  { id: 'moldura_neon',    nome: '🔮 Moldura Neon',      tipo: 'moldura',    preco: 800,  desc: 'Moldura com efeito neon colorido.' },
  { id: 'moldura_foguete', nome: '🚀 Moldura Galáxia',   tipo: 'moldura',    preco: 1200, desc: 'Moldura espacial premium.' },

  { id: 'badge_estrela',   nome: '⭐ Badge Estrela',     tipo: 'badge',      preco: 300,  desc: 'Badge de estrela para o perfil.' },
  { id: 'badge_fogo',      nome: '🔥 Badge Chama',       tipo: 'badge',      preco: 400,  desc: 'Badge de chama ardente.' },
  { id: 'badge_coroa',     nome: '👑 Badge Realeza',     tipo: 'badge',      preco: 700,  desc: 'Badge exclusivo de realeza.' },
  { id: 'badge_diamante',  nome: '💎 Badge Diamante',    tipo: 'badge',      preco: 1000, desc: 'Badge raro de diamante.' },

  { id: 'efeito_confete',  nome: '🎊 Efeito Confete',    tipo: 'efeito',     preco: 600,  desc: 'Confetes no perfil.' },
  { id: 'efeito_aurora',   nome: '🌌 Efeito Aurora',     tipo: 'efeito',     preco: 900,  desc: 'Aurora boreal no perfil.' },

  { id: 'xp_boost_mini',   nome: '⚡ XP Boost Mini',     tipo: 'consumivel', preco: 200,  desc: '+50 XP instantâneos.' },
  { id: 'xp_boost_max',    nome: '🚀 XP Boost Max',      tipo: 'consumivel', preco: 500,  desc: '+150 XP instantâneos.' },
];

const AVATAR_PADRAO = 'https://cdn.discordapp.com/embed/avatars/0.png';

/* =========================
   PREVIEW ITEM
========================= */

async function renderItem(item) {
  const canvas = createCanvas(700, 350);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(30, 30, 640, 290);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(item.nome, 60, 90);

  ctx.fillStyle = '#9aa4b2';
  ctx.font = '18px Sans';
  ctx.fillText(`Tipo: ${item.tipo}`, 60, 140);

  ctx.fillStyle = '#00ff88';
  ctx.font = '22px Sans';
  ctx.fillText(`${item.preco} XP`, 60, 190);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px Sans';
  ctx.fillText(item.desc, 60, 240);

  return canvas.toBuffer('image/png');
}

/* =========================
   PERFIL (FIX DEFINITIVO MOLDURA)
========================= */

async function renderPerfil(user, data) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // FUNDO
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // AVATAR
  let avatarImg = null;

  try {
    avatarImg = await loadImage(data.avatar || AVATAR_PADRAO);
  } catch {}

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, 40, 40, 160, 160);
    ctx.restore();
  }

  // TEXTO
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Sans';
  ctx.fillText(data.nome || 'Usuário', 230, 100);

  ctx.font = '20px Sans';
  ctx.fillStyle = '#00ff88';
  ctx.fillText(`XP: ${data.xp || 0}`, 230, 150);

  // BORDA BASE (NÃO CONFLITA COM MOLDURA)
  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // 🔥 MOLDURA SEMPRE ÚLTIMA CAMADA
  if (data.moldura) {
    try {
      const frame = await loadImage(
        `assets/frames/${data.moldura}.png`
      );

      // GARANTE OVERLAY TOTAL
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    } catch (err) {
      console.warn('[perfil] moldura não encontrada:', data.moldura);
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   LOJA
========================= */

function embedLoja(page = 0) {
  const perPage = 5;
  const start = page * perPage;
  const itens = ITENS.slice(start, start + perPage);

  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      itens.map(i =>
        `🛒 **${i.nome}** — ${i.preco} XP\n\`${i.id}\``
      ).join('\n\n')
    )
    .setFooter({ text: `Página ${page + 1}` });
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'loja') return;

    try {
      const page = Math.max(0, (parseInt(args[0]) || 1) - 1);
      const itens = ITENS.slice(page * 5, page * 5 + 5);

      const user = await Usuario.findOne({
        userId: msg.author.id,
        guildId: msg.guild.id
      });

      const row = new ActionRowBuilder().addComponents(
        itens.map(item =>
          new ButtonBuilder()
            .setCustomId(`shop_item:${msg.author.id}:${item.id}`)
            .setLabel(item.nome.slice(0, 20))
            .setStyle(ButtonStyle.Primary)
        )
      );

      const embed = embedLoja(page).addFields({
        name: '💰 Seu saldo',
        value: `${user?.xpDisponivel || 0} XP`,
      });

      return msg.reply({ embeds: [embed], components: [row] });

    } catch (err) {
      console.error('[loja] erro:', err);
      return msg.reply('❌ Erro ao carregar loja.');
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const id = interaction.customId;
    if (!id.startsWith('shop_item:')) return;

    const [, userId, itemId] = id.split(':');

    if (interaction.user.id !== userId)
      return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });

    const item = ITENS.find(i => i.id === itemId);
    if (!item)
      return interaction.reply({ content: 'Item não encontrado.', flags: 64 });

    try {
      await interaction.deferReply({ flags: 64 });

      const buffer = await renderItem(item);

      const file = new AttachmentBuilder(buffer, {
        name: 'item.png'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_buy:${userId}:${item.id}`)
          .setLabel(`Comprar (${item.preco} XP)`)
          .setStyle(ButtonStyle.Success)
      );

      return interaction.editReply({
        files: [file],
        components: [row]
      });

    } catch (err) {
      console.error('[preview] erro:', err);
      return interaction.editReply('❌ erro preview');
    }
  });
}

export const comandos = [
  { cmd: '!loja', desc: 'Loja de cosméticos do perfil.' },
];
