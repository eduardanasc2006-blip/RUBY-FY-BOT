import { EmbedBuilder } from 'discord.js';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { addAfinidade } from './afinidade.mjs';

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
    'https://media.tenor.com/yfZOdWKpnNcAAAAC/anime-pat.gif',
  ],
  acariciar: [
    'https://media.tenor.com/yfZOdWKpnNcAAAAC/anime-pat.gif',
    'https://media.tenor.com/aHxQKVqJlcUAAAAC/head-pat-anime.gif',
  ],
  dancar: [
    'https://media.tenor.com/8gswRnwH8FIAAAAC/anime-dance.gif',
    'https://media.tenor.com/QnGOKE0K-DEAAAAC/anime-dance-cute.gif',
    'https://media.tenor.com/5WFTGvv-aS8AAAAC/dance.gif',
  ],
  proteger: [
    'https://media.tenor.com/RFOiGbcv_z0AAAAC/anime-protect.gif',
    'https://media.tenor.com/qHBW3bm5mwoAAAAC/anime-protect.gif',
  ],
  atacar: [
    'https://media.tenor.com/NVHKCn_Zaf4AAAAC/anime-fight.gif',
    'https://media.tenor.com/aW_qkVtI9M0AAAAC/anime-punch.gif',
    'https://media.tenor.com/kJ0LHD7x7CQAAAAC/anime-hit.gif',
  ],
  tocaaqui: [
    'https://media.tenor.com/UWuQX5Ns6VEAAAAC/highfive-anime.gif',
    'https://media.tenor.com/vJmgd4bqdDkAAAAC/high-five.gif',
  ],
  bofetada: [
    'https://media.tenor.com/v3jIPbXtqfkAAAAC/anime-slap.gif',
    'https://media.tenor.com/YhVNBR5OrikAAAAC/slap-anime.gif',
  ],
  elogiar: null,
  xingar: null,
};

const ELOGIOS = [
  'Você é incrível! 🌟', 'Que pessoa maravilhosa! 💜', 'Você ilumina esse servidor! ✨',
  'É uma honra ter você aqui! 🏆', 'Você é simplesmente perfeito(a)! 💫',
];

const XINGAMENTOS = [
  'Vai varrer a rua, seu pé de alface! 🥬', 'Você tem cara de emoji de boia! 🏊',
  'Seu pé de moleque! 🥜', 'Você confunde pizza de banana com comida! 🍌',
  'Vai tomar banho, sua batata crua! 🥔',
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

const ALL_CMDS = ['abracar', 'beijar', 'cafune', 'acariciar', 'dancar', 'elogiar',
                  'xingar', 'proteger', 'atacar', 'tocaaqui', 'bofetada'];

export const comandos = [
  { cmd: '!beijar @user',    desc: 'Beija alguém (+3 afinidade).' },
  { cmd: '!abracar @user',   desc: 'Abraça alguém (+1 afinidade).' },
  { cmd: '!cafune @user',    desc: 'Cafuné (+2 afinidade).' },
  { cmd: '!acariciar @user', desc: 'Carinho (+2 afinidade).' },
  { cmd: '!dancar @user',    desc: 'Dança juntos (+1 afinidade).' },
  { cmd: '!elogiar @user',   desc: 'Elogia alguém.' },
  { cmd: '!proteger @user',  desc: 'Protege alguém.' },
  { cmd: '!atacar @user',    desc: 'Ataca alguém.' },
  { cmd: '!tocaaqui @user',  desc: 'High five!' },
  { cmd: '!bofetada @user',  desc: 'Bofetada!' },
  { cmd: '!xingar @user',    desc: 'Xinga alguém (diversão).' },
];

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
    if (alvo.id === msg.author.id) return msg.reply({ embeds: [embedErro('Você não pode usar isso em si mesmo!')] });

    const embed = new EmbedBuilder()
  .setColor(CORES[cmd] || 0xa855f7)
  .setTimestamp();

const COMANDOS_REVIDA = ['atacar', 'bofetada', 'xingar'];

if (alvo.bot && COMANDOS_REVIDA.includes(cmd)) {
  if (cmd === 'atacar') {
    const gif = GIFS.atacar?.[Math.floor(Math.random() * GIFS.atacar.length)];

    embed
      .setDescription(
        `⚔️ <@${msg.author.id}> tentou atacar o bot!\n\n💥 O bot desviou e atacou de volta!`
      );

    if (gif) embed.setImage(gif);
    console.log(
  `[INTERACAO] ${cmd} GIF =>`,
  gif
);

    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'bofetada') {
    const gif = GIFS.bofetada?.[Math.floor(Math.random() * GIFS.bofetada.length)];

    embed
      .setDescription(
        `👋 <@${msg.author.id}> tentou dar uma bofetada no bot!\n\n😤 O bot devolveu a bofetada!`
      );

    if (gif) embed.setImage(gif);

    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'xingar') {
    const respostas = [
      'Você foi derrotado por um bot. 🤖',
      'Erro 404: inteligência não encontrada. 💀',
      'Seu Wi-Fi tem mais personalidade. 📶',
      'Tente novamente quando evoluir de nível. 😏',
      'Meu banco de dados ficou ofendido. 🗄️'
    ];

    embed.setDescription(
      `😤 O bot respondeu para <@${msg.author.id}>:\n\n> ${
        respostas[Math.floor(Math.random() * respostas.length)]
      }`
    );

    return msg.reply({ embeds: [embed] });
  }
}
    const cdKey = `inter:${cmd}:${msg.author.id}:${msg.guild.id}`;
    const espera = checkCooldown(cdKey, 20_000);
    if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });

    const pontos = AFINIDADE_MAPA[cmd] || 0;
    let afin = { ganhou: false, pontosGanhos: 0 };
    if (pontos > 0 && !alvo.bot) {
      afin = await addAfinidade(msg.guild.id, msg.author.id, alvo.id, pontos).catch(() => ({ ganhou: false, pontosGanhos: 0 }));
    }
;

    if (cmd === 'elogiar') {
      const elogio = ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)];
      embed.setDescription(`💬 <@${msg.author.id}> elogiou <@${alvo.id}>:\n> *${elogio}*`);
    } else if (cmd === 'xingar') {
      const xingo = XINGAMENTOS[Math.floor(Math.random() * XINGAMENTOS.length)];
      embed.setDescription(`😤 <@${msg.author.id}> para <@${alvo.id}>:\n> *${xingo}*`);
    } else {
      const gifs = GIFS[cmd];
      const gif = gifs?.[Math.floor(Math.random() * gifs.length)];
      embed.setDescription(TEXTOS[cmd]?.(msg.author.id, alvo.id) || `<@${msg.author.id}> interagiu com <@${alvo.id}>`);
      if (gif) embed.setImage(gif);
    }

    if (!alvo.bot && afin.ganhou && pontos > 0) {
      embed.setFooter({
  text: `+${pontos} Afinidade`
});
    } else if (!alvo.bot && pontos > 0) {
      embed.setFooter({ text: 'Afinidade: já ganhada hoje (próxima em 12h)' });
    }

    if (alvo.displayAvatarURL) {
  embed.setThumbnail(
    alvo.displayAvatarURL({
      extension: 'png',
      size: 512
    })
  );
        }
    await msg.reply({ embeds: [embed] });
     await atualizarMissoes(
  msg.author.id,
  msg.guild.id,
  cmd
);
  });
}

async function atualizarMissoes(userId, guildId, tipo) {
  try {
    const { default: Missao } = await import('../db/models/Missao.mjs');
    await Missao.updateOne(
      { userId, guildId, 'diarias.tipo': tipo, 'diarias.concluida': false },
      { $inc: { 'diarias.$.atual': 1 } }
    );
  } catch {}
}
