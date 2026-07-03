import { EmbedBuilder } from 'discord.js';
import Usuario from '../../db/models/Usuario.mjs';
import Conquista from '../../db/models/Conquista.mjs';
import Casamento from '../../db/models/Casamento.mjs';
import Afinidade from '../../db/models/Afinidade.mjs';
import { checkCooldown, formatarTempo } from '../../utils/cooldown.mjs';
import { embedErro } from '../../utils/embeds.mjs';
import { registrarLog } from '../../utils/logger.mjs';
import { calcularNivel, getFaixa } from '../../utils/nivelCalc.mjs';
import { ganharXP } from './xpSystem.mjs';
import { semBanco } from '../../utils/dbGuard.mjs';

function nome(user) {
  return user.globalName || user.username || user.tag || 'Usuário';
}

function gerarBarra(atual, total, tamanho = 10) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
}

function chaveAfin(u1, u2) {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

export const comandos = [
  { cmd: '!rep @user', desc: 'Dá +1 reputação (1x por dia, +20 XP).' },
  { cmd: '!ranking',   desc: 'Top 10 reputação do servidor.' },
];

export function register(client, configs) {
  if (client.__reputacaoRegistrado) return;
  client.__reputacaoRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'rep') {
      if (semBanco(msg)) return;
      const alvo = msg.mentions.users.first();
      if (!alvo || alvo.bot) return msg.reply({ embeds: [embedErro('Mencione um usuário válido.')] });
      if (alvo.id === msg.author.id) return msg.reply({ embeds: [embedErro('Você não pode dar reputação a si mesmo.')] });

      const cdKey = `rep:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 24 * 3600 * 1000);
      if (espera) {
        const h = Math.floor(espera / 3600000);
        const m = Math.floor((espera % 3600000) / 60000);
        return msg.reply({ embeds: [embedErro(`Você já deu reputação hoje. Próxima em **${h}h ${m}m**.`)] });
      }

      await Usuario.findOneAndUpdate(
        { userId: alvo.id, guildId },
        { $inc: { reputacao: 1 }, $setOnInsert: { userId: alvo.id, guildId } },
        { upsert: true, new: true }
      );
      await registrarLog(client, guildId, 'reputacao', msg.author.id, {
        descricao: `<@${msg.author.id}> deu +1 rep para <@${alvo.id}>`,
      }, configs);
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`⭐ <@${msg.author.id}> deu **+1 reputação** para <@${alvo.id}>!`).setTimestamp()] });
    }

    if (cmd === 'ranking') {
      if (semBanco(msg)) return;
      const todos = await Usuario.find({ guildId });
      const top = todos
        .sort((a, b) => (b.reputacao || 0) - (a.reputacao || 0))
        .slice(0, 10);
      const medals = ['🥇', '🥈', '🥉'];
      const linhas = top.map((u, i) => `${medals[i] || `**#${i + 1}**`} <@${u.userId}> — ⭐ ${u.reputacao || 0}`);
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle('⭐ Top Reputação').setDescription(linhas.join('\n') || 'Nenhum dado.').setTimestamp()] });
    }
  });
}
