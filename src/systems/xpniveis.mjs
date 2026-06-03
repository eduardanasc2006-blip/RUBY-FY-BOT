import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Config from '../db/models/Config.mjs';
import { calcularNivel, xpParaNivel, getFaixa, FAIXAS_NIVEL } from '../utils/nivelCalc.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { verificarConquistas } from './conquistas.mjs';
import { isAdmin } from '../utils/permissions.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

const MSGS_RECENTES = new Map();

function gerarBarra(atual, total, tamanho = 10) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
}

function nomeUsuario(user) {
  return user.globalName || user.username || user.tag || 'Usuário';
}

// Retorna o dia atual em formato YYYY-MM-DD (UTC)
function diaAtual() {
  return new Date().toISOString().slice(0, 10);
}

// Calcula bônus de streak: retorna multiplicador (1.0, 1.2, 1.5, 2.0)
function multiplicadorStreak(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.2;
  return 1.0;
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    const guildId = msg.guild.id;

    if (!msg.content.startsWith(prefixo)) {
      await processarXP(msg, client, configs, guildId, cfg);
      return;
    }

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'xp') {
      const alvo = msg.mentions.users.first() || msg.author;
      const u = await Usuario.findOne({ userId: alvo.id, guildId });
      const { nivel, xpAtual, xpProximo } = calcularNivel(u?.xp || 0);
      const faixa = getFaixa(nivel);
      const barra = gerarBarra(xpAtual, xpProximo);
      const pct = Math.floor((xpAtual / xpProximo) * 100);
      const streakTxt = (u?.streak || 0) > 1 ? `🔥 **${u.streak}** dias seguidos` : '—';
      const embed = new EmbedBuilder()
        .setColor(faixa.cor)
        .setTitle(`${faixa.emoji} XP de ${nomeUsuario(alvo)}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '🏆 Nível', value: `**${nivel}**`, inline: true },
          { name: `${faixa.emoji} Faixa`, value: `**${faixa.nome}**`, inline: true },
          { name: '⭐ XP Total', value: `**${(u?.xp || 0).toLocaleString('pt-BR')}**`, inline: true },
          { name: `📊 Progresso (${pct}%)`, value: `${barra}\n${xpAtual.toLocaleString('pt-BR')} / ${xpProximo.toLocaleString('pt-BR')} XP`, inline: false },
          { name: '🔥 Streak Diário', value: streakTxt, inline: true },
        )
        .setFooter({ text: 'FiskBot • Sistema de XP' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'rank') {
      const alvo = msg.mentions.users.first() || msg.author;
      const u = await Usuario.findOne({ userId: alvo.id, guildId });
      const { nivel, xpAtual, xpProximo } = calcularNivel(u?.xp || 0);
      const faixa = getFaixa(nivel);
      const barra = gerarBarra(xpAtual, xpProximo);
      const ranking = await Usuario.countDocuments({ guildId, xp: { $gt: u?.xp || 0 } });
      const embed = new EmbedBuilder()
        .setColor(faixa.cor)
        .setTitle(`🏅 Rank de ${nomeUsuario(alvo)}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '🏆 Nível', value: `**${nivel}**`, inline: true },
          { name: `${faixa.emoji} Faixa`, value: `**${faixa.nome}**`, inline: true },
          { name: '📊 Posição', value: `**#${ranking + 1}**`, inline: true },
          { name: '⭐ XP Atual', value: `${xpAtual.toLocaleString('pt-BR')} / ${xpProximo.toLocaleString('pt-BR')}`, inline: false },
          { name: '📈 Progresso', value: barra, inline: false },
        )
        .setFooter({ text: 'FiskBot • Níveis' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    // !rankxp / !leaderboard / !topxp — ranking de XP
    if (cmd === 'rankxp' || cmd === 'leaderboard' || cmd === 'topxp') {
      const top = await Usuario.find({ guildId }).sort({ xp: -1 }).limit(10).lean();
      if (!top.length) return msg.reply({ embeds: [embedErro('Nenhum dado de XP ainda.')] });
      const medals = ['🥇', '🥈', '🥉'];
      const linhas = await Promise.all(top.map(async (u, i) => {
        const { nivel } = calcularNivel(u.xp || 0);
        const faixa = getFaixa(nivel);
        const medal = medals[i] || `**#${i + 1}**`;
        const streakBadge = (u.streak || 0) >= 7 ? ` 🔥${u.streak}d` : '';
        let nome = `<@${u.userId}>`;
        return `${medal} ${nome} — ${faixa.emoji} Nível **${nivel}** · ${(u.xp || 0).toLocaleString('pt-BR')} XP${streakBadge}`;
      }));
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Top XP do Servidor')
        .setDescription(linhas.join('\n'))
        .setFooter({ text: `FiskBot • Use !xp para ver o seu` })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'topnivel') {
      const top = await Usuario.find({ guildId }).sort({ xp: -1 }).limit(10).lean();
      const medals = ['🥇', '🥈', '🥉'];
      const linhas = top.map((u, i) => {
        const { nivel } = calcularNivel(u.xp || 0);
        const faixa = getFaixa(nivel);
        const medal = medals[i] || `**#${i + 1}**`;
        return `${medal} <@${u.userId}> — ${faixa.emoji} **${faixa.nome}** (Nível ${nivel})`;
      });
      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle('👑 Top Níveis do Servidor')
        .setDescription(linhas.join('\n') || 'Nenhum dado ainda.')
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'setlevelrole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      const nivel = parseInt(args[0]);
      const cargoId = msg.mentions.roles.first()?.id || args[1]?.replace(/[<@&>]/g, '');
      if (!nivel || !cargoId) return msg.reply({ embeds: [embedErro('Use: `!setlevelrole <nível> @cargo`')] });
      await Config.findOneAndUpdate({ guildId }, { $pull: { levelRoles: { nivel } } }, { upsert: true });
      await Config.findOneAndUpdate({ guildId }, { $push: { levelRoles: { nivel, cargoId } } }, { upsert: true });
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Cargo <@&${cargoId}> configurado para o Nível **${nivel}**.`)] });
    }

    if (cmd === 'levelroles') {
      const dbCfg = await Config.findOne({ guildId });
      const roles = (dbCfg?.levelRoles || []).sort((a, b) => a.nivel - b.nivel);
      if (!roles.length) return msg.reply({ embeds: [embedErro('Nenhum cargo de nível configurado.\nUse `!setlevelrole <nível> @cargo`')] });
      const linhas = roles.map(r => `Nível **${r.nivel}** → <@&${r.cargoId}>`);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎖️ Cargos por Nível')
        .setDescription(linhas.join('\n'))
        .setFooter({ text: 'Use !setlevelrole <nível> @cargo para configurar' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'removelevelrole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      const nivel = parseInt(args[0]);
      if (!nivel) return msg.reply({ embeds: [embedErro('Use: `!removelevelrole <nível>`')] });
      await Config.findOneAndUpdate({ guildId }, { $pull: { levelRoles: { nivel } } });
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Cargo do Nível **${nivel}** removido.`)] });
    }
  });
}

async function processarXP(msg, client, configs, guildId, cfg) {
  if (!isDBConnected()) return;
  if (!msg.content.trim() || msg.content.length < 5) return;

  const chave = `xp:${msg.author.id}:${guildId}`;
  const agora = Date.now();
  if (agora - (MSGS_RECENTES.get(chave) || 0) < 60_000) return;

  const histKey = `hist:${msg.author.id}:${guildId}:${agora}`;
  const recentes = [...MSGS_RECENTES.entries()]
    .filter(([k]) => k.startsWith(`hist:${msg.author.id}:${guildId}`))
    .map(([, v]) => v);
  if (recentes.includes(msg.content)) return;

  MSGS_RECENTES.set(chave, agora);
  MSGS_RECENTES.set(histKey, msg.content);
  setTimeout(() => MSGS_RECENTES.delete(histKey), 120_000);

  // Buscar dados atuais para calcular streak
  const uAtual = await Usuario.findOne({ userId: msg.author.id, guildId });

  // Calcular streak
  const hoje = diaAtual();
  const ultimoDia = uAtual?.ultimoDiaAtivo || null;
  let novoStreak = 1;
  if (ultimoDia) {
    const ontem = new Date();
    ontem.setUTCDate(ontem.getUTCDate() - 1);
    const ontemStr = ontem.toISOString().slice(0, 10);
    if (ultimoDia === hoje) {
      novoStreak = uAtual.streak || 1; // mesmo dia, mantém
    } else if (ultimoDia === ontemStr) {
      novoStreak = (uAtual.streak || 0) + 1; // dia seguinte, incrementa
    } else {
      novoStreak = 1; // pulou um dia, reseta
    }
  }

  // XP base + bônus de streak
  const xpBase = Math.floor(Math.random() * 8) + 8; // 8–15 XP
  const multi = multiplicadorStreak(novoStreak);
  const ganho = Math.round(xpBase * multi);

  const u = await Usuario.findOneAndUpdate(
    { userId: msg.author.id, guildId },
    {
      $inc: { xp: ganho, mensagens: 1 },
      $set: { streak: novoStreak, ultimoDiaAtivo: hoje },
      $setOnInsert: { userId: msg.author.id, guildId },
    },
    { upsert: true, new: true }
  );

  if (!u) return;

  // Verificar subida de nível
  const nivelAntes = calcularNivel((u.xp || 0) - ganho).nivel;
  const nivelDepois = calcularNivel(u.xp || 0).nivel;
  if (nivelDepois > nivelAntes) {
    await subirNivel(msg, client, configs, guildId, cfg, u, nivelDepois);
  }

  await verificarConquistas(client, msg.author.id, guildId, u, configs).catch(() => {});
  await atualizarMissoes(msg.author.id, guildId, 'mensagem').catch(() => {});
}

async function subirNivel(msg, client, configs, guildId, cfg, usuario, novoNivel) {
  const faixa = getFaixa(novoNivel);
  const embed = new EmbedBuilder()
    .setColor(faixa.cor)
    .setTitle('🎉 Subiu de Nível!')
    .setDescription(`Parabéns <@${usuario.userId}>!\nVocê alcançou o **Nível ${novoNivel}** ${faixa.emoji} **${faixa.nome}**!`)
    .setTimestamp();
  await msg.channel.send({ embeds: [embed] }).catch(() => {});

  try {
    const dbCfg = await Config.findOne({ guildId });
    const levelRoles = dbCfg?.levelRoles || [];
    const cargoConfig = [...levelRoles].reverse().find(r => r.nivel <= novoNivel);
    if (cargoConfig) {
      const membro = msg.guild.members.cache.get(usuario.userId)
        || await msg.guild.members.fetch(usuario.userId).catch(() => null);
      if (membro) {
        const cargo = msg.guild.roles.cache.get(cargoConfig.cargoId);
        if (cargo) await membro.roles.add(cargo).catch(() => {});
      }
    }
  } catch {}

  await registrarLog(client, guildId, 'nivel', usuario.userId, {
    descricao: `<@${usuario.userId}> subiu para o Nível **${novoNivel}** (${getFaixa(novoNivel).nome}).`,
  }, configs);
}

async function atualizarMissoes(userId, guildId, tipo) {
  try {
    const { default: Missao } = await import('../db/models/Missao.mjs');
    await Missao.updateOne(
      { userId, guildId, 'diarias.tipo': tipo, 'diarias.concluida': false },
      { $inc: { 'diarias.$.atual': 1 } }
    );
  } catch {}
}
