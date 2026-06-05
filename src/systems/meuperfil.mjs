import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';

import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

import { createCanvas, loadImage } from '@napi-rs/canvas';

/* =========================
   FUNDO
========================= */

function corFundo(id) {
  const mapa = {
    escuro: '#1e1f22',
    galaxia: '#2b2d31',
    floresta: '#1f3b2c',
    oceano: '#0d2b45',
    pordosol: '#ff7a59',
    neon: '#8a2be2',
  };
  return mapa[id] || '#1e1f22';
}

/* =========================
   BARRA XP
========================= */

function drawBar(ctx, x, y, w, h, p) {
  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#00ff88';
  ctx.fillRect(x, y, w * p, h);
}

/* =========================
   CANVAS PERFIL
========================= */

async function renderPerfil({
  user,
  nivel,
  xpAtual,
  xpProximo,
  xpTotal,
  streak,
  fundo,
  avatarURL,
}) {
  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  /* FUNDO */
  ctx.fillStyle = corFundo(fundo);
  ctx.fillRect(0, 0, 900, 300);

  /* CARD */
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(40, 40, 820, 220);

  /* NOME */
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(user.username, 180, 95);

  /* NÍVEL */
  ctx.font = '20px Sans';
  ctx.fillText(`Nível ${nivel}`, 180, 130);

  /* XP */
  ctx.font = '16px Sans';
  ctx.fillText(`${xpAtual} / ${xpProximo} XP`, 180, 160);

  /* BARRA XP */
  const p = Math.min(1, xpAtual / Math.max(1, xpProximo));
  drawBar(ctx, 180, 175, 500, 18, p);

  /* STREAK */
  ctx.fillText(`🔥 Streak: ${streak || 0} dias`, 180, 230);

  /* AVATAR */
  const avatar = await loadImage(avatarURL);

  const x = 70;
  const y = 80;
  const size = 100;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + 50, y + 50, 50, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(avatar, x, y, size, size);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/* =========================
   PERFIL PRINCIPAL
========================= */

async function mostrarPerfil(alvo, guildId, guild, replyFn) {
  const [usuario, conquistas, casamento] = await Promise.all([
    Usuario.findOne({ userId: alvo.id, guildId }),
    Conquista.findOne({ userId: alvo.id, guildId }),
    Casamento.findOne({
      guildId,
      ativo: true,
      $or: [{ userId1: alvo.id }, { userId2: alvo.id }],
    }),
  ]);

  if (!usuario) {
    return replyFn({ embeds: [embedErro('Usuário não encontrado.')] });
  }

  /* XP */
  const xpTotal = usuario.xpTotal || usuario.xp || 0;
  const xpDisponivel = usuario.xpDisponivel || 0;

  const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
  const faixa = getFaixa(nivel);

  const streak = usuario.streak || 0;
  const fundo = usuario.inventario?.fundo || 'escuro';

  /* CASAMENTO */
  let parceiroNome = null;
  let afinidadePct = null;

  if (casamento) {
    const parceiroId =
      casamento.userId1 === alvo.id
        ? casamento.userId2
        : casamento.userId1;

    const membro = await guild.members.fetch(parceiroId).catch(() => null);

    parceiroNome = membro
      ? (membro.user.globalName || membro.user.username)
      : `<@${parceiroId}>`;

    const [u1, u2] = [alvo.id, parceiroId].sort();

    const afin = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });

    if (afin?.pontos) {
      afinidadePct = Math.min(100, Math.round((afin.pontos / 2000) * 100));
    }
  }

  /* IMAGEM FINAL */
  const buffer = await renderPerfil({
    user: alvo,
    nivel,
    xpAtual,
    xpProximo,
    xpTotal,
    streak,
    fundo,
    avatarURL: alvo.displayAvatarURL({ extension: 'png', size: 256 }),
  });

  const file = new AttachmentBuilder(buffer, {
    name: 'perfil.png',
  });

  /* BOTÕES */
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`perfil:moldura:${alvo.id}:${guildId}`)
      .setLabel('Moldura')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`perfil:fundo:${alvo.id}:${guildId}`)
      .setLabel('Fundo')
      .setStyle(ButtonStyle.Secondary)
  );

  return replyFn({
    files: [file],
    components: [row],
  });
}

/* =========================
   REGISTER
========================= */

export const comandos = [
  { cmd: '!meuperfil [@user]', desc: 'Perfil em imagem (XP, nível, streak, etc).' },
];

export function register(client, configs) {
  client.on('messageCreate', async msg => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'meuperfil') return;

    if (!isDBConnected()) {
      return msg.reply({ embeds: [embedErro('Banco offline.')] });
    }

    const cd = checkCooldown(`perfil:${msg.author.id}:${msg.guild.id}`, 8000);
    if (cd) {
      return msg.reply({ embeds: [embedErro(`Aguarde ${formatarTempo(cd)}`)] });
    }

    const alvo = msg.mentions.users.first() || msg.author;

    return mostrarPerfil(alvo, msg.guild.id, msg.guild, opts =>
      msg.reply(opts)
    );
  });
}
