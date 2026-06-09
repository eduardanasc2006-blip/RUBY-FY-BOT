import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { registrarLog } from '../utils/logger.mjs';

import Usuario from '../db/models/Usuario.mjs';
import Casamento from '../db/models/Casamento.mjs';

/* =========================
   TEMAS
========================= */

const TEMAS = [
  {
    min: 0,
    max: 20,
    nome: "Distantes",
    final: "❌ A conexão entre vocês é praticamente inexistente."
  },
  {
    min: 21,
    max: 40,
    nome: "Conexão Fraca",
    final: "⚠️ Existe alguma curiosidade, mas pouca sintonia."
  },
  {
    min: 41,
    max: 60,
    nome: "Amizade",
    final: "💫 Há uma base emocional, mas ainda instável."
  },
  {
    min: 61,
    max: 80,
    nome: "Romance",
    final: "💞 Existe uma forte conexão entre vocês."
  },
  {
    min: 81,
    max: 100,
    nome: "Almas Gêmeas",
    final: "💖 A conexão de vocês é extremamente rara."
  }
];

/* =========================
   CORES
========================= */

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

/* =========================
   CANVAS CONFIG
========================= */

const W = 820;
const H = 480;

const AVATAR_SIZE = 110;

const LEFT_X = 210;
const RIGHT_X = 610;
const Y = 200;

/* =========================
   HELPERS
========================= */

function getTema(p) {
  return TEMAS.find(t => p >= t.min && p <= t.max) || TEMAS[4];
}

function gerarPct(a, b) {
  const seed = (BigInt(a) + BigInt(b)).toString();
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 101;
}

/* =========================
   BAR
========================= */

function drawBar(ctx, pct) {
  const x = 160;
  const y = 340;
  const w = 500;
  const h = 20;

  ctx.fillStyle = "#1c1c2a";
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#ff4d6d");
  grad.addColorStop(1, "#4dd6ff");

  ctx.fillStyle = grad;
  ctx.roundRect(x, y, (w * pct) / 100, h, 10);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${pct}% compatibilidade`, x + w / 2, y - 10);
}

/* =========================
   IMAGEM SHIP
========================= */

async function gerarImagemShip(u1, u2, pct, casados) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* FUNDO */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b14");
  bg.addColorStop(1, "#15152a");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* CARD */
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.roundRect(80, 60, 660, 360, 20);
  ctx.fill();

  /* AVATARES */
  const [img1, img2] = await Promise.all([
    loadImage(u1.displayAvatarURL({ extension: "png", size: 256 })),
    loadImage(u2.displayAvatarURL({ extension: "png", size: 256 }))
  ]);

  /* glow */
  ctx.beginPath();
  ctx.arc(LEFT_X, Y, AVATAR_SIZE / 2 + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ff4d6d55";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(RIGHT_X, Y, AVATAR_SIZE / 2 + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#4dd6ff55";
  ctx.fill();

  /* avatar 1 */
  ctx.save();
  ctx.beginPath();
  ctx.arc(LEFT_X, Y, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img1, LEFT_X - AVATAR_SIZE / 2, Y - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  /* avatar 2 */
  ctx.save();
  ctx.beginPath();
  ctx.arc(RIGHT_X, Y, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img2, RIGHT_X - AVATAR_SIZE / 2, Y - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  /* nome */
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${u1.username} ❤️ ${u2.username}`, W / 2, 120);

  /* % */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#ff4d6d");
  grad.addColorStop(1, "#4dd6ff");

  ctx.fillStyle = grad;
  ctx.font = "bold 64px Arial";
  ctx.fillText(`${pct}%`, W / 2, 200);

  if (casados) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 14px Arial";
    ctx.fillText("💍 CASAL OFICIAL", W / 2, 160);
  }

  drawBar(ctx, pct);

  return canvas.toBuffer("image/png");
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  if (client.__shipRegistrado) return;
  client.__shipRegistrado = true;

  client.on("messageCreate", async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefix = configs.get(msg.guild.id)?.prefixo || "!";
    if (!msg.content.startsWith(prefix)) return;

    const args = msg.content.slice(prefix.length).trim().split(/\s+/);
    if (args.shift().toLowerCase() !== "ship") return;

    let u1 = msg.mentions.users.first();
    let u2 = msg.mentions.users.at(1);

    if (!u2 && u1) {
      u2 = u1;
      u1 = msg.author;
    }

    if (!u1 || !u2)
      return msg.reply({ embeds: [embedErro("Use: !ship @user")] });

    const pct = gerarPct(u1.id, u2.id);
    const tema = getTema(pct);

    let casados = false;

    if (isDBConnected()) {
      const casal = await Casamento.findOne({
        guildId: msg.guild.id,
        ativo: true,
        $or: [
          { userId1: u1.id, userId2: u2.id },
          { userId1: u2.id, userId2: u1.id }
        ]
      });

      casados = !!casal;
    }

    const buffer = await gerarImagemShip(u1, u2, pct, casados);

    const img = new AttachmentBuilder(buffer, { name: "ship.png" });

    await registrarLog(client, msg.guild.id, "ship", msg.author.id, {
      usuarios: [u1.id, u2.id],
      porcentagem: pct,
      casados
    }, configs);

    return msg.reply({
      content:
`💞 **${tema.nome}**

${tema.final}`,
      files: [img]
    });
  });
}

export const comandos = [
  { cmd: "!ship @user", desc: "Sistema de compatibilidade redesenhado" }
];
