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

/* =========================
   PREVIEW
========================= */

async function renderItem(item) {
  const canvas = createCanvas(600, 300);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, 600, 300);

  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(30, 30, 540, 240);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Sans';
  ctx.fillText(item.nome, 60, 90);

  ctx.font = '18px Sans';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Tipo: ${item.tipo}`, 60, 130);

  ctx.fillStyle = '#00ff88';
  ctx.fillText(`${item.preco} XP`, 60, 170);

  ctx.fillStyle = '#ddd';
  ctx.fillText(item.desc, 60, 220);

  return canvas.toBuffer('image/png');
}

/* =========================
   EMBED
========================= */

function embedLoja(page = 0) {
  const itens = ITENS.slice(page * 5, page * 5 + 5);

  return new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle('🛍️ Loja FiskBot')
    .setDescription(
      itens
        .map(i => `🛒 **${i.nome}** — ${i.preco} XP\n\`${i.id}\``)
        .join('\n\n')
    )
    .setFooter({ text: `Página ${page + 1}` });
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {

  /* =========================
     COMANDO LOJA
  ========================= */

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'loja') return;

    const page = Math.max(0, (parseInt(args[0]) || 1) - 1);

    const itens = ITENS.slice(page * 5, page * 5 + 5);

    const embed = embedLoja(page);

    const row = new ActionRowBuilder().addComponents(
      itens.map(item =>
        new ButtonBuilder()
          .setCustomId(`shop_view:${msg.author.id}:${item.id}`)
          .setLabel('Ver item')
          .setStyle(ButtonStyle.Primary)
      )
    );

    return msg.reply({ embeds: [embed], components: [row] });
  });

  /* =========================
     INTERAÇÕES
  ========================= */

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [type, userId, itemId] = interaction.customId.split(':');

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Este menu não é seu.',
        ephemeral: true,
      });
    }

    const item = ITENS.find(i => i.id === itemId);

    /* =========================
       VIEW ITEM
    ========================= */

    if (type === 'shop_view') {
      if (!item) {
        return interaction.reply({
          content: 'Item não encontrado.',
          ephemeral: true,
        });
      }

      const buffer = await renderItem(item);
      const file = new AttachmentBuilder(buffer, { name: 'item.png' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_confirm_yes:${userId}:${item.id}`)
          .setLabel(`Sim, comprar (${item.preco} XP)`)
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`shop_confirm_no:${userId}:${item.id}`)
          .setLabel('Não')
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        files: [file],
        components: [row],
        ephemeral: true,
      });
    }

    /* =========================
       CANCELAR
    ========================= */

    if (type === 'shop_confirm_no') {
      return interaction.update({
        content: '❌ Compra cancelada.',
        components: [],
        files: [],
      });
    }

    /* =========================
       CONFIRMAR COMPRA
    ========================= */

    if (type === 'shop_confirm_yes') {
      if (!item) {
        return interaction.update({
          content: 'Item não encontrado.',
          components: [],
          files: [],
        });
      }

      const ok = await gastarXP(
        userId,
        interaction.guild.id,
        item.preco,
        `shop_${item.id}`
      );

      if (!ok) {
        return interaction.update({
          content: '❌ XP insuficiente.',
          components: [],
          files: [],
        });
      }

      const filter = { userId, guildId: interaction.guild.id };

      if (item.tipo === 'badge') {
        await Usuario.findOneAndUpdate(filter, { $addToSet: { badges: item.id } }, { upsert: true });

      } else if (item.tipo === 'efeito') {
        await Usuario.findOneAndUpdate(filter, { $addToSet: { efeitos: item.id } }, { upsert: true });

      } else if (item.tipo === 'moldura') {
        await Usuario.findOneAndUpdate(filter, { $set: { moldura: item.id } }, { upsert: true });

      } else if (item.tipo === 'consumivel') {
        const xpBonus = item.id === 'xp_boost_max' ? 150 : 50;

        const mod = await import('./xpSystem.mjs');
        await mod.ganharXP(userId, interaction.guild.id, xpBonus, 'shop_boost');
      }

      return interaction.update({
        content: `✅ Compra realizada: **${item.nome}**`,
        components: [],
        files: [],
      });
    }
  });
}
