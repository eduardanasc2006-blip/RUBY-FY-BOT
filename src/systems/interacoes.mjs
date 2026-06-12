import { EmbedBuilder } from 'discord.js';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { addAfinidade } from './afinidade.mjs';
import { progredirMissao } from './missoes.mjs';

// ================= GIFS =================
const GIFS = {
  abracar: [
    'https://media.tenor.com/gNxdFE9bHHcAAAAd/hug.gif',
    'https://media.tenor.com/OR58iFQXeXkAAAAd/hug-anime.gif',
    'https://media.tenor.com/zxpgW_k9droAAAAd/anime-hug.gif',
    'https://media.tenor.com/3wv088fG6WcAAAAd/anime-hug-love.gif',
    'https://media.tenor.com/jU9c9w82GKAAAAAd/anime-cuddle.gif',
    'https://media.tenor.com/1y8hug1.gif',
    'https://media.tenor.com/2y8hug2.gif',
    'https://media.tenor.com/3y8hug3.gif',
  ],

  beijar: [
    'https://media.tenor.com/N7i2iy_Ag2UAAAAd/anime-kiss.gif',
    'https://media.tenor.com/nz_Lr7bfaLwAAAAd/kiss.gif',
    'https://media.tenor.com/f_I2Lv9HnGIAAAAd/anime-kiss.gif',
    'https://media.tenor.com/b7DWF6EH8gAAAAAd/anime-love.gif',
    'https://media.tenor.com/9Nt8hK7V6QAAAAAd/anime-kiss-love.gif',
    'https://media.tenor.com/kiss1.gif',
    'https://media.tenor.com/kiss2.gif',
  ],

  cafune: [
    'https://media.tenor.com/lBvJXbG9sDoAAAAd/pat.gif',
    'https://media.tenor.com/aHxQKVqJlcUAAAAd/head-pat-anime.gif',
    'https://media.tenor.com/yfZOdWKpnNcAAAAd/anime-pat.gif',
    'https://media.tenor.com/5X4iM4x8A8AAAAAd/pat-head.gif',
    'https://media.tenor.com/YiSI6sM1N0QAAAAd/anime-headpat.gif',
    'https://media.tenor.com/pat1.gif',
    'https://media.tenor.com/pat2.gif',
  ],

  acariciar: [
    'https://media.tenor.com/yfZOdWKpnNcAAAAd/anime-pat.gif',
    'https://media.tenor.com/8mPbK8tM8gAAAAAd/anime-cute.gif',
    'https://media.tenor.com/yJmr2XxJk3gAAAAd/anime-love.gif',
    'https://media.tenor.com/FyN5Y2cM8YAAAAAd/anime-pat.gif',
    'https://media.tenor.com/cute1.gif',
    'https://media.tenor.com/cute2.gif',
  ],

  dancar: [
    'https://media.tenor.com/8gswRnwH8FIAAAAd/anime-dance.gif',
    'https://media.tenor.com/QnGOKE0K-DEAAAAd/anime-dance-cute.gif',
    'https://media.tenor.com/5WFTGvv-aS8AAAAd/dance.gif',
    'https://media.tenor.com/8W7hK1sU0M8AAAAd/anime-party.gif',
    'https://media.tenor.com/WJ6RzYzL6l8AAAAd/anime-dancing.gif',
    'https://media.tenor.com/dance1.gif',
    'https://media.tenor.com/dance2.gif',
  ],

  proteger: [
    'https://media.tenor.com/RFOiGbcv_z0AAAAd/anime-protect.gif',
    'https://media.tenor.com/qHBW3bm5mwoAAAAd/anime-protect.gif',
    'https://media.tenor.com/6fW8s6nY9zYAAAAd/anime-protecting.gif',
    'https://media.tenor.com/PV1LMN7fK4gAAAAd/anime-shield.gif',
    'https://media.tenor.com/UvN6j0G7G2YAAAAd/anime-save.gif',
    'https://media.tenor.com/protect1.gif',
  ],

  atacar: [
    'https://media.tenor.com/NVHKCn_Zaf4AAAAd/anime-fight.gif',
    'https://media.tenor.com/aW_qkVtI9M0AAAAd/anime-punch.gif',
    'https://media.tenor.com/kJ0LHD7x7CQAAAAd/anime-hit.gif',
    'https://media.tenor.com/rQ8M0W8L5sAAAAAd/anime-fight-action.gif',
    'https://media.tenor.com/QkX0yJ4x9vMAAAAd/anime-attack.gif',
    'https://media.tenor.com/fight1.gif',
    'https://media.tenor.com/fight2.gif',
  ],

  tocaaqui: [
    'https://media.tenor.com/UWuQX5Ns6VEAAAAd/highfive-anime.gif',
    'https://media.tenor.com/vJmgd4bqdDkAAAAd/high-five.gif',
    'https://media.tenor.com/cb6L2l0pQwQAAAAd/anime-highfive.gif',
    'https://media.tenor.com/EhM4N0w8M4gAAAAd/high-five-anime.gif',
    'https://media.tenor.com/3I4VY6gWw9QAAAAd/friends-high-five.gif',
    'https://media.tenor.com/high1.gif',
  ],

  bofetada: [
    'https://media.tenor.com/v3jIPbXtqfkAAAAd/anime-slap.gif',
    'https://media.tenor.com/YhVNBR5OrikAAAAd/slap-anime.gif',
    'https://media.tenor.com/3wT4F8Nf6R8AAAAd/anime-smack.gif',
    'https://media.tenor.com/WqWcN7TnN7IAAAAd/anime-angry.gif',
    'https://media.tenor.com/4x7wP6sY2NAAAAAd/anime-slap-face.gif',
    'https://media.tenor.com/slap1.gif',
  ],

  elogiar: [
    'https://media.tenor.com/2n1ZQ0Qv8XgAAAAC/anime-cute-blush.gif',
    'https://media.tenor.com/blush1.gif',
    'https://media.tenor.com/blush2.gif',
  ],

  xingar: [
    'https://media.tenor.com/8ZQ3QmV6k4oAAAAC/anime-angry.gif',
    'https://media.tenor.com/angry1.gif',
    'https://media.tenor.com/angry2.gif',
  ],
};

// ================= DADOS =================
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

const TEXTOS = {
  abracar: (a, b) => `🤗 <@${a}> abraçou <@${b}>!`,
  beijar: (a, b) => `💋 <@${a}> beijou <@${b}>!`,
  cafune: (a, b) => `🥰 <@${a}> fez cafuné em <@${b}>!`,
  acariciar: (a, b) => `💕 <@${a}> acariciou <@${b}>!`,
  dancar: (a, b) => `💃 <@${a}> dançou com <@${b}>!`,
  proteger: (a, b) => `🛡️ <@${a}> prometeu proteger <@${b}>!`,
  atacar: (a, b) => `⚔️ <@${a}> atacou <@${b}>!`,
  tocaaqui: (a, b) => `🤚 <@${a}> pediu toca aqui para <@${b}>!`,
  bofetada: (a, b) => `👋 <@${a}> deu uma bofetada em <@${b}>! 😤`,
};

const CORES = {
  abracar: 0xa855f7,
  beijar: 0xff69b4,
  cafune: 0xffd700,
  acariciar: 0xa855f7,
  dancar: 0x2ecc71,
  proteger: 0x3498db,
  elogiar: 0xf1c40f,
  xingar: 0xe74c3c,
  atacar: 0xe74c3c,
  tocaaqui: 0x27ae60,
  bofetada: 0xe67e22,
};

// ================= EXPORT COMANDOS (CORRIGIDO) =================
export const comandos = [
  { cmd: '!abracar @user', desc: 'Abraça alguém (+1 afinidade).' },
  { cmd: '!beijar @user', desc: 'Beija alguém (+3 afinidade).' },
  { cmd: '!cafune @user', desc: 'Cafuné (+2 afinidade).' },
  { cmd: '!acariciar @user', desc: 'Carinho (+2 afinidade).' },
  { cmd: '!dancar @user', desc: 'Dança com alguém (+1 afinidade).' },
  { cmd: '!elogiar @user', desc: 'Elogia alguém (+1 afinidade).' },
  { cmd: '!proteger @user', desc: 'Protege alguém (+2 afinidade).' },
  { cmd: '!atacar @user', desc: 'Ataca alguém.' },
  { cmd: '!tocaaqui @user', desc: 'High five (+1 afinidade).' },
  { cmd: '!bofetada @user', desc: 'Bofetada.' },
  { cmd: '!xingar @user', desc: 'Xinga alguém (diversão).' },
];

// ================= FILTRO DE COMANDOS (CORRIGE !AJUDA) =================
const INTERACOES = new Set(Object.keys(AFINIDADE_MAPA));

// ================= HELPERS =================
const getGif = (key) => {
  const list = GIFS[key] || [];
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
};

export function register(client, configs) {
  if (client.__interacoesRegistrado) return;
  client.__interacoesRegistrado = true;

  client.on('messageCreate', async (msg) => {
    try {
      if (msg.author.bot || !msg.guild) return;

      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';

      if (!msg.content.startsWith(prefixo)) return;

      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();

      // 🔥 CORREÇÃO PRINCIPAL
      if (!INTERACOES.has(cmd)) return;

      const alvo = msg.mentions.users.first();
      if (!alvo)
        return msg.reply({ embeds: [embedErro('Mencione um usuário.')] });

      if (alvo.id === msg.author.id)
        return msg.reply({ embeds: [embedErro('Você não pode usar isso em si mesmo!')] });

      const cdKey = `inter:${cmd}:${msg.author.id}:${msg.guild.id}`;
      const espera = checkCooldown(cdKey, 20000);

      if (espera)
        return msg.reply({
          embeds: [
            embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`),
          ],
        });

      const embed = new EmbedBuilder()
        .setColor(CORES[cmd] || 0xa855f7)
        .setTimestamp();

      embed.setDescription(TEXTOS[cmd]?.(msg.author.id, alvo.id));
      const gif = getGif(cmd);
      if (gif) embed.setImage(gif);

      embed.setThumbnail(alvo.displayAvatarURL({ size: 512 }));

      const pontos = AFINIDADE_MAPA[cmd] || 0;

      if (pontos > 0) {
        await addAfinidade(
          msg.guild.id,
          msg.author.id,
          alvo.id,
          pontos
        ).catch(() => {});
      }

      await msg.reply({ embeds: [embed] });

      await progredirMissao(
        msg.author.id,
        msg.guild.id,
        'interacao',
        1,
        msg.channel
      ).catch(() => {});
    } catch (e) {
      console.error(e);
      msg.reply({ content: '❌ Ocorreu um erro.' }).catch(() => {});
    }
  });
}
