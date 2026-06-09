import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import QuizModel from '../db/models/Quiz.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

/* ─────────────────────────────────────────────
   CONFIG DO GAME
──────────────────────────────────────────── */
const MAX_ERROS = 4;
const TEMPO_PERGUNTA = 25_000;

const LETRAS = ['A', 'B', 'C', 'D'];

const jogosAtivos = new Map();

/* ─────────────────────────────────────────────
   PERGUNTAS (SEU BANCO ORIGINAL)
──────────────────────────────────────────── */
const PERGUNTAS = { /* mantém igual ao seu */ };

const TODAS_CATS = Object.keys(PERGUNTAS);

/* ─────────────────────────────────────────────
   UTIL
──────────────────────────────────────────── */
function sortearPergunta(categoria) {
  if (categoria === 'geral') {
    const cat = TODAS_CATS[Math.floor(Math.random() * TODAS_CATS.length)];
    const p = PERGUNTAS[cat];
    return { pergunta: p[Math.floor(Math.random() * p.length)], categoria: cat };
  }

  const p = PERGUNTAS[categoria] || PERGUNTAS[TODAS_CATS[0]];
  return { pergunta: p[Math.floor(Math.random() * p.length)], categoria };
}

function gerarRanking(jogo) {
  const users = Object.entries(jogo.pontos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!users.length) return 'Ninguém pontuou.';

  return users
    .map((u, i) => `**#${i + 1}** <@${u[0]}> — ⭐ ${u[1]} pts`)
    .join('\n');
}

/* ─────────────────────────────────────────────
   INICIAR JOGO
──────────────────────────────────────────── */
async function iniciarQuiz(channel, userId, guildId, categoria) {
  const chave = `${channel.id}:${guildId}`;

  if (jogosAtivos.has(chave)) {
    return channel.send({
      embeds: [embedErro('Já existe um quiz ativo neste canal!')]
    });
  }

  const jogo = {
    categoria,
    pontos: {},
    erros: {},
    streak: {},
    iniciadoPor: userId,
    perguntaAtual: null,
    timer: null,
    ativo: true,
  };

  jogosAtivos.set(chave, jogo);

  await enviarPergunta(channel, chave);
}

/* ─────────────────────────────────────────────
   ENVIAR PERGUNTA
──────────────────────────────────────────── */
async function enviarPergunta(channel, chave) {
  const jogo = jogosAtivos.get(chave);
  if (!jogo || !jogo.ativo) return;

  const { pergunta, categoria } = sortearPergunta(jogo.categoria);
  jogo.perguntaAtual = pergunta;

  const opcoes = pergunta.ops
    .map((o, i) => `${LETRAS[i]}) ${o}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🧠 Quiz - ${categoria}`)
    .setDescription(`**${pergunta.p}**\n\n${opcoes}`)
    .setFooter({
      text: `Responda A, B, C ou D • Erros: 0/${MAX_ERROS}`
    });

  await channel.send({ embeds: [embed] });

  clearTimeout(jogo.timer);

  jogo.timer = setTimeout(() => {
    encerrarJogo(channel, chave, '⏱ Tempo esgotado!');
  }, TEMPO_PERGUNTA);
}

/* ─────────────────────────────────────────────
   PROCESSAR RESPOSTA
──────────────────────────────────────────── */
async function processarResposta(msg, jogo, chave) {
  const resposta = msg.content.trim().toUpperCase();
  if (!LETRAS.includes(resposta)) return;

  const userId = msg.author.id;
  const idx = LETRAS.indexOf(resposta);
  const correto = idx === jogo.perguntaAtual.r;

  // init user
  jogo.pontos[userId] = jogo.pontos[userId] || 0;
  jogo.erros[userId] = jogo.erros[userId] || 0;
  jogo.streak[userId] = jogo.streak[userId] || 0;

  if (correto) {
    jogo.pontos[userId] += 10;
    jogo.streak[userId]++;

    await msg.react('✅').catch(() => {});
  } else {
    jogo.erros[userId]++;
    jogo.streak[userId] = 0;

    await msg.react('❌').catch(() => {});
  }

  // eliminação por vidas
  if (jogo.erros[userId] >= MAX_ERROS) {
    await msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription(`💀 <@${userId}> foi eliminado com ${MAX_ERROS} erros!`)
      ]
    });
  }

  // continua jogo (NUNCA encerra aqui)
  await enviarPergunta(msg.channel, chave);
}

/* ─────────────────────────────────────────────
   ENCERRAR JOGO
──────────────────────────────────────────── */
async function encerrarJogo(channel, chave, motivo) {
  const jogo = jogosAtivos.get(chave);
  if (!jogo) return;

  jogo.ativo = false;
  clearTimeout(jogo.timer);

  const ranking = gerarRanking(jogo);

  jogosAtivos.delete(chave);

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏁 Quiz Encerrado')
        .setDescription(`${motivo}\n\n🏆 **Ranking Final:**\n${ranking}`)
    ]
  });
}

/* ─────────────────────────────────────────────
   REGISTER
──────────────────────────────────────────── */
export function register(client, configs) {
  if (client.__quizRegistrado) return;
  client.__quizRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    const chave = `${msg.channel.id}:${msg.guild.id}`;
    const jogo = jogosAtivos.get(chave);

    // respostas do jogo (ANTES do comando)
    if (jogo && jogo.ativo && !msg.content.startsWith(prefixo)) {
      return processarResposta(msg, jogo, chave);
    }

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'quiz') return;

    const cdKey = `quiz:${msg.author.id}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 15000);

    if (espera) {
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(espera)}**`)]
      });
    }

    const cat = args[0] || 'geral';

    return iniciarQuiz(msg.channel, msg.author.id, msg.guild.id, cat);
  });
}
