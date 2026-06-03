import { EmbedBuilder } from 'discord.js';
import ConquistaModel from '../db/models/Conquista.mjs';
import { ganharXP } from './xpSystem.mjs';

// ══════════════════════════════════════════════════════════
//  LISTA DE CONQUISTAS
// ══════════════════════════════════════════════════════════

export const LISTA_CONQUISTAS = [
  // 💬 MENSAGENS
  { id: 'primeira_mensagem', cat: 'mensagens', nome: '📢 Primeira Mensagem', descricao: 'Envie sua primeira mensagem', meta: 1, campo: 'mensagens', xp: 50 },
  { id: 'mensagens_100', cat: 'mensagens', nome: '💬 Ativo', descricao: 'Envie 100 mensagens', meta: 100, campo: 'mensagens', xp: 100 },
  { id: 'mensagens_500', cat: 'mensagens', nome: '📡 Comunicador', descricao: 'Envie 500 mensagens', meta: 500, campo: 'mensagens', xp: 250 },
  { id: 'mensagens_1000', cat: 'mensagens', nome: '🧠 Veterano', descricao: 'Envie 1000 mensagens', meta: 1000, campo: 'mensagens', xp: 500 },
  { id: 'mensagens_10000', cat: 'mensagens', nome: '💀 Sem Vida Social', descricao: 'Envie 10000 mensagens', meta: 10000, campo: 'mensagens', xp: 1500, secreta: true },

  // 📈 NÍVEL
  { id: 'nivel_5', cat: 'nivel', nome: '🌱 Iniciante', descricao: 'Alcance nível 5', meta: 5, campo: 'nivel', xp: 100 },
  { id: 'nivel_20', cat: 'nivel', nome: '⭐ Evoluindo', descricao: 'Alcance nível 20', meta: 20, campo: 'nivel', xp: 200 },
  { id: 'nivel_50', cat: 'nivel', nome: '🏆 Experiente', descricao: 'Alcance nível 50', meta: 50, campo: 'nivel', xp: 500 },
  { id: 'nivel_100', cat: 'nivel', nome: '👑 Elite', descricao: 'Alcance nível 100', meta: 100, campo: 'nivel', xp: 1000, secreta: true },
  { id: 'nivel_200', cat: 'nivel', nome: '🌟 Lenda', descricao: 'Alcance nível 200', meta: 200, campo: 'nivel', xp: 2000, secreta: true },
  { id: 'nivel_300', cat: 'nivel', nome: '⚡ Divindade', descricao: 'Alcance nível 300', meta: 300, campo: 'nivel', xp: 5000, secreta: true },

  // 🧠 QUIZ
  { id: 'quiz_1', cat: 'quiz', nome: '🧠 Curioso', descricao: 'Responda 1 quiz', meta: 1, campo: 'quiz', xp: 50 },
  { id: 'quiz_50', cat: 'quiz', nome: '🎓 Estudante', descricao: 'Responda 50 quizzes', meta: 50, campo: 'quiz', xp: 200 },
  { id: 'quiz_100', cat: 'quiz', nome: '🏅 Sabichão', descricao: 'Responda 100 quizzes', meta: 100, campo: 'quiz', xp: 400, secreta: true },
  { id: 'quiz_500', cat: 'quiz', nome: '👑 Mente Brilhante', descricao: 'Responda 500 quizzes', meta: 500, campo: 'quiz', xp: 1000, secreta: true },

  // ⭐ REPUTAÇÃO
  { id: 'rep_1', cat: 'reputacao', nome: '⭐ Reconhecido', descricao: 'Receba 1 reputação', meta: 1, campo: 'reputacao', xp: 50 },
  { id: 'rep_10', cat: 'reputacao', nome: '🌟 Popular', descricao: 'Receba 10 reputação', meta: 10, campo: 'reputacao', xp: 150 },
  { id: 'rep_50', cat: 'reputacao', nome: '🔥 Influente', descricao: 'Receba 50 reputação', meta: 50, campo: 'reputacao', xp: 400, secreta: true },

  // 💍 AMOR
  { id: 'casamento_1', cat: 'amor', nome: '💍 Primeiro Amor', descricao: 'Case-se pela primeira vez', meta: 1, campo: 'casamento', xp: 100 },
  { id: 'afinidade_1000', cat: 'amor', nome: '💜 Alma Gêmea', descricao: 'Alcance 1000 de afinidade', meta: 1000, campo: 'afinidade', xp: 300, secreta: true },

  // 💋 BEIJO
  { id: 'primeiro_beijo', cat: 'beijo', nome: '💋 Primeiro Beijo', descricao: 'Use o comando beijo', meta: 1, campo: 'beijo', xp: 50 },
  { id: 'beijos_50', cat: 'beijo', nome: '😘 Beijoqueiro', descricao: 'Dê 50 beijos', meta: 50, campo: 'beijo', xp: 150 },
  { id: 'beijos_200', cat: 'beijo', nome: '😏 Casanova', descricao: 'Dê 200 beijos', meta: 200, campo: 'beijo', xp: 400, secreta: true },

  // 🎲 DIVERSÃO
  { id: 'coinflip_50', cat: 'diversao', nome: '🪙 Apostador', descricao: 'Use coinflip 50 vezes', meta: 50, campo: 'coinflip', xp: 150 },
  { id: '8ball_100', cat: 'diversao', nome: '🎱 Oráculo', descricao: 'Use 8ball 100 vezes', meta: 100, campo: '8ball', xp: 200 },

  // 🧩 FORÇA / JOGOS
  { id: 'vitoria_10', cat: 'jogos', nome: '⚔️ Sobrevivente', descricao: 'Vença 10 partidas', meta: 10, campo: 'vitorias', xp: 200 },
  { id: 'vitoria_100', cat: 'jogos', nome: '🏆 Campeão', descricao: 'Vença 100 partidas', meta: 100, campo: 'vitorias', xp: 500, secreta: true },

  // 💔 SHIP
  { id: 'ship_0', cat: 'ship', nome: '💔 Amor Impossível', descricao: 'Obtenha 0% em um ship', meta: 0, campo: 'ship_min', xp: 50 },
  { id: 'ship_100', cat: 'ship', nome: '💘 Destino Perfeito', descricao: 'Obtenha 100% em um ship', meta: 100, campo: 'ship_max', xp: 300 },
  { id: 'friendzone', cat: 'ship', nome: '🤝 Friendzone', descricao: 'Fique entre 40% e 49%', meta: 40, campo: 'ship_range_40_49', xp: 150 },

  // 🔥 SECRETAS
  { id: 'talarico', cat: 'secreto', nome: '😈 Talarico', descricao: 'Beijar alguém casado', meta: 1, campo: 'beijo_casado', xp: 500, secreta: true },
  { id: 'escandalo', cat: 'secreto', nome: '📢 Escândalo', descricao: 'Criar drama no servidor', meta: 1, campo: 'drama', xp: 800, secreta: true },
  { id: 'cupido_errado', cat: 'secreto', nome: '🏹 Cupido Errou', descricao: '0% com alguém de afinidade máxima', meta: 1, campo: 'ship_contradicao', xp: 1000, secreta: true },

  // 💎 RARAS
  { id: 'azarsupremo', cat: 'raras', nome: '💀 Azar Supremo', descricao: '0% em 5 ships seguidos', meta: 5, campo: 'ship_0_streak', xp: 2000, secreta: true },
  { id: 'sortedivina', cat: 'raras', nome: '🍀 Sorte Divina', descricao: '100% em 3 ships seguidos', meta: 3, campo: 'ship_100_streak', xp: 2500, secreta: true },
  { id: 'lendaviva', cat: 'raras', nome: '👑 Lenda Viva', descricao: 'Complete todas as conquistas', meta: 1, campo: 'all', xp: 10000, secreta: true },
];

// ══════════════════════════════════════════════════════════
//  VERIFICAR E CONCEDER CONQUISTAS
//  USA ganharXP() — NUNCA $inc: { xp: ... } direto
// ══════════════════════════════════════════════════════════

export async function verificarConquistas(client, userId, guildId, usuario, configs) {
  try {
    let doc = await ConquistaModel.findOne({ userId, guildId });
    if (!doc) {
      doc = await ConquistaModel.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId, conquistas: [] } },
        { upsert: true, new: true }
      );
    }
    if (!doc) return;

    const conquistadas = Array.isArray(doc.conquistas) ? doc.conquistas : [];
    const novas = [];

    for (const c of LISTA_CONQUISTAS) {
      if (conquistadas.includes(c.id)) continue;

      const valorCampo = usuario?.[c.campo] ?? 0;
      let desbloqueada = false;

      if (c.campo === 'all') {
        const totalPossiveis = LISTA_CONQUISTAS.filter(x => !x.secreta).length;
        desbloqueada = conquistadas.length >= totalPossiveis;
      } else if (c.campo === 'ship_min') {
        desbloqueada = (usuario?.ship_min ?? 999) === 0;
      } else if (c.campo === 'ship_max') {
        desbloqueada = (usuario?.ship_max ?? 0) === 100;
      } else if (c.campo === 'ship_range_40_49') {
        const v = usuario?.ship_last ?? -1;
        desbloqueada = v >= 40 && v <= 49;
      } else {
        desbloqueada = Number(valorCampo) >= c.meta;
      }

      if (desbloqueada) {
        novas.push(c);
        conquistadas.push(c.id);
      }
    }

    if (!novas.length) return;

    await ConquistaModel.updateOne(
      { userId, guildId },
      { $set: { conquistas: conquistadas } }
    );

    for (const c of novas) {
      if (c.xp > 0) {
        await ganharXP(userId, guildId, c.xp, 'conquista');
      }

      const cfg = configs?.get(guildId);
      const canalId = cfg?.canalLogs;
      if (!canalId) continue;
      const canal = client?.channels?.cache.get(canalId);
      if (!canal) continue;

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🏅 Conquista Desbloqueada!')
            .setDescription(
              `<@${userId}> desbloqueou **${c.nome}**\n*${c.descricao}*\n\n+**${c.xp} XP** ganhos!`
            )
            .setFooter({ text: 'FiskBot • Conquistas' })
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  } catch {}
}

// ══════════════════════════════════════════════════════════
//  COMANDO !conquistas
// ══════════════════════════════════════════════════════════

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'conquistas') return;

    const alvo = msg.mentions.users.first() || msg.author;
    const doc = await ConquistaModel.findOne({ userId: alvo.id, guildId });
    const conquistadas = Array.isArray(doc?.conquistas) ? doc.conquistas : [];

    const cats = [...new Set(LISTA_CONQUISTAS.map(c => c.cat))];

    const campos = cats.map(cat => {
      const dessa = LISTA_CONQUISTAS.filter(c => c.cat === cat);
      const feitas = dessa.filter(c => conquistadas.includes(c.id));
      const linhas = dessa.map(c => {
        const ok = conquistadas.includes(c.id);
        if (c.secreta && !ok) return `🔒 **???** — Conquista secreta`;
        return `${ok ? '✅' : '⬜'} **${c.nome}** — ${c.descricao} (+${c.xp} XP)`;
      });
      return {
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${feitas.length}/${dessa.length})`,
        value: linhas.join('\n').slice(0, 1020)
      };
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🏅 Conquistas de ${alvo.globalName || alvo.username}`)
      .setDescription(`**${conquistadas.length}** / **${LISTA_CONQUISTAS.length}** desbloqueadas`)
      .setThumbnail(alvo.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    for (const f of campos.slice(0, 5)) embed.addFields(f);

    await msg.reply({ embeds: [embed] });
  });
}
