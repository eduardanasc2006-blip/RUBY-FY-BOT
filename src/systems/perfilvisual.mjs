import { EmbedBuilder } from 'discord.js';
import { getDB } from '../db/sqlite.mjs';
import { calcularNivel, nivelAfinidade } from '../utils/nivelCalc.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';

const db = getDB();

export const comandos = [
  { cmd: '!perfil [@user]', desc: 'Ver perfil com stats completos.' },
  { cmd: '!setmoldura <id>', desc: 'Trocar moldura do perfil.' },
  { cmd: '!setfundo <id>', desc: 'Trocar fundo do perfil.' },
];

export function register(client, configs) {
  if (client.__perfilvisualRegistrado) return;
  client.__perfilvisualRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'perfil') return;

    const alvo = msg.mentions.users.first() || msg.author;

    const cdKey = `perfil:${msg.author.id}:${guildId}`;
    const espera = checkCooldown(cdKey, 10_000);

    if (espera) {
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(espera)}**.`)],
      });
    }

    try {
      /* =========================
         USER SQLITE ÚNICO
      ========================= */

      const u = db.prepare(`
        SELECT * FROM usuarios
        WHERE userId = ? AND guildId = ?
      `).get(alvo.id, guildId);

      const xpTotal = u?.xpTotal || 0;
      const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);

      const pct = Math.round((xpAtual / Math.max(1, xpProximo)) * 100);

      /* =========================
         BADGES / EFEITOS
      ========================= */

      const badges = u?.badges ? JSON.parse(u.badges) : [];

      const barra =
        '█'.repeat(Math.round((xpAtual / xpProximo) * 15)) +
        '░'.repeat(15 - Math.round((xpAtual / xpProximo) * 15));

      /* =========================
         EMBED FINAL
      ========================= */

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle(`🎭 Perfil de ${alvo.username}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
        .setDescription(`*"${u?.titulo || 'Sem título equipado'}"*`)
        .addFields(
          { name: '🏆 Nível', value: `${nivel} (${pct}%)`, inline: true },
          { name: '⭐ XP Total', value: xpTotal.toLocaleString('pt-BR'), inline: true },
          { name: '💰 XP Disponível', value: (u?.xpDisponivel || 0).toLocaleString('pt-BR'), inline: true },

          { name: '📊 Progresso', value: `\`${barra}\`\n${xpAtual}/${xpProximo}`, inline: false },

          { name: '💜 Reputação', value: String(u?.reputacao || 0), inline: true },
          { name: '💬 Mensagens', value: String(u?.mensagens || 0), inline: true },

          {
            name: '🏅 Badges',
            value: badges.length ? badges.join(' ') : 'Nenhum',
            inline: true,
          },
        )
        .setFooter({
          text: `FiskBot • ${msg.guild.name}`,
          iconURL: msg.guild.iconURL() ?? undefined,
        })
        .setTimestamp();

      return msg.reply({ embeds: [embed] });

    } catch (err) {
      console.error('[perfilvisual]', err);
      return msg.reply({
        embeds: [embedErro('Erro ao carregar perfil.')],
      });
    }
  });
}
