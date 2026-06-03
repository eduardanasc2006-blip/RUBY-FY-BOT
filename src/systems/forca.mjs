import { EmbedBuilder } from 'discord.js';
import ForcaModel from '../db/models/Forca.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { progredirMissao } from './missoes.mjs';
import { ganharXP, XP_EVENTS } from './xpSystem.mjs';

const PALAVRAS = {
  anime: ['NARUTO', 'SASUKE', 'BORUTO', 'GOKU', 'VEGETA', 'LUFFY', 'ZORO', 'NAMI', 'ICHIGO', 'BLEACH', 'TITAN', 'MIKASA', 'LEVI', 'TANJIRO'],
  roblox: ['ROBUX', 'BLOXBURG', 'ADOPT', 'ARSENAL', 'SIMULATOR', 'OBBY', 'AVATAR', 'GAMEPASS', 'STUDIO', 'SCRIPTING'],
  jogos: ['MINECRAFT', 'FORTNITE', 'ROBLOX', 'VALORANT', 'FREEFIRE', 'GENSHIN', 'POKEMON', 'ZELDA', 'MARIO', 'SONIC'],
  paises: ['BRASIL', 'JAPAO', 'FRANCA', 'ALEMANHA', 'ITALIA', 'ESPANHA', 'CHINA', 'RUSSIA', 'CANADA', 'ARGENTINA'],
  capitais: ['BRASILIA', 'TOKYO', 'PARIS', 'BERLIN', 'ROMA', 'MADRID', 'BEIJING', 'MOSCOU', 'OTTAWA', 'BUENOSAIRES'],
};

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

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;
    const chave = `${msg.author.id}:${guildId}`;

    if (cmd === 'forca') {
      if (jogosAtivos.has(chave)) return msg.reply({ embeds: [embedErro('Você já tem um jogo em andamento! Adivinhe uma letra.')] });

      const catInput = args[0]?.toLowerCase();
      const cats = Object.keys(PALAVRAS);
      const cat = cats.find(c => c.includes(catInput)) || cats[Math.floor(Math.random() * cats.length)];
      const palavras = PALAVRAS[cat];
      const palavra = palavras[Math.floor(Math.random() * palavras.length)];

      jogosAtivos.set(chave, {
        palavra,
        categoria: cat,
        letrasUsadas: [],
        erros: 0,
        maxErros: 6,
      });

      await enviarEstado(msg.channel, msg.author, jogosAtivos.get(chave));
      return;
    }

    if (cmd === 'forcaranking') {
      const top = await ForcaModel.find({ guildId }).sort({ vitorias: -1 }).limit(10).lean();
      const linhas = top.map((u, i) => `**#${i + 1}** <@${u.userId}> — ✅ ${u.vitorias} vitórias | ❌ ${u.derrotas} derrotas`);
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 Ranking Forca')
        .setDescription(linhas.join('\n') || 'Nenhum dado.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    const jogo = jogosAtivos.get(chave);
    if (!jogo || msg.content.startsWith(prefixo)) return;

    const letra = msg.content.trim().toUpperCase();
    if (!/^[A-Z]$/.test(letra)) return;

    if (jogo.letrasUsadas.includes(letra)) {
      return msg.reply({ embeds: [embedErro(`Você já tentou a letra **${letra}**!`)] });
    }

    jogo.letrasUsadas.push(letra);
    if (!jogo.palavra.includes(letra)) jogo.erros++;

    const palavraMostrada = jogo.palavra.split('').map(l => (jogo.letrasUsadas.includes(l) ? l : '_')).join(' ');
    const ganhou = !palavraMostrada.includes('_');
    const perdeu = jogo.erros >= jogo.maxErros;

    if (ganhou || perdeu) {
      jogosAtivos.delete(chave);
      if (ganhou) {
        await ForcaModel.findOneAndUpdate({ userId: msg.author.id, guildId }, { $inc: { vitorias: 1 }, $setOnInsert: { userId: msg.author.id, guildId } }, { upsert: true });
        await ganharXP(msg.author.id, guildId, XP_EVENTS.FORCA, 'forca');
        await progredirMissao(msg.author.id, guildId, 'forca').catch(() => {});
        const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle('🎉 Você venceu!').setDescription(`A palavra era: **${jogo.palavra}**\n+${XP_EVENTS.FORCA} XP!`).setTimestamp();
        return msg.channel.send({ embeds: [embed] });
      } else {
        await ForcaModel.findOneAndUpdate({ userId: msg.author.id, guildId }, { $inc: { derrotas: 1 }, $setOnInsert: { userId: msg.author.id, guildId } }, { upsert: true });
        const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('😢 Você perdeu!').setDescription(`${FORCA_ARTE[6]}\nA palavra era: **${jogo.palavra}**`).setTimestamp();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    await enviarEstado(msg.channel, msg.author, jogo);
  });
}

async function enviarEstado(canal, autor, jogo) {
  const palavraMostrada = jogo.palavra.split('').map(l => (jogo.letrasUsadas.includes(l) ? l : '_')).join(' ');
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🎯 Jogo da Forca')
    .addFields(
      { name: '🎮 Categoria', value: jogo.categoria, inline: true },
      { name: '❌ Erros', value: `${jogo.erros}/${jogo.maxErros}`, inline: true },
      { name: '🔤 Letras usadas', value: jogo.letrasUsadas.join(', ') || 'Nenhuma', inline: false },
      { name: '📝 Palavra', value: `\`${palavraMostrada}\``, inline: false },
    )
    .setDescription(FORCA_ARTE[jogo.erros])
    .setFooter({ text: `${autor.displayName} — Digite uma letra para adivinhar!` })
    .setTimestamp();
  await canal.send({ embeds: [embed] }).catch(() => {});
}
