import { EmbedBuilder } from 'discord.js';

export const comandos = [{ cmd: '!tapa @user', desc: 'Dar um tapa em alguém' }];

const GIFS = [
  'https://media.tenor.com/tXwfbr7avKQAAAAC/anime-slap.gif',
  'https://media.tenor.com/GmXTFLzZRRIAAAAC/slap-anime.gif',
];

export function register(client, configs) {
  if (client.__tapaRegistrado) return;
  client.__tapaRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p + 'tapa')) return;
    const alvo = msg.mentions.users.first();
    if (!alvo || alvo.id === msg.author.id) return msg.reply('❌ Mencione alguém!');
    const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xe74c3c).setDescription(`👋 **${msg.author.username}** deu um tapa em **${alvo.username}**! 😤`).setImage(gif)
    ]});
  });
}
