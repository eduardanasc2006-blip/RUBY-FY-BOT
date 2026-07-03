import { EmbedBuilder } from 'discord.js';
import { addAfinidade } from './afinidade.mjs';

export const comandos = [{ cmd: '!abracar @user', desc: 'Abraçar alguém' }];

const GIFS = [
  'https://media.tenor.com/I-cWkpGbPSkAAAAC/anime-hug.gif',
  'https://media.tenor.com/GHT4TgFZGl8AAAAC/anime-hug.gif',
  'https://media.tenor.com/lBVWFV2VTRAAAAAC/hug-anime.gif',
];

export function register(client, configs) {
  if (client.__abracarRegistrado) return;
  client.__abracarRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p + 'abracar')) return;
    const alvo = msg.mentions.users.first();
    if (!alvo || alvo.id === msg.author.id) return msg.reply('❌ Mencione alguém para abraçar!');
    if (alvo.bot) return msg.reply('🤖 Não posso abraçar um bot!');
    const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
    await addAfinidade(msg.author.id, alvo.id, msg.guild.id, 2).catch(() => null);
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xffb7c5).setDescription(`🤗 **${msg.author.username}** abraçou **${alvo.username}**!`).setImage(gif)
    ]});
  });
}
