import { EmbedBuilder } from 'discord.js';
import { addAfinidade } from './afinidade.mjs';

export const comandos = [{ cmd: '!beijar @user', desc: 'Beijar alguém' }];

const GIFS = [
  'https://media.tenor.com/Yf4VfMDKE4sAAAAC/anime-kiss.gif',
  'https://media.tenor.com/cA7hh64ZuHsAAAAC/kiss-anime.gif',
];

export function register(client, configs) {
  if (client.__beijarRegistrado) return;
  client.__beijarRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p + 'beijar')) return;
    const alvo = msg.mentions.users.first();
    if (!alvo || alvo.id === msg.author.id) return msg.reply('❌ Mencione alguém!');
    if (alvo.bot) return msg.reply('🤖 Não posso beijar um bot!');
    const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
    await addAfinidade(msg.author.id, alvo.id, msg.guild.id, 5).catch(() => null);
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xff4d6d).setDescription(`💋 **${msg.author.username}** beijou **${alvo.username}**!`).setImage(gif)
    ]});
  });
}
