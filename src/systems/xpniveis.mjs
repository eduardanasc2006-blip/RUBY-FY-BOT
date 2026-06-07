import { EmbedBuilder } from 'discord.js';
import Missao from '../db/models/Missao.mjs';
import { ganharXP } from './xpSystem.mjs';
import { embedErro } from '../utils/embeds.mjs';

// =========================
// POOL GRANDE DE MISSÕES
// =========================

const POOL_DIARIO = [
  { id: 'd1', tipo: 'mensagem', descricao: 'Enviar 10 mensagens', meta: 10, xp: 100 },
  { id: 'd2', tipo: 'mensagem', descricao: 'Enviar 30 mensagens', meta: 30, xp: 190 },
  { id: 'd3', tipo: 'quiz', descricao: 'Responder 2 quizzes', meta: 2, xp: 70 },
  { id: 'd4', tipo: 'quiz', descricao: 'Responder 5 quizzes', meta: 5, xp: 250 },
  { id: 'd5', tipo: 'interacao', descricao: 'Fazer 5 interações', meta: 5, xp: 60 },
  { id: 'd6', tipo: 'interacao', descricao: 'Fazer 15 interações', meta: 15, xp: 180 },
  { id: 'd7', tipo: 'reputacao', descricao: 'Dar 1 reputação', meta: 1, xp: 70 },
  { id: 'd8', tipo: 'reputacao', descricao: 'Dar 3 reputações', meta: 3, xp: 200 },
];

const POOL_SEMANAL = [
  { id: 's1', tipo: 'xp', descricao: 'Ganhar 300 XP', meta: 300, xp: 350 },
  { id: 's2', tipo: 'xp', descricao: 'Ganhar 800 XP', meta: 800, xp: 600 },
  { id: 's3', tipo: 'quiz', descricao: 'Completar 10 quizzes', meta: 10, xp: 400 },
  { id: 's4', tipo: 'quiz', descricao: 'Completar 25 quizzes', meta: 25, xp: 900 },
  { id: 's5', tipo: 'interacao', descricao: 'Fazer 20 interações', meta: 20, xp: 500 },
  { id: 's6', tipo: 'mensagem', descricao: 'Enviar 200 mensagens', meta: 200, xp: 800 },
];

// =========================
// RESET POR DATA REAL
// =========================

function getDia() {
  return new Date().toISOString().split('T')[0];
}

function getSemana() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor((d - start) / 86400000);
  return `${d.getFullYear()}-W${Math.ceil((diff + start.getDay() + 1) / 7)}`;
}

// =========================
// RANDOM MISSIONS (4 FIXAS)
// =========================

function sortear(lista, qtd = 4) {
  const copia = [...lista];
  const resultado = [];

  while (resultado.length < qtd && copia.length) {
    const i = Math.floor(Math.random() * copia.length);
    resultado.push(copia.splice(i, 1)[0]);
  }

  return resultado;
}

// =========================
// GARANTIR MISSÕES
// =========================

async function garantirMissoes(userId, guildId) {
  let doc = await Missao.findOne({ userId, guildId });

  const hoje = getDia();
  const semana = getSemana();

  if (!doc) {
    doc = new Missao({
      userId,
      guildId,
      diarias: [],
      semanais: [],
      resetDia: hoje,
      resetSemana: semana,
    });
  }

  // 🔥 RESET DIÁRIO (NOVAS MISSÕES)
  if (doc.resetDia !== hoje) {
    doc.diarias = sortear(POOL_DIARIO, 4).map(m => ({
      ...m,
      atual: 0,
      concluida: false,
    }));
    doc.resetDia = hoje;
  }

  // 🔥 RESET SEMANAL (NOVAS MISSÕES)
  if (doc.resetSemana !== semana) {
    doc.semanais = sortear(POOL_SEMANAL, 4).map(m => ({
      ...m,
      atual: 0,
      concluida: false,
    }));
    doc.resetSemana = semana;
  }

  await doc.save();
  return doc;
}

// =========================
// BARRA
// =========================

function barra(atual, meta) {
  const total = 8;
  const p = Math.min(1, atual / meta);
  const f = Math.round(p * total);
  return '█'.repeat(f) + '░'.repeat(total - f);
}

function formatar(m) {
  const status = m.concluida ? '✅' : '⏳';
  return `${status} **${m.descricao}**\n${barra(m.atual, m.meta)} \`${m.atual}/${m.meta}\` +${m.xp} XP`;
}

// =========================
// COMANDO !missoes

// O comando !missoes é gerenciado exclusivamente por missoes.mjs
// xpniveis.mjs é um módulo utilitário — não registra comandos próprios
export const comandos = [];
export function register(_client, _configs) {}
