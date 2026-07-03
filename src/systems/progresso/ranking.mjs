import { createCanvas, loadImage } from '@napi-rs/canvas';
import { EmbedBuilder, Colors } from 'discord.js';
import Usuario from '../../db/models/Usuario.mjs';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

const MEDALS = ['🥇', '🥈', '🥉'];

async function gerarRankingCanvas(users, guild) {
  const W = 900, H = 80 + users.length * 70 + 30;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b0c2a'); bg.addColorStop(1, '#1a0040');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px Sans'; ctx.textAlign = 'center';
  ctx.fillText(`🏆  Top ${users.length} — ${guild?.name ?? 'Servidor'}`, W / 2, 44);
  ctx.textAlign = 'left';

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const y = 70 + i * 70;
    const alpha = i < 3 ? 0.20 : 0.10;
    const accent = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#7c3aed';

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    roundRect(ctx, 20, y, W - 40, 58, 12); ctx.fill();

    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    roundRect(ctx, 20, y, W - 40, 58, 12); ctx.stroke();

    ctx.fillStyle = accent; ctx.font = 'bold 20px Sans';
    ctx.fillText(MEDALS[i] ?? `#${i + 1}`, 36, y + 36);

    try {
      const av = await loadImage(u.avatarUrl ?? '');
      ctx.save(); ctx.beginPath(); ctx.arc(95, y + 29, 22, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(av, 73, y + 7, 44, 44); ctx.restore();
    } catch {
      ctx.fillStyle = '#36393f'; ctx.beginPath(); ctx.arc(95, y + 29, 22, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px Sans';
    ctx.fillText((u.username ?? 'Usuário').slice(0, 22), 128, y + 26);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '13px Sans';
    ctx.fillText(`Nível ${u.nivel ?? 1}  •  ${(u.xpTotal ?? 0).toLocaleString()} XP`, 128, y + 46);

    ctx.fillStyle = accent; ctx.font = 'bold 16px Sans'; ctx.textAlign = 'right';
    ctx.fillText(`${(u.xpTotal ?? 0).toLocaleString()} XP`, W - 36, y + 36);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

export async function ranking(message) {
  const guildId = message.guild?.id;
  if (!guildId) return message.reply('❌ Comando apenas em servidores.');

  const users = await Usuario.find({ guildId }).sort({ xpTotal: -1 }).limit(10).lean();
  if (!users.length) return message.reply('❌ Nenhum usuário no ranking ainda.');

  const enriched = await Promise.all(users.map(async u => {
    try {
      const member = await message.guild.members.fetch(u.userId).catch(() => null);
      return { ...u, username: member?.user.username ?? u.userId, avatarUrl: member?.user.displayAvatarURL({ extension: 'png', size: 128 }) };
    } catch { return { ...u, username: u.userId }; }
  }));

  const img = await gerarRankingCanvas(enriched, message.guild);
  return message.channel.send({ files: [{ attachment: img, name: 'ranking.png' }] });
}

export function register(client, configs) {
  if (client.__rankingRegistrado) return;
  client.__rankingRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const cmd = msg.content.slice(p.length).trim().split(/\s+/)[0].toLowerCase();
    if (cmd === 'rank' || cmd === 'top' || cmd === 'ranking') {
      try { await ranking(msg); } catch (e) { console.error('[ranking]', e); }
    }
  });
}
