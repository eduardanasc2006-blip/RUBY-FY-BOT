import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Config from '../db/models/Config.mjs';
import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { verificarConquistas } from './conquistas.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

/* =========================
   MEMÓRIA SEPARADA (FIX)
========================= */

const MSG_COOLDOWN = new Map();
const MSG_HIST = new Map();

/* =========================
   CONFIG LOJA DE VIDAS
========================= */

const LOJA_VIDAS = {
  1: 200,
  3: 500,
  5: 800,
};

/* =========================
   UTIL
========================= */

function gerarBarra(atual, total, tamanho = 10) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(f) + '░'.repeat(tamanho - f);
}

function nomeUsuario(user) {
  return user.globalName || user.username || 'Usuário';
}

function diaAtual() {
  return new Date().toISOString().slice(0, 10);
}

/* streak seguro */
function calcularStreak(ultimoDia, streakAtual) {
  if (!ultimoDia) return 1;

  const hoje = new Date();
  const ontem = new Date();
  ontem.setUTCDate(ontem.getUTCDate() - 1);

  const hojeStr = hoje.toISOString().slice(0, 10);
  const ontemStr = ontem.toISOString().slice(0, 10);

  if (ultimoDia === hojeStr) return streakAtual || 1;
  if (ultimoDia === ontemStr) return (streakAtual || 0) + 1;

  return 1;
}

function multiplicadorStreak(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}

/* =========================
   XP CORE
========================= */

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    const guildId = msg.guild.id;

    /* =========================
       COMANDOS
    ========================= */

    if (msg.content.startsWith(prefixo)) {
      const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
      const cmd = args.shift().toLowerCase();

      /* ================= LOJA ================= */
      if (cmd === 'loja') {
        const embed = new EmbedBuilder()
          .setColor(0x00bfff)
          .setTitle('🏪 Loja de Vidas')
          .setDescription(
            Object.entries(LOJA_VIDAS)
              .map(([v, xp]) => `❤️ **${v} vida(s)** — ${xp} XP`)
              .join('\n') + '\n\nUse: `!comprarvida <quantidade>`'
          );

        return msg.reply({ embeds: [embed] });
      }

      if (cmd === 'comprarvida') {
        const qtd = parseInt(args[0]);
        if (!LOJA_VIDAS[qtd])
          return msg.reply({ embeds: [embedErro('Quantidade inválida. Use 1, 3 ou 5 vidas.')] });

        const user = await Usuario.findOne({ userId: msg.author.id, guildId });
        if (!user) return;

        if ((user.xp || 0) < LOJA_VIDAS[qtd]) {
          return msg.reply({ embeds: [embedErro('XP insuficiente.')] });
        }

        user.xp -= LOJA_VIDAS[qtd];
        user.vidas = (user.vidas || 3) + qtd;
        await user.save();

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setDescription(`✅ Você comprou **${qtd} vidas**!`)
          ]
        });
      }

      /* ================= XP ================= */
      if (cmd === 'xp') {
        const alvo = msg.mentions.users.first() || msg.author;
        const u = await Usuario.findOne({ userId: alvo.id, guildId });

        const { nivel, xpAtual, xpProximo } = calcularNivel(u?.xp || 0);
        const faixa = getFaixa(nivel);

        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(faixa.cor)
              .setTitle(`${faixa.emoji} XP de ${nomeUsuario(alvo)}`)
              .addFields(
                { name: 'Nível', value: `${nivel}`, inline: true },
                { name: 'XP', value: `${u?.xp || 0}`, inline: true },
                { name: 'Vidas', value: `${u?.vidas || 3}/3`, inline: true }
              )
          ]
        });
      }

      return;
    }

    /* =========================
       XP AUTOMÁTICO
    ========================= */

    if (!isDBConnected()) return;
    if (msg.content.length < 5) return;

    const key = `${msg.author.id}:${guildId}`;
    const agora = Date.now();

    /* anti spam cooldown */
    if (agora - (MSG_COOLDOWN.get(key) || 0) < 8000) return;
    MSG_COOLDOWN.set(key, agora);

    /* anti repetição */
    const histKey = `${key}:${msg.content}`;
    if (MSG_HIST.has(histKey)) return;
    MSG_HIST.set(histKey, true);
    setTimeout(() => MSG_HIST.delete(histKey), 60000);

    const uAtual = await Usuario.findOne({ userId: msg.author.id, guildId });

    /* streak */
    const hoje = diaAtual();
    const streak = calcularStreak(uAtual?.ultimoDiaAtivo, uAtual?.streak);

    /* XP base */
    const base = Math.floor(Math.random() * 8) + 8;
    const ganho = Math.round(base * multiplicadorStreak(streak));

    const u = await Usuario.findOneAndUpdate(
      { userId: msg.author.id, guildId },
      {
        $inc: { xp: ganho },
        $set: {
          streak,
          ultimoDiaAtivo: hoje
        },
        $setOnInsert: { vidas: 3 }
      },
      { upsert: true, new: true }
    );

    /* nível */
    const antes = calcularNivel((u.xp || 0) - ganho).nivel;
    const depois = calcularNivel(u.xp || 0).nivel;

    if (depois > antes) {
      const faixa = getFaixa(depois);

      msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(faixa.cor)
            .setTitle('🎉 Subiu de Nível!')
            .setDescription(`<@${u.userId}> chegou ao nível ${depois}!`)
        ]
      });

      await registrarLog(client, guildId, 'nivel', u.userId, {
        descricao: `<@${u.userId}> subiu para nível ${depois}`
      });
    }

    await verificarConquistas(client, msg.author.id, guildId, u, configs).catch(() => {});
  });
}
