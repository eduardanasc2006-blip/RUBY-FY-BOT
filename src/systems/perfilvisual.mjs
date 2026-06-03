import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import { calcularNivel, nivelAfinidade } from '../utils/nivelCalc.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'perfilcard') {
      const alvo = msg.mentions.users.first() || msg.author;

      const cdKey = `perfilcard:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 10_000);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para gerar outro perfil.`)] });

      const [u, conquistas, casamento] = await Promise.all([
        Usuario.findOne({ userId: alvo.id, guildId }),
        Conquista.findOne({ userId: alvo.id, guildId }),
        Casamento.findOne({ guildId, $or: [{ userId1: alvo.id }, { userId2: alvo.id }], ativo: true }),
      ]);

      const { nivel, xpAtual, xpProximo } = calcularNivel(u?.xp || 0);
      const barra = gerarBarraVisual(xpAtual, xpProximo);

      let parceiro = null;
      let afinidadePontos = 0;

      if (casamento) {
        const parcId = casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;
        const u1 = parcId < alvo.id ? parcId : alvo.id;
        const u2 = parcId < alvo.id ? alvo.id : parcId;
        const afinDoc = await Afinidade.findOne({ guildId, userId1: u1, userId2: u2 });
        afinidadePontos = afinDoc?.pontos || 0;
        parceiro = await client.users.fetch(parcId).catch(() => null);
      }

      const numConquistas = conquistas?.conquistas?.length || 0;
      const pct = Math.round((xpAtual / xpProximo) * 100);

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle(`🎭 Perfil de ${alvo.displayName}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
        .setDescription(`*"${u?.tituloEquipado || '─ Sem título equipado ─'}"*`)
        .addFields(
          { name: '🏆 Nível', value: `**${nivel}** (${pct}%)`, inline: true },
          { name: '⭐ XP', value: `${u?.xp?.toLocaleString('pt-BR') || 0}`, inline: true },
          { name: '📊 Progresso', value: `\`${barra}\`\n${xpAtual}/${xpProximo}`, inline: false },
          { name: '💜 Reputação', value: String(u?.reputacao || 0), inline: true },
          { name: '💬 Mensagens', value: (u?.mensagens || 0).toLocaleString('pt-BR'), inline: true },
          { name: '🏅 Conquistas', value: String(numConquistas), inline: true },
          { name: '💍 Parceiro(a)', value: parceiro ? `${parceiro.displayName}\n💜 ${afinidadePontos} pts (${nivelAfinidade(afinidadePontos)})` : 'Solteiro(a)', inline: true },
        )
        .setFooter({ text: `FiskBot • ${msg.guild.name}`, iconURL: msg.guild.iconURL() })
        .setTimestamp();

      if (parceiro) {
        embed.setImage(parceiro.displayAvatarURL({ size: 128 }));
      }

      return msg.reply({ embeds: [embed] });
    }
  });
}

function gerarBarraVisual(atual, total, tamanho = 15) {
  const pct = Math.min(1, atual / total);
  const preenchido = Math.round(pct * tamanho);
  return '█'.repeat(preenchido) + '░'.repeat(tamanho - preenchido);
}
