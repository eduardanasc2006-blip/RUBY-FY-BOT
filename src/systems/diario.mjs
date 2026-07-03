import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { ganharXP } from './xpSystem.mjs';

const XP_DIARIO = 100;
const MS_24H = 86_400_000;

export const comandos = [{ cmd: '!diario', desc: 'Coletar recompensa diária de XP' }];

export function register(client, configs) {
  if (client.__diarioRegistrado) return;
  client.__diarioRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p + 'diario') && msg.content.slice(p.length).trim().split(/\s+/)[0].toLowerCase() !== 'diario') return;
    if (msg.content.slice(p.length).trim().split(/\s+/)[0].toLowerCase() !== 'diario') return;

    const user = await Usuario.findOne({ userId: msg.author.id, guildId: msg.guild.id });
    if (!user) return msg.reply(embedErro('Você ainda não tem perfil. Mande uma mensagem primeiro!'));

    const agora = Date.now();
    const ultimoDiario = user.ultimoDiario ? new Date(user.ultimoDiario).getTime() : 0;
    const restante = MS_24H - (agora - ultimoDiario);

    if (restante > 0) {
      const h = Math.floor(restante / 3600000);
      const m = Math.floor((restante % 3600000) / 60000);
      return msg.reply(embedErro(`Você já coletou hoje! Volte em **${h}h ${m}m**.`));
    }

    await ganharXP(msg.author.id, msg.guild.id, XP_DIARIO, 'diario');
    await Usuario.updateOne({ userId: msg.author.id, guildId: msg.guild.id }, { $set: { ultimoDiario: new Date().toISOString() } });

    await msg.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎁 Recompensa Diária!')
        .setDescription(`Você coletou **+${XP_DIARIO} XP**! Volte amanhã.`)
        .setThumbnail(msg.author.displayAvatarURL({ size: 128 }))
    ]});
  });
}
