import { EmbedBuilder } from 'discord.js';
  import Usuario from '../db/models/Usuario.mjs';
  import Casamento from '../db/models/Casamento.mjs';
  import Ticket from '../db/models/Ticket.mjs';
  import Afinidade from '../db/models/Afinidade.mjs';

  export const comandos = [
    { cmd: '!stats',   desc: 'Estatísticas gerais do servidor.' },
    { cmd: '!botinfo', desc: 'Informações e status do FiskBot.' },
    { cmd: '!versao',  desc: 'Versão atual do bot.' },
  ];

  export function register(client, configs) {
    if (client.__estatisticasRegistrado) return;
    client.__estatisticasRegistrado = true;

    client.on('messageCreate', async (msg) => {
      if (msg.author.bot || !msg.guild) return;
      const cfg = configs.get(msg.guild.id);
      const prefixo = cfg?.prefixo || '!';
      if (!msg.content.startsWith(prefixo)) return;

      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();
      const guildId = msg.guild.id;

      if (cmd === 'stats') {
        const [usuarios, casamentos, tickets, afinidades, todosUsers] = await Promise.all([
          Usuario.countDocuments({ guildId }),
          Casamento.countDocuments({ guildId, ativo: true }),
          Ticket.countDocuments({ guildId }),
          Afinidade.find({ guildId }).lean(),
          Usuario.find({ guildId }).lean(),
        ]);

        const totalMsgs = todosUsers.reduce((s, u) => s + (u.mensagens || 0), 0);
        const totalPontosAfin = afinidades.reduce((s, a) => s + (a.pontos || 0), 0);

        const embed = new EmbedBuilder()
          .setColor(0xa855f7)
          .setTitle(`📊 Estatísticas — ${msg.guild.name}`)
          .setThumbnail(msg.guild.iconURL({ size: 128 }))
          .addFields(
            { name: '👥 Usuários no Bot',    value: String(usuarios),                    inline: true },
            { name: '💍 Casamentos Ativos',  value: String(casamentos),                  inline: true },
            { name: '🎫 Tickets Total',       value: String(tickets),                     inline: true },
            { name: '💜 Pontos Afinidade',   value: String(totalPontosAfin),             inline: true },
            { name: '💬 Total Mensagens',    value: totalMsgs.toLocaleString('pt-BR'),   inline: true },
          )
          .setTimestamp();
        return msg.reply({ embeds: [embed] });
      }

      if (cmd === 'botinfo') {
        const embed = new EmbedBuilder()
          .setColor(0xa855f7)
          .setTitle('🤖 FiskBot — Info')
          .addFields(
            { name: '📡 Servidores', value: String(client.guilds.cache.size), inline: true },
            { name: '👥 Usuários',   value: String(client.users.cache.size),  inline: true },
            { name: '⏱️ Uptime',    value: _formatarUptime(process.uptime()), inline: true },
            { name: '💾 RAM',        value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
            { name: '📦 Node.js',   value: process.version, inline: true },
            { name: '🔖 Versão',    value: '2.0.0 Ultimate', inline: true },
          )
          .setTimestamp();
        return msg.reply({ embeds: [embed] });
      }

      if (cmd === 'versao') {
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xa855f7).setDescription('🔖 **FiskBot v2.0.0 Ultimate**').setTimestamp()] });
      }
    });
  }

  function _formatarUptime(segundos) {
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
  