import { EmbedBuilder } from 'discord.js';
import Log from '../db/models/Log.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { embedErro } from '../utils/embeds.mjs';

export const comandos = [
  { cmd: '!logs [tipo]', desc: 'Ver últimos logs do servidor (admin).' },
];

export function register(client, configs) {
  if (client.__logsRegistrado) return;
  client.__logsRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'logs') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      const tipo = args[0] || null;
      const filtro = { guildId };
      if (tipo) filtro.tipo = tipo;

      const logs = await Log.find(filtro).sort({ createdAt: -1 }).limit(10).lean();
      if (!logs.length) return msg.reply({ embeds: [embedErro('Nenhum log encontrado.')] });

      const linhas = logs.map(l => {
        const data = new Date(l.createdAt).toLocaleString('pt-BR');
        return `**[${data}]** \`${l.tipo}\` — ${l.dados?.descricao || JSON.stringify(l.dados).slice(0, 80)}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle(`📋 Logs Recentes${tipo ? ` (${tipo})` : ''}`)
        .setDescription(linhas.join('\n'))
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });

  client.on('guildMemberAdd', async (member) => {
    const cfg = configs.get(member.guild.id);
    if (!cfg?.canalLogs) return;
    const canal = member.guild.channels.cache.get(cfg.canalLogs);
    if (!canal) return;
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('📥 Membro Entrou')
      .setDescription(`${member.toString()} entrou no servidor!`)
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .addFields({ name: '📅 Conta criada em', value: member.user.createdAt.toLocaleDateString('pt-BR'), inline: true })
      .setTimestamp();
    await canal.send({ embeds: [embed] }).catch(() => {});
  });

  client.on('guildMemberRemove', async (member) => {
    const cfg = configs.get(member.guild.id);
    if (!cfg?.canalLogs) return;
    const canal = member.guild.channels.cache.get(cfg.canalLogs);
    if (!canal) return;
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('📤 Membro Saiu')
      .setDescription(`**${member.user.tag}** saiu do servidor.`)
      .setTimestamp();
    await canal.send({ embeds: [embed] }).catch(() => {});
  });
}
