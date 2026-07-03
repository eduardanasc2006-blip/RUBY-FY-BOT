import { EmbedBuilder } from 'discord.js';

export const comandos = [{ cmd: '!dado [lados]', desc: 'Rolar um dado (padrão: 6 lados)' }];

export function register(client, configs) {
  if (client.__dadoRegistrado) return;
  client.__dadoRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'dado') return;
    const lados = Math.min(Math.max(parseInt(parts[1]) || 6, 2), 100);
    const resultado = Math.floor(Math.random() * lados) + 1;
    await msg.reply({ embeds: [
      new EmbedBuilder().setColor(0xe67e22)
        .setTitle('🎲 Dado Rolado!')
        .setDescription(`Você rolou um d**${lados}** e tirou **${resultado}**!`)
    ]});
  });
}
