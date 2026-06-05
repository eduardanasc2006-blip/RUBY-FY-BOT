import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';

import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

/* =========================
   MOLDURAS
========================= */

const MOLDURAS = [
  { id: 'padrao', nome: 'Padrão', emoji: '⬜' },
  { id: 'bronze', nome: 'Bronze', emoji: '🟫' },
  { id: 'prata', nome: 'Prata', emoji: '⬜' },
  { id: 'ouro', nome: 'Ouro', emoji: '🟨' },
  { id: 'diamante', nome: 'Diamante', emoji: '🔷' },
  { id: 'neon_azul', nome: 'Neon Azul', emoji: '🟦' },
  { id: 'neon_roxo', nome: 'Neon Roxo', emoji: '🟪' },
  { id: 'cosmica', nome: 'Cósmica', emoji: '🌌' },
];

/* =========================
   FUNDOS
========================= */

const FUNDOS = [
  { id: 'escuro', nome: 'Escuro' },
  { id: 'galaxia', nome: 'Galáxia' },
  { id: 'floresta', nome: 'Floresta' },
  { id: 'oceano', nome: 'Oceano' },
  { id: 'pordosol', nome: 'Pôr do Sol' },
  { id: 'neon', nome: 'Neon' },
];

/* =========================
   UTIL
========================= */

function gerarBarra(atual, total, size = 12) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * size);
  return '█'.repeat(f) + '░'.repeat(size - f);
}

function nomeMoldura(id) {
  return MOLDURAS.find(m => m.id === id)?.nome || 'Padrão';
}

function nomeFundo(id) {
  return FUNDOS.find(f => f.id === id)?.nome || 'Escuro';
}

function corMoldura(id) {
  const mapa = {
    padrao: 0x5865f2,
    bronze: 0xcd7f32,
    prata: 0xc0c0c0,
    ouro: 0xffd700,
    diamante: 0xb9f2ff,
    neon_azul: 0x00bfff,
    neon_roxo: 0xa855f7,
    cosmica: 0xff00ff,
  };
  return mapa[id] || 0x5865f2;
}

/* =========================
   PERFIL
========================= */

async function mostrarPerfil(alvo, guildId, guild, replyFn) {
  const [u, conquistas, casamento] = await Promise.all([
    Usuario.findOne({ userId: alvo.id, guildId }),
    Conquista.findOne({ userId: alvo.id, guildId }),
    Casamento.findOne({
      guildId,
      ativo: true,
      $or: [{ userId1: alvo.id }, { userId2: alvo.id }],
    }),
  ]);

  if (!u) {
    return replyFn({ embeds: [embedErro('Usuário não encontrado.')] });
  }

  /* =========================
     XP SYSTEM (NOVO)
  ========================= */

  const xpTotal = u.xpTotal || u.xp || 0;
  const xpDisponivel = u.xpDisponivel || 0;

  const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
  const faixa = getFaixa(nivel);

  const moldura = u.inventario?.moldura || 'padrao';
  const fundo = u.inventario?.fundo || 'escuro';
  const streak = u.streak || 0;

  const barra = gerarBarra(xpAtual, xpProximo);
  const pct = Math.round((xpAtual / xpProximo) * 100);

  /* =========================
     CASAMENTO + XP 12K REGRAS
  ========================= */

  let parceiroNome = null;
  let afinidadePct = null;

  if (casamento) {
    const parceiroId =
      casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;

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

  /* =========================
     EMBED
  ========================= */

  const embed = new EmbedBuilder()
    .setColor(corMoldura(moldura))
    .setTitle(`👤 ${alvo.globalName || alvo.username}`)
    .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
    .setAuthor({
      name: `Lv ${nivel} • ${faixa.nome}`,
      iconURL: alvo.displayAvatarURL(),
    })
    .addFields(
      { name: `${faixa.emoji} Nível`, value: `${barra} ${pct}%`, inline: false },
      { name: '⭐ XP Total', value: `${xpTotal}`, inline: true },
      { name: '💰 XP Disponível', value: `${xpDisponivel}`, inline: true },
      { name: '🔥 Streak', value: streak ? `${streak} dias` : '—', inline: true },
      { name: '🏆 Conquistas', value: `${conquistas?.conquistas?.length || 0}`, inline: true },
      { name: '🎖️ Última Conquista', value: conquistas?.conquistas?.slice(-1)[0] || 'Nenhuma', inline: false },
      { name: '🖼️ Moldura', value: nomeMoldura(moldura), inline: true },
      { name: '🌌 Fundo', value: nomeFundo(fundo), inline: true },
    );

  if (casamento) {
    embed.addFields(
      { name: '💍 Casado(a) com', value: parceiroNome, inline: true },
      { name: '💘 Afinidade', value: `${afinidadePct || 0}%`, inline: true }
    );
  }

  /* =========================
     BOTÕES
  ========================= */

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

  return replyFn({ embeds: [embed], components: [row] });
}

/* =========================
   REGISTER
========================= */

export const comandos = [
  { cmd: '!meuperfil [@user]', desc: 'Perfil completo (XP, nível, conquistas, casamento).' },
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

    if (!isDBConnected())
      return msg.reply({ embeds: [embedErro('Banco offline.')] });

    const cd = checkCooldown(`perfil:${msg.author.id}:${msg.guild.id}`, 8000);
    if (cd)
      return msg.reply({ embeds: [embedErro(`Aguarde ${formatarTempo(cd)}`)] });

    const alvo = msg.mentions.users.first() || msg.author;

    return mostrarPerfil(alvo, msg.guild.id, msg.guild, opts =>
      msg.reply(opts)
    );
  });
}
