import { EmbedBuilder } from 'discord.js';

export const comandos = [{ cmd: '!moeda', desc: 'Jogar cara ou coroa' }];

export function register(client, configs) {
  if (client.__moedaRegistrado) return;
  client.__moedaRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (msg.content.slice(p.length).trim().split(/\s+/)[0].toLowerCase() !== 'moeda') return;
    if (!msg.content.startsWith(p)) return;
    const resultado = Math.random() < 0.5 ? '👑 Cara' : '🪙 Coroa';
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xf1c40f).setTitle('🪙 Cara ou Coroa').setDescription(`Resultado: **${resultado}**!`)
    ]});
  });
}
