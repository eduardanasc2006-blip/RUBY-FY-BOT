/**
 * Proofs — Ponto de entrada público do módulo.
 *
 * Exporta:
 *   registerProofsHandler  — registra namespace + ação 'proof' (boot)
 *   openProofsList         — responde ao /proof listar
 *   buildProofModal        — constrói o modal de registro
 *   MODAL_CUSTOM_ID        — customId do modal
 *
 * Uso em src/index.mjs:
 *   import { registerProofsHandler } from './modules/proofs/index.mjs';
 *   registerProofsHandler();
 *
 * Uso em commands/proofs.mjs:
 *   import { buildProofModal, openProofsList } from '../modules/proofs/index.mjs';
 */

import { MessageFlags } from 'discord.js';
import { register }                from '../../handlers/componentHandler.mjs';
import { registerAction }          from '../connections/index.mjs';
import { handleProofsComponent }   from './actions.mjs';
import { listProofs }              from '../../database/repositories/Proofs.mjs';
import {
  buildProofModal,
  buildProofListEmbed,
  MODAL_CUSTOM_ID,
} from './flow.mjs';
import { logger } from '../../utils/logger.mjs';

// Re-exporta para uso externo
export { buildProofModal, MODAL_CUSTOM_ID };

// ── Boot ──────────────────────────────────────────────────────────────────────

/**
 * Registra o módulo de proofs no boot do bot.
 *
 * Deve ser chamado UMA ÚNICA VEZ em src/index.mjs.
 * Registra:
 *   - A ação 'proof' no registry de Connections
 *   - O namespace 'proofs' no componentHandler
 */
export function registerProofsHandler() {
  // Registra a ação 'proof' para que /conexoes possa criar Connections
  registerAction('proof', {
    label:       '📋 Prova de Venda',
    description: 'Disparado quando uma prova de venda é registrada',
  });

  // Registra o namespace no componentHandler
  register('proofs', handleProofsComponent);

  logger.info('[Proofs] Handler registrado no namespace "proofs". Ação "proof" disponível em Connections.');
}

// ── Comando /proof listar ─────────────────────────────────────────────────────

/**
 * Responde ao subcomando /proof listar, exibindo as provas recentes do servidor.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openProofsList(interaction) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: '❌ Este comando só pode ser usado em servidores.',
      flags:   MessageFlags.Ephemeral,
    });
    return;
  }

  const proofs = listProofs(guildId, { limit: 10 });
  const embed  = buildProofListEmbed(proofs);

  await interaction.reply({
    embeds: [embed],
    flags:  MessageFlags.Ephemeral,
  });
}
