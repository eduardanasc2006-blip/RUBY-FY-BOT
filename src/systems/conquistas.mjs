import { EmbedBuilder } from 'discord.js';
import Conquista from '../db/models/Conquista.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { calcularNivel } from '../utils/nivelCalc.mjs';

export const LISTA_CONQUISTAS = [
  // 💬 Mensagens
  { id: 'primeira_mensagem', cat: 'mensagens', nome: '💬 Primeira Mensagem', descricao: 'Envie sua primeira mensagem', meta: 1,    campo: 'mensagens', xp: 50  },
  { id: 'mensagens_100',     cat: 'mensagens', nome: '📢 100 Mensagens',     descricao: 'Envie 100 mensagens',         meta: 100,  campo: 'mensagens', xp: 100 },
  { id: 'mensagens_500',     cat: 'mensagens', nome: '🎙️ 500 Mensagens',    descricao: 'Envie 500 mensagens',         meta: 500,  campo: 'mensagens', xp: 250 },
  { id: 'mensagens_1000',    cat: 'mensagens', nome: '📡 1000 Mensagens',    descricao: 'Envie 1000 mensagens',        meta: 1000, campo: 'mensagens', xp: 500 },
  // 📈 Nível
  { id: 'nivel_5',    cat: 'nivel', nome: '🌱 Primeiro Passo',       descricao: 'Alcance o nível 5',   meta: 5,   xp: 100  },
  { id: 'nivel_20',   cat: 'nivel', nome: '⭐ Determinado',          descricao: 'Alcance o nível 20',  meta: 20,  xp: 200  },
  { id: 'nivel_50',   cat: 'nivel', nome: '🏆 Veterano',             descricao: 'Alcance o nível 50',  meta: 50,  xp: 500  },
  { id: 'nivel_100',  cat: 'nivel', nome: '👑 Incansável',           descricao: 'Alcance o nível 100', meta: 100, xp: 1000, secreta: true },
  { id: 'nivel_200',  cat: 'nivel', nome: '🌟 Lenda do Servidor',    descricao: 'Alcance o nível 200', meta: 200, xp: 2000, secreta: true },
  { id: 'nivel_300',  cat: 'nivel', nome: '⚡ Divindade',            descricao: 'Alcance o nível 300', meta: 300, xp: 5000, secreta: true },
  // 🧠 Quiz
  { id: 'primeiro_quiz', cat: 'quiz', nome: '🧠 Primeiro Quiz', descricao: 'Responda seu primeiro quiz', meta: 1,   xp: 50  },
  { id: 'quiz_50',       cat: 'quiz', nome: '🎓 50 Quizzes',    descricao: 'Responda 50 quizzes',         meta: 50,  xp: 200 },
  { id: 'quiz_100',      cat: 'quiz', nome: '🏅 100 Quizzes',   descricao: 'Responda 100 quizzes',        meta: 100, xp: 400, secreta: true },
  // ⭐ Reputação
  { id: 'primeira_rep', cat: 'reputacao', nome: '⭐ Primeira Rep',     descricao: 'Receba sua primeira reputação', meta: 1,  xp: 50  },
  { id: 'rep_10',       cat: 'reputacao', nome: '⭐ Popular',          descricao: 'Tenha 10 de reputação',         meta: 10, xp: 150 },
  { id: 'rep_50',       cat: 'reputacao', nome: '🌟 Muito Respeitado', descricao: 'Tenha 50 de reputação',         meta: 50, xp: 400, secreta: true },
  // 💍 Amor & Casamento
  { id: 'primeiro_casamento', cat: 'amor', nome: '💍 Primeiro Casamento', descricao: 'Case-se com alguém', meta: 1, xp: 100 },
  { id: 'alma_gemea',         cat: 'amor', nome: '💜 Casal Perfeito',     descricao: 'Tenha 1000+ pontos de afinidade', meta: 1000, xp: 300, secreta: true },
  // 🎫 Suporte
  { id: 'primeiro_ticket', cat: 'suporte', nome: '🎫 Primeiro Ticket', descricao: 'Abra seu primeiro ticket', meta: 1, xp: 50 },
];

const CATEGORIAS_INFO = {
  mensagens: { emoji: '💬', nome: 'Mensagens' },
  nivel:     { emoji: '📈', nome: 'Nível'     },
  quiz:      { emoji: '🧠', nome: 'Quiz'      },
  reputacao: { emoji: '⭐', nome: 'Reputação' },
  amor:      { emoji: '💍', nome: 'Amor & Casamento' },
  suporte:   { emoji: '🎫', nome: 'Suporte'   },
};

export async function verificarConquistas(client, userId, guildId, usuario, configs) {
  let doc = await Conquista.findOne({ userId, guildId });
  if (!doc) doc = await Conquista.create({ userId, guildId });

  const desbloqueadas = doc.conquistas || [];
  const novas = [];
  const { nivel } = calcularNivel(usuario?.xp || 0);
  const mensagens = usuario?.mensagens || 0;
  const reputacao = usuario?.reputacao || 0;

  const checks = [
    { id: 'primeira_mensagem', ok: mensagens >= 1   },
    { id: 'mensagens_100',     ok: mensagens >= 100 },
    { id: 'mensagens_500',     ok: mensagens >= 500 },
    { id: 'mensagens_1000',    ok: mensagens >= 1000 },
    { id: 'nivel_5',           ok: nivel >= 5   },
    { id: 'nivel_20',          ok: nivel >= 20  },
    { id: 'nivel_50',          ok: nivel >= 50  },
    { id: 'nivel_100',         ok: nivel >= 100 },
    { id: 'nivel_200',         ok: nivel >= 200 },
    { id: 'nivel_300',         ok: nivel >= 300 },
    { id: 'primeira_rep',      ok: reputacao >= 1  },
    { id: 'rep_10',            ok: reputacao >= 10 },
    { id: 'rep_50',            ok: reputacao >= 50 },
  ];

  for (const check of checks) {
    if (check.ok && !desbloqueadas.includes(check.id)) novas.push(check.id);
  }

  if (novas.length > 0) {
    await Conquista.updateOne({ userId, guildId }, { $push: { conquistas: { $each: novas } } });
    for (const id of novas) {
      const c = LISTA_CONQUISTAS.find(x => x.id === id);
      if (!c) continue;
      if (c.xp) await Usuario.updateOne({ userId, guildId }, { $inc: { xp: c.xp } });
      await registrarLog(client, guildId, 'conquista', userId, {
        descricao: `<@${userId}> desbloqueou **${c.nome}**! (+${c.xp || 0} XP)`,
      }, configs);
    }
  }
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

    if (cmd === 'conquistas' || cmd === 'badges') {
      const alvo = msg.mentions.users.first() || msg.author;
      const doc = await Conquista.findOne({ userId: alvo.id, guildId });
      const u = await Usuario.findOne({ userId: alvo.id, guildId });
      const desbloqueadas = doc?.conquistas || [];
      const { nivel } = calcularNivel(u?.xp || 0);
      const mensagens = u?.mensagens || 0;
      const reputacao = u?.reputacao || 0;

      if (desbloqueadas.length === 0) {
        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`🏅 Conquistas de ${alvo.globalName || alvo.username}`)
          .setDescription('Nenhuma conquista desbloqueada ainda.\n\nEnvie mensagens, responda quizzes e participe do servidor para desbloquear!')
          .setFooter({ text: '0 / ' + LISTA_CONQUISTAS.filter(c => !c.secreta).length + ' conquistadas' })
          .setTimestamp()] });
      }

      const camposValor = {
        mensagens, nivel, reputacao,
      };

      const porCategoria = {};
      for (const c of LISTA_CONQUISTAS) {
        if (c.secreta && !desbloqueadas.includes(c.id)) continue;
        const cat = c.cat || 'outros';
        if (!porCategoria[cat]) porCategoria[cat] = [];

        const ok = desbloqueadas.includes(c.id);
        let progresso = '';
        if (!ok && c.campo && camposValor[c.campo] !== undefined) {
          const atual = Math.min(camposValor[c.campo], c.meta);
          const barra = gerarBarra(atual, c.meta, 6);
          progresso = ` *(${atual}/${c.meta})* ${barra}`;
        } else if (!ok && c.cat === 'nivel') {
          const atual = Math.min(nivel, c.meta);
          const barra = gerarBarra(atual, c.meta, 6);
          progresso = ` *(${atual}/${c.meta})* ${barra}`;
        } else if (!ok && c.cat === 'reputacao') {
          const atual = Math.min(reputacao, c.meta);
          const barra = gerarBarra(atual, c.meta, 6);
          progresso = ` *(${atual}/${c.meta})* ${barra}`;
        }

        porCategoria[cat].push(`${ok ? '✅' : '🔒'} **${c.nome}**${progresso}`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🏅 Conquistas de ${alvo.globalName || alvo.username}`)
        .setFooter({ text: `${desbloqueadas.length} / ${LISTA_CONQUISTAS.filter(c => !c.secreta).length} conquistadas` })
        .setTimestamp();

      for (const [cat, linhas] of Object.entries(porCategoria)) {
        const info = CATEGORIAS_INFO[cat] || { emoji: '🎯', nome: cat };
        const value = linhas.join('\n').slice(0, 1020);
        embed.addFields({ name: `${info.emoji} ${info.nome}`, value, inline: false });
      }

      return msg.reply({ embeds: [embed] });
    }
  });
}

function gerarBarra(atual, total, tamanho = 6) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
}
