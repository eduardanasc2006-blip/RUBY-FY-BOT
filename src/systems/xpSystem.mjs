import Usuario from '../db/models/Usuario.mjs';
import XpLog from '../db/models/XpLog.mjs';
import { calcularNivel } from '../utils/nivelCalc.mjs';

// xpSystem é um módulo utilitário puro (sem comandos de chat próprios) —
// outros sistemas importam suas funções diretamente. Exporta comandos/register
// vazios apenas para satisfazer o contrato padrão do loader.mjs.
export const comandos = [];
export function register() {}

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
// ─────────────────────────────────────────────────────────────
export const XP_EVENTS = Object.freeze({
  CHAT:      { base: 15, max: 30 },
  QUIZ:      30,
  FORCA:     120,
  MISSAO_D:  100,
  MISSAO_S:  350,
  CONQUISTA: null,
  REP:       20,
  CASAMENTO: 50,
});

// ─────────────────────────────────────────────────────────────
//  2. MULTIPLICADORES
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
 */
export async function ganharXP(userId, guildId, valor, origem = 'sistema', multiplicador = 1.0) {
  if (!userId || !guildId || typeof valor !== 'number' || valor <= 0) {
    return { usuario: null, levelUp: false, nivelNovo: 1 };
  }

  const valorFinal = Math.round(valor * Math.max(0.1, multiplicador));

  const u = await Usuario.findOneAndUpdate(
    { userId, guildId },
    {
      $inc: {
        xpTotal:      valorFinal,
        xpDisponivel: valorFinal,
      },
      $setOnInsert: {
        userId,
        guildId,
      },
    },
    { upsert: true, new: true }
  );

  if (!u) return { usuario: null, levelUp: false, nivelNovo: 1 };

  // ── Level cache ──────────────────────────────────────────
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

  // ── Log persistente ──────────────────────────────────────
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
 */
export async function gastarXP(userId, guildId, valor, motivo = 'compra') {
  if (!userId || !guildId || typeof valor !== 'number' || valor <= 0) return false;

  const user = await Usuario.findOne({ userId, guildId });
  const saldo = user?.xpDisponivel ?? 0;

  if (!user || saldo < valor) return false;

  await Usuario.updateOne(
    { userId, guildId },
    { $inc: { xpDisponivel: -valor } }
  );

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

export async function temXP(userId, guildId, valor) {
  if (typeof valor !== 'number' || valor <= 0) return false;
  const user = await Usuario.findOne({ userId, guildId });
  return (user?.xpDisponivel ?? 0) >= valor;
}

export async function getXP(userId, guildId) {
  const user = await Usuario.findOne({ userId, guildId });
  return {
    xpTotal:      user?.xpTotal      ?? 0,
    xpDisponivel: user?.xpDisponivel ?? 0,
    nivel:        user?.nivel        ?? 1,
  };
}

export async function historicoXP(userId, guildId, limite = 10) {
  const todos = await XpLog.find({ userId, guildId });
  return todos
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limite);
}

// ─────────────────────────────────────────────────────────────
//  6. LOG INTERNO
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

// ─────────────────────────────────────────────────────────────
//  7. transferirXP  — aposta / duelo (sem criar XP novo)
// ─────────────────────────────────────────────────────────────

/**
 * Transfere XP disponível de um usuário para outro.
 * Não cria nem destrói XP — apenas redistribui.
 */
export async function transferirXP(deUserId, paraUserId, guildId, valor, motivo = 'transferencia') {
  if (!deUserId || !paraUserId || !guildId || typeof valor !== 'number' || valor <= 0) return false;

  const perdedor = await Usuario.findOne({ userId: deUserId, guildId });
  if (!perdedor || (perdedor.xpDisponivel ?? 0) < valor) return false;

  await Usuario.updateOne(
    { userId: deUserId, guildId },
    { $inc: { xpDisponivel: -valor } }
  );

  await Usuario.findOneAndUpdate(
    { userId: paraUserId, guildId },
    {
      $inc: { xpDisponivel: valor },
      $setOnInsert: {
        userId: paraUserId,
        guildId,
      },
    },
    { upsert: true }
  );

  const saldoPerdedorApos = (perdedor.xpDisponivel ?? 0) - valor;
  const vencedor = await Usuario.findOne({ userId: paraUserId, guildId });
  const saldoVencedorApos = (vencedor?.xpDisponivel ?? 0);

  await Promise.all([
    _registrarLog({
      userId:    deUserId,
      guildId,
      tipo:      'transferencia',
      valor:     -valor,
      origem:    motivo,
      saldoApos: saldoPerdedorApos,
    }),
    _registrarLog({
      userId:    paraUserId,
      guildId,
      tipo:      'transferencia',
      valor:     +valor,
      origem:    motivo,
      saldoApos: saldoVencedorApos,
    }),
  ]);

  return true;
}
