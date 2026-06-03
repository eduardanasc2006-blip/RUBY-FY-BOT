import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

/* =========================
   CACHE (performance)
========================= */
const shipCache = new Map();

/* =========================
   TEMAS
========================= */
const TEMAS = [
  { min: 0,  max: 20,  nome: 'Sombrio',    msg: 'A distancia pode ser o melhor caminho.',   msg2: 'A energia entre voces e muito intensa.' },
  { min: 21, max: 40,  nome: 'Neutro',     msg: 'Pode virar amizade.',                       msg2: 'Existe um vinculo aqui, mas precisa amadurecer.' },
  { min: 41, max: 60,  nome: 'Amizade',    msg: 'Uma amizade muito promissora.',              msg2: 'Voces combinam bem, ha espaco para crescer.' },
  { min: 61, max: 80,  nome: 'Romantico',  msg: 'Talvez exista algo especial aqui.',         msg2: 'A conexao entre voces e inegavel.' },
  { min: 81, max: 100, nome: 'Alma Gemea', msg: 'Feitos um para o outro.',                   msg2: 'Uma conexao rara e poderosa.' },
];

/* =========================
   CORES POR GENERO
========================= */
function getCoresGenero(g1, g2) {
  const a = g1 || 'none';
  const b = g2 || 'none';

  if (a === 'masculino' && b === 'masculino') return ['#00bfff', '#00e5ff'];
  if (a === 'feminino'  && b === 'feminino')  return ['#ff69b4', '#c084fc'];

  if (
    (a === 'masculino' && b === 'feminino') ||
    (a === 'feminino' && b === 'masculino')
  ) return ['#9b59b6', '#ff00ff'];

  if (a === 'outro' || b === 'outro') return ['#a855f7', '#ffffff'];

  return ['#39ff14', '#00bfff'];
}

/* =========================
   DIMENSÕES
========================= */
const W = 720;
const H = 490;
const AV_R = 88;
const LEFT_CX = 158;
const RIGHT_CX = W - 158;
const AV_CY = 192;

/* =========================
   UTILS
========================= */
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

function getTema(pct) {
  return TEMAS.find(t => pct >= t.min && pct <= t.max) || TEMAS[4];
}

/* =========================
   PORCENTAGEM (CORRIGIDO)
========================= */
function gerarPorcentagem(id1, id2) {
  const seed = [id1, id2].sort().join(':');

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % 101;
}

/* =========================
   AVATAR
========================= */
async function fetchAvatar(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

/* =========================
   IMAGEM SHIP
========================= */
async function gerarImagemShip(u1, u2, pct, corEsq, corDir, g1, g2) {
  const cacheKey = `${u1.id}:${u2.id}:${pct}:${corEsq}:${corDir}`;
  if (shipCache.has(cacheKey)) return shipCache.get(cacheKey);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  /* BACKGROUND */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.5, '#0e0826');
  bg.addColorStop(1, '#07071a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* PARTICULAS */
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(Math.abs(Math.sin(i * 137.5)) * (W - 4));
    const sy = Math.floor(Math.abs(Math.cos(i * 97.3)) * (H - 4));
    ctx.fillRect(sx, sy, 1, 1);
  }

  /* TITULO */
  const TITLE = 'SHIPMETRO';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';

  const titleW = ctx.measureText(TITLE).width;
  const titleY = 38;

  const gradTitle = ctx.createLinearGradient(W / 2 - titleW / 2, 0, W / 2 + titleW / 2, 0);
  gradTitle.addColorStop(0, corEsq);
  gradTitle.addColorStop(1, corDir);

  ctx.fillStyle = gradTitle;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 20;
  ctx.fillText(TITLE, W / 2, titleY);
  ctx.shadowBlur = 0;

  /* AVATARES */
  const [imgL, imgR] = await Promise.all([
    fetchAvatar(u1.displayAvatarURL({ extension: 'png', size: 256 })),
    fetchAvatar(u2.displayAvatarURL({ extension: 'png', size: 256 })),
  ]);

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

  /* PORCENTAGEM */
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';

  const pctGrad = ctx.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
  pctGrad.addColorStop(0, corEsq);
  pctGrad.addColorStop(1, corDir);

  ctx.fillStyle = pctGrad;
  ctx.fillText(`${pct}%`, W / 2, AV_CY);

  const buffer = canvas.toBuffer('image/png');
  shipCache.set(cacheKey, buffer);

  return buffer;
}

/* =========================
   REGISTER
========================= */
export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd !== 'ship') return;

    const users = msg.mentions.users;
    const u1 = users.first();
    const u2 = users.at(1);

    if (!u1 || !u2)
      return msg.reply({ embeds: [embedErro('Use: `!ship @user1 @user2`')] });

    if (u1.id === u2.id)
      return msg.reply({ embeds: [embedErro('Mencione dois usuarios diferentes.')] });

    const cdKey = `ship:${[u1.id, u2.id].sort().join(':')}:${msg.guild.id}`;
    const wait = checkCooldown(cdKey, 30_000);

    if (wait)
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(wait)}** para usar novamente.`)],
      });

    const pct = gerarPorcentagem(u1.id, u2.id);

    let g1 = null, g2 = null;

    if (isDBConnected()) {
      const [dbU1, dbU2] = await Promise.all([
        Usuario.findOne({ userId: u1.id, guildId: msg.guild.id }),
        Usuario.findOne({ userId: u2.id, guildId: msg.guild.id }),
      ]);

      g1 = dbU1?.genero ?? 'none';
      g2 = dbU2?.genero ?? 'none';
    }

    const [corEsq, corDir] = getCoresGenero(g1, g2);

    try {
      const buffer = await gerarImagemShip(u1, u2, pct, corEsq, corDir, g1, g2);
      const attachment = new AttachmentBuilder(buffer, { name: 'shipmetro.png' });
      return msg.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Ship]', err);
      return msg.reply({ embeds: [embedErro('Erro ao gerar ship.')] });
    }
  });
}
