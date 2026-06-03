import Usuario from '../db/models/Usuario.mjs';
import XpLog from '../db/models/XpLog.mjs';
import { calcularNivel } from '../utils/nivelCalc.mjs';

// ════════════════════════════════════════════════════════════
//  SISTEMA CENTRAL DE XP — xpSystem.mjs
//
//  REGRA MESTRA: TODO XP que entra ou sai do jogo passa aqui.
//  NUNCA use $inc: { xp/xpTotal/xpDisponivel } fora deste arquivo.
//
//  xpTotal     → nível / ranking / conquistas (NUNCA diminui)
//  xpDisponivel → moeda gastável: loja / casamento / efeitos
// ════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  1. CONSTANTES — valores base por origem
//     Use sempre XP_EVENTS para definir recompensas, nunca
//     números mágicos espalhados pelo código.
// ─────────────────────────────────────────────────────────────
export const XP_EVENTS = Object.freeze({
  CHAT:      { base: 15, max: 30 },  // range aleatório; aplicado em xpniveis.mjs
  QUIZ:      30,
  FORCA:     120,
  MISSAO_D:  100,   // missão diária genérica
  MISSAO_S:  350,   // missão semanal genérica
  CONQUISTA: null,  // valor vem do próprio objeto de conquista
  REP:       20,    // receber reputação
  CASAMENTO: 50,    // bônus ao casar
});

// ─────────────────────────────────────────────────────────────
//  2. MULTIPLICADORES
//     Passe o multiplicador em ganharXP() quando necessário.
//     Ex.: evento double-XP → ganharXP(id, g, 30, 'quiz', 2.0)
// ─────────────────────────────────────────────────────────────
export const MULTIPLICADORES = Object.freeze({
  NORMAL:  1.0,
  VIP:     1.5,
  EVENTO:  2.0,
  WEEKEND: 1.2,
});

// ─────────────────────────────────────────────────────────────
//  3. ganharXP  — fonte única de ganho de XP
// ─────────────────────────────────────────────────────────────

/**
 * Concede XP ao usuário.
 * Incrementa AMBOS xpTotal (permanente) e xpDisponivel (moeda).
 *
 * @param {string} userId
 * @param {string} guildId
 * @param {number} valor         — XP base a conceder (> 0)
 * @param {string} origem        — 'chat' | 'quiz' | 'forca' | 'missao' | 'conquista' | …
 * @param {number} multiplicador — ex. 1.5 para VIP, 2.0 para evento (padrão 1.0)
 * @returns {Promise<{usuario: object|null, levelUp: boolean, nivelNovo: number}>}
 */
export async function ganharXP(userId, guildId, valor, origem = 'sistema', multiplicador = 1.0) {
  if (!userId || !guildId || typeof valor !== 'number' || valor <= 0) {
    return { usuario: null, levelUp: false, nivelNovo: 1 };
  }

  const valorFinal = Math.round(valor * Math.max(0.1, multiplicador));

  // ── Atomicidade: $inc garante operação atômica no SQLite ──
  const u = await Usuario.findOneAndUpdate(
    { userId, guildId },
    {
      $inc: {
        xpTotal:      valorFinal,
        xpDisponivel: valorFinal,
      },
      $setOnInsert: { userId, guildId },
    },
    { upsert: true, new: true }
  );

  if (!u) return { usuario: null, levelUp: false, nivelNovo: 1 };

  // ── Level cache: calcula nível e persiste se mudou ────────
  const xpAntes    = Math.max(0, (u.xpTotal || 0) - valorFinal);
  const nivelAntes = calcularNivel(xpAntes).nivel;
  const nivelNovo  = calcularNivel(u.xpTotal || 0).nivel;
  const levelUp    = nivelNovo > nivelAntes;

  if (levelUp) {
    await Usuario.updateOne(
      { userId, guildId },
      { $set: { nivel: nivelNovo } }
    );
    u.nivel = nivelNovo;
  }

  // ── Log persistente ───────────────────────────────────────
  await _registrarLog({
    userId,
    guildId,
    tipo:   'ganho',
    valor:  valorFinal,
    origem,
    saldoApos: u.xpDisponivel || 0,
  });

  return { usuario: u, levelUp, nivelNovo };
}

// ─────────────────────────────────────────────────────────────
//  4. gastarXP  — fonte única de gasto de XP (moeda)
// ─────────────────────────────────────────────────────────────

/**
 * Gasta XP disponível (moeda) do usuário.
 * NUNCA reduz xpTotal.
 * Valida saldo antes de qualquer operação.
 *
 * @param {string} userId
 * @param {string} guildId
 * @param {number} valor   — quantidade a gastar (> 0)
 * @param {string} motivo  — 'loja' | 'casamento' | 'efeito' | …
 * @returns {Promise<boolean>} true = sucesso | false = saldo insuficiente
 */
export async function gastarXP(userId, guildId, valor, motivo = 'compra') {
  // ── Validação de entrada ───────────────────────────────────
  if (!userId || !guildId || typeof valor !== 'number' || valor <= 0) return false;

  const user = await Usuario.findOne({ userId, guildId });
  const saldo = user?.xpDisponivel ?? 0;

  // ── Impede saldo negativo ou gasto maior que saldo ────────
  if (!user || saldo < valor) return false;

  // ── Atualização atômica: $inc com valor negativo ──────────
  await Usuario.updateOne(
    { userId, guildId },
    { $inc: { xpDisponivel: -valor } }
  );

  // ── Log persistente ───────────────────────────────────────
  await _registrarLog({
    userId,
    guildId,
    tipo:   'gasto',
    valor:  -valor,
    origem: motivo,
    saldoApos: saldo - valor,
  });

  return true;
}

// ─────────────────────────────────────────────────────────────
//  5. Funções utilitárias
// ─────────────────────────────────────────────────────────────

/**
 * Verifica saldo sem gastar (leitura pura).
 */
export async function temXP(userId, guildId, valor) {
  if (typeof valor !== 'number' || valor <= 0) return false;
  const user = await Usuario.findOne({ userId, guildId });
  return (user?.xpDisponivel ?? 0) >= valor;
}

/**
 * Retorna o saldo atual do usuário.
 */
export async function getXP(userId, guildId) {
  const user = await Usuario.findOne({ userId, guildId });
  return {
    xpTotal:      user?.xpTotal      ?? 0,
    xpDisponivel: user?.xpDisponivel ?? 0,
    nivel:        user?.nivel        ?? 1,
  };
}

/**
 * Busca o histórico de XP do usuário (últimas N entradas).
 * @param {string} userId
 * @param {string} guildId
 * @param {number} limite — padrão 10
 */
export async function historicoXP(userId, guildId, limite = 10) {
  return XpLog.find({ userId, guildId })
    .sort({ createdAt: -1 })
    .limit(limite)
    .lean();
}

// ─────────────────────────────────────────────────────────────
//  6. LOG INTERNO — não exportado, só usado por este módulo
// ─────────────────────────────────────────────────────────────

async function _registrarLog({ userId, guildId, tipo, valor, origem, saldoApos }) {
  try {
    await XpLog.create({
      userId,
      guildId,
      tipo,
      valor,
      origem,
      saldoApos,
      createdAt: new Date(),
    });
  } catch {
    // Log nunca deve quebrar a operação principal
  }
}
