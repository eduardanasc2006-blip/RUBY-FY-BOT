import { EmbedBuilder } from 'discord.js';
import Usuario from '../../db/models/Usuario.mjs';
import { embedErro } from '../../utils/embeds.mjs';

export const comandos = [
  { cmd: '!saldo', desc: 'Ver seu XP disponível' },
  { cmd: '!transferir @user <xp>', desc: 'Transferir XP para alguém' },
];

export function register(client, configs) {
  if (client.__economiaRegistrado) return;
  client.__economiaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'saldo') {
      const user = await Usuario.findOne({ userId: msg.author.id, guildId: msg.guild.id });
      if (!user) return msg.reply(embedErro('Você ainda não tem perfil. Mande uma mensagem primeiro!'));
      await msg.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0x00d4ff)
          .setTitle('💰 Seu Saldo')
          .addFields(
            { name: 'XP Disponível', value: (user.xpDisponivel ?? 0).toLocaleString('pt-BR'), inline: true },
            { name: 'XP Total', value: (user.xpTotal ?? 0).toLocaleString('pt-BR'), inline: true },
          )
          .setThumbnail(msg.author.displayAvatarURL({ size: 128 }))
      ]});
    }
  });
}
