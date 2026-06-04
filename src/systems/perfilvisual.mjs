// ===============================
// PERFILCARD V2 — UPDATE LOG
// ===============================

import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import {
  calcularNivel,
  nivelAfinidade,
  getFaixa
} from '../utils/nivelCalc.mjs';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';

/* =========================
   BARRA VISUAL XP
========================= */
function gerarBarraVisual(atual, total, size = 15) {
  const pct = Math.max(0, Math.min(1, atual / Math.max(1, total)));
  const filled = Math.round(pct * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

/* =========================
   PERFILCARD REGISTER
========================= */
export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'perfilcard') return;

    const alvo = msg.mentions.users.first() || msg.author;

    const cdKey = `perfilcard:${msg.author.id}:${guildId}`;
    const espera = checkCooldown(cdKey, 10_000);
    if (espera) {
      return msg.reply({
        embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para gerar outro perfil.`)]
      });
    }

    const [u, conquistas, casamento] = await Promise.all([
      Usuario.findOne({ userId: alvo.id, guildId }),
      Conquista.findOne({ userId: alvo.id, guildId }),
      Casamento.findOne({
        guildId,
        ativo: true,
        $or: [{ userId1: alvo.id }, { userId2: alvo.id }],
      }),
    ]);

    if (!u) {
      return msg.reply({ embeds: [embedErro('Usuário não encontrado.')] });
    }

    // ================= XP SYSTEM FIX =================
    const xpTotal = u.xpTotal || 0;
    const xpDisponivel = u.xpDisponivel || 0;

    const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
    const faixa = getFaixa(nivel);
    const pct = Math.floor((xpAtual / xpProximo) * 100);
    const barra = gerarBarraVisual(xpAtual, xpProximo);

    // ================= CASAMENTO =================
    let parceiro = null;
    let afinidadePontos = 0;

    if (casamento) {
      const parcId =
        casamento.userId1 === alvo.id
          ? casamento.userId2
          : casamento.userId1;

      const u1 = parcId < alvo.id ? parcId : alvo.id;
      const u2 = parcId < alvo.id ? alvo.id : parcId;

      const afinDoc = await Afinidade.findOne({
        guildId,
        userId1: u1,
        userId2: u2
      });

      afinidadePontos = afinDoc?.pontos || 0;
      parceiro = await client.users.fetch(parcId).catch(() => null);
    }

    // ================= LOJA / PERFIL =================
    const moldura = u.inventario?.moldura || 'padrao';
    const fundo = u.inventario?.fundo || 'azul';
    const titulo = u.titulos?.length
      ? u.titulos[u.titulos.length - 1]
      : '─ Sem título ─';

    const numConquistas = conquistas?.conquistas?.length || 0;

    // ================= EMBED =================
    const embed = new EmbedBuilder()
      .setColor(faixa?.cor || 0xa855f7)
      .setTitle(`🎭 Perfil de ${alvo.displayName}`)
      .setThumbnail(alvo.displayAvatarURL({ size: 256 }))

      // título equipado
      .setDescription(`*"${titulo}"*\n🎨 Moldura: **${moldura}** | 🌌 Fundo: **${fundo}**`)

      .addFields(
        { name: '🏆 Nível', value: `**${nivel}** (${pct}%)`, inline: true },
        { name: '⭐ XP Total', value: xpTotal.toLocaleString('pt-BR'), inline: true },
        { name: '💰 XP Disponível', value: xpDisponivel.toLocaleString('pt-BR'), inline: true },

        {
          name: '📊 Progresso',
          value: `\`${barra}\`\n${xpAtual}/${xpProximo}`,
          inline: false
        },

        { name: '💜 Reputação', value: String(u?.reputacao || 0), inline: true },
        { name: '💬 Mensagens', value: String(u?.mensagens || 0), inline: true },
        { name: '🏅 Conquistas', value: String(numConquistas), inline: true },

        {
          name: '💍 Parceiro(a)',
          value: parceiro
            ? `${parceiro.displayName}\n💜 ${afinidadePontos} pts (${nivelAfinidade(afinidadePontos)})`
            : 'Solteiro(a)',
          inline: true
        }
      )

      .setFooter({
        text: `FiskBot • ${msg.guild.name}`,
        iconURL: msg.guild.iconURL()
      })
      .setTimestamp();

    // imagem do parceiro (opcional)
    if (parceiro) {
      embed.setImage(parceiro.displayAvatarURL({ size: 256 }));
    }

    return msg.reply({ embeds: [embed] });
  });
      }
