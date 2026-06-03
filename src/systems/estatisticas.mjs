import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Ticket from '../db/models/Ticket.mjs';
import QuizModel from '../db/models/Quiz.mjs';
import Afinidade from '../db/models/Afinidade.mjs';

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'stats') {
      const [usuarios, casamentos, tickets, quizStats, afinidades] = await Promise.all([
        Usuario.countDocuments({ guildId }),
        Casamento.countDocuments({ guildId, ativo: true }),
        Ticket.countDocuments({ guildId }),
        QuizModel.aggregate([{ $match: { guildId } }, { $group: { _id: null, total: { $sum: '$total' }, acertos: { $sum: '$acertos' } } }]),
        Afinidade.aggregate([{ $match: { guildId } }, { $group: { _id: null, totalPontos: { $sum: '$pontos' } } }]),
      ]);

      const totalMsgs = (await Usuario.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: '$mensagens' } } }
      ]))[0]?.total || 0;

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle(`📊 Estatísticas — ${msg.guild.name}`)
        .setThumbnail(msg.guild.iconURL({ size: 128 }))
        .addFields(
          { name: '👥 Usuários no Bot', value: String(usuarios), inline: true },
          { name: '💍 Casamentos Ativos', value: String(casamentos), inline: true },
          { name: '🎫 Tickets Total', value: String(tickets), inline: true },
          { name: '🧠 Quizzes Jogados', value: String(quizStats[0]?.total || 0), inline: true },
          { name: '✅ Acertos Quiz', value: String(quizStats[0]?.acertos || 0), inline: true },
          { name: '💜 Pontos de Afinidade', value: String(afinidades[0]?.totalPontos || 0), inline: true },
          { name: '💬 Total Mensagens', value: totalMsgs.toLocaleString('pt-BR'), inline: true },
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
          { name: '👥 Usuários', value: String(client.users.cache.size), inline: true },
          { name: '⏱️ Uptime', value: formatarUptime(process.uptime()), inline: true },
          { name: '💾 RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
          { name: '📦 Node.js', value: process.version, inline: true },
          { name: '🔖 Versão', value: '2.0.0 Ultimate', inline: true },
        )
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }
  });
}

function formatarUptime(segundos) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
