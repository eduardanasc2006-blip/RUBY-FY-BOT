import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { registrarLog } from '../utils/logger.mjs';

import Usuario from '../db/models/Usuario.mjs';
import Casamento from '../db/models/Casamento.mjs';

// ── Temas por porcentagem ─────────────────────────────
const TEMAS = [
  { min: 0, max: 20, nome: 'Distantes', msg: 'Entre vocês há um afastamento emocional.', msg2: 'A conexão ainda não encontrou equilíbrio.' },
  { min: 21, max: 40, nome: 'Conexão Fraca', msg: 'Existe curiosidade, mas pouca sintonia.', msg2: 'Com o tempo isso pode mudar.' },
  { min: 41, max: 60, nome: 'Amizade', msg: 'Há uma base sólida de amizade entre vocês.', msg2: 'Existe potencial para algo maior.' },
  { min: 61, max: 80, nome: 'Romance', msg: 'A conexão entre vocês é forte e envolvente.', msg2: 'Existe química e compatibilidade emocional.' },
  { min: 81, max: 100, nome: 'Almas Gêmeas', msg: 'Vocês parecem profundamente conectados.', msg2: 'Uma ligação rara, intensa e duradoura.' }
];

// ── Cores por gênero ─────────────────────────────
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

// ── Canvas ─────────────────────────────
const W = 720;
const H = 520;
const AV_R = 88;
const LEFT_CX = 158;
const RIGHT_CX = W - 158;
const AV_CY = 200;

function getTema(pct) {
  return TEMAS.find(t => pct >= t.min && pct <= t.max) || TEMAS[4];
}

function gerarPorcentagem(id1, id2) {
  const seed = (BigInt(id1) + BigInt(id2)).toString();
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(hash) % 101;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function drawGlow(ctx, cx, cy, r, color) {
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  for (let i = 6; i > 0; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.05 + i * 0.01})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
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

async function fetchAvatar(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

async function gerarImagemShip(u1, u2, pct, corEsq, corDir, casados) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // fundo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#050514');
  bg.addColorStop(0.5, '#120a2a');
  bg.addColorStop(1, '#050514');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // partículas
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillRect(x, y, 2, 2);
  }

  const [imgL, imgR] = await Promise.all([
    fetchAvatar(u1.displayAvatarURL({ extension: 'png', size: 256 })),
    fetchAvatar(u2.displayAvatarURL({ extension: 'png', size: 256 }))
  ]);

  // glow diferenciado se casados
  const glowL = casados ? '#ffd700' : corEsq;
  const glowR = casados ? '#ffd700' : corDir;

  drawGlow(ctx, LEFT_CX, AV_CY, AV_R, glowL);
  drawGlow(ctx, RIGHT_CX, AV_CY, AV_R, glowR);

  // avatares
  ctx.save();
  ctx.beginPath();
  ctx.arc(LEFT_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  if (imgL) ctx.drawImage(imgL, LEFT_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(RIGHT_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  if (imgR) ctx.drawImage(imgR, RIGHT_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  ctx.restore();

  // percentual central
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, corEsq);
  grad.addColorStop(1, corDir);

  ctx.fillStyle = grad;
  ctx.fillText(`${pct}%`, W / 2, AV_CY);

  // badge casamento
  if (casados) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('💍 CASAL OFICIAL', W / 2, AV_CY - 70);
  }

  return canvas.toBuffer('image/png');
}

// ───────────────────────────────
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
      return msg.reply({ embeds: [embedErro('Use: `!ship @user1 @user2`')] });

    const pct = gerarPorcentagem(u1.id, u2.id);

    let g1 = null, g2 = null;
    let casados = false;

    if (isDBConnected()) {
      const [db1, db2, casal] = await Promise.all([
        Usuario.findOne({ userId: u1.id, guildId: msg.guild.id }),
        Usuario.findOne({ userId: u2.id, guildId: msg.guild.id }),
        Casamento.findOne({
          guildId: msg.guild.id,
          ativo: true,
          $or: [
            { userId1: u1.id, userId2: u2.id },
            { userId1: u2.id, userId2: u1.id }
          ]
        })
      ]);

      g1 = db1?.genero;
      g2 = db2?.genero;
      casados = !!casal;
    }

    const [corEsq, corDir] = getCoresGenero(g1, g2);

    try {
      const buffer = await gerarImagemShip(u1, u2, pct, corEsq, corDir, casados);
      const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

      // ── LOG DO SHIP ──
      await registrarLog(client, msg.guild.id, 'ship', msg.author.id, {
        usuarios: [u1.id, u2.id],
        porcentagem: pct,
        casados
      });

      return msg.reply({ files: [attachment] });

    } catch (err) {
      console.error(err);
      return msg.reply({ embeds: [embedErro('Erro ao gerar ship.')] });
    }
  });
                }
