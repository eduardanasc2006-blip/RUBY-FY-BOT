import {
  AttachmentBuilder,
} from 'discord.js';

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getDB } from '../db/sqlite.mjs';

const db = getDB();

/* =========================
   CONFIG
========================= */

const AVATAR_PADRAO =
  'https://cdn.discordapp.com/embed/avatars/0.png';

/* =========================
   RENDER PERFIL
========================= */

export async function renderPerfil(data) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // fundo
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // card
  ctx.fillStyle = '#11141b';
  ctx.fillRect(20, 20, 760, 380);

  /* =========================
     AVATAR (SAFE)
  ========================= */
  try {
    const avatar = await loadImage(
      data.avatar || AVATAR_PADRAO
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 130, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 60, 140, 140);
    ctx.restore();
  } catch (err) {
    console.error('[perfil] avatar erro:', err);
  }

  /* =========================
     TEXTO
  ========================= */

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(data.nome || 'Usuário', 220, 110);

  ctx.fillStyle = '#00ff88';
  ctx.font = '20px Arial';
  ctx.fillText(`XP: ${data.xp || 0}`, 220, 160);

  /* =========================
     BORDA
  ========================= */

  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  /* =========================
     MOLDURA (SAFE)
  ========================= */

  if (data.moldura) {
    try {
      const frame = await loadImage(
        `assets/frames/${data.moldura}.png`
      );

      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.error('[perfil] moldura erro:', err);

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
    }
  }

  /* =========================
     BADGES
  ========================= */

  if (Array.isArray(data.badges)) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '16px Arial';

    data.badges.slice(0, 5).forEach((b, i) => {
      ctx.fillText(`🏅 ${b}`, 220, 200 + i * 20);
    });
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   COMMAND !meuperfil
========================= */

export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefixo =
      configs.get(msg.guild.id)?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content
      .slice(prefixo.length)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    if (cmd !== 'meuperfil') return;

    try {
      const user = db
        .prepare(
          `
        SELECT * FROM usuarios
        WHERE userId = ? AND guildId = ?
      `
        )
        .get(msg.author.id, msg.guild.id);

      const data = {
        nome: msg.author.username,
        avatar: msg.author.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        xp: user?.xpDisponivel || 0,
        moldura: user?.moldura || null,
        badges: user?.badges
          ? JSON.parse(user.badges)
          : [],
      };

      const buffer = await renderPerfil(data);

      const file = new AttachmentBuilder(buffer, {
        name: 'perfil.png',
      });

      return msg.reply({
        files: [file],
      });
    } catch (err) {
      console.error('[perfil] erro completo:', err);

      return msg.reply(
        '❌ erro ao gerar perfil.'
      );
    }
  });
}

/* =========================
   EXPORT COMANDOS
========================= */

export const comandos = [
  {
    cmd: '!meuperfil',
    desc: 'Mostra o perfil com XP, badges e moldura.',
  },
];
