import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';

import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';

// ───────────────────────────────
// MOLDURAS
// ───────────────────────────────
const MOLDURAS = [
  { id: 'padrao', nome: 'Padrao', emoji: '⬜', desc: 'Moldura simples padrao' },
  { id: 'bronze', nome: 'Bronze', emoji: '🟫', desc: 'Acabamento em bronze' },
  { id: 'prata', nome: 'Prata', emoji: '⬜', desc: 'Acabamento em prata' },
  { id: 'ouro', nome: 'Ouro', emoji: '🟨', desc: 'Acabamento em ouro' },
  { id: 'diamante', nome: 'Diamante', emoji: '🔷', desc: 'Cristal diamante' },
  { id: 'neon_azul', nome: 'Neon Azul', emoji: '🟦', desc: 'Brilho neon azul' },
  { id: 'neon_roxo', nome: 'Neon Roxo', emoji: '🟪', desc: 'Brilho neon roxo' },
  { id: 'cosmica', nome: 'Cosmica', emoji: '🌌', desc: 'Gradiente cosmico' },
];

// ───────────────────────────────
// FUNDOS
// ───────────────────────────────
const FUNDOS = [
  { id: 'escuro', nome: 'Escuro', desc: 'Fundo padrao escuro' },
  { id: 'galaxia', nome: 'Galaxia', desc: 'Tons azul-roxo espacial' },
  { id: 'floresta', nome: 'Floresta', desc: 'Verde escuro natural' },
  { id: 'oceano', nome: 'Oceano', desc: 'Azul profundo' },
  { id: 'pordosol', nome: 'Por do Sol', desc: 'Laranja e rosa' },
  { id: 'neon', nome: 'Neon', desc: 'Luzes neon vibrantes' },
];

const LABEL_GENERO = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro',
};

// ───────────────────────────────
// UTIL
// ───────────────────────────────
function gerarBarra(atual, total, tamanho = 12) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '`' + '█'.repeat(f) + '░'.repeat(tamanho - f) + '`';
}

function nomeMoldura(id) {
  return MOLDURAS.find(m => m.id === id)?.nome || 'Padrao';
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

function chaveAfin(u1, u2) {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

// ───────────────────────────────
// PERFIL
// ───────────────────────────────
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

  const xp = u?.xp || 0;
  const { nivel, xpAtual, xpProximo } = calcularNivel(xp);

  const pct = xpProximo > 0 ? Math.round((xpAtual / xpProximo) * 100) : 100;
  const faixa = getFaixa(nivel);
  const barra = gerarBarra(xpAtual, xpProximo);

  const moldura = u?.moldura || 'padrao';
  const fundo = u?.fundo || 'escuro';
  const genero = u?.genero || null;
  const streak = u?.streak || 0;

  // ── última conquista ──
  const ultimaConquista =
    conquistas?.conquistas?.length > 0
      ? conquistas.conquistas[conquistas.conquistas.length - 1]
      : null;

  // ── casamento ──
  let parceiroNome = null;
  let afinidadePct = null;

  if (casamento) {
    const parceiroId =
      casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;

    try {
      const membro = await guild.members.fetch(parceiroId).catch(() => null);
      parceiroNome = membro
        ? (membro.user.globalName || membro.user.username)
        : `<@${parceiroId}>`;

      const [u1, u2] = chaveAfin(alvo.id, parceiroId);

      const afin = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });

      if (afin && afin.pontos !== undefined) {
        afinidadePct = Math.min(100, Math.round((afin.pontos / 2000) * 100));
      }
    } catch {}
  }

  // ── quiz ──
  let quizPrecisao = null;
  try {
    const Quiz = (await import('../db/models/Quiz.mjs')).default;
    const q = await Quiz.findOne({ userId: alvo.id, guildId });

    if (q && (q.acertos + q.erros) > 0) {
      quizPrecisao = Math.round((q.acertos / (q.acertos + q.erros)) * 100);
    }
  } catch {}

  // ── forca ──
  let forcaVitorias = null;
  try {
    const Forca = (await import('../db/models/Forca.mjs')).default;
    const fc = await Forca.findOne({ userId: alvo.id, guildId });
    forcaVitorias = fc?.vitorias ?? 0;
  } catch {}

  const embed = new EmbedBuilder()
    .setColor(corMoldura(moldura))
    .setTitle(`👤 ${alvo.globalName || alvo.username}`)
    .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
    .setDescription(u?.tituloEquipado ? `👑 *"${u.tituloEquipado}"*` : '')
    .setAuthor({
      name: `Lv ${nivel} • ${faixa.nome}`,
      iconURL: alvo.displayAvatarURL(),
    });

  const fields = [
    {
      name: `${faixa.emoji} Nível`,
      value: `${barra} **${pct}%**`,
      inline: false,
    },
    { name: '📈 XP', value: `${xp}`, inline: true },
    { name: '⭐ Reputação', value: `${u?.reputacao || 0}`, inline: true },
    { name: '💬 Mensagens', value: `${u?.mensagens || 0}`, inline: true },
    { name: '🔥 Streak', value: streak > 0 ? `${streak} dias` : '—', inline: true },
    {
      name: '🏆 Conquistas',
      value: `${conquistas?.conquistas?.length || 0}`,
      inline: true,
    },
    {
      name: '🎖️ Última Conquista',
      value: ultimaConquista || 'Nenhuma',
      inline: false,
    },
  ];

  if (casamento && parceiroNome)
    fields.push({
      name: '💍 Casado(a) com',
      value: parceiroNome,
      inline: true,
    });

  if (afinidadePct !== null)
    fields.push({
      name: '💘 Afinidade',
      value: `${afinidadePct}%`,
      inline: true,
    });

  if (quizPrecisao !== null)
    fields.push({
      name: '🧠 Quiz',
      value: `${quizPrecisao}%`,
      inline: true,
    });

  if (forcaVitorias !== null)
    fields.push({
      name: '🔤 Força',
      value: `${forcaVitorias}`,
      inline: true,
    });

  fields.push(
    { name: '👤 Gênero', value: genero || 'Não definido', inline: true },
    { name: '🖼️ Moldura', value: nomeMoldura(moldura), inline: true },
    { name: '🌌 Fundo', value: nomeFundo(fundo), inline: true }
  );

  embed.addFields(fields);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`perfil:moldura:${alvo.id}:${guildId}`)
      .setLabel('Moldura')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`perfil:fundo:${alvo.id}:${guildId}`)
      .setLabel('Fundo')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`perfil:titulos:${alvo.id}:${guildId}`)
      .setLabel('Titulo')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`perfil:genero:${alvo.id}:${guildId}`)
      .setLabel('Genero')
      .setStyle(ButtonStyle.Secondary)
  );

  return replyFn({ embeds: [embed], components: [row] });
}

// ───────────────────────────────
// REGISTER
// ───────────────────────────────
export function register(client, configs) {
  client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'meuperfil') return;

    if (!isDBConnected())
      return msg.reply({ embeds: [embedErro('Banco offline.')] });

    const cdKey = `perfil:${msg.author.id}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 8000);

    if (espera)
      return msg.reply({
        embeds: [embedErro(`Aguarde ${formatarTempo(espera)}`)],
      });

    const alvo = msg.mentions.users.first() || msg.author;

    await mostrarPerfil(alvo, msg.guild.id, msg.guild, opts =>
      msg.reply(opts)
    );
  });
      }
