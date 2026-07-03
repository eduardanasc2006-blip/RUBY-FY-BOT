import { EmbedBuilder } from 'discord.js';
import { addAfinidade } from './afinidade.mjs';

export const comandos = [{ cmd: '!cafune @user', desc: 'Fazer cafuné em alguém' }];

const GIFS = [
  'https://media.tenor.com/X7a3Wf15NBAAAAAC/anime-headpat.gif',
  'https://media.tenor.com/P_5mVd3JA7IAAAAC/head-pat-anime.gif',
];

export function register(client, configs) {
  if (client.__cafuneRegistrado) return;
  client.__cafuneRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p + 'cafune')) return;
    const alvo = msg.mentions.users.first();
    if (!alvo || alvo.id === msg.author.id) return msg.reply('❌ Mencione alguém!');
    if (alvo.bot) return msg.reply('🤖 Um bot não precisa de cafuné!');
    const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
    await addAfinidade(msg.author.id, alvo.id, msg.guild.id, 3).catch(() => null);
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xa78bfa).setDescription(`🤚 **${msg.author.username}** fez cafuné em **${alvo.username}**!`).setImage(gif)
    ]});
  });
}
