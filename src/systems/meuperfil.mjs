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
  { id: 'xp_boost_mini',  nome: '⚡ XP Boost Mini',     tipo: 'consumivel', preco: 200,  desc: '+50 XP instantâneos.' },
  { id: 'xp_boost_max',   nome: '🚀 XP Boost Max',      tipo: 'consumivel', preco: 500,  desc: '+150 XP instantâneos.' },
];

// URL de avatar padrão usada quando loadImage falha
const AVATAR_PADRAO = 'https://cdn.discordapp.com/embed/avatars/0.png';

/* =========================
   PREVIEW ITEM
========================= */

async function renderItem(item) {
  const canvas = createCanvas(700, 350);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(30, 30, 640, 290);

  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 28px Sans';
  ctx.fillText(item.nome, 60, 90);

  ctx.fillStyle = '#9aa4b2';
  ctx.font      = '18px Sans';
  ctx.fillText('Tipo: ' + item.tipo, 60, 140);

  ctx.fillStyle = '#00ff88';
  ctx.font      = '22px Sans';
  ctx.fillText(item.preco + ' XP', 60, 190);

  ctx.fillStyle = '#cbd5e1';
  ctx.font      = '16px Sans';
  ctx.fillText(item.desc, 60, 240);

  return canvas.toBuffer('image/png');
}

/* =========================
   PERFIL EM IMAGEM
   FIX: loadImage envolto em try/catch com fallback de avatar padrão
========================= */

async function renderPerfil(user, data) {
  const canvas = createCanvas(800, 420);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // FIX: avatar com fallback — nunca deixa crashar o comando
  let avatarImg = null;
  try {
    if (data.avatar) {
      avatarImg = await loadImage(data.avatar);
    }
  } catch (e) {
    console.warn('[meuperfil] avatar falhou, usando padrão:', e.message);
    try {
      avatarImg = await loadImage(AVATAR_PADRAO);
    } catch {
      avatarImg = null;
    }
  }

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, 40, 40, 160, 160);
    ctx.restore();
  } else {
    // Círculo de placeholder se avatar não carregar
    ctx.fillStyle = '#2c2f3a';
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 30px Sans';
  ctx.fillText(data.nome, 230, 100);

  ctx.font      = '20px Sans';
  ctx.fillStyle = '#00ff88';
  ctx.fillText('XP: ' + data.xp, 230, 150);

  ctx.fillStyle = '#ff69b4';
  ctx.fillText('💍 Relacionamento: ' + (data.casamentoLevel || 0), 230, 190);

  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth   = 6;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

  return canvas.toBuffer('image/png');
}

/* =========================
   LOJA
========================= */

function embedLoja(page = 0) {
  const porPagina = 5;
  const start = page * porPagina;
  const itens = ITENS.slice(start, start + porPagina);
  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      itens.map(i => '🛒 **' + i.nome + '** — ' + i.preco + ' XP\n`' + i.id + '`').join('\n\n')
    )
    .setFooter({ text: 'Página ' + (page + 1) });
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  console.log('[SHOP] carregado');

  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args    = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd     = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'loja') return;

    try {
      const page = Math.max(0, (parseInt(args[0]) || 1) - 1);
      const itens = ITENS.slice(page * 5, page * 5 + 5);
      const user  = await Usuario.findOne({ userId: msg.author.id, guildId });

      const row = new ActionRowBuilder().addComponents(
        itens.map(item =>
          new ButtonBuilder()
            .setCustomId('shop_item:' + msg.author.id + ':' + item.id)
            .setLabel(item.nome.slice(0, 20))
            .setStyle(ButtonStyle.Primary)
        )
      );

      const embed = embedLoja(page).addFields({
        name:  '💰 Seu saldo',
        value: (user?.xpDisponivel || 0) + ' XP',
      });

      return msg.reply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('[meuperfil] !loja erro:', err);
      return msg.reply({ content: '❌ Erro ao carregar a loja. Tente novamente.' });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const id = interaction.customId;

    // Preview item
    if (id.startsWith('shop_item:')) {
      const [, userId, itemId] = id.split(':');
      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });

      const item = ITENS.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: 'Item não encontrado.', flags: 64 });

      try {
        // FIX: deferReply antes de operação pesada (canvas)
        await interaction.deferReply({ flags: 64 });

        const buffer = await renderItem(item);
        const file   = new AttachmentBuilder(buffer, { name: 'item.png' });
        const row    = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('shop_buy:' + userId + ':' + item.id)
            .setLabel('Comprar (' + item.preco + ' XP)')
            .setStyle(ButtonStyle.Success)
        );

        return interaction.editReply({ files: [file], components: [row] });
      } catch (err) {
        console.error('[meuperfil] shop_item erro:', err);
        return interaction.editReply({ content: '❌ Erro ao gerar preview.' }).catch(() => {});
      }
    }

    // Compra
    if (id.startsWith('shop_buy:')) {
      const [, userId, itemId] = id.split(':');
      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Não é seu menu.', flags: 64 });

      const item = ITENS.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: 'Item inválido.', flags: 64 });

      try {
        await interaction.deferReply({ flags: 64 });

        const ok = await gastarXP(userId, interaction.guild.id, item.preco, 'shop_' + item.id);
        if (!ok) return interaction.editReply({ content: '❌ XP insuficiente.' });

        const filter = { userId, guildId: interaction.guild.id };
        if (item.tipo === 'badge')
          await Usuario.findOneAndUpdate(filter, { $push: { badges: item.id } }, { upsert: true });
        if (item.tipo === 'efeito')
          await Usuario.findOneAndUpdate(filter, { $push: { efeitos: item.id } }, { upsert: true });
        if (item.tipo === 'moldura')
          await Usuario.findOneAndUpdate(filter, { $set: { moldura: item.id } }, { upsert: true });
        if (item.tipo === 'consumivel')
          await ganharXP(userId, interaction.guild.id, item.id === 'xp_boost_max' ? 150 : 50, 'shop_boost');

        return interaction.editReply({ content: '✅ Comprou **' + item.nome + '**!' });
      } catch (err) {
        console.error('[meuperfil] shop_buy erro:', err);
        return interaction.editReply({ content: '❌ Erro ao processar compra.' }).catch(() => {});
      }
    }
  });
}

export const comandos = [
  { cmd: '!loja', desc: 'Abre a loja de itens e cosméticos do perfil.' },
];
