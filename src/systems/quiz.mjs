import { EmbedBuilder } from 'discord.js';
import QuizModel from '../db/models/Quiz.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

const PERGUNTAS = {
  roblox: [
    { p: 'Em que ano o Roblox foi lançado?', r: '2006' },
    { p: 'Moeda do Roblox?', r: 'Robux' },
  ],
  anime: [
    { p: 'Quem é o protagonista de Naruto?', r: 'Naruto' },
    { p: 'Anime do Goku?', r: 'Dragon Ball' },
  ],
  geral: [
    { p: 'Quanto é 2 + 2?', r: '4' },
    { p: 'Capital do Brasil?', r: 'Brasília' },
  ],
};

const ativos = new Map();

function sortear(cat) {
  const lista = PERGUNTAS[cat] || PERGUNTAS.geral;
  return lista[Math.floor(Math.random() * lista.length)];
}

async function iniciarQuiz(msg, guildId, userId, cat) {
  const key = `${guildId}:${userId}`;

  if (ativos.has(key))
    return msg.reply({ embeds: [embedErro('Você já está em um quiz!')] });

  let vidas = 3;
  let pergunta = sortear(cat);

  const canal = msg.channel;

  const coletor = canal.createMessageCollector({
    filter: m => m.author.id === userId,
    time: 30000
  });

  const enviarPergunta = async () => {
    pergunta = sortear(cat);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🧠 Quiz')
          .setDescription(`**${pergunta.p}**\n\n❤️ Vidas: ${vidas}`)
          .setFooter({ text: 'Responda em 30s no chat' })
      ]
    });
  };

  ativos.set(key, { vidas, coletor });

  await enviarPergunta();

  const timer = setTimeout(() => {
    coletor.stop('timeout');
  }, 30000);

  coletor.on('collect', async (m) => {
    if (m.author.bot) return;

    if (m.content.toLowerCase() === '!quizparar') {
      coletor.stop('manual');
      return;
    }

    clearTimeout(timer);

    if (m.content.toLowerCase() === pergunta.r.toLowerCase()) {
      await ganharXP(userId, guildId, XP_EVENTS.QUIZ, 'quiz');
      await canal.send(`✅ Correto <@${userId}>! +XP`);

      pergunta = sortear(cat);
      return enviarPergunta();
    } else {
      vidas--;

      if (vidas <= 0) {
        coletor.stop('lose');
        return;
      }

      await canal.send(`❌ Errado! Vidas restantes: ${vidas}`);
      pergunta = sortear(cat);
      return enviarPergunta();
    }
  });

  coletor.on('end', async (_, reason) => {
    ativos.delete(key);

    if (reason === 'timeout') {
      return canal.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`⏰ Tempo acabou! Resposta era: **${pergunta.r}**`)
        ]
      });
    }

    if (reason === 'lose') {
      return canal.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`💀 <@${userId}> perdeu todas as vidas!`)
        ]
      });
    }
  });
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;
    const userId = msg.author.id;

    if (cmd === 'quiz') {
      const cd = checkCooldown(`quiz:${userId}:${guildId}`, 15000);
      if (cd) return msg.reply(embedErro(`Aguarde ${formatarTempo(cd)}`));

      const cat = args[0] || 'geral';
      return iniciarQuiz(msg, guildId, userId, cat);
    }

    if (cmd === 'quizparar') {
      const key = `${guildId}:${userId}`;
      const jogo = ativos.get(key);

      if (!jogo) return msg.reply(embedErro('Nenhum quiz ativo.'));
      jogo.coletor.stop('manual');
      return msg.reply('🛑 Quiz encerrado.');
    }
  });
    }
