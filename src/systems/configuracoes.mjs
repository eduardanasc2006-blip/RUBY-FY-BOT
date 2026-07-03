import { EmbedBuilder } from 'discord.js';
import Config from '../db/models/Config.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { isAdmin } from '../utils/permissions.mjs';

export const comandos = [
  { cmd: '!config', desc: 'Ver configurações do servidor' },
  { cmd: '!setprefixo <prefixo>', desc: 'Alterar prefixo do bot' },
];

export function register(client, configs) {
  if (client.__configRegistrado) return;
  client.__configRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'config') {
      if (!isAdmin(msg)) return msg.reply(embedErro('Apenas administradores.'));
      const config = await Config.findOne({ guildId: msg.guild.id });
      await msg.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⚙️ Configurações do Servidor')
          .addFields(
            { name: 'Prefixo', value: config?.prefixo ?? '!', inline: true },
            { name: 'Canal de Logs', value: config?.canalLogs ? `<#${config.canalLogs}>` : 'Não definido', inline: true },
          )
      ]});
    }

    if (cmd === 'setprefixo') {
      if (!isAdmin(msg)) return msg.reply(embedErro('Apenas administradores.'));
      const novo = parts[1];
      if (!novo || novo.length > 3) return msg.reply(embedErro('Prefixo inválido (máx 3 caracteres).'));
      await Config.findOneAndUpdate({ guildId: msg.guild.id }, { $set: { prefixo: novo } }, { upsert: true, new: true });
      configs.set(msg.guild.id, { ...(cfg ?? {}), prefixo: novo });
      await msg.reply(embedSucesso(`Prefixo alterado para \`${novo}\``));
    }
  });
}
