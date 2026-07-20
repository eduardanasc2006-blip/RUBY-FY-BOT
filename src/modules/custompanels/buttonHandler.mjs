/**
 * Sistema de Painéis Personalizados — Handler de botões publicados (namespace 'cpnlb').
 *
 * Gerencia interações de usuários comuns com botões de painéis publicados.
 *
 * Roteamento:
 *   cpnlb:click:<panelId>:<buttonId>
 *
 * Segurança:
 *   - Valida que o painel pertence ao guildId da interação
 *   - Valida que o botão pertence ao painel
 *   - Não executa código arbitrário
 *   - Erros individuais não afetam outras interações
 */

import { MessageFlags } from 'discord.js';
import { logger }       from '../../utils/logger.mjs';
import { getPanel, getButton } from '../../database/repositories/CustomPanels.mjs';
import { evaluateButtonAction } from './flow.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleCpnlbComponent(interaction, action, partes) {
  if (action !== 'click') {
    logger.warn(`[CustomPanels/Button] Ação desconhecida: '${action}'`);
    return safeReply(interaction, '⚠️ Ação não reconhecida.');
  }

  const [panelId, buttonId] = partes;

  if (!panelId || !buttonId) {
    return safeReply(interaction, '⚠️ Botão inválido. O painel pode ter sido reconfigurado.');
  }

  const guildId = interaction.guildId;

  // 1. Verifica isolamento — painel pertence ao servidor
  const panel = getPanel(guildId, panelId);
  if (!panel) {
    return safeReply(interaction, '⚠️ Este painel não está disponível neste servidor.');
  }

  // 2. Verifica que o botão pertence ao painel do servidor
  const button = getButton(guildId, panelId, buttonId);
  if (!button) {
    return safeReply(interaction, '⚠️ Este botão não foi encontrado. O painel pode ter sido atualizado.');
  }

  logger.info(`[CustomPanels/Button] Clique | painel: ${panelId} | botão: ${buttonId} | user: ${interaction.user.id} | ação: ${button.actionType}`);

  // 3. Executa a ação
  return evaluateButtonAction(interaction, button);
}

// ── Utilitário ────────────────────────────────────────────────────────────────

async function safeReply(interaction, content) {
  try {
    const payload = { content, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* ignorado */ }
}
