/**
 * Clients — Ponto de entrada público do módulo.
 *
 * Exporta:
 *   registerClientsHandler  — registra namespace 'clients' (boot)
 *   openClientsList         — responde ao /cliente listar
 *   buildClientModal        — constrói o modal de registro
 *   MODAL_CUSTOM_ID         — customId do modal
 */

import { MessageFlags } from 'discord.js';
import { register }                from '../../handlers/componentHandler.mjs';
import { handleClientsComponent }  from './actions.mjs';
import { listClients }             from '../../database/repositories/Clients.mjs';
import {
  buildClientModal,
  buildClientListEmbed,
  buildClientPickRow,
  MODAL_CUSTOM_ID,
} from './flow.mjs';
import { logger } from '../../utils/logger.mjs';

// Re-exporta para uso externo
export { buildClientModal, MODAL_CUSTOM_ID };

// ── Boot ──────────────────────────────────────────────────────────────────────

/**
 * Registra o módulo de clientes no boot do bot.
 * Deve ser chamado UMA ÚNICA VEZ em src/index.mjs.
 */
export function registerClientsHandler() {
  register('clients', handleClientsComponent);
  logger.info('[Clients] Handler registrado no namespace "clients".');
}

// ── Comando /cliente listar ───────────────────────────────────────────────────

/**
 * Responde ao /cliente listar com embed + select de seleção.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openClientsList(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: '❌ Este comando só pode ser usado em servidores.',
      flags:   MessageFlags.Ephemeral,
    });
    return;
  }

  const clients   = listClients(guildId, { limit: 25 });
  const embed     = buildClientListEmbed(clients);
  const pickRow   = buildClientPickRow(clients);
  const components = pickRow ? [pickRow] : [];

  await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
}
