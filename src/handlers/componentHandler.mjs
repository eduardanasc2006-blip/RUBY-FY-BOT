import { MessageFlags } from 'discord.js';
import { parse } from '../utils/customId.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Roteador central de componentes interativos.
 *
 * Responsável por receber botões, menus de seleção e modais
 * vindos do interactionCreate.mjs e encaminhar para o handler
 * do módulo correto com base no namespace do customId.
 *
 * Uso:
 *   // Em src/index.mjs, ao inicializar um módulo:
 *   import { register } from './handlers/componentHandler.mjs';
 *   import { handleComponent } from './modules/editor/index.mjs';
 *   register('editor', handleComponent);
 *
 *   // O handler do módulo recebe:
 *   async function handleComponent(interaction, action, partes) { ... }
 */

// Namespaces reservados pelo core — não podem ser registrados por módulos
const RESERVED = new Set(['system', 'core', 'debug']);

// Map interno: namespace → handler
const handlers = new Map();

// ── Registro ────────────────────────────────────────────────────────────────

/**
 * Registra um handler para um namespace.
 * Lança erro se o namespace já estiver registrado ou for reservado.
 *
 * @param {string}   namespace - Identificador único do módulo
 * @param {Function} handler   - async (interaction, action, partes) => void
 */
export function register(namespace, handler) {
  if (RESERVED.has(namespace)) {
    throw new Error(`[ComponentHandler] Namespace '${namespace}' é reservado pelo sistema.`);
  }
  if (handlers.has(namespace)) {
    throw new Error(`[ComponentHandler] Namespace '${namespace}' já está registrado. Cada módulo deve ter um namespace único.`);
  }
  if (typeof handler !== 'function') {
    throw new Error(`[ComponentHandler] Handler para '${namespace}' deve ser uma função.`);
  }

  handlers.set(namespace, handler);
  logger.info(`[ComponentHandler] Namespace registrado: '${namespace}'`);
}

/**
 * Remove o registro de um namespace (útil em testes).
 * @param {string} namespace
 */
export function unregister(namespace) {
  handlers.delete(namespace);
}

/**
 * Retorna os namespaces atualmente registrados.
 * @returns {string[]}
 */
export function getRegistered() {
  return [...handlers.keys()];
}

// ── Roteamento ───────────────────────────────────────────────────────────────

/**
 * Roteia uma interação de componente para o handler do módulo correto.
 * Chamado pelo interactionCreate.mjs para botões, selects e modais.
 *
 * @param {import('discord.js').Interaction} interaction
 */
export async function route(interaction) {
  const { valid, namespace, action, partes } = parse(interaction.customId);

  // customId malformado
  if (!valid) {
    logger.warn(`[ComponentHandler] customId inválido recebido: "${interaction.customId}"`);
    await safeReply(interaction, '⚠️ Componente inválido.');
    return;
  }

  const handler = handlers.get(namespace);

  // Namespace não registrado
  if (!handler) {
    logger.warn(`[ComponentHandler] Namespace não registrado: '${namespace}' (customId: "${interaction.customId}")`);
    await safeReply(interaction, '⚠️ Este componente expirou ou não está mais disponível.');
    return;
  }

  // Despacha para o handler do módulo
  try {
    await handler(interaction, action, partes);
  } catch (err) {
    logger.error(`[ComponentHandler] Erro no handler '${namespace}' (action: '${action}'):`, err);
    await safeReply(interaction, '❌ Ocorreu um erro ao processar este componente.');
  }
}

// ── Utilitário interno ───────────────────────────────────────────────────────

/**
 * Responde à interação de forma segura, independente do estado dela.
 */
async function safeReply(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // Interação já expirou ou foi respondida — não trava o bot
  }
}
