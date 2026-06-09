import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import { embedErro } from "../utils/embeds.mjs";
import { isDBConnected } from "../utils/dbGuard.mjs";
import { registrarLog } from "../utils/logger.mjs";

import Casamento from "../db/models/Casamento.mjs";

/* =========================
   TEMAS
========================= */

const TEMAS = [
  { min: 0, max: 20, nome: "Distantes", final: "A conexão entre vocês é quase inexistente e instável." },
  { min: 21, max: 40, nome: "Conexão Fraca", final: "Existe curiosidade, mas pouca sintonia emocional." },
  { min: 41, max: 60, nome: "Amizade", final: "Há base emocional e conforto entre vocês." },
  { min: 61, max: 80, nome: "Romance", final: "A conexão é forte e naturalmente envolvente." },
  { min: 81, max: 100, nome: "Almas Gêmeas", final: "A ligação entre vocês é profunda e rara." }
];

/* =========================
   CANVAS CONFIG
========================= */

const W = 820;
const H = 520;

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
   BAR (SHIPMETRO)
========================= */

function drawBar(ctx, pct) {
  const x = 160;
  const y = 360;
  const w = 500;
  const h = 18;

  // fundo barra
  ctx.fillStyle = "#1b1b25";
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();

  // preenchimento
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#ff4d6d");
  grad.addColorStop(1, "#4dd6ff");

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, (w * pct) / 100, h, 10);
  ctx.fill();

  // texto da barra
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${pct}% compatibilidade`, x + w / 2, y - 10);
}

/* =========================
   ROUND RECT FIX
========================= */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* =========================
   IMAGEM SHIP (NOVO DESIGN)
========================= */

async function gerarImagemShip(u1, u2, pct, casados) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* BACKGROUND */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b14");
  bg.addColorStop(1, "#141425");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* CARD PRINCIPAL */
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 80, 60, 660, 400, 20);
  ctx.fill();

  /* AVATARES */
  const [img1, img2] = await Promise.all([
    loadImage(u1.displayAvatarURL({ extension: "png", size: 256 })),
    loadImage(u2.displayAvatarURL({ extension: "png", size: 256 }))
  ]);

  // glow esquerdo
  ctx.beginPath();
  ctx.arc(LEFT_X, Y, AVATAR_SIZE / 2 + 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,77,109,0.25)";
  ctx.fill();

  // glow direito
  ctx.beginPath();
  ctx.arc(RIGHT_X, Y, AVATAR_SIZE / 2 + 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(77,214,255,0.25)";
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

  /* TÍTULO (SEM EMOJI) */
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SHIPMETRO", W / 2, 95);

  /* USUÁRIOS */
  ctx.font = "bold 18px Arial";
  ctx.fillText(u1.username, LEFT_X, 330);
  ctx.fillText(u2.username, RIGHT_X, 330);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#aab";
  ctx.fillText(`@${u1.username}`, LEFT_X, 350);
  ctx.fillText(`@${u2.username}`, RIGHT_X, 350);

  /* % CENTRAL */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#ff4d6d");
  grad.addColorStop(1, "#4dd6ff");

  ctx.fillStyle = grad;
  ctx.font = "bold 54px Arial";
  ctx.fillText(`${pct}%`, W / 2, 210);

  if (casados) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 14px Arial";
    ctx.fillText("CASAL OFICIAL", W / 2, 170);
  }

  /* BARRA */
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
`${tema.nome}
${tema.final}`,
      files: [img]
    });
  });
}

export const comandos = [
  { cmd: "!ship @user", desc: "Sistema SHIPMETRO redesenhado" }
];
