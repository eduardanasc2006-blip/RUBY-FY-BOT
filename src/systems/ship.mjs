import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

// ── Temas por porcentagem (VERSÃO MELHORADA) ─────────────────────────────
const TEMAS = [
  {
    min: 0,
    max: 20,
    nome: 'Distantes',
    msg: 'Entre vocês há um afastamento emocional.',
    msg2: 'A conexão ainda não encontrou equilíbrio.'
  },
  {
    min: 21,
    max: 40,
    nome: 'Conexão Fraca',
    msg: 'Existe curiosidade, mas pouca sintonia.',
    msg2: 'Com o tempo isso pode mudar.'
  },
  {
    min: 41,
    max: 60,
    nome: 'Amizade',
    msg: 'Há uma base sólida de amizade entre vocês.',
    msg2: 'Existe potencial para algo maior.'
  },
  {
    min: 61,
    max: 80,
    nome: 'Romance',
    msg: 'A conexão entre vocês é forte e envolvente.',
    msg2: 'Existe química e compatibilidade emocional.'
  },
  {
    min: 81,
    max: 100,
    nome: 'Almas Gêmeas',
    msg: 'Vocês parecem profundamente conectados.',
    msg2: 'Uma ligação rara, intensa e duradoura.'
  }
];

// ── Cores por combinação de gênero ────────────────────────────
function getCoresGenero(g1, g2) {
  const a = g1 || 'none';
  const b = g2 || 'none';

  if (a === 'masculino' && b === 'masculino') return ['#00bfff', '#00e5ff'];
  if (a === 'feminino' && b === 'feminino') return ['#ff69b4', '#c084fc'];

  if ((a === 'masculino' && b === 'feminino') ||
      (a === 'feminino' && b === 'masculino')) return ['#9b59b6', '#ff00ff'];

  if (a === 'outro' || b === 'outro') return ['#a855f7', '#ffffff'];

  return ['#39ff14', '#00bfff'];
}

// ── Canvas ────────────────────────────────────────────────────
const W = 720;
const H = 490;
const AV_R = 88;
const LEFT_CX = 158;
const RIGHT_CX = W - 158;
const AV_CY = 192;

function getTema(pct) {
  return TEMAS.find(t => pct >= t.min && pct <= t.max) || TEMAS[4];
}

function gerarPorcentagem(id1, id2) {
  const seed = (BigInt(id1) + BigInt(id2)).toString();
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 101;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.closePath();
}

function drawGlow(ctx, cx, cy, r, color, layers = 5) {
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  for (let i = layers; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.05 + 0.03 / i})`;
    ctx.lineWidth = 9;
    ctx.stroke();
  }
}

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#1e1e3a';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy);
  }

  ctx.restore();
}

function drawAvatarBorder(ctx, cx, cy, r, color) {
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function fitText(ctx, text, maxWidth, fontSize, fontWeight = 'bold') {
  let size = fontSize;
  ctx.font = `${fontWeight} ${size}px sans-serif`;

  while (ctx.measureText(text).width > maxWidth && size > 9) {
    size--;
    ctx.font = `${fontWeight} ${size}px sans-serif`;
  }

  if (ctx.measureText(text).width > maxWidth) {
    while (text.length > 1 && ctx.measureText(text + '...').width > maxWidth) {
      text = text.slice(0, -1);
    }
    text += '...';
  }

  return text;
}

async function fetchAvatar(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

async function gerarImagemShip(u1, u2, pct, corEsq, corDir) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.5, '#0e0826');
  bg.addColorStop(1, '#07071a');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(Math.abs(Math.sin(i * 137.508)) * (W - 4));
    const sy = Math.floor(Math.abs(Math.cos(i * 97.318)) * (H - 4));
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }

  const [imgL, imgR] = await Promise.all([
    fetchAvatar(u1.displayAvatarURL({ extension: 'png', size: 256 })),
    fetchAvatar(u2.displayAvatarURL({ extension: 'png', size: 256 }))
  ]);

  drawGlow(ctx, LEFT_CX, AV_CY, AV_R, corEsq);
  drawGlow(ctx, RIGHT_CX, AV_CY, AV_R, corDir);

  drawCircleAvatar(ctx, imgL, LEFT_CX, AV_CY, AV_R);
  drawCircleAvatar(ctx, imgR, RIGHT_CX, AV_CY, AV_R);

  drawAvatarBorder(ctx, LEFT_CX, AV_CY, AV_R, corEsq);
  drawAvatarBorder(ctx, RIGHT_CX, AV_CY, AV_R, corDir);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px sans-serif';

  const pctGrad = ctx.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
  pctGrad.addColorStop(0, corEsq);
  pctGrad.addColorStop(1, corDir);

  ctx.fillStyle = pctGrad;
  ctx.fillText(`${pct}%`, W / 2, AV_CY);

  const tema = getTema(pct);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(200,180,255,0.6)';
  ctx.fillText(tema.nome, W / 2, AV_CY + 34);

  const nameY = AV_CY + AV_R + 36;
  const userY = nameY + 28;

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(fitText(ctx, u1.displayName, 185, 20), LEFT_CX, nameY);
  ctx.fillText(fitText(ctx, u2.displayName, 185, 20), RIGHT_CX, nameY);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`@${u1.username}`, LEFT_CX, userY);
  ctx.fillText(`@${u2.username}`, RIGHT_CX, userY);

  const barTopY = userY + 50;

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundedRect(ctx, 78, barTopY, W - 156, 22, 11);
  ctx.fill();

  const fillW = Math.round((pct / 100) * (W - 156));

  const grad = ctx.createLinearGradient(78, 0, 78 + fillW, 0);
  grad.addColorStop(0, corEsq);
  grad.addColorStop(1, corDir);

  ctx.fillStyle = grad;
  roundedRect(ctx, 78, barTopY, fillW, 22, 11);
  ctx.fill();

  const temaY = barTopY + 50;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(tema.msg, W / 2, temaY);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(200,200,255,0.6)';
  ctx.fillText(tema.msg2, W / 2, temaY + 22);

  return canvas.toBuffer('image/png');
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    if (args.shift().toLowerCase() !== 'ship') return;

    const u1 = msg.mentions.users.first();
    const u2 = msg.mentions.users.at(1);

    if (!u1 || !u2)
      return msg.reply({ embeds: [embedErro('Use: `!ship @usuario1 @usuario2`')] });

    const pct = gerarPorcentagem(u1.id, u2.id);

    let g1 = null, g2 = null;

    if (isDBConnected()) {
      const [db1, db2] = await Promise.all([
        Usuario.findOne({ userId: u1.id, guildId: msg.guild.id }),
        Usuario.findOne({ userId: u2.id, guildId: msg.guild.id })
      ]);

      g1 = db1?.genero;
      g2 = db2?.genero;
    }

    const [corEsq, corDir] = getCoresGenero(g1, g2);

    try {
      const buffer = await gerarImagemShip(u1, u2, pct, corEsq, corDir);
      const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

      return msg.reply({ files: [attachment] });

    } catch (err) {
      console.error(err);
      return msg.reply({ embeds: [embedErro('Erro ao gerar ship.')] });
    }
  });
                                                    }
