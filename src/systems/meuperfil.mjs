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

/* =========================
   PREVIEW ITEM (IMAGEM MELHORADA)
========================= */

async function renderItem(item) {
  const canvas = createCanvas(700, 350);
  const ctx = canvas.getContext('2d');

  // fundo
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // card
  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(30, 30, 640, 290);

  // título
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(item.nome, 60, 90);

  // tipo
  ctx.fillStyle = '#9aa4b2';
  ctx.font = '18px Sans';
  ctx.fillText(`Tipo: ${item.tipo}`, 60, 140);

  // preço
  ctx.fillStyle = '#00ff88';
  ctx.font = '22px Sans';
  ctx.fillText(`${item.preco} XP`, 60, 190);

  // descrição
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px Sans';
  ctx.fillText(item.desc, 60, 240);

  return canvas.toBuffer('image/png');
}

/* =========================
   PERFIL EM IMAGEM (NOVA FEATURE 🔥)
========================= */

async function renderPerfil(user, data) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // fundo
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // overlay
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // avatar
  const avatar = await loadImage(data.avatar);
  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 120, 80, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 40, 40, 160, 160);
  ctx.restore();

  // nome
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Sans';
  ctx.fillText(data.nome, 230, 100);

  // XP
  ctx.font = '20px Sans';
  ctx.fillStyle = '#00ff88';
  ctx.fillText(`XP: ${data.xp}`, 230, 150);

  // level casal
  ctx.fillStyle = '#ff69b4';
  ctx.fillText(`💍 Relacionamento: ${data.casamentoLevel || 0}`, 230, 190);

  // moldura
  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 6;
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
      itens.map(i => `🛒 **${i.nome}** — ${i.preco} XP\n\`${i.id}\``).join('\n\n')
    )
    .setFooter({ text: `Página ${page + 1}` });
}

/* =========================
   REGISTER (CORRIGIDO)
========================= */

export function register(client, configs) {
  console.log('[SHOP] carregado');

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;

    /* =========================
       !LOJA
    ========================= */

    if (cmd === 'loja') {
      const page = Math.max(0, (parseInt(args[0]) || 1) - 1);
      const itens = ITENS.slice(page * 5, page * 5 + 5);

      const user = await Usuario.findOne({ userId: msg.author.id, guildId });

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
    }
  });

  /* =========================
     INTERAÇÕES (FORA DO MESSAGE CREATE ✔)
  ========================= */

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const id = interaction.customId;

    /* =========================
       PREVIEW ITEM (IMAGEM)
    ========================= */

    if (id.startsWith('shop_item:')) {
      const [, userId, itemId] = id.split(':');

      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Não é seu menu.', ephemeral: true });

      const item = ITENS.find(i => i.id === itemId);
      if (!item)
        return interaction.reply({ content: 'Item não encontrado.', ephemeral: true });

      const buffer = await renderItem(item);
      const file = new AttachmentBuilder(buffer, { name: 'item.png' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_buy:${userId}:${item.id}`)
          .setLabel(`Comprar (${item.preco} XP)`)
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        files: [file],
        components: [row],
        ephemeral: true,
      });
    }

    /* =========================
       COMPRA
    ========================= */

    if (id.startsWith('shop_buy:')) {
      const [, userId, itemId] = id.split(':');

      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ Não é seu menu.', ephemeral: true });

      const item = ITENS.find(i => i.id === itemId);
      if (!item)
        return interaction.reply({ content: 'Item inválido.', ephemeral: true });

      const ok = await gastarXP(userId, interaction.guild.id, item.preco, `shop_${item.id}`);

      if (!ok)
        return interaction.reply({ content: '❌ XP insuficiente.', ephemeral: true });

      const filter = { userId, guildId: interaction.guild.id };

      if (item.tipo === 'badge')
        await Usuario.findOneAndUpdate(filter, { $push: { badges: item.id } }, { upsert: true });

      if (item.tipo === 'efeito')
        await Usuario.findOneAndUpdate(filter, { $push: { efeitos: item.id } }, { upsert: true });

      if (item.tipo === 'moldura')
        await Usuario.findOneAndUpdate(filter, { $set: { moldura: item.id } }, { upsert: true });

      if (item.tipo === 'consumivel')
        await ganharXP(userId, interaction.guild.id, item.id === 'xp_boost_max' ? 150 : 50, 'shop_boost');

      return interaction.reply({
        content: `✅ Comprou **${item.nome}**!`,
        ephemeral: true,
      });
    }
  });
               }
