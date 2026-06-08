import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { registrarLog } from '../utils/logger.mjs';

import Usuario from '../db/models/Usuario.mjs';
import Casamento from '../db/models/Casamento.mjs';

// ── FRASES DE DESTINO ─────────────────────────────
const DESTINO = [
  "O universo já escreveu essa história antes mesmo de vocês se conhecerem.",
  "Nada é acaso — vocês dois foram puxados um ao outro.",
  "Existe algo invisível conectando vocês desde o início.",
  "Seus caminhos se cruzaram por um motivo que ainda será revelado.",
  "Nem o tempo consegue separar o que já foi ligado pelo destino.",
  "Vocês são uma coincidência que insiste em acontecer.",
  "O destino sorriu quando decidiu juntar vocês dois.",
  "Há algo entre vocês que nem a lógica consegue explicar."
];

// ── TEMAS ─────────────────────────────────────────────
const TEMAS = [
  { min: 0, max: 20, nome: 'Distantes', msg: 'Entre vocês há um afastamento emocional.', msg2: 'A conexão ainda não encontrou equilíbrio.' },
  { min: 21, max: 40, nome: 'Conexão Fraca', msg: 'Existe curiosidade, mas pouca sintonia.', msg2: 'Com o tempo isso pode mudar.' },
  { min: 41, max: 60, nome: 'Amizade', msg: 'Há uma base sólida de amizade entre vocês.', msg2: 'Existe potencial para algo maior.' },
  { min: 61, max: 80, nome: 'Romance', msg: 'A conexão entre vocês é forte e envolvente.', msg2: 'Existe química e compatibilidade emocional.' },
  { min: 81, max: 100, nome: 'Almas Gêmeas', msg: 'Vocês parecem profundamente conectados.', msg2: 'Uma ligação rara, intensa e duradoura.' }
];

// ── CORES ─────────────────────────────────────────────
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

// ── CANVAS CONFIG ─────────────────────────────────────
const W = 720;
const H = 520;
const AV_R = 88;
const LEFT_CX = 158;
const RIGHT_CX = W - 158;
const AV_CY = 200;

// ── HELPERS ───────────────────────────────────────────
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

function randomDestino() {
  return DESTINO[Math.floor(Math.random() * DESTINO.length)];
}

// ── IMAGEM SHIP ───────────────────────────────────────
async function gerarImagemShip(u1, u2, pct, corEsq, corDir, casados) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, casados ? '#120a2a' : '#050514');
  bg.addColorStop(0.5, '#0e0826');
  bg.addColorStop(1, '#050514');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }

  const [imgL, imgR] = await Promise.all([
    loadImage(u1.displayAvatarURL({ extension: 'png', size: 256 })),
    loadImage(u2.displayAvatarURL({ extension: 'png', size: 256 }))
  ]);

  const glowL = casados ? '#ffd700' : corEsq;
  const glowR = casados ? '#ffd700' : corDir;

  // glow
  for (let i = 6; i > 0; i--) {
    ctx.beginPath();
    ctx.arc(LEFT_CX, AV_CY, AV_R + i * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + i * 0.01})`;
    ctx.stroke();
  }

  for (let i = 6; i > 0; i--) {
    ctx.beginPath();
    ctx.arc(RIGHT_CX, AV_CY, AV_R + i * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + i * 0.01})`;
    ctx.stroke();
  }

  // avatars
  ctx.save();
  ctx.beginPath();
  ctx.arc(LEFT_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(imgL, LEFT_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(RIGHT_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(imgR, RIGHT_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  ctx.restore();

  // porcentagem
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px sans-serif';

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, corEsq);
  grad.addColorStop(1, corDir);

  ctx.fillStyle = grad;
  ctx.fillText(`${pct}%`, W / 2, AV_CY);

  // casamento
  if (casados) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('💍 CASAL OFICIAL', W / 2, AV_CY - 70);
  }

  return canvas.toBuffer('image/png');
}

// ── REGISTER ──────────────────────────────────────────
export function register(client, configs) {
    if (client.__shipRegistrado) return;
    client.__shipRegistrado = true;
  client.on('messageCreate', async (msg) => {

    const cfg = configs.get(msg.guild?.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    if (args.shift().toLowerCase() !== 'ship') return;

    let u1 = msg.mentions.users.first();
    let u2 = msg.mentions.users.at(1);

    // !ship @user
    if (!u2 && u1) {
      u2 = u1;
      u1 = msg.author;
    }

    if (!u1 || !u2)
      return msg.reply({ embeds: [embedErro('Use: `!ship @user` ou `!ship @user1 @user2`')] });

    const pct = gerarPorcentagem(u1.id, u2.id);

    let g1 = null, g2 = null, casados = false;

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
    const destino = randomDestino();

    try {
      const buffer = await gerarImagemShip(
        u1,
        u2,
        pct,
        corEsq,
        corDir,
        casados
      );

      const attachment = new AttachmentBuilder(buffer, {
        name: 'ship.png'
      });

      await registrarLog(
        client,
        msg.guild.id,
        'ship',
        msg.author.id,
        {
          usuarios: [u1.id, u2.id],
          porcentagem: pct,
          casados
        }
      );

      return msg.reply({
        content: `💫 **Destino:** ${destino}`,
        files: [attachment]
      });

    } catch (err) {
      console.error('[SHIP]', err);

      return msg.reply({
        embeds: [embedErro('Erro ao gerar ship.')]
      });
    }
  });
}

  export const comandos = [
  {
    cmd: '!ship @user',
    desc: 'Calcula a compatibilidade com alguém.'
  },
  {
    cmd: '!ship @user1 @user2',
    desc: 'Calcula a compatibilidade entre dois usuários.'
  }
];
