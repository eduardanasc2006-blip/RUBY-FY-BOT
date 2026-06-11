import { EmbedBuilder } from 'discord.js';
import Missao from '../db/models/Missao.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { ganharXP } from './xpSystem.mjs';

// ════════════════════════════════════════════════════════
//  POOL DE MISSÕES — 40 diárias + 20 semanais
//  A cada período, 4 são sorteadas para o usuário.
// ════════════════════════════════════════════════════════

const POOL_DIARIAS = [
  // mensagem
  { id: 'msg_5',    tipo: 'mensagem',  descricao: 'Enviar 5 mensagens no chat',          meta: 5,   recompensa: 30  },
  { id: 'msg_10',   tipo: 'mensagem',  descricao: 'Enviar 10 mensagens no chat',         meta: 10,  recompensa: 50  },
  { id: 'msg_20',   tipo: 'mensagem',  descricao: 'Enviar 20 mensagens no chat',         meta: 20,  recompensa: 80  },
  { id: 'msg_30',   tipo: 'mensagem',  descricao: 'Enviar 30 mensagens no chat',         meta: 30,  recompensa: 100 },
  { id: 'msg_50',   tipo: 'mensagem',  descricao: 'Enviar 50 mensagens no chat',         meta: 50,  recompensa: 130 },
  { id: 'msg_75',   tipo: 'mensagem',  descricao: 'Enviar 75 mensagens',                 meta: 75,  recompensa: 160 },
  { id: 'msg_100',  tipo: 'mensagem',  descricao: 'Super ativo: 100 mensagens',          meta: 100, recompensa: 200 },
  // quiz
  { id: 'quiz_1',   tipo: 'quiz',      descricao: 'Responder 1 quiz',                    meta: 1,   recompensa: 30  },
  { id: 'quiz_3',   tipo: 'quiz',      descricao: 'Responder 3 quizzes',                 meta: 3,   recompensa: 70  },
  { id: 'quiz_5',   tipo: 'quiz',      descricao: 'Acertar 5 quizzes',                   meta: 5,   recompensa: 100 },
  { id: 'quiz_8',   tipo: 'quiz',      descricao: 'Completar 8 quizzes',                 meta: 8,   recompensa: 140 },
  { id: 'quiz_10',  tipo: 'quiz',      descricao: 'Dez quizzes hoje!',                   meta: 10,  recompensa: 180 },
  // forca
  { id: 'forca_1',  tipo: 'forca',     descricao: 'Vencer 1 partida de forca',           meta: 1,   recompensa: 50  },
  { id: 'forca_2',  tipo: 'forca',     descricao: 'Vencer 2 partidas de forca',          meta: 2,   recompensa: 90  },
  { id: 'forca_3',  tipo: 'forca',     descricao: 'Vencer 3 partidas de forca',          meta: 3,   recompensa: 130 },
  { id: 'forca_5',  tipo: 'forca',     descricao: 'Ganhar 5 vezes na forca',             meta: 5,   recompensa: 180 },
  // interação
  { id: 'int_3',    tipo: 'interacao', descricao: 'Fazer 3 interações sociais',          meta: 3,   recompensa: 40  },
  { id: 'int_5',    tipo: 'interacao', descricao: 'Fazer 5 interações sociais',          meta: 5,   recompensa: 60  },
  { id: 'int_10',   tipo: 'interacao', descricao: 'Fazer 10 interações sociais',         meta: 10,  recompensa: 90  },
  { id: 'int_15',   tipo: 'interacao', descricao: 'Fazer 15 interações com amigos',      meta: 15,  recompensa: 120 },
  { id: 'int_20',   tipo: 'interacao', descricao: 'Ser social: 20 interações',           meta: 20,  recompensa: 150 },
  // reputação
  { id: 'rep_1',    tipo: 'reputacao', descricao: 'Dar reputação para alguém',           meta: 1,   recompensa: 40  },
  { id: 'rep_2',    tipo: 'reputacao', descricao: 'Dar rep para 2 pessoas hoje',         meta: 2,   recompensa: 70  },
  { id: 'rep_3',    tipo: 'reputacao', descricao: 'Elogiar 3 pessoas (reputação)',       meta: 3,   recompensa: 100 },
  // comando
  { id: 'cmd_5',    tipo: 'comando',   descricao: 'Usar 5 comandos do bot',              meta: 5,   recompensa: 30  },
  { id: 'cmd_10',   tipo: 'comando',   descricao: 'Usar 10 comandos do bot',             meta: 10,  recompensa: 50  },
  { id: 'cmd_15',   tipo: 'comando',   descricao: 'Usar 15 comandos do bot',             meta: 15,  recompensa: 70  },
  { id: 'cmd_20',   tipo: 'comando',   descricao: 'Usar 20 comandos do bot',             meta: 20,  recompensa: 90  },
  { id: 'cmd_30',   tipo: 'comando',   descricao: 'Expert: 30 comandos do bot',          meta: 30,  recompensa: 120 },
  // afinidade
  { id: 'afin_1',   tipo: 'afinidade', descricao: 'Fazer 1 interação afetiva',           meta: 1,   recompensa: 35  },
  { id: 'afin_3',   tipo: 'afinidade', descricao: 'Criar 3 interações afetivas',         meta: 3,   recompensa: 60  },
  { id: 'afin_5',   tipo: 'afinidade', descricao: 'Fortalecer 5 laços de amizade',       meta: 5,   recompensa: 90  },
  // xp
  { id: 'xp_50',    tipo: 'xp',        descricao: 'Ganhar 50 XP hoje',                   meta: 50,  recompensa: 40  },
  { id: 'xp_100',   tipo: 'xp',        descricao: 'Ganhar 100 XP hoje',                  meta: 100, recompensa: 70  },
  { id: 'xp_200',   tipo: 'xp',        descricao: 'Ganhar 200 XP hoje',                  meta: 200, recompensa: 100 },
  { id: 'xp_300',   tipo: 'xp',        descricao: 'Acumular 300 XP em um dia',           meta: 300, recompensa: 130 },
  // especial
  { id: 'esp_voz',  tipo: 'quiz',      descricao: 'Participar de 2 quizzes diferentes',  meta: 2,   recompensa: 80  },
  { id: 'esp_jogo', tipo: 'forca',     descricao: 'Jogar forca 2x e quiz 1x',            meta: 2,   recompensa: 100 },
  { id: 'esp_msg',  tipo: 'mensagem',  descricao: 'Enviar 40 mensagens hoje',             meta: 40,  recompensa: 110 },
  { id: 'esp_ativo',tipo: 'comando',   descricao: 'Usar 25 comandos do bot hoje',         meta: 25,  recompensa: 100 },
];

const POOL_SEMANAIS = [
  { id: 'w_xp_500',   tipo: 'xp',        descricao: 'Ganhar 500 XP esta semana',          meta: 500,  recompensa: 400 },
  { id: 'w_xp_1000',  tipo: 'xp',        descricao: 'Acumular 1.000 XP na semana',        meta: 1000, recompensa: 700 },
  { id: 'w_xp_1500',  tipo: 'xp',        descricao: 'Ser um monstro: 1.500 XP',           meta: 1500, recompensa: 900 },
  { id: 'w_quiz_10',  tipo: 'quiz',       descricao: 'Completar 10 quizzes',               meta: 10,   recompensa: 300 },
  { id: 'w_quiz_20',  tipo: 'quiz',       descricao: 'Completar 20 quizzes',               meta: 20,   recompensa: 500 },
  { id: 'w_quiz_30',  tipo: 'quiz',       descricao: 'Mestre: completar 30 quizzes',       meta: 30,   recompensa: 700 },
  { id: 'w_forca_3',  tipo: 'forca',      descricao: 'Vencer 3 partidas de forca',         meta: 3,    recompensa: 250 },
  { id: 'w_forca_5',  tipo: 'forca',      descricao: 'Vencer 5 partidas de forca',         meta: 5,    recompensa: 350 },
  { id: 'w_forca_10', tipo: 'forca',      descricao: 'Mestre da forca: 10 vitórias',       meta: 10,   recompensa: 600 },
  { id: 'w_int_20',   tipo: 'interacao',  descricao: 'Fazer 20 interações esta semana',    meta: 20,   recompensa: 200 },
  { id: 'w_int_50',   tipo: 'interacao',  descricao: 'Fazer 50 interações esta semana',    meta: 50,   recompensa: 400 },
  { id: 'w_msg_100',  tipo: 'mensagem',   descricao: 'Enviar 100 mensagens na semana',     meta: 100,  recompensa: 300 },
  { id: 'w_msg_200',  tipo: 'mensagem',   descricao: 'Enviar 200 mensagens na semana',     meta: 200,  recompensa: 500 },
  { id: 'w_msg_500',  tipo: 'mensagem',   descricao: 'Lendário: 500 mensagens',            meta: 500,  recompensa: 900 },
  { id: 'w_rep_5',    tipo: 'reputacao',  descricao: 'Dar reputação 5 vezes esta semana',  meta: 5,    recompensa: 180 },
  { id: 'w_cmd_50',   tipo: 'comando',    descricao: 'Usar 50 comandos do bot',            meta: 50,   recompensa: 200 },
  { id: 'w_cmd_100',  tipo: 'comando',    descricao: 'Usar 100 comandos do bot',           meta: 100,  recompensa: 350 },
  { id: 'w_afin_10',  tipo: 'afinidade',  descricao: 'Fazer 10 interações afetivas',       meta: 10,   recompensa: 250 },
  { id: 'w_afin_20',  tipo: 'afinidade',  descricao: 'Fortalecer 20 laços',               meta: 20,   recompensa: 400 },
  { id: 'w_misto',    tipo: 'quiz',       descricao: 'Completar 15 quizzes ou forca',      meta: 15,   recompensa: 450 },
];

// ─────────────────────────────────────────────────────────
//  UTILS DE CALENDÁRIO — reset baseado em data real
// ─────────────────────────────────────────────────────────

function diaAtual() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function semanaISO() {
  const now = new Date();
  const d   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const sem    = Math.ceil((((d - inicio) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(sem).padStart(2, '0')}`;
}

function sortear(pool, qtd) {
  const copia = [...pool].sort(() => Math.random() - 0.5);
  return copia.slice(0, qtd).map(m => ({ ...m, atual: 0, concluida: false }));
}

// ─────────────────────────────────────────────────────────
//  GARANTIR MISSÕES — cria ou renova por calendário
// ─────────────────────────────────────────────────────────

async function garantirMissoes(userId, guildId) {
  const hoje   = diaAtual();
  const semana = semanaISO();

  let doc = await Missao.findOne({ userId, guildId });
  if (!doc) doc = new Missao({ userId, guildId });

  const renovarD = doc.ultimaDiaMissao !== hoje;
  const renovarS = doc.ultimaSemanaMissao !== semana;

  if (renovarD) {
    doc.diarias = sortear(POOL_DIARIAS, 4);
    doc.ultimaDiaMissao = hoje;
    doc.ultimaRenovacaoDiaria = new Date();
  }
  if (renovarS) {
    doc.semanais = sortear(POOL_SEMANAIS, 4);
    doc.ultimaSemanaMissao = semana;
    doc.ultimaRenovacaoSemanal = new Date();
  }

  await doc.save();
  return doc;
}

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

function gerarBarra(atual, total, tamanho = 8) {
  const p = Math.min(1, atual / Math.max(1, total));
  const f = Math.round(p * tamanho);
  return '█'.repeat(Math.max(0, f)) + '░'.repeat(Math.max(0, tamanho - f));
}

function formatarMissao(m) {
  const barra  = gerarBarra(m.atual, m.meta, 8);
  const status = m.concluida ? '✅' : '⏳';
  return `${status} **${m.descricao}**\n${barra} \`${m.atual}/${m.meta}\` • +${m.recompensa} XP`;
}

// ─────────────────────────────────────────────────────────
//  REGISTER — comando !missoes
// ─────────────────────────────────────────────────────────

export const comandos = [
  { cmd: '!missoes', desc: 'Ver missões diárias e semanais com progresso.' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd !== 'missoes') return;

    let doc;
    try {
      doc = await garantirMissoes(msg.author.id, guildId);
    } catch (e) {
      return msg.reply({ embeds: [embedErro('Erro ao carregar missões. Tente novamente.')] });
    }

    const diarias  = doc.diarias  || [];
    const semanais = doc.semanais || [];

    const cdD = diarias.filter(m => m.concluida).length;
    const cdS = semanais.filter(m => m.concluida).length;

    const agora  = new Date();
    const meiaNoite = new Date();
    meiaNoite.setHours(24, 0, 0, 0);
    const restaDia  = Math.round((meiaNoite - agora) / 3600000);

    const limitField = (txt) => txt.slice(0, 1020) || 'Nenhuma missão.';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📋 Suas Missões')
      .setDescription(
        `**Conclua missões para ganhar XP!**\n\n` +
        `📅 **Diárias:** ${cdD}/4 concluídas • Reset em ~${restaDia}h\n` +
        `📆 **Semanais:** ${cdS}/4 concluídas • Reset toda segunda-feira`
      )
      .addFields(
        { name: '📅 Missões Diárias', value: limitField(diarias.map(formatarMissao).join('\n\n')), inline: false },
        { name: '📆 Missões Semanais', value: limitField(semanais.map(formatarMissao).join('\n\n')), inline: false },
      )
      .setFooter({ text: 'As missões são sorteadas do pool — 4 novas a cada período!' })
      .setTimestamp();

    return msg.reply({ embeds: [embed] });
  });
}

// ─────────────────────────────────────────────────────────
//  progredirMissao — chamado por outros sistemas
//  canal (opcional): para notificar no chat quando concluir
// ─────────────────────────────────────────────────────────

export async function progredirMissao(userId, guildId, tipo, quantidade = 1, canal = null) {
  try {
    const doc = await garantirMissoes(userId, guildId);
    let atualizado = false;

    for (const lista of [doc.diarias, doc.semanais]) {
      for (const m of lista) {
        if (m.tipo !== tipo || m.concluida) continue;

        m.atual = Math.min(m.atual + quantidade, m.meta);
        atualizado = true;

        if (m.atual >= m.meta) {
          m.concluida = true;

          // XP via controlador central
          await ganharXP(userId, guildId, m.recompensa, 'missao').catch(() => {});

          // Notificação automática no canal
          if (canal) {
            const embed = new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('🎉 Missão Concluída!')
              .setDescription(
                `<@${userId}>\n` +
                `📋 **${m.descricao}**\n` +
                `⭐ **+${m.recompensa} XP** creditados automaticamente!`
              )
              .setFooter({ text: 'Use !missoes para ver suas missões' })
              .setTimestamp();
            canal.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }
    }

    if (atualizado) await doc.save();
  } catch {}
   }
