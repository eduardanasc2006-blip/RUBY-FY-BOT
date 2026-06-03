import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Config from '../db/models/Config.mjs';
import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { verificarConquistas } from './conquistas.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

const MSGS_RECENTES = new Map();

/* =========================
   UTILS
========================= */

function gerarBarra(atual, total, tamanho = 10) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(f) + '░'.repeat(tamanho - f);
}

function diaAtual() {
  return new Date().toISOString().slice(0, 10);
}

function multiplicadorStreak(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (!isDBConnected()) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    const guildId = msg.guild.id;

    /* =====================
       COMANDOS
    ===================== */

    if (msg.content.startsWith(prefixo)) {
      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();

      /* ===== XP ===== */
      if (cmd === 'xp') {
        const alvo = msg.mentions.users.first() || msg.author;
        const u = await Usuario.findOne({ userId: alvo.id, guildId });

        const total = u?.xpTotal || 0;
        const disponivel = u?.xpDisponivel || 0;

        const { nivel, xpAtual, xpProximo } = calcularNivel(total);
        const faixa = getFaixa(nivel);

        const barra = gerarBarra(xpAtual, xpProximo);
        const pct = Math.floor((xpAtual / xpProximo) * 100);

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(faixa.cor)
              .setTitle(`${faixa.emoji} XP de ${alvo.globalName || alvo.username}`)
              .setThumbnail(alvo.displayAvatarURL({ size: 128 }))
              .addFields(
                { name: '🏆 Nível', value: `**${nivel}**`, inline: true },
                { name: '⭐ XP Total', value: `**${total.toLocaleString('pt-BR')}**`, inline: true },
                { name: '💰 XP Disponível', value: `**${disponivel.toLocaleString('pt-BR')}**`, inline: true },
                {
                  name: `📊 Progresso (${pct}%)`,
                  value: `${barra}\n${xpAtual} / ${xpProximo}`,
                  inline: false
                },
                {
                  name: '🔥 Streak',
                  value: `${u?.streak || 0} dias`,
                  inline: true
                }
              )
              .setFooter({ text: 'FiskBot • Sistema de XP' })
          ]
        });
      }

      /* ===== RANK ===== */
      if (cmd === 'rank' || cmd === 'leaderboard' || cmd === 'topxp') {
        const top = await Usuario.find({ guildId })
          .sort({ xpTotal: -1 })
          .limit(10)
          .lean();

        if (!top.length)
          return msg.reply({ embeds: [embedErro('Nenhum dado de XP ainda.')] });

        const linhas = top.map((u, i) => {
          const { nivel } = calcularNivel(u.xpTotal || 0);
          const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
          return `${medal} <@${u.userId}> — Nível **${nivel}** • ${u.xpTotal} XP`;
        });

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle('🏆 Top XP')
              .setDescription(linhas.join('\n'))
          ]
        });
      }
    }

    /* =====================
       XP PASSIVO
    ===================== */

    if (!msg.content.trim() || msg.content.length < 5) return;

    const chave = `xp:${msg.author.id}:${guildId}`;
    const agora = Date.now();
    if (agora - (MSGS_RECENTES.get(chave) || 0) < 60000) return;

    MSGS_RECENTES.set(chave, agora);

    const uAtual = await Usuario.findOne({ userId: msg.author.id, guildId });

    /* ===== STREAK ===== */
    const hoje = diaAtual();
    const ultimo = uAtual?.ultimoDiaAtivo;

    let streak = 1;

    if (ultimo === hoje) {
      streak = uAtual?.streak || 1;
    } else {
      const ontem = new Date();
      ontem.setUTCDate(ontem.getUTCDate() - 1);
      const ontemStr = ontem.toISOString().slice(0, 10);

      if (ultimo === ontemStr) streak = (uAtual?.streak || 0) + 1;
    }

    /* ===== XP GANHO (15–30 FIXADO) ===== */
    const base = Math.floor(Math.random() * 16) + 15; // 15–30 XP
    const mult = multiplicadorStreak(streak);
    const ganho = Math.round(base * mult);

    const u = await Usuario.findOneAndUpdate(
      { userId: msg.author.id, guildId },
      {
        $inc: {
          xpTotal: ganho,
          xpDisponivel: ganho,
          mensagens: 1
        },
        $set: {
          streak,
          ultimoDiaAtivo: hoje
        },
        $setOnInsert: {
          userId: msg.author.id,
          guildId
        }
      },
      { upsert: true, new: true }
    );

    if (!u) return;

    /* ===== LEVEL UP ===== */
    const nivelAntes = calcularNivel((u.xpTotal || 0) - ganho).nivel;
    const nivelDepois = calcularNivel(u.xpTotal || 0).nivel;

    if (nivelDepois > nivelAntes) {
      const faixa = getFaixa(nivelDepois);

      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(faixa.cor)
            .setTitle('🎉 Level Up!')
            .setDescription(
              `<@${u.userId}> chegou ao nível **${nivelDepois}** ${faixa.emoji}`
            )
        ]
      });

      await registrarLog(client, guildId, 'nivel', u.userId, {
        descricao: `<@${u.userId}> subiu para o nível ${nivelDepois}`
      }, configs);
    }

    /* ===== CONQUISTAS ===== */
    await verificarConquistas(client, msg.author.id, guildId, u, configs)
      .catch(() => {});
  });
}
