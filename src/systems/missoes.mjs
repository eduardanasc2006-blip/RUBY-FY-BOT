import { EmbedBuilder } from 'discord.js';
import Missao from '../db/models/Missao.mjs';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';

const DIARIAS_BASE = [
  { id: 'd1', tipo: 'mensagem',  descricao: 'Enviar 20 mensagens',       meta: 20, recompensa: 100 },
  { id: 'd2', tipo: 'quiz',      descricao: 'Responder 3 quizzes',       meta: 3,  recompensa: 80  },
  { id: 'd3', tipo: 'interacao', descricao: 'Usar 5 interações sociais', meta: 5,  recompensa: 60  },
  { id: 'd4', tipo: 'reputacao', descricao: 'Dar reputação para alguém', meta: 1,  recompensa: 50  },
  { id: 'd5', tipo: 'comando',   descricao: 'Usar 10 comandos',          meta: 10, recompensa: 70  },
];

const SEMANAIS_BASE = [
  { id: 's1', tipo: 'xp',       descricao: 'Ganhar 500 XP',             meta: 500, recompensa: 500 },
  { id: 's2', tipo: 'quiz',     descricao: 'Completar 20 quizzes',       meta: 20,  recompensa: 400 },
  { id: 's3', tipo: 'forca',    descricao: 'Vencer 5 partidas de forca', meta: 5,   recompensa: 350 },
  { id: 's4', tipo: 'interacao',descricao: 'Fazer 30 interações',        meta: 30,  recompensa: 300 },
];

function expiracaoDiaria() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d;
}
function expiracaoSemanal() {
  const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); d.setHours(23, 59, 59, 0); return d;
}

async function garantirMissoes(userId, guildId) {
  const agora = new Date();
  let doc = await Missao.findOne({ userId, guildId });
  if (!doc) doc = new Missao({ userId, guildId });

  const renovarD = !doc.ultimaRenovacaoDiaria || (agora - doc.ultimaRenovacaoDiaria) >= 86400000;
  const renovarS = !doc.ultimaRenovacaoSemanal || (agora - doc.ultimaRenovacaoSemanal) >= 604800000;

  if (renovarD) {
    doc.diarias = DIARIAS_BASE.map(m => ({ ...m, atual: 0, concluida: false, expira: expiracaoDiaria() }));
    doc.ultimaRenovacaoDiaria = agora;
  }
  if (renovarS) {
    doc.semanais = SEMANAIS_BASE.map(m => ({ ...m, atual: 0, concluida: false, expira: expiracaoSemanal() }));
    doc.ultimaRenovacaoSemanal = agora;
  }
  await doc.save();
  return doc;
}

function formatarMissao(m) {
  const barra = gerarBarra(m.atual, m.meta, 8);
  const status = m.concluida ? '✅' : '⏳';
  return `${status} **${m.descricao}**\n${barra} \`${m.atual}/${m.meta}\` • +${m.recompensa} XP`;
}

function gerarBarra(atual, total, tamanho = 8) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
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

    if (cmd === 'missoes') {
      let doc;
      try {
        doc = await garantirMissoes(msg.author.id, guildId);
      } catch (e) {
        return msg.reply({ embeds: [embedErro('Erro ao carregar missões. Verifique a conexão com o banco de dados.')] });
      }

      const diarias = doc.diarias || [];
      const semanais = doc.semanais || [];

      const concluiDiarias = diarias.filter(m => m.concluida).length;
      const concluiSemanais = semanais.filter(m => m.concluida).length;

      const textoDiarias = diarias.length
        ? diarias.map(formatarMissao).join('\n\n')
        : 'Nenhuma missão diária.';

      const textoSemanais = semanais.length
        ? semanais.map(formatarMissao).join('\n\n')
        : 'Nenhuma missão semanal.';

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📋 Suas Missões')
        .setDescription(`Conclua missões para ganhar XP!\n\n📅 **Diárias:** ${concluiDiarias}/${diarias.length} concluídas\n📆 **Semanais:** ${concluiSemanais}/${semanais.length} concluídas`)
        .setTimestamp();

      const limitField = (txt) => txt.slice(0, 1020);
      embed.addFields(
        { name: '📅 Missões Diárias', value: limitField(textoDiarias), inline: false },
        { name: '📆 Missões Semanais', value: limitField(textoSemanais), inline: false },
      );

      return msg.reply({ embeds: [embed] });
    }
  });
}

export async function progredirMissao(userId, guildId, tipo, quantidade = 1) {
  try {
    const doc = await garantirMissoes(userId, guildId);
    let atualizado = false;

    for (const lista of [doc.diarias, doc.semanais]) {
      for (const m of lista) {
        if (m.tipo === tipo && !m.concluida) {
          m.atual = Math.min(m.atual + quantidade, m.meta);
          if (m.atual >= m.meta) {
            m.concluida = true;
            await Usuario.updateOne({ userId, guildId }, { $inc: { xp: m.recompensa }, $setOnInsert: { userId, guildId } }, { upsert: true });
          }
          atualizado = true;
        }
      }
    }
    if (atualizado) await doc.save();
  } catch {}
}
