import { EmbedBuilder } from 'discord.js';
import Usuario from '../../db/models/Usuario.mjs';
import Conquista from '../../db/models/Conquista.mjs';
import Casamento from '../../db/models/Casamento.mjs';
import Afinidade from '../../db/models/Afinidade.mjs';
import { calcularNivel, nivelAfinidade } from '../../utils/nivelCalc.mjs';
import { checkCooldown, formatarTempo } from '../../utils/cooldown.mjs';
import { embedErro } from '../../utils/embeds.mjs';

export const comandos = [
  { cmd: '!perfil [@user]', desc: 'Mostra o perfil RPG do usuário.' },
];

export function register(client, configs) {
  if (client.__perfilRegistrado) return;
  client.__perfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== 'perfil') return;

    const alvo = msg.mentions.users.first() || msg.author;
    const guildId = msg.guild.id;

    const cdKey = `perfil:${msg.author.id}:${guildId}`;
    const espera = checkCooldown(cdKey, 8000);

    if (espera) {
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)],
      });
    }

    try {
      const [u, conquistas, casamento] = await Promise.all([
        Usuario.findOne({ userId: alvo.id, guildId }),
        Conquista.findOne({ userId: alvo.id, guildId }),
        Casamento.findOne({
          guildId,
          $or: [{ userId1: alvo.id }, { userId2: alvo.id }],
          ativo: true,
        }),
      ]);

      const xpTotal = u?.xpTotal || 0;
      const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
      const pct = Math.round((xpAtual / Math.max(1, xpProximo)) * 100);

      let parceiro = null;
      let afinidade = 0;

      if (casamento) {
        const idParc =
          casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;

        const u1 = idParc < alvo.id ? idParc : alvo.id;
        const u2 = idParc < alvo.id ? alvo.id : idParc;

        const afinDoc = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });

        afinidade = afinDoc?.pontos || 0;
        parceiro = await client.users.fetch(idParc).catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle(`🎭 Perfil de ${alvo.username}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
        .setDescription(`*"${u?.tituloEquipado || 'Sem título equipado'}"*`)
        .addFields(
          { name: '🏆 Nível', value: `${nivel} (${pct}%)`, inline: true },
          { name: '⭐ XP Total', value: String(xpTotal), inline: true },
          { name: '💰 XP Disponível', value: String(u?.xpDisponivel || 0), inline: true },

          { name: '📊 Progresso', value: `${xpAtual}/${xpProximo}`, inline: false },

          { name: '💜 Reputação', value: String(u?.reputacao || 0), inline: true },
          { name: '💬 Mensagens', value: String(u?.mensagens || 0), inline: true },
          { name: '🏅 Conquistas', value: String(conquistas?.conquistas?.length || 0), inline: true },

          {
            name: '💍 Parceiro(a)',
            value: parceiro
              ? `${parceiro.username}\n💜 ${afinidade} pts (${nivelAfinidade(afinidade)})`
              : 'Solteiro(a)',
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
      console.error('[perfil] erro:', err);
      return msg.reply({
        embeds: [embedErro('Erro ao carregar perfil.')],
      });
    }
  });
}
