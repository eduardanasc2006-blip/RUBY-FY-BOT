import { EmbedBuilder } from 'discord.js';
import { getDB } from '../db/sqlite.mjs';

export const comandos = [
  { cmd: '!stats',   desc: 'Estatísticas gerais do servidor.' },
  { cmd: '!botinfo', desc: 'Informações e status do FiskBot.' },
  { cmd: '!versao',  desc: 'Versão atual do bot.' },
];

export function register(client, configs) {
  if (client.__estatisticasRegistrado) return;
  client.__estatisticasRegistrado = true;

  const db = getDB();

  client.on('messageCreate', async (msg) => {
    try {
      if (msg.author.bot || !msg.guild) return;

      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';
      if (!msg.content.startsWith(prefixo)) return;

      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();
      const guildId = msg.guild.id;

      // ===================== STATS =====================
      if (cmd === 'stats') {

        const usuarios = db.prepare(
          'SELECT COUNT(*) as total FROM usuarios WHERE guildId = ?'
        ).get(guildId).total;

        const casamentos = db.prepare(
          'SELECT COUNT(*) as total FROM casamentos WHERE guildId = ? AND ativo = 1'
        ).get(guildId).total;

        const afinidades = db.prepare(
          'SELECT pontos FROM afinidades WHERE guildId = ?'
        ).all(guildId);

        const todosUsers = db.prepare(
          'SELECT mensagens FROM usuarios WHERE guildId = ?'
        ).all(guildId);

        const totalMsgs = todosUsers.reduce(
          (s, u) => s + (u.mensagens || 0),
          0
        );

        const totalPontosAfin = afinidades.reduce(
          (s, a) => s + (a.pontos || 0),
          0
        );

        const embed = new EmbedBuilder()
          .setColor(0xa855f7)
          .setTitle(`📊 Estatísticas — ${msg.guild.name}`)
          .setThumbnail(msg.guild.iconURL({ size: 128 }))
          .addFields(
            { name: '👥 Usuários no Bot',   value: String(usuarios), inline: true },
            { name: '💍 Casamentos Ativos', value: String(casamentos), inline: true },
            { name: '💜 Pontos Afinidade',  value: String(totalPontosAfin), inline: true },
            { name: '💬 Total Mensagens',   value: totalMsgs.toLocaleString('pt-BR'), inline: true },
          )
          .setTimestamp();

        return msg.reply({ embeds: [embed] });
      }

      // ===================== BOTINFO =====================
      if (cmd === 'botinfo') {
        const embed = new EmbedBuilder()
          .setColor(0xa855f7)
          .setTitle('🤖 FiskBot — Info')
          .addFields(
            { name: '📡 Servidores', value: String(client.guilds.cache.size), inline: true },
            { name: '👥 Usuários',   value: String(client.users.cache.size), inline: true },
            { name: '⏱️ Uptime',     value: _formatarUptime(process.uptime()), inline: true },
            { name: '💾 RAM',        value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
            { name: '📦 Node.js',    value: process.version, inline: true },
            { name: '🔖 Versão',     value: '2.0.0 Ultimate', inline: true },
          )
          .setTimestamp();

        return msg.reply({ embeds: [embed] });
      }

      // ===================== VERSÃO =====================
      if (cmd === 'versao') {
        const embed = new EmbedBuilder()
          .setColor(0xa855f7)
          .setDescription('🔖 **FiskBot v2.0.0 Ultimate**')
          .setTimestamp();

        return msg.reply({ embeds: [embed] });
      }

    } catch (err) {
      console.error('[ESTATISTICAS ERROR]', err);
    }
  });
}

// ===================== UTILS =====================
function _formatarUptime(segundos) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
