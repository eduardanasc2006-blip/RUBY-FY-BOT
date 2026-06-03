import {
  EmbedBuilder,
} from 'discord.js';

import QuizModel from '../db/models/Quiz.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { progredirMissao } from './missoes.mjs';

/* =========================
   PERGUNTAS (SEM OPÇÕES VISÍVEIS)
========================= */

const PERGUNTAS = {
  geral: [
    { p: 'Qual é a capital do Brasil?', r: 'brasília' },
  ],
  roblox: [
    { p: 'Qual moeda é usada no Roblox?', r: 'robux' },
  ],
  anime: [
    { p: 'Quem é o protagonista de Naruto?', r: 'naruto' },
  ],
  matematica: [
    { p: 'Quanto é 15 × 15?', r: '225' },
  ],
};

const cooldownQuiz = new Map();
const jogosAtivos = new Map();

/* =========================
   FUNÇÕES AUXILIARES
========================= */

function normalizar(txt) {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/* =========================
   USUÁRIO
========================= */

async function getUser(userId, guildId) {
  let u = await Usuario.findOne({ userId, guildId });

  if (!u) {
    u = await Usuario.create({
      userId,
      guildId,
      xp: 0,
      vidas: 3,
    });
  }

  if (u.vidas === undefined) u.vidas = 3;

  return u;
}

/* =========================
   INICIAR QUIZ
========================= */

async function iniciarQuiz(msg, userId, guildId, categoria) {
  const chave = `${userId}:${guildId}`;

  if (jogosAtivos.has(chave)) {
    return msg.reply({ embeds: [embedErro('Você já está em um quiz!')] });
  }

  const cat = PERGUNTAS[categoria] || PERGUNTAS.geral;
  const pergunta = cat[Math.floor(Math.random() * cat.length)];

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🧠 Quiz — ${categoria}`)
    .setDescription(`**${pergunta.p}**\n\n⏳ Responda digitando sua resposta no chat!`)
    .setFooter({ text: 'Você tem 30 segundos para responder' });

  await msg.reply({ embeds: [embed] });

  jogosAtivos.set(chave, {
    resposta: normalizar(pergunta.r),
  });

  setTimeout(() => jogosAtivos.delete(chave), 30000);
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    const content = msg.content.trim();
    const args = content.slice(prefixo.length).split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    const guildId = msg.guild.id;
    const userId = msg.author.id;

    /* =========================
       COMANDO QUIZ
    ========================= */

    if (cmd === 'quiz') {
      const cd = cooldownQuiz.get(`${userId}:${guildId}`);
      if (cd && Date.now() - cd < 15000) {
        return msg.reply({ embeds: [embedErro('Aguarde para jogar novamente.')] });
      }

      cooldownQuiz.set(`${userId}:${guildId}`, Date.now());

      const categoria = args[0]?.toLowerCase() || 'geral';
      return iniciarQuiz(msg, userId, guildId, categoria);
    }

    /* =========================
       RESPOSTA DO USUÁRIO
    ========================= */

    const chave = `${userId}:${guildId}`;
    const jogo = jogosAtivos.get(chave);

    if (!jogo) return;

    const respostaUser = normalizar(content);

    if (!respostaUser) return;

    jogosAtivos.delete(chave);

    const user = await getUser(userId, guildId);

    const acertou =
      respostaUser.includes(jogo.resposta) ||
      jogo.resposta.includes(respostaUser);

    if (acertou) {
      user.xp += 30;
      await user.save();

      await progredirMissao(userId, guildId, 'quiz');

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`✅ Correto! +30 XP 🎉`),
        ],
      });
    }

    user.vidas = Math.max(0, (user.vidas || 3) - 1);
    await user.save();

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription(
            `❌ Errado!\n💔 Vidas restantes: **${user.vidas}/3**`
          ),
      ],
    });
  });
}
