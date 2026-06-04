import { EmbedBuilder } from 'discord.js';
import ForcaModel from '../db/models/Forca.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

/* =========================
   PALAVRAS POR CATEGORIA
========================= */

const PALAVRAS = {
  anime: ['NARUTO', 'GOKU', 'LUFFY', 'SASUKE', 'TANJIRO', 'MIKASA', 'LEVI'],
  roblox: ['ROBUX', 'BLOXBURG', 'OBBY', 'STUDIO', 'AVATAR'],
  jogos: ['MINECRAFT', 'FORTNITE', 'ROBLOX', 'VALORANT', 'FREEFIRE'],
  paises: ['BRASIL', 'JAPAO', 'FRANCA', 'ALEMANHA', 'CANADA'],
  geral: ['PROGRAMADOR', 'DISCORD', 'JAVASCRIPT', 'COMPUTADOR'],
};

/* =========================
   ARMAZENAMENTO DE JOGOS
========================= */

const jogosAtivos = new Map();

/* =========================
   ARTE FORCA
========================= */

const FORCA_ARTE = [
`  +---+
      |
      |
      |
     ===`,
`  +---+
  O   |
      |
      |
     ===`,
`  +---+
  O   |
  |   |
      |
     ===`,
`  +---+
  O   |
 /|   |
      |
     ===`,
`  +---+
  O   |
 /|\\  |
      |
     ===`,
`  +---+
  O   |
 /|\\  |
 /    |
     ===`,
`  +---+
  O   |
 /|\\  |
 / \\  |
     ===`,
];

/* =========================
   FUNÇÃO DE ESTADO
========================= */

async function enviarEstado(channel, userId, jogo) {
  const palavraMostrada = jogo.palavra
    .split('')
    .map(l => (jogo.letras.includes(l) ? l : '_'))
    .join(' ');

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🎯 Jogo da Forca')
    .setDescription('```\n' + FORCA_ARTE[jogo.erros] + '\n```')
    .addFields(
      { name: '🎮 Categoria', value: jogo.categoria, inline: true },
      { name: '🔠 Palavra', value: `\`${palavraMostrada}\``, inline: false },
      { name: '❌ Erros', value: `${jogo.erros}/6`, inline: true },
      { name: '🔤 Letras usadas', value: jogo.letras.join(', ') || 'Nenhuma', inline: false },
      { name: '📏 Tamanho', value: `${jogo.palavra.length} letras`, inline: true },
    )
    .setFooter({ text: `Jogador: ${userId}` });

  return channel.send({ embeds: [embed] });
}

/* =========================
   INICIAR JOGO
========================= */

function sortearPalavra(cat) {
  const lista = PALAVRAS[cat] || PALAVRAS.geral;
  return lista[Math.floor(Math.random() * lista.length)];
}

function iniciarJogo(userId, guildId, channel, categoria) {
  const key = `${guildId}:${userId}`;

  if (jogosAtivos.has(key)) return false;

  const palavra = sortearPalavra(categoria);

  jogosAtivos.set(key, {
    palavra,
    categoria,
    letras: [],
    erros: 0,
    max: 6,
  });

  return true;
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;
    const userId = msg.author.id;
    const key = `${guildId}:${userId}`;

    /* =========================
       INICIAR FORCA
    ========================= */

    if (cmd === 'forca') {
      if (jogosAtivos.has(key))
        return msg.reply(embedErro('Você já está jogando forca!'));

      const cat = args[0]?.toLowerCase() || 'geral';

      iniciarJogo(userId, guildId, msg.channel, cat);

      const jogo = jogosAtivos.get(key);
      await enviarEstado(msg.channel, userId, jogo);

      return;
    }

    /* =========================
       ENCERRAR JOGO
    ========================= */

    if (cmd === 'forcaparar') {
      if (!jogosAtivos.has(key))
        return msg.reply(embedErro('Você não está jogando.'));

      jogosAtivos.delete(key);
      return msg.reply('🛑 Jogo da forca encerrado.');
    }

    /* =========================
       JOGO EM ANDAMENTO
    ========================= */

    const jogo = jogosAtivos.get(key);
    if (!jogo) return;

    const letra = msg.content.toUpperCase().trim();

    if (!/^[A-Z]$/.test(letra)) return;

    if (jogo.letras.includes(letra)) {
      return msg.reply(embedErro(`Você já usou a letra **${letra}**`));
    }

    jogo.letras.push(letra);

    if (!jogo.palavra.includes(letra)) {
      jogo.erros++;
    }

    const palavraMostrada = jogo.palavra
      .split('')
      .map(l => (jogo.letras.includes(l) ? l : '_'))
      .join('');

    const ganhou = !palavraMostrada.includes('_');
    const perdeu = jogo.erros >= jogo.max;

    /* =========================
       FINAL DO JOGO
    ========================= */

    if (ganhou || perdeu) {
      jogosAtivos.delete(key);

      if (ganhou) {
        await ganharXP(userId, guildId, XP_EVENTS.FORCA, 'forca');
        await progredirMissao(userId, guildId, 'forca').catch(() => {});

        return msg.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('🎉 Vitória!')
              .setDescription(`Você acertou a palavra **${jogo.palavra}**!\n+XP ganho!`)
          ]
        });
      }

      return msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('💀 Você perdeu!')
            .setDescription(`A palavra era **${jogo.palavra}**`)
        ]
      });
    }

    /* =========================
       ATUALIZA ESTADO
    ========================= */

    await enviarEstado(msg.channel, userId, jogo);
  });
    }
