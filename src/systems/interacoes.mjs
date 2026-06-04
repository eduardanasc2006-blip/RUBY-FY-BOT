import { EmbedBuilder } from 'discord.js';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { addAfinidade } from './afinidade.mjs';

/* =========================
   GIFS
========================= */
const GIFS = {
  abracar: [
    'https://media.tenor.com/gNxdFE9bHHcAAAAC/hug.gif',
    'https://media.tenor.com/OR58iFQXeXkAAAAC/hug-anime.gif',
    'https://media.tenor.com/zxpgW_k9droAAAAC/anime-hug.gif',
  ],
  beijar: [
    'https://media.tenor.com/N7i2iy_Ag2UAAAAC/anime-kiss.gif',
    'https://media.tenor.com/nz_Lr7bfaLwAAAAC/kiss.gif',
    'https://media.tenor.com/f_I2Lv9HnGIAAAAC/anime-kiss.gif',
  ],
  cafune: [
    'https://media.tenor.com/lBvJXbG9sDoAAAAC/pat.gif',
    'https://media.tenor.com/aHxQKVqJlcUAAAAC/head-pat-anime.gif',
  ],
  acariciar: [
    'https://media.tenor.com/yfZOdWKpnNcAAAAC/anime-pat.gif',
  ],
  dancar: [
    'https://media.tenor.com/8gswRnwH8FIAAAAC/anime-dance.gif',
    'https://media.tenor.com/QnGOKE0K-DEAAAAC/anime-dance-cute.gif',
  ],
  proteger: [
    'https://media.tenor.com/RFOiGbcv_z0AAAAC/anime-protect.gif',
  ],
  atacar: [
    'https://media.tenor.com/NVHKCn_Zaf4AAAAC/anime-fight.gif',
    'https://media.tenor.com/aW_qkVtI9M0AAAAC/anime-punch.gif',
  ],
  tocaaqui: [
    'https://media.tenor.com/UWuQX5Ns6VEAAAAC/highfive-anime.gif',
  ],
  bofetada: [
    'https://media.tenor.com/v3jIPbXtqfkAAAAC/anime-slap.gif',
  ],
};

/* =========================
   TEXTOS
========================= */
const TEXTOS = {
  abracar:   (a,b) => `🤗 <@${a}> abraçou <@${b}>!`,
  beijar:    (a,b) => `💋 <@${a}> tentou beijar <@${b}>!`,
  cafune:    (a,b) => `🥰 <@${a}> fez cafuné em <@${b}>!`,
  acariciar: (a,b) => `💕 <@${a}> acariciou <@${b}>!`,
  dancar:    (a,b) => `💃 <@${a}> dançou com <@${b}>!`,
  proteger:  (a,b) => `🛡️ <@${a}> protegeu <@${b}>!`,
  atacar:    (a,b) => `⚔️ <@${a}> atacou <@${b}>!`,
  tocaaqui:  (a,b) => `🤚 <@${a}> pediu toca aqui para <@${b}>!`,
  bofetada:  (a,b) => `👋 <@${a}> deu uma bofetada em <@${b}>!`,
};

/* =========================
   CORES
========================= */
const CORES = {
  abracar: 0xa855f7,
  beijar: 0xff69b4,
  cafune: 0xffd700,
  acariciar: 0xa855f7,
  dancar: 0x2ecc71,
  proteger: 0x3498db,
  atacar: 0xe74c3c,
  tocaaqui: 0x27ae60,
  bofetada: 0xe67e22,
  elogiar: 0xf1c40f,
  xingar: 0xe74c3c,
};

/* =========================
   MAPA AFINIDADE
========================= */
const AFINIDADE_MAPA = {
  abracar: 1,
  beijar: 3,
  cafune: 2,
  acariciar: 2,
  dancar: 1,
  elogiar: 1,
  xingar: 0,
  proteger: 2,
  atacar: 0,
  tocaaqui: 1,
  bofetada: 0,
};

const ALL_CMDS = Object.keys(AFINIDADE_MAPA);

/* =========================
   RESPOSTAS ESPECIAIS
========================= */
const ELOGIOS = [
  'Você é incrível! 🌟',
  'Você ilumina o servidor! ✨',
  'Pessoa maravilhosa! 💜',
];

const XINGAMENTOS = [
  'Eu não vou responder isso 😐',
  'Respeito é bom e eu gosto 👍',
  'Não vou entrar nesse nível 😌',
];

/* =========================
   BOT REAÇÕES
========================= */
const FRIENDZONE = [
  '😳 E-eh... não tenho sentimentos assim... mas obrigado(a)!',
  '💔 Acho que só amizade mesmo 😅',
  '😶 Eu sou apenas um bot... mas você é legal!',
];

const REVENGE = (alvo) => [
  `⚔️ Ei! <@${alvo}> isso não vai ficar assim!`,
  `👊 <@${alvo}> levou de volta na mesma moeda!`,
  `🔥 Reação automática: devolvido para <@${alvo}>!`,
];

/* =========================
   MAIN
========================= */
export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (!ALL_CMDS.includes(cmd)) return;

    const alvo = msg.mentions.users.first();
    if (!alvo) return msg.reply({ embeds: [embedErro('Mencione um usuário.')] });
    if (alvo.id === msg.author.id)
      return msg.reply({ embeds: [embedErro('Você não pode usar isso em si mesmo!')] });

    const cdKey = `inter:${cmd}:${msg.author.id}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 20000);
    if (espera)
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(espera)}**.`)],
      });

    const embed = new EmbedBuilder().setColor(CORES[cmd] || 0xa855f7).setTimestamp();

    /* =========================
       XINGAR (IGNORA BOT)
    ========================= */
    if (cmd === 'xingar') {
      const resposta = XINGAMENTOS[Math.floor(Math.random() * XINGAMENTOS.length)];
      embed.setDescription(`😐 <@${msg.author.id}> tentou xingar <@${alvo.id}>\n> ${resposta}`);
      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       ELOGIAR
    ========================= */
    if (cmd === 'elogiar') {
      const elogio = ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)];
      embed.setDescription(`💬 <@${msg.author.id}> elogiou <@${alvo.id}>\n> *${elogio}*`);
      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       BEIJAR (FRIENDZONE BOT)
    ========================= */
    if (cmd === 'beijar' && alvo.bot) {
      const fr = FRIENDZONE[Math.floor(Math.random() * FRIENDZONE.length)];
      embed.setDescription(`💔 <@${msg.author.id}> tentou beijar o bot...\n> ${fr}`);
      return msg.reply({ embeds: [embed] });
    }

    /* =========================
       ATAQUE / BOFETADA (REVIDA)
    ========================= */
    if (cmd === 'atacar' || cmd === 'bofetada') {
      const gif = GIFS[cmd]?.[Math.floor(Math.random() * GIFS[cmd].length)];

      const embedUser = new EmbedBuilder()
        .setColor(CORES[cmd])
        .setDescription(TEXTOS[cmd](msg.author.id, alvo.id))
        .setImage(gif)
        .setTimestamp();

      const embedRevanche = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(
          REVENGE(alvo.id)[Math.floor(Math.random() * 3)]
        );

      await msg.reply({ embeds: [embedUser] });
      return msg.channel.send({ embeds: [embedRevanche] });
    }

    /* =========================
       PADRÃO (GIF NORMAL)
    ========================= */
    const gifs = GIFS[cmd];
    const gif = gifs?.[Math.floor(Math.random() * gifs.length)];

    embed.setDescription(TEXTOS[cmd]?.(msg.author.id, alvo.id));
    if (gif) embed.setImage(gif);

    await msg.reply({ embeds: [embed] });
  });
  }
