export const comandos = [
  {
    cmd: '!xp',
    desc: 'Mostra seu XP e nível'
  },
  {
    cmd: '!rank',
    desc: 'Ranking de XP do servidor'
  },
  {
    cmd: '!xplogs',
    desc: 'Histórico de XP'
  }
];
import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { verificarConquistas } from './conquistas.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';
import { ganharXP, XP_EVENTS, historicoXP } from './xpSystem.mjs';

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

      /* ===== XP LOGS ===== */
      if (cmd === 'xplogs') {
        const alvo = msg.mentions.users.first() || msg.author;
        const logs = await historicoXP(alvo.id, guildId, 10);

        if (!logs.length)
          return msg.reply({ embeds: [embedErro('Nenhum histórico de XP ainda.')] });

        const emojis = { ganho: '🟢', gasto: '🔴' };
        const linhas = logs.map(l => {
          const sinal  = l.tipo === 'ganho' ? `+${l.valor}` : `${l.valor}`;
          const emoji  = emojis[l.tipo] || '⚪';
          const data   = l.createdAt ? new Date(l.createdAt).toLocaleString('pt-BR') : '?';
          return `${emoji} \`${sinal.padStart(6)} XP\` — **${l.origem}** • ${data}`;
        });

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle(`📋 Histórico de XP — ${alvo.globalName || alvo.username}`)
              .setDescription(linhas.join('\n'))
              .setFooter({ text: 'Últimas 10 transações • FiskBot' })
              .setTimestamp()
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

    /* ===== XP GANHO — usa XP_EVENTS.CHAT + multiplicador streak ===== */
    const chatMin  = XP_EVENTS.CHAT.base;
    const chatMax  = XP_EVENTS.CHAT.max;
    const base     = Math.floor(Math.random() * (chatMax - chatMin + 1)) + chatMin;
    const mult     = multiplicadorStreak(streak);

    // Atualiza campos NÃO-XP: mensagens, streak, ultimoDiaAtivo
    await Usuario.findOneAndUpdate(
      { userId: msg.author.id, guildId },
      {
        $inc: { mensagens: 1 },
        $set: { streak, ultimoDiaAtivo: hoje },
        $setOnInsert: { userId: msg.author.id, guildId }
      },
      { upsert: true }
    );

    // Todo XP passa pelo controlador central (ganharXP)
    // mult é passado como multiplicador → ganharXP faz Math.round(base * mult)
    const { usuario: u, levelUp, nivelNovo } = await ganharXP(
      msg.author.id, guildId, base, 'chat', mult
    );
    if (!u) return;

    /* ===== LEVEL UP (detectado dentro de ganharXP, anunciado aqui) ===== */
    if (levelUp) {
      const faixa = getFaixa(nivelNovo);

      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(faixa.cor)
            .setTitle('🎉 Level Up!')
            .setDescription(
              `<@${u.userId}> chegou ao nível **${nivelNovo}** ${faixa.emoji}`
            )
        ]
      });

      await registrarLog(client, guildId, 'nivel', u.userId, {
        descricao: `<@${u.userId}> subiu para o nível ${nivelNovo}`
      }, configs);
    }

    /* ===== CONQUISTAS ===== */
    await verificarConquistas(client, msg.author.id, guildId, u, configs)
      .catch(() => {});
  });
}
