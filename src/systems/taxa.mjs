import { EmbedBuilder, Colors } from 'discord.js';
import { isAdmin } from '../utils/permissions.mjs';
import { embedErro } from '../utils/embeds.mjs';
import Config from '../db/models/Config.mjs';

export const comandos = [
  { cmd: '!taxa', desc: 'Ver taxa atual de Robux' },
  { cmd: '!setraxa <robux> <brl>', desc: 'Definir taxa (admin)' },
  { cmd: '!historico', desc: 'Histórico de taxas' },
];

function formatBrl(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export function register(client, configs) {
  if (client.__taxaRegistrado) return;
  client.__taxaRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    const guildConfig = await Config.findOne({ guildId: msg.guild.id });
    const taxa = guildConfig?.taxa ?? 38;

    if (cmd === 'taxa') {
      await msg.reply({ embeds: [
        new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle('📊 Taxa atual de Robux')
          .addFields(
            { name: '1.000 Robux', value: formatBrl(taxa), inline: true },
            { name: '1 Robux', value: formatBrl(taxa / 1000), inline: true },
          )
      ]});
    }

    if (cmd === 'setraxa') {
      if (!isAdmin(msg)) return msg.reply(embedErro('Apenas administradores.'));
      const novaRobux = parseInt(parts[1]);
      const novaBrl = parseFloat(parts[2]?.replace(',', '.'));
      if (!novaRobux || !novaBrl) return msg.reply(embedErro('Use: `!setraxa 1000 40`'));
      const novaTaxa = (novaBrl / novaRobux) * 1000;
      const hist = guildConfig?.taxaHistorico ?? [];
      hist.push({ taxa: novaTaxa, changedBy: msg.author.username, changedAt: new Date().toISOString() });
      if (hist.length > 10) hist.shift();
      await Config.findOneAndUpdate({ guildId: msg.guild.id }, { $set: { taxa: novaTaxa, taxaHistorico: hist } }, { upsert: true });
      await msg.reply({ embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Taxa atualizada!').setDescription(`${novaRobux} Robux = ${formatBrl(novaBrl)}`)] });
    }
  });
}
