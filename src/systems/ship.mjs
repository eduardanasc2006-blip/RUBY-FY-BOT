import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Op } from "sequelize";

import { embedErro } from "../utils/embeds.mjs";
import { isDBConnected } from "../utils/dbGuard.mjs";
import { registrarLog } from "../utils/logger.mjs";

import Usuario from "../db/models/Usuario.mjs";
import Casamento from "../db/models/Casamento.mjs";

/* =========================
   CORES
========================= */
const COR_GENERO = {
  masculino: "#00bfff",
  feminino: "#ff69b4",
  outro: "#a855f7",
  misto: "#ff3b7a",
  padrao: "#ff4d6d"
};

/* =========================
   TEMAS
========================= */
const TEMAS = [
  { min: 0, max: 20, nome: "💔 Distantes", final: "A conexão entre vocês é quase inexistente." },
  { min: 21, max: 40, nome: "✨ Fraco", final: "Existe curiosidade, mas pouca sintonia." },
  { min: 41, max: 60, nome: "🤍 Amizade", final: "Há base emocional entre vocês." },
  { min: 61, max: 80, nome: "💖 Romance", final: "A conexão é forte e envolvente." },
  { min: 81, max: 100, nome: "❤️‍🔥 Almas Gêmeas", final: "Conexão extremamente rara!" }
];

/* =========================
   HELPERS
========================= */
function getTema(p) {
  return TEMAS.find(t => p >= t.min && p <= t.max) || TEMAS[4];
}

function gerarPct(a, b) {
  const ordenado = [a, b].sort();
  let seed = 0;
  for (const c of (ordenado[0] + ordenado[1])) {
    seed = (seed * 31 + c.charCodeAt(0)) % 100000;
  }
  return Math.abs(seed % 101);
}

async function pegarGenero(userId, guildId) {
  if (!isDBConnected()) return null;

  try {
    const u = await Usuario.findOne({
      where: { userId, guildId },
      attributes: ["genero"]
    });

    return u?.genero?.toLowerCase() || null;
  } catch {
    return null;
  }
}

async function verificarCasal(u1, u2, guildId) {
  try {
    const casal = await Casamento.findOne({
      where: {
        guildId,
        ativo: true,
        [Op.or]: [
          { userId1: u1.id, userId2: u2.id },
          { userId1: u2.id, userId2: u1.id }
        ]
      }
    });

    return !!casal;
  } catch {
    return false;
  }
}

/* =========================
   CANVAS
========================= */
const W = 820;
const H = 520;
const AVATAR_SIZE = 110;
const LEFT_X = 210;
const RIGHT_X = 610;
const Y = 200;

function roundRect(ctx, x, y, w, h, r) {
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

/* =========================
   IMAGE
========================= */
async function gerarImagemShip(u1, u2, pct, casados, cor1, cor2) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  try {
    // BACKGROUND
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#080812");
    bg.addColorStop(1, "#101020");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // CARD
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, 80, 60, 660, 400, 20);
    ctx.fill();

    // AVATARES (SAFE)
    const avatar1 = u1.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });
    const avatar2 = u2.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });

    let img1, img2;

    try {
      [img1, img2] = await Promise.all([
        loadImage(avatar1),
        loadImage(avatar2)
      ]);
    } catch {
      const fallback = "https://cdn.discordapp.com/embed/avatars/0.png";
      img1 = img2 = await loadImage(fallback);
    }

    function avatar(img, x) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, Y, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - 55, Y - 55, AVATAR_SIZE, AVATAR_SIZE);
      ctx.restore();
    }

    avatar(img1, LEFT_X);
    avatar(img2, RIGHT_X);

    // TEXTOS
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("S H I P M E T R O", W / 2, 95);

    const nome1 = u1.globalName || u1.username;
    const nome2 = u2.globalName || u2.username;

    ctx.font = "18px Arial";
    ctx.fillText(nome1, LEFT_X, 330);
    ctx.fillText(nome2, RIGHT_X, 330);

    ctx.font = "62px Arial";
    ctx.fillStyle = cor1;
    ctx.fillText(`${pct}%`, W / 2, 220);

    if (casados) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "14px Arial";
      ctx.fillText("💍 CASAL OFICIAL", W / 2, 170);
    }

    return canvas.toBuffer("image/png");

  } catch (err) {
    console.error("[SHIP CANVAS ERROR]", err);
    return null;
  }
}

/* =========================
   COMMAND
========================= */
export function register(client, configs) {
  if (client.__ship) return;
  client.__ship = true;

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

    const casados = await verificarCasal(u1, u2, msg.guild.id);

    const g1 = await pegarGenero(u1.id, msg.guild.id);
    const g2 = await pegarGenero(u2.id, msg.guild.id);

    const cor1 = COR_GENERO[g1] || COR_GENERO.padrao;
    const cor2 = COR_GENERO[g2] || COR_GENERO.padrao;

    const buffer = await gerarImagemShip(u1, u2, pct, casados, cor1, cor2);

    if (!buffer) {
      return msg.reply("❌ Erro ao gerar imagem do ship.");
    }

    return msg.reply({
      content: `**${tema.nome}**\n> ${tema.final}`,
      files: [new AttachmentBuilder(buffer, { name: "ship.png" })]
    });
  });
     }
