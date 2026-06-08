import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/* =========================
   CONFIG
========================= */

const AVATAR_PADRAO = 'https://cdn.discordapp.com/embed/avatars/0.png';

/* =========================
   RENDER PERFIL (BASE ÚNICA)
========================= */

export async function renderPerfil(data) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // FUNDO
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // CARD BASE
  ctx.fillStyle = '#11141b';
  ctx.fillRect(20, 20, 760, 380);

  /* =========================
     AVATAR
  ========================= */

  try {
    const avatar = await loadImage(data.avatar || AVATAR_PADRAO);

    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 130, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 60, 140, 140);
    ctx.restore();
  } catch {}

  /* =========================
     TEXTO
  ========================= */

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Sans';
  ctx.fillText(data.nome || 'Usuário', 220, 110);

  ctx.fillStyle = '#00ff88';
  ctx.font = '20px Sans';
  ctx.fillText(`XP: ${data.xp || 0}`, 220, 160);

  /* =========================
     BORDA BASE
  ========================= */

  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  /* =========================
     MOLDURA (SISTEMA REAL)
  ========================= */

  if (data.moldura) {
    try {
      const frame = await loadImage(`assets/frames/${data.moldura}.png`);

      // overlay REAL do item comprado
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    } catch {
      console.warn('[perfil] moldura não encontrada:', data.moldura);

      // fallback visual (NUNCA quebra o perfil)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   COMMAND: !meuperfil
========================= */

export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/).shift();

    if (cmd !== 'meuperfil') return;

    try {
      const user = await Usuario.findOne({
        userId: msg.author.id,
        guildId: msg.guild.id,
      });

      const data = {
        nome: msg.author.username,
        avatar: msg.author.displayAvatarURL?.() || null,
        xp: user?.xpDisponivel || 0,
        moldura: user?.moldura || null,
      };

      const buffer = await renderPerfil(data);

      const file = new AttachmentBuilder(buffer, {
        name: 'perfil.png',
      });

      return msg.reply({
        files: [file],
      });

    } catch (err) {
      console.error('[perfil] erro:', err);
      return msg.reply('❌ erro ao gerar perfil.');
    }
  });
}

export const comandos = [
  { cmd: '!meuperfil', desc: 'Mostra o perfil com moldura e XP.' },
];
