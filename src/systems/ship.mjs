import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

// ── Temas por porcentagem ─────────────────────────────────────
const TEMAS = [
  { min: 0,  max: 20,  nome: 'Sombrio',    msg: 'A distancia pode ser o melhor caminho.',   msg2: 'A energia entre voces e muito intensa.' },
  { min: 21, max: 40,  nome: 'Neutro',     msg: 'Pode virar amizade.',                       msg2: 'Existe um vinculo aqui, mas precisa amadurecer.' },
  { min: 41, max: 60,  nome: 'Amizade',    msg: 'Uma amizade muito promissora.',              msg2: 'Voces combinam bem, ha espaco para crescer.' },
  { min: 61, max: 80,  nome: 'Romantico',  msg: 'Talvez exista algo especial aqui.',         msg2: 'A conexao entre voces e inegavel.' },
  { min: 81, max: 100, nome: 'Alma Gemea', msg: 'Feitos um para o outro.',                   msg2: 'Uma conexao rara e poderosa.' },
];

// ── Cores por combinação de gênero ────────────────────────────
//    [corEsquerda, corDireita]
function getCoresGenero(g1, g2) {
  const a = g1 || 'none';
  const b = g2 || 'none';

  // Masculino + Masculino
  if (a === 'masculino' && b === 'masculino') return ['#00bfff', '#00e5ff'];
  // Feminino + Feminino
  if (a === 'feminino'  && b === 'feminino')  return ['#ff69b4', '#c084fc'];
  // Masculino + Feminino (qualquer ordem)
  if ((a === 'masculino' && b === 'feminino') ||
      (a === 'feminino'  && b === 'masculino')) return ['#9b59b6', '#ff00ff'];
  // Outro + qualquer
  if (a === 'outro' || b === 'outro') return ['#a855f7', '#ffffff'];
  // Nenhum configurado
  return ['#39ff14', '#00bfff'];
}

// ── Canvas ────────────────────────────────────────────────────
const W      = 720;
const H      = 490;
const AV_R   = 88;       // +10% vs original (80)
const LEFT_CX  = 158;
const RIGHT_CX = W - 158;
const AV_CY    = 192;

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
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
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
  ctx.font = `${fontWeight} ${size}px sans-serif`.trim();
  while (ctx.measureText(text).width > maxWidth && size > 9) {
    size -= 1;
    ctx.font = `${fontWeight} ${size}px sans-serif`.trim();
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
  try { return await loadImage(url); } catch { return null; }
}

async function gerarImagemShip(u1, u2, pct, corEsq, corDir, g1, g2) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Fundo ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#07071a');
  bg.addColorStop(0.5, '#0e0826');
  bg.addColorStop(1,   '#07071a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Particulas (canvas puro, sem Unicode)
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(Math.abs(Math.sin(i * 137.508)) * (W - 4));
    const sy = Math.floor(Math.abs(Math.cos(i * 97.318)) * (H - 4));
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }

  // Bordas decorativas
  ctx.strokeStyle = 'rgba(150,100,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(30, 4);     ctx.lineTo(W - 30, 4);     ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, H - 4); ctx.lineTo(W - 30, H - 4); ctx.stroke();

  // ── Titulo SHIPMETRO ─────────────────────────────────────────
  //    Linhas laterais desenhadas por canvas (nao Unicode/emoji)
  const TITLE = 'SHIPMETRO';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleW  = ctx.measureText(TITLE).width;
  const titleY  = 38;
  const lineGap = 18;

  ctx.strokeStyle = 'rgba(180,130,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(36, titleY);
  ctx.lineTo(W / 2 - titleW / 2 - lineGap, titleY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + titleW / 2 + lineGap, titleY);
  ctx.lineTo(W - 36, titleY);
  ctx.stroke();

  // Brilho neon no texto do titulo — esq=corEsq, dir=corDir
  const titleGrad = ctx.createLinearGradient(W / 2 - titleW / 2, 0, W / 2 + titleW / 2, 0);
  titleGrad.addColorStop(0,   corEsq);
  titleGrad.addColorStop(0.5, '#ffffff');
  titleGrad.addColorStop(1,   corDir);
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur  = 24;
  ctx.fillStyle   = titleGrad;
  ctx.fillText(TITLE, W / 2, titleY);
  ctx.shadowBlur  = 0;

  // Subtitulo
  ctx.font      = '13px sans-serif';
  ctx.fillStyle = 'rgba(180,150,255,0.55)';
  ctx.fillText('Compatibilidade', W / 2, titleY + 22);

  // Aviso quando genero nao configurado
  if (!g1 || !g2) {
    ctx.font      = '11px sans-serif';
    ctx.fillStyle = 'rgba(150,150,180,0.5)';
    ctx.fillText('Genero nao configurado. Use !genero para personalizar.', W / 2, titleY + 38);
  }

  // ── Glows ────────────────────────────────────────────────────
  drawGlow(ctx, LEFT_CX,  AV_CY, AV_R, corEsq);
  drawGlow(ctx, RIGHT_CX, AV_CY, AV_R, corDir);

  // ── Avatares ─────────────────────────────────────────────────
  const [imgL, imgR] = await Promise.all([
    fetchAvatar(u1.displayAvatarURL({ extension: 'png', size: 256 })),
    fetchAvatar(u2.displayAvatarURL({ extension: 'png', size: 256 })),
  ]);

  drawCircleAvatar(ctx, imgL, LEFT_CX,  AV_CY, AV_R);
  drawCircleAvatar(ctx, imgR, RIGHT_CX, AV_CY, AV_R);
  drawAvatarBorder(ctx, LEFT_CX,  AV_CY, AV_R, corEsq);
  drawAvatarBorder(ctx, RIGHT_CX, AV_CY, AV_R, corDir);

  // ── Porcentagem (centro, entre os avatares) ───────────────────
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px sans-serif';
  const pctGrad = ctx.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0);
  pctGrad.addColorStop(0, corEsq);
  pctGrad.addColorStop(1, corDir);
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur  = 28;
  ctx.fillStyle   = pctGrad;
  ctx.fillText(`${pct}%`, W / 2, AV_CY);
  ctx.shadowBlur  = 0;

  const tema = getTema(pct);
  ctx.font      = '13px sans-serif';
  ctx.fillStyle = 'rgba(200,180,255,0.6)';
  ctx.fillText(tema.nome, W / 2, AV_CY + 34);

  // ── Nomes e @usernames ────────────────────────────────────────
  //    36px abaixo da borda do avatar — hierarquia garantida
  const maxNameW = 185;
  const nameY    = AV_CY + AV_R + 36;
  const userY    = nameY + 28;

  // Esquerdo
  ctx.font        = 'bold 20px sans-serif';
  const leftName  = fitText(ctx, u1.displayName, maxNameW, 20);
  ctx.textAlign   = 'center';
  ctx.shadowColor = corEsq;
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(leftName, LEFT_CX, nameY);
  ctx.shadowBlur  = 0;
  ctx.font        = '14px sans-serif';
  const leftUser  = fitText(ctx, `@${u1.username}`, maxNameW, 14, '');
  const { r: gr, g: gg, b: gb } = hexToRgb(corEsq);
  ctx.fillStyle = `rgba(${gr},${gg},${gb},0.75)`;
  ctx.fillText(leftUser, LEFT_CX, userY);

  // Direito
  ctx.font        = 'bold 20px sans-serif';
  const rightName = fitText(ctx, u2.displayName, maxNameW, 20);
  ctx.shadowColor = corDir;
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(rightName, RIGHT_CX, nameY);
  ctx.shadowBlur  = 0;
  ctx.font        = '14px sans-serif';
  const rightUser = fitText(ctx, `@${u2.username}`, maxNameW, 14, '');
  const { r: br, g: bg2, b: bb } = hexToRgb(corDir);
  ctx.fillStyle = `rgba(${br},${bg2},${bb},0.75)`;
  ctx.fillText(rightUser, RIGHT_CX, userY);

  // ── Barra de compatibilidade ──────────────────────────────────
  //    50px abaixo do @username — nunca sobrepoe nada
  const barTopY = userY + 50;
  const barH    = 22;
  const barX    = 78;
  const barW    = W - barX * 2;
  const barR    = barH / 2;

  // Trilha
  ctx.fillStyle   = 'rgba(255,255,255,0.06)';
  roundedRect(ctx, barX, barTopY, barW, barH, barR);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 1;
  roundedRect(ctx, barX, barTopY, barW, barH, barR);
  ctx.stroke();

  // Preenchimento gradiente
  const fillW    = Math.max(barR * 2, Math.round((pct / 100) * barW));
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
  fillGrad.addColorStop(0, corEsq);
  fillGrad.addColorStop(1, corDir);
  ctx.fillStyle   = fillGrad;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur  = 14;
  roundedRect(ctx, barX, barTopY, fillW, barH, barR);
  ctx.fill();
  ctx.shadowBlur  = 0;

  // ── Frases ────────────────────────────────────────────────────
  const phraseY = barTopY + barH + 28;

  ctx.font         = 'bold 17px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = '#c084fc';
  ctx.shadowBlur   = 14;
  ctx.fillStyle    = '#ffffff';
  ctx.fillText(tema.msg, W / 2, phraseY);
  ctx.shadowBlur   = 0;

  ctx.font      = '13px sans-serif';
  ctx.fillStyle = 'rgba(180,160,255,0.6)';
  ctx.fillText(tema.msg2, W / 2, phraseY + 24);

  // Rodape
  ctx.font      = '11px sans-serif';
  ctx.fillStyle = 'rgba(140,130,180,0.3)';
  ctx.fillText('FiskBot  Shipmetro', W / 2, H - 10);

  return canvas.toBuffer('image/png');
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg  = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
    if (cmd !== 'ship') return;

    const mencionados = msg.mentions.users;
    const u1 = mencionados.first();
    const u2 = mencionados.at(1);

    if (!u1 || !u2)
      return msg.reply({ embeds: [embedErro('Use: `!ship @usuario1 @usuario2`')] });
    if (u1.id === u2.id)
      return msg.reply({ embeds: [embedErro('Mencione dois usuarios diferentes.')] });

    const cdKey = `ship:${[u1.id, u2.id].sort().join(':')}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 20_000);
    if (espera)
      return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar este par novamente.`)] });

    const pct = gerarPorcentagem(u1.id, u2.id);

    // Buscar genero dos usuarios
    let g1 = null, g2 = null;
    if (isDBConnected()) {
      const [dbU1, dbU2] = await Promise.all([
        Usuario.findOne({ userId: u1.id, guildId: msg.guild.id }).catch(() => null),
        Usuario.findOne({ userId: u2.id, guildId: msg.guild.id }).catch(() => null),
      ]);
      g1 = dbU1?.genero || null;
      g2 = dbU2?.genero || null;
    }

    const [corEsq, corDir] = getCoresGenero(g1, g2);

    try {
      const buffer = await gerarImagemShip(u1, u2, pct, corEsq, corDir, g1, g2);
      const attachment = new AttachmentBuilder(buffer, { name: 'shipmetro.png' });
      return msg.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Ship] Erro:', err.message);
      return msg.reply({ embeds: [embedErro('Nao foi possivel gerar a imagem. Tente novamente.')] });
    }
  });
}
