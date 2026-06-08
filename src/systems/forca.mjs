import { EmbedBuilder } from 'discord.js';
import ForcaModel from '../db/models/Forca.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

const PALAVRAS = {
  anime:    ['NARUTO', 'SASUKE', 'BORUTO', 'GOKU', 'VEGETA', 'LUFFY', 'ZORO', 'NAMI', 'ICHIGO', 'BLEACH', 'TITAN', 'MIKASA', 'LEVI', 'TANJIRO'],
  roblox:   ['ROBUX', 'BLOXBURG', 'ADOPT', 'ARSENAL', 'SIMULATOR', 'OBBY', 'AVATAR', 'GAMEPASS', 'STUDIO', 'SCRIPTING'],
  jogos:    ['MINECRAFT', 'FORTNITE', 'ROBLOX', 'VALORANT', 'FREEFIRE', 'GENSHIN', 'POKEMON', 'ZELDA', 'MARIO', 'SONIC'],
  paises:   ['BRASIL', 'JAPAO', 'FRANCA', 'ALEMANHA', 'ITALIA', 'ESPANHA', 'CHINA', 'RUSSIA', 'CANADA', 'ARGENTINA'],
  capitais: ['BRASILIA', 'TOKYO', 'PARIS', 'BERLIN', 'ROMA', 'MADRID', 'BEIJING', 'MOSCOU', 'OTTAWA', 'BUENOS AIRES'],
};

const CAT_INFO = {
  anime:    { emoji: '🎌', label: 'Anime & Manga' },
  roblox:   { emoji: '🎮', label: 'Roblox' },
  jogos:    { emoji: '🕹', label: 'Jogos' },
  paises:   { emoji: '🌍', label: 'Paises' },
  capitais: { emoji: '🏛', label: 'Capitais' },
};

// Arte da forca (plain strings, sem template literal aninhado)
const FORCA_ARTE = [
  '```\n  +---+\n      |\n      |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n      |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n  |   |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|   |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n      |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n /    |\n     ===```',
  '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n     ===```',
];

const jogosAtivos = new Map();

export const comandos = [
  { cmd: '!forca [categoria]', desc: 'Jogo da forca (+120 XP por vitória).' },
  { cmd: '!forcaranking',      desc: 'Ranking de vitórias na forca.' },
];

export function register(client, configs) {
  if (client.__forcaRegistrado) return;
  client.__forcaRegistrado = true;
  if (client.__forcaRegistrado) return;
  client.__forcaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    try {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args    = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd     = args.shift().toLowerCase();
    const guildId = msg.guild.id;
    const chave   = msg.author.id + ':' + guildId;

    // ── !forca ────────────────────────────────────────────
    if (cmd === 'forca') {
      if (jogosAtivos.has(chave))
        return msg.reply({ embeds: [embedErro('Você já tem um jogo em andamento! Digite uma letra.')] });

      const catInput = args[0]?.toLowerCase();
      const cats     = Object.keys(PALAVRAS);
      const cat      = cats.find(c => c.startsWith(catInput ?? '__')) ?? null;

      // Sem categoria — mostrar menu
      if (!cat) {
        const campos = cats.map(c => ({
          name:   CAT_INFO[c].emoji + ' ' + CAT_INFO[c].label,
          value:  '`!forca ' + c + '`',
          inline: true,
        }));
        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('🎯 Jogo da Forca — Escolha uma Categoria')
          .setDescription(
            'Escolha uma categoria para jogar!\n' +
            'Use o comando com o nome da categoria:\n\n' +
            '> Exemplo: **!forca anime** ou **!forca jogos**'
          )
          .addFields(campos)
          .setFooter({ text: 'FiskBot • Forca' })
          .setTimestamp();
        return msg.reply({ embeds: [embed] });
      }

      // Iniciar jogo
      const palavras = PALAVRAS[cat];
      const palavra  = palavras[Math.floor(Math.random() * palavras.length)];
      const jogo     = { palavra, categoria: cat, letrasUsadas: [], erros: 0, maxErros: 6 };
      jogosAtivos.set(chave, jogo);
      await enviarEstado(msg.channel, msg.author, jogo, true);
      return;
    }

    // ── !forcaranking ─────────────────────────────────────
    if (cmd === 'forcaranking') {
      const top = await ForcaModel.find({ guildId }).sort({ vitorias: -1 }).limit(10).lean();
      const linhas = top.map((u, i) => {
        const total = (u.vitorias || 0) + (u.derrotas || 0);
        const taxa  = total > 0 ? ((u.vitorias / total) * 100).toFixed(0) : '0';
        return '**#' + (i + 1) + '** <@' + u.userId + '> — ✅ ' + u.vitorias +
               ' vitórias • ❌ ' + u.derrotas + ' derrotas • 🎯 ' + taxa + '%';
      });
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 Ranking Forca')
        .setDescription(linhas.join('\n') || 'Nenhum dado ainda.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    // ── Letras do jogo em andamento ───────────────────────
    const jogo = jogosAtivos.get(chave);
    if (!jogo) return;

    const letra = msg.content.trim().toUpperCase();
    if (!/^[A-Z]$/.test(letra)) return;

    if (jogo.letrasUsadas.includes(letra))
      return msg.reply({ embeds: [embedErro('Você já tentou a letra **' + letra + '**!')] });

    jogo.letrasUsadas.push(letra);
    if (!jogo.palavra.includes(letra)) jogo.erros++;

    const palavraMostrada = jogo.palavra.split('').map(l => jogo.letrasUsadas.includes(l) ? l : '_').join(' ');
    const ganhou = !palavraMostrada.includes('_');
    const perdeu = jogo.erros >= jogo.maxErros;

    if (ganhou || perdeu) {
      jogosAtivos.delete(chave);

      if (ganhou) {
        await ForcaModel.findOneAndUpdate(
          { userId: msg.author.id, guildId },
          { $inc: { vitorias: 1 }, $setOnInsert: { userId: msg.author.id, guildId } },
          { upsert: true }
        );
        await ganharXP(msg.author.id, guildId, XP_EVENTS.FORCA, 'forca');
        await progredirMissao(msg.author.id, guildId, 'forca', 1, msg.channel).catch(() => {});
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🎉 Você venceu!')
          .setDescription('A palavra era: **' + jogo.palavra + '**\n+' + XP_EVENTS.FORCA + ' XP! Parabéns!')
          .setFooter({ text: 'Categoria: ' + (CAT_INFO[jogo.categoria]?.label ?? jogo.categoria) })
          .setTimestamp();
        return msg.channel.send({ embeds: [embed] });
      } else {
        await ForcaModel.findOneAndUpdate(
          { userId: msg.author.id, guildId },
          { $inc: { derrotas: 1 }, $setOnInsert: { userId: msg.author.id, guildId } },
          { upsert: true }
        );
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('😢 Você perdeu!')
          .setDescription(FORCA_ARTE[6] + '\n\nA palavra era: **' + jogo.palavra + '**')
          .setFooter({ text: 'Categoria: ' + (CAT_INFO[jogo.categoria]?.label ?? jogo.categoria) })
          .setTimestamp();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    await enviarEstado(msg.channel, msg.author, jogo, false);
    } catch (e) {
      console.error('[Forca:msg]', e.message);
    }
  });
}

async function enviarEstado(canal, autor, jogo, isInicio) {
  const palavraMostrada = jogo.palavra.split('').map(l => jogo.letrasUsadas.includes(l) ? l : '_').join('  ');
  const catInfo  = CAT_INFO[jogo.categoria] ?? { emoji: '❓', label: jogo.categoria };
  const letras   = jogo.letrasUsadas.length ? jogo.letrasUsadas.join(' ') : 'Nenhuma';
  const erradas  = jogo.letrasUsadas.filter(l => !jogo.palavra.includes(l));
  const cor      = jogo.erros >= 4 ? 0xe74c3c : jogo.erros >= 2 ? 0xe67e22 : 0x9b59b6;

  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle(isInicio ? '🎯 Jogo da Forca — Novo Jogo!' : '🎯 Jogo da Forca')
    .setDescription(FORCA_ARTE[jogo.erros] + '\n\n`' + palavraMostrada + '`')
    .addFields(
      { name: catInfo.emoji + ' Categoria', value: catInfo.label,                                              inline: true  },
      { name: '❤️ Vidas',                   value: (jogo.maxErros - jogo.erros) + '/' + jogo.maxErros,         inline: true  },
      { name: '🔤 Letras tentadas',          value: letras,                                                     inline: false },
      { name: '❌ Letras erradas',           value: erradas.length ? erradas.join(' ') : 'Nenhuma',            inline: false },
    )
    .setFooter({ text: autor.displayName + ' — Digite uma letra para adivinhar!' })
    .setTimestamp();

  await canal.send({ embeds: [embed] }).catch(() => {});
}
