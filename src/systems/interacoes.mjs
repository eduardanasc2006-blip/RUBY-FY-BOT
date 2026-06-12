import { EmbedBuilder } from 'discord.js';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { addAfinidade } from './afinidade.mjs';
import { progredirMissao } from './missoes.mjs';

// GIFs — formato AAAAD (compatível com Discord em 2025)
const GIFS = {
  abracar: [
    'https://media.tenor.com/gNxdFE9bHHcAAAAd/hug.gif',
    'https://media.tenor.com/OR58iFQXeXkAAAAd/hug-anime.gif',
    'https://media.tenor.com/zxpgW_k9droAAAAd/anime-hug.gif',
    'https://media.tenor.com/3wv088fG6WcAAAAd/anime-hug-love.gif',
    'https://media.tenor.com/jU9c9w82GKAAAAAd/anime-cuddle.gif',
  ],

  beijar: [
    'https://media.tenor.com/N7i2iy_Ag2UAAAAd/anime-kiss.gif',
    'https://media.tenor.com/nz_Lr7bfaLwAAAAd/kiss.gif',
    'https://media.tenor.com/f_I2Lv9HnGIAAAAd/anime-kiss.gif',
    'https://media.tenor.com/b7DWF6EH8gAAAAAd/anime-love.gif',
    'https://media.tenor.com/9Nt8hK7V6QAAAAAd/anime-kiss-love.gif',
  ],

  cafune: [
    'https://media.tenor.com/lBvJXbG9sDoAAAAd/pat.gif',
    'https://media.tenor.com/aHxQKVqJlcUAAAAd/head-pat-anime.gif',
    'https://media.tenor.com/yfZOdWKpnNcAAAAd/anime-pat.gif',
    'https://media.tenor.com/5X4iM4x8A8AAAAAd/pat-head.gif',
    'https://media.tenor.com/YiSI6sM1N0QAAAAd/anime-headpat.gif',
  ],

  acariciar: [
    'https://media.tenor.com/yfZOdWKpnNcAAAAd/anime-pat.gif',
    'https://media.tenor.com/aHxQKVqJlcUAAAAd/head-pat-anime.gif',
    'https://media.tenor.com/8mPbK8tM8gAAAAAd/anime-cute.gif',
    'https://media.tenor.com/yJmr2XxJk3gAAAAd/anime-love.gif',
    'https://media.tenor.com/FyN5Y2cM8YAAAAAd/anime-pat.gif',
  ],

  dancar: [
    'https://media.tenor.com/8gswRnwH8FIAAAAd/anime-dance.gif',
    'https://media.tenor.com/QnGOKE0K-DEAAAAd/anime-dance-cute.gif',
    'https://media.tenor.com/5WFTGvv-aS8AAAAd/dance.gif',
    'https://media.tenor.com/8W7hK1sU0M8AAAAd/anime-party.gif',
    'https://media.tenor.com/WJ6RzYzL6l8AAAAd/anime-dancing.gif',
  ],

  proteger: [
    'https://media.tenor.com/RFOiGbcv_z0AAAAd/anime-protect.gif',
    'https://media.tenor.com/qHBW3bm5mwoAAAAd/anime-protect.gif',
    'https://media.tenor.com/6fW8s6nY9zYAAAAd/anime-protecting.gif',
    'https://media.tenor.com/PV1LMN7fK4gAAAAd/anime-shield.gif',
    'https://media.tenor.com/UvN6j0G7G2YAAAAd/anime-save.gif',
  ],

  atacar: [
    'https://media.tenor.com/NVHKCn_Zaf4AAAAd/anime-fight.gif',
    'https://media.tenor.com/aW_qkVtI9M0AAAAd/anime-punch.gif',
    'https://media.tenor.com/kJ0LHD7x7CQAAAAd/anime-hit.gif',
    'https://media.tenor.com/rQ8M0W8L5sAAAAAd/anime-fight-action.gif',
    'https://media.tenor.com/QkX0yJ4x9vMAAAAd/anime-attack.gif',
  ],

  tocaaqui: [
    'https://media.tenor.com/UWuQX5Ns6VEAAAAd/highfive-anime.gif',
    'https://media.tenor.com/vJmgd4bqdDkAAAAd/high-five.gif',
    'https://media.tenor.com/cb6L2l0pQwQAAAAd/anime-highfive.gif',
    'https://media.tenor.com/EhM4N0w8M4gAAAAd/high-five-anime.gif',
    'https://media.tenor.com/3I4VY6gWw9QAAAAd/friends-high-five.gif',
  ],

  bofetada: [
    'https://media.tenor.com/v3jIPbXtqfkAAAAd/anime-slap.gif',
    'https://media.tenor.com/YhVNBR5OrikAAAAd/slap-anime.gif',
    'https://media.tenor.com/3wT4F8Nf6R8AAAAd/anime-smack.gif',
    'https://media.tenor.com/WqWcN7TnN7IAAAAd/anime-angry.gif',
    'https://media.tenor.com/4x7wP6sY2NAAAAAd/anime-slap-face.gif',
  ],

  elogiar: null,
  xingar: null,
};

const ELOGIOS = [
  'Você é incrível! 🌟',
  'Que pessoa maravilhosa! 💜',
  'Você ilumina esse servidor! ✨',
  'É uma honra ter você aqui! 🏆',
  'Você é simplesmente perfeito(a)! 💫',
];

const XINGAMENTOS = [
  'Vai varrer a rua, seu pé de alface! 🥬',
  'Você tem cara de emoji de boia! 🏊',
  'Seu pé de moleque! 🥜',
  'Você confunde pizza de banana com comida! 🍌',
  'Vai tomar banho, sua batata crua! 🥔',
];

const BOT_RESPOSTAS_XINGAR = [
  'Erro 404: inteligência não encontrada. 💀',
  'Seu Wi-Fi tem mais personalidade. 📶',
  'Tente novamente quando evoluir de nível. 😏',
  'Meu banco de dados ficou ofendido. 🗄️',
  'Desculpe, fui programado para ser superior. 🤖',
];

const AFINIDADE_MAPA = {
  abracar: 1, beijar: 3, cafune: 2, acariciar: 2, dancar: 1,
  elogiar: 1, xingar: 0, proteger: 2, atacar: 0, tocaaqui: 1, bofetada: 0,
};

const TEXTOS = {
  abracar:   (a, b) => `🤗 <@${a}> abraçou <@${b}>!`,
  beijar:    (a, b) => `💋 <@${a}> beijou <@${b}>!`,
  cafune:    (a, b) => `🥰 <@${a}> fez cafuné em <@${b}>!`,
  acariciar: (a, b) => `💕 <@${a}> acariciou <@${b}>!`,
  dancar:    (a, b) => `💃 <@${a}> dançou com <@${b}>!`,
  proteger:  (a, b) => `🛡️ <@${a}> prometeu proteger <@${b}>!`,
  atacar:    (a, b) => `⚔️ <@${a}> atacou <@${b}>!`,
  tocaaqui:  (a, b) => `🤚 <@${a}> pediu toca aqui para <@${b}>!`,
  bofetada:  (a, b) => `👋 <@${a}> deu uma bofetada em <@${b}>! 😤`,
};

const CORES = {
  abracar: 0xa855f7, beijar: 0xff69b4, cafune: 0xffd700,
  acariciar: 0xa855f7, dancar: 0x2ecc71, proteger: 0x3498db,
  elogiar: 0xf1c40f, xingar: 0xe74c3c, atacar: 0xe74c3c,
  tocaaqui: 0x27ae60, bofetada: 0xe67e22,
};

const CMDS_AGRESSIVOS = ['atacar', 'bofetada', 'xingar'];
const CMDS_POSITIVOS  = ['beijar', 'abracar', 'cafune', 'acariciar', 'dancar', 'elogiar', 'proteger', 'tocaaqui'];
const ALL_CMDS        = [...CMDS_AGRESSIVOS, ...CMDS_POSITIVOS];

export const comandos = [
  { cmd: '!beijar @user',    desc: 'Beija alguém (+3 afinidade).' },
  { cmd: '!abracar @user',   desc: 'Abraça alguém (+1 afinidade).' },
  { cmd: '!cafune @user',    desc: 'Cafuné (+2 afinidade).' },
  { cmd: '!acariciar @user', desc: 'Carinho (+2 afinidade).' },
  { cmd: '!dancar @user',    desc: 'Dança juntos (+1 afinidade).' },
  { cmd: '!elogiar @user',   desc: 'Elogia alguém (+1 afinidade).' },
  { cmd: '!proteger @user',  desc: 'Protege alguém (+2 afinidade).' },
  { cmd: '!atacar @user',    desc: 'Ataca alguém.' },
  { cmd: '!tocaaqui @user',  desc: 'High five! (+1 afinidade).' },
  { cmd: '!bofetada @user',  desc: 'Bofetada!' },
  { cmd: '!xingar @user',    desc: 'Xinga alguém (diversão).' },
];

export function register(client, configs) {
  // Guarda duplo — evita registrar o evento mais de uma vez
  if (client.__interacoesRegistrado) return;
  client.__interacoesRegistrado = true;

  client.on('messageCreate', async (msg) => {
    try {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
    if (!ALL_CMDS.includes(cmd)) return;

    const alvo = msg.mentions.users.first();
    if (!alvo) return msg.reply({ embeds: [embedErro('Mencione um usuário.')] });
    if (alvo.id === msg.author.id)
      return msg.reply({ embeds: [embedErro('Você não pode usar isso em si mesmo!')] });

    // Logs de depuração

    // ── 1. COOLDOWN — sempre primeiro ─────────────────────
    const cdKey  = `inter:${cmd}:${msg.author.id}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 20_000);
    if (espera)
      return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });

    const embed = new EmbedBuilder()
      .setColor(CORES[cmd] || 0xa855f7)
      .setTimestamp();

    // ── INTERAÇÕES COM BOT ────────────────────────────────
if (alvo.bot) {

  // Agressivos
  if (cmd === 'atacar') {
    const gif = GIFS.atacar[Math.floor(Math.random() * GIFS.atacar.length)];

    embed
      .setDescription(
        `⚔️ <@${msg.author.id}> tentou atacar o bot!\n\n💥 O bot desviou e contra-atacou!`
      );

    if (gif) embed.setImage(gif);

    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'bofetada') {
    const gif = GIFS.bofetada[Math.floor(Math.random() * GIFS.bofetada.length)];

    embed
      .setDescription(
        `👋 <@${msg.author.id}> tentou dar uma bofetada no bot!\n\n😤 O bot devolveu na mesma intensidade!`
      );

    if (gif) embed.setImage(gif);

    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'xingar') {
    const resp =
      BOT_RESPOSTAS_XINGAR[
        Math.floor(Math.random() * BOT_RESPOSTAS_XINGAR.length)
      ];

    embed.setDescription(
      `😤 <@${msg.author.id}> xingou o bot.\n\n🤖 ${resp}`
    );

    return msg.reply({ embeds: [embed] });
  }

  // BEIJO = FRIENDZONE
  if (cmd === 'beijar') {
    const gif = GIFS.beijar[Math.floor(Math.random() * GIFS.beijar.length)];

    embed
      .setColor(0xff69b4)
      .setDescription(
        `💋 <@${msg.author.id}> tentou beijar o bot.\n\n🤖 O bot ficou sem jeito...\n💔 "Desculpa, mas te vejo apenas como amigo(a)." #Friendzone`
      );

    if (gif) embed.setImage(gif);

    return msg.reply({ embeds: [embed] });
  }

  // COMANDOS POSITIVOS
  const gifs = GIFS[cmd];
  const gif =
    gifs?.[Math.floor(Math.random() * gifs.length)];

  const respostasBot = {
    abracar: '🤗 O bot retribuiu o abraço!',
    cafune: '🥰 O bot adorou o cafuné!',
    acariciar: '💕 O bot ficou feliz com o carinho!',
    dancar: '💃 O bot entrou na dança!',
    proteger: '🛡️ O bot agradece a proteção!',
    tocaaqui: '🤚 Toca aqui aceito!',
    elogiar: '😊 O bot ficou lisonjeado com o elogio!'
  };

  if (cmd === 'elogiar') {
    embed.setDescription(
      `💬 <@${msg.author.id}> elogiou o bot!\n\n🤖 Muito obrigado! ❤️`
    );
  } else {
    embed.setDescription(
      respostasBot[cmd] ||
      `🤖 O bot interagiu com <@${msg.author.id}>`
    );

    if (gif) embed.setImage(gif);
  }

  return msg.reply({ embeds: [embed] });
}
    // ── 4. INTERAÇÃO NORMAL ───────────────────────────────
    if (cmd === 'elogiar') {
      embed.setDescription(`💬 <@${msg.author.id}> elogiou <@${alvo.id}>:\n> *${ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)]}*`);
    } else if (cmd === 'xingar') {
      embed.setDescription(`😤 <@${msg.author.id}> para <@${alvo.id}>:\n> *${XINGAMENTOS[Math.floor(Math.random() * XINGAMENTOS.length)]}*`);
    } else {
      const gifs = GIFS[cmd];
      const gif  = gifs?.[Math.floor(Math.random() * gifs.length)];
      embed.setDescription(
        TEXTOS[cmd]?.(msg.author.id, alvo.id) || `<@${msg.author.id}> interagiu com <@${alvo.id}>`
      );
      if (gif) embed.setImage(gif);
    }

    // Thumbnail do alvo
    embed.setThumbnail(alvo.displayAvatarURL({ extension: 'png', size: 512 }));

    // ── 5. AFINIDADE ──────────────────────────────────────
    const pontos = AFINIDADE_MAPA[cmd] || 0;
    let afin = { ganhou: false, pontosGanhos: 0, pontos: 0 };
    if (pontos > 0) {
      afin = await addAfinidade(msg.guild.id, msg.author.id, alvo.id, pontos).catch(() => afin);
    }

    if (pontos > 0) {
      embed.setFooter(
        afin.ganhou
          ? { text: `+${pontos} Afinidade • Total: ${afin.pontos ?? '?'} pts` }
          : { text: 'Afinidade: já ganhada hoje (próxima em 12h)' }
      );
    }

    await msg.reply({ embeds: [embed] });

    // ── 6. MISSÕES — tipo 'interacao' (nunca o nome do cmd) ─
    await progredirMissao(msg.author.id, msg.guild.id, 'interacao', 1, msg.channel).catch(() => {});
    } catch (e) {
      msg.reply({ content: '❌ Ocorreu um erro.' }).catch(() => {});
    }
  });
}
