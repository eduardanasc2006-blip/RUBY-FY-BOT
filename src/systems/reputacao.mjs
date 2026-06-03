import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import Casamento from '../db/models/Casamento.mjs';
import Afinidade from '../db/models/Afinidade.mjs';
import { checkCooldown } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { calcularNivel, getFaixa } from '../utils/nivelCalc.mjs';
import { semBanco } from '../utils/dbGuard.mjs';

function nome(user) {
  return user.globalName || user.username || user.tag || 'Usuário';
}

function gerarBarra(atual, total, tamanho = 10) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(f) + '░'.repeat(tamanho - f);
}

function chaveAfin(u1, u2) {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    /* =========================
       REPUTAÇÃO
    ========================= */
    if (cmd === 'rep') {
      if (semBanco(msg)) return;

      const alvo = msg.mentions.users.first();
      if (!alvo || alvo.bot)
        return msg.reply({ embeds: [embedErro('Mencione um usuário válido.')] });

      if (alvo.id === msg.author.id)
        return msg.reply({ embeds: [embedErro('Você não pode se autoavaliar.')] });

      const cdKey = `rep:${msg.author.id}:${guildId}`;
      const espera = checkCooldown(cdKey, 24 * 60 * 60 * 1000);

      if (espera) {
        const h = Math.floor(espera / 3600000);
        const m = Math.floor((espera % 3600000) / 60000);
        return msg.reply({
          embeds: [embedErro(`Você já deu reputação hoje. Próxima em **${h}h ${m}m**.`)],
        });
      }

      await Usuario.findOneAndUpdate(
        { userId: alvo.id, guildId },
        { $inc: { reputacao: 1 }, $setOnInsert: { userId: alvo.id, guildId } },
        { upsert: true }
      );

      await registrarLog(client, guildId, 'reputacao', msg.author.id, {
        descricao: `<@${msg.author.id}> deu +1 rep para <@${alvo.id}>`,
      }, configs);

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setDescription(`⭐ <@${msg.author.id}> deu **+1 reputação** para <@${alvo.id}>!`)
            .setTimestamp(),
        ],
      });
    }

    /* =========================
       RANKING
    ========================= */
    if (cmd === 'ranking') {
      if (semBanco(msg)) return;

      const top = await Usuario.find({ guildId })
        .sort({ reputacao: -1 })
        .limit(10)
        .lean();

      const medals = ['🥇', '🥈', '🥉'];

      const linhas = top.map(
        (u, i) =>
          `${medals[i] || `**#${i + 1}**`} <@${u.userId}> — ⭐ ${u.reputacao || 0}`
      );

      return msg.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('⭐ Top Reputação')
            .setDescription(linhas.join('\n') || 'Nenhum dado.')
            .setTimestamp(),
        ],
      });
    }

    /* =========================
       PERFIL
    ========================= */
    if (cmd === 'meuperfil') {
      if (semBanco(msg)) return;

      const alvo = msg.mentions.users.first() || msg.author;

      const [u, conquistaDoc, casamento] = await Promise.all([
        Usuario.findOne({ userId: alvo.id, guildId }),
        Conquista.findOne({ userId: alvo.id, guildId }),
        Casamento.findOne({
          guildId,
          ativo: true,
          $or: [{ userId1: alvo.id }, { userId2: alvo.id }],
        }),
      ]);

      const xpTotal = u?.xp || 0;
      const { nivel, xpAtual, xpProximo } = calcularNivel(xpTotal);
      const faixa = getFaixa(nivel);

      const barra = gerarBarra(xpAtual, xpProximo);
      const pct = Math.floor((xpAtual / Math.max(1, xpProximo)) * 100);

      const totalConquistas = conquistaDoc?.conquistas?.length || 0;

      /* =========================
         CASAMENTO / AFINIDADE
      ========================= */
      let parceiroNome = null;
      let afinidadePct = null;

      if (casamento) {
        const parceiroId =
          casamento.userId1 === alvo.id ? casamento.userId2 : casamento.userId1;

        const parceiroMembro = await msg.guild.members
          .fetch(parceiroId)
          .catch(() => null);

        parceiroNome = parceiroMembro
          ? parceiroMembro.user.globalName || parceiroMembro.user.username
          : `<@${parceiroId}>`;

        const [u1, u2] = chaveAfin(alvo.id, parceiroId);

        const afin = await Afinidade.findOne({
          guildId,
          userId1: u1,
          userId2: u2,
        });

        if (afin?.pontos) {
          afinidadePct = Math.min(100, Math.round((afin.pontos / 2000) * 100));
        }
      }

      /* =========================
         QUIZ
      ========================= */
      let quizPrecisao = null;
      try {
        const { default: Quiz } = await import('../db/models/Quiz.mjs');
        const quiz = await Quiz.findOne({ userId: alvo.id, guildId });

        if (quiz && (quiz.acertos + quiz.erros) > 0) {
          quizPrecisao = Math.round(
            (quiz.acertos / (quiz.acertos + quiz.erros)) * 100
          );
        }
      } catch {}

      /* =========================
         FORCA
      ========================= */
      let forcaVitorias = null;
      try {
        const { default: Forca } = await import('../db/models/Forca.mjs');
        const forca = await Forca.findOne({ userId: alvo.id, guildId });
        forcaVitorias = forca?.vitorias || 0;
      } catch {}

      /* =========================
         TÍTULOS
      ========================= */
      let totalTitulos = 0;
      try {
        const { TITULOS_DISPONIVEIS } = await import('./titulos.mjs');
        totalTitulos = u?.titulos?.length || 0;
      } catch {
        totalTitulos = u?.titulos?.length || 0;
      }

      const embed = new EmbedBuilder()
        .setColor(faixa.cor)
        .setTitle(`👤 ${nome(alvo)}`)
        .setThumbnail(alvo.displayAvatarURL({ size: 256 }))
        .setDescription(u?.tituloEquipado ? `👑 ${u.tituloEquipado}` : '');

      const fields = [
        {
          name: `${faixa.emoji} Nível ${nivel}`,
          value: `${barra} **${pct}%**`,
          inline: false,
        },
        { name: '📈 XP', value: `**${xpTotal.toLocaleString('pt-BR')}**`, inline: true },
        { name: '⭐ Reputação', value: `**${u?.reputacao || 0}**`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
      ];

      if (afinidadePct !== null) {
        fields.push({
          name: '💘 Afinidade Máxima',
          value: `**${afinidadePct}%**`,
          inline: true,
        });
      }

      if (casamento && parceiroNome) {
        fields.push({
          name: '💍 Casado(a) com',
          value: `**${parceiroNome}**`,
          inline: true,
        });
      }

      fields.push(
        { name: '🏆 Conquistas', value: `**${totalConquistas}**`, inline: true },
        { name: '🎖️ Títulos', value: `**${totalTitulos}**`, inline: true }
      );

      if (quizPrecisao !== null) {
        fields.push({
          name: '🧠 Quiz',
          value: `**${quizPrecisao}%** precisão`,
          inline: true,
        });
      }

      if (forcaVitorias !== null) {
        fields.push({
          name: '🔤 Forca',
          value: `**${forcaVitorias}** vitórias`,
          inline: true,
        });
      }

      embed.addFields(fields);
      embed.setFooter({ text: 'FiskBot • Perfil' }).setTimestamp();

      return msg.reply({ embeds: [embed] });
    }
  });
        }
