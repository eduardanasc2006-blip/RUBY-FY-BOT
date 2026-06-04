import {
  AttachmentBuilder
} from 'discord.js';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';

import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

/* =========================
   BARRA XP MELHORADA
========================= */
function gerarBarra(atual, total, size = 18) {
  const p = Math.max(0, Math.min(1, atual / Math.max(1, total)));
  const fill = Math.round(p * size);
  return {
    bar: '█'.repeat(fill) + '░'.repeat(size - fill),
    percent: Math.floor(p * 100),
  };
}

/* =========================
   PERFIL CANVAS
========================= */
async function gerarImagemPerfil(user, guildId, guild) {
  const [u, conquistas, casamento] = await Promise.all([
    Usuario.findOne({ userId: user.id, guildId }),
    Conquista.findOne({ userId: user.id, guildId }),
    Casamento.findOne({
      guildId,
      ativo: true,
      $or: [{ userId1: user.id }, { userId2: user.id }],
    }),
  ]);

  if (!u) return null;

  const xpTotal = u.xpTotal || 0;
  const xpDisponivel = u.xpDisponivel || 0;

  const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
  const faixa = getFaixa(nivel);

  const canvas = createCanvas(900, 500);
  const ctx = canvas.getContext('2d');

  /* fundo simples */
  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, 900, 500);

  /* avatar */
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);

  ctx.save();
  ctx.beginPath();
  ctx.arc(100, 120, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 30, 50, 140, 140);
  ctx.restore();

  /* nome */
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  ctx.fillText(user.globalName || user.username, 200, 90);

  /* nível */
  ctx.font = '22px Arial';
  ctx.fillStyle = faixa?.cor ? '#00ffcc' : '#ffffff';
  ctx.fillText(`Nível: ${nivel} • ${faixa.nome}`, 200, 130);

  /* XP */
  const { bar, percent } = gerarBarra(xpAtual, xpProximo);

  ctx.font = '20px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`XP: ${xpAtual} / ${xpProximo} (${percent}%)`, 200, 180);

  /* barra visual */
  ctx.fillStyle = '#333';
  ctx.fillRect(200, 200, 500, 20);

  ctx.fillStyle = '#00ffcc';
  ctx.fillRect(200, 200, (500 * percent) / 100, 20);

  /* infos extras */
  ctx.fillStyle = '#aaa';
  ctx.font = '18px Arial';
  ctx.fillText(`🔥 Streak: ${u.streak || 0}`, 200, 260);
  ctx.fillText(`⭐ XP Disponível: ${xpDisponivel}`, 200, 290);
  ctx.fillText(`🏆 Conquistas: ${conquistas?.conquistas?.length || 0}`, 200, 320);

  if (casamento) {
    const parceiroId =
      casamento.userId1 === user.id ? casamento.userId2 : casamento.userId1;

    ctx.fillText(`💍 Casamento ativo`, 200, 360);
    ctx.fillText(`💘 Parceiro: ${parceiroId}`, 200, 390);
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   COMANDO !meuperfil
========================= */
export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'meuperfil') return;

    if (!isDBConnected())
      return msg.reply({ embeds: [embedErro('Banco offline.')] });

    const cd = checkCooldown(`perfil:${msg.author.id}`, 8000);
    if (cd)
      return msg.reply({ embeds: [embedErro(`Aguarde ${formatarTempo(cd)}`)] });

    const alvo = msg.mentions.users.first() || msg.author;

    const img = await gerarImagemPerfil(alvo, msg.guild.id, msg.guild);

    if (!img)
      return msg.reply({ embeds: [embedErro('Usuário não encontrado.')] });

    return msg.reply({
      files: [new AttachmentBuilder(img, { name: 'perfil.png' })],
    });
  });
      }
