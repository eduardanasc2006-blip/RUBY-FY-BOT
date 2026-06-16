import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Op } from "sequelize";

import { embedErro } from "../utils/embeds.mjs";
import { isDBConnected } from "../utils/dbGuard.mjs";
import { registrarLog } from "../utils/logger.mjs";

import Usuario from "../db/models/Usuario.mjs";
import Casamento from "../db/models/Casamento.mjs";

/* =========================
   CORES E GÊNERO
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
  { min: 0, max: 20, nome: "💔 Distantes", final: "A conexão entre vocês é quase inexistente e instável." },
  { min: 21, max: 40, nome: "✨ Conexão Fraca", final: "Existe curiosidade, mas pouca sintonia emocional." },
  { min: 41, max: 60, nome: "🤍 Amizade", final: "Há base emocional e conforto entre vocês." },
  { min: 61, max: 80, nome: "💖 Romance", final: "A conexão é forte e naturalmente envolvente." },
  { min: 81, max: 100, nome: "❤️‍🔥 Almas Gêmeas", final: "A ligação entre vocês é profunda e rara." }
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
  const ordenado = [a, b].sort();
  const seed = (BigInt(ordenado[0]) + BigInt(ordenado[1])).toString();
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 101;
}

// ✅ Query segura para Sequelize/SQLite
async function pegarGenero(userId, guildId) {
  if (!isDBConnected()) return null;
  try {
    const u = await Usuario.findOne({
      where: { userId, guildId },
      attributes: ["genero"]
    });
    return u?.genero?.toLowerCase().trim() || null;
  } catch {
    return null;
  }
}

/* =========================
   BAR (SHIPMETRO)
========================= */
function drawBar(ctx, pct, cor1, cor2) {
  const x = 160;
  const y = 360;
  const w = 500;
  const h = 18;

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, cor1);
  grad.addColorStop(1, cor2);

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, (w * pct) / 100, h, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${pct}% de compatibilidade`, x + w / 2, y - 12);
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
   IMAGEM SHIP 100% CORRIGIDA
========================= */
async function gerarImagemShip(u1, u2, pct, casados, cor1, cor2) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#080812");
  bg.addColorStop(1, "#101020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Card principal
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 80, 60, 660, 400, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // ✅ Avatares com tratamento de erro
  const avatarUrl1 = u1.displayAvatarURL({ extension: "png", size: 256, forceStatic: false });
  const avatarUrl2 = u2.displayAvatarURL({ extension: "png", size: 256, forceStatic: false });

  let img1, img2;
  try {
    [img1, img2] = await Promise.all([loadImage(avatarUrl1), loadImage(avatarUrl2)]);
  } catch {
    img1 = img2 = await loadImage("https://cdn.discordapp.com/embed/avatars/0.png");
  }

  // Brilhos dinâmicos
  ctx.beginPath();
  ctx.arc(LEFT_X, Y, AVATAR_SIZE / 2 + 12, 0, Math.PI * 2);
  const gradGlow1 = ctx.createRadialGradient(LEFT_X, Y, 0, LEFT_X, Y, AVATAR_SIZE / 2 + 12);
  gradGlow1.addColorStop(0, cor1 + "80");
  gradGlow1.addColorStop(1, "transparent");
  ctx.fillStyle = gradGlow1;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(RIGHT_X, Y, AVATAR_SIZE / 2 + 12, 0, Math.PI * 2);
  const gradGlow2 = ctx.createRadialGradient(RIGHT_X, Y, 0, RIGHT_X, Y, AVATAR_SIZE / 2 + 12);
  gradGlow2.addColorStop(0, cor2 + "80");
  gradGlow2.addColorStop(1, "transparent");
  ctx.fillStyle = gradGlow2;
  ctx.fill();

  // Desenha avatares
  ctx.save();
  ctx.beginPath();
  ctx.arc(LEFT_X, Y, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img1, LEFT_X - AVATAR_SIZE / 2, Y - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(RIGHT_X, Y, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img2, RIGHT_X - AVATAR_SIZE / 2, Y - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
  ctx.restore();

  // Coração central
  ctx.font = "32px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText("💞", W / 2, 205);

  // Título
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.fillText("S H I P M E T R O", W / 2, 95);

  // ✅ Nomes corretos para v14
  const nome1 = u1.globalName || u1.username;
  const nome2 = u2.globalName || u2.username;

  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(nome1, LEFT_X, 330);
  ctx.fillText(nome2, RIGHT_X, 330);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#aab2cc";
  ctx.fillText(`@${u1.username}`, LEFT_X, 352);
  ctx.fillText(`@${u2.username}`, RIGHT_X, 352);

  // ✅ Gradiente corrigido
  const gradPct = ctx.createLinearGradient(0, 0, W, 0);
  gradPct.addColorStop(0, cor1);
  gradPct.addColorStop(1, cor2);
  ctx.fillStyle = gradPct;
  ctx.font = "bold 62px Arial";
  ctx.fillText(`${pct}%`, W / 2, 220);

  if (casados) {
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#aa8c00";
    ctx.lineWidth = 2;
    ctx.font = "bold 15px Arial";
    ctx.strokeText("💍 CASAL OFICIAL", W / 2, 172);
    ctx.fillText("💍 CASAL OFICIAL", W / 2, 172);
  }

  drawBar(ctx, pct, cor1, cor2);

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
      return msg.reply({ embeds: [embedErro("Uso correto: `!ship @usuário`")] });

    if (u1.id === u2.id)
      return msg.reply({ embeds: [embedErro("❌ Você não pode fazer ship com você mesmo!")] });

    const pct = gerarPct(u1.id, u2.id);
    const tema = getTema(pct);

    let casados = false;
    let cor1 = COR_GENERO.padrao;
    let cor2 = COR_GENERO.padrao;

    if (isDBConnected()) {
      try {
        // ✅ Query do Sequelize CORRETA
        const casal = await Casamento.findOne({
          where: {
            guildId: msg.guild.id,
            ativo: true,
            [Op.or]: [
              { userId1: u1.id, userId2: u2.id },
              { userId1: u2.id, userId2: u1.id }
            ]
          }
        });
        casados = !!casal;

        const g1 = await pegarGenero(u1.id, msg.guild.id);
        const g2 = await pegarGenero(u2.id, msg.guild.id);

        // ✅ Cores seguras, nunca undefined
        cor1 = COR_GENERO[g1] ?? COR_GENERO.padrao;
        cor2 = COR_GENERO[g2] ?? COR_GENERO.padrao;

      } catch (erro) {
        console.error("[SHIP] Erro ao acessar banco:", erro);
      }
    }

    const buffer = await gerarImagemShip(u1, u2, pct, casados, cor1, cor2);
    const imagem = new AttachmentBuilder(buffer, { name: `ship_${u1.id}_${u2.id}.png` });

    await registrarLog(client, msg.guild.id, "ship", msg.author.id, {
      usuarios: [u1.id, u2.id],
      porcentagem: pct,
      casados
    }, configs);

    return msg.reply({
      content: `**${tema.nome}**\n> ${tema.final}`,
      files: [imagem]
    });
  });
}

export const comandos = [
  { cmd: "!ship @usuário", desc: "Sistema de compatibilidade com visual exclusivo" }
];

