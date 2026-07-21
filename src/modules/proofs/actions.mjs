/**
 * Proofs — Handler do namespace 'proofs' no componentHandler.
 *
 * Processa interações roteadas pelo componentHandler para o namespace 'proofs'.
 *
 * Ações tratadas:
 *   modal_submit — submissão do modal de registro de proof
 *   list         — exibe lista de proofs recentes (via botão/select)
 *
 * CustomIds:
 *   proofs:modal_submit   — modal de registro
 *   proofs:list           — botão de listagem
 */

import { MessageFlags } from 'discord.js';
import { createProof, listProofs } from '../../database/repositories/Proofs.mjs';
import { executeConnections } from '../connections/index.mjs';
import { fireAutomationTrigger } from '../automations/index.mjs';
import {
  parseModalData,
  resolveUserId,
  buildSuccessPayload,
  buildErrorPayload,
  buildProofListEmbed,
} from './flow.mjs';
import { logger } from '../../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';
import { logAudit } from '../audit/index.mjs';

const MODULE_NAME = 'proofs';

// ── Verificação de Permissão ─────────────────────────────────────────────────

function checkPermission(interaction) {
  return hasModulePermission(interaction.guildId, MODULE_NAME, interaction.member);
}

// ── Roteador do namespace ─────────────────────────────────────────────────────

/**
 * Handler principal — recebe todas as interações do namespace 'proofs'.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} action
 * @param {string[]} partes
 */
export async function handleProofsComponent(interaction, action, partes) {
  // Verifica permissão do módulo
  if (!checkPermission(interaction)) {
    return safeReply(interaction, buildDeniedMessage(MODULE_NAME));
  }

  switch (action) {
    case 'modal_submit': return handleModalSubmit(interaction);
    case 'list':         return handleList(interaction);

    default:
      logger.warn(`[Proofs] Ação desconhecida: '${action}' (partes: ${partes.join(', ')})`);
      await safeReply(interaction, '⚠️ Componente não reconhecido.');
  }
}

// ── Modal Submit ──────────────────────────────────────────────────────────────

/**
 * Processa a submissão do modal de prova de venda.
 *
 * Fluxo:
 *  1. Valida o contexto (guildId obrigatório)
 *  2. Extrai os campos do modal
 *  3. Valida campos obrigatórios (produto, valor)
 *  4. Resolve o ID do cliente
 *  5. Persiste a proof no banco
 *  6. Dispara executeConnections('proof', ...) de forma assíncrona
 *  7. Responde com embed de confirmação ephemeral
 */
async function handleModalSubmit(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply(buildErrorPayload('Este comando só pode ser usado em servidores.'));
      return;
    }

    const { clienteRaw, produto, valor, ticket, notas } = parseModalData(interaction);

    // Validações de campos obrigatórios
    if (!clienteRaw) {
      await interaction.editReply(buildErrorPayload('O campo **Cliente** é obrigatório.'));
      return;
    }
    if (!produto) {
      await interaction.editReply(buildErrorPayload('O campo **Produto** é obrigatório.'));
      return;
    }
    if (!valor) {
      await interaction.editReply(buildErrorPayload('O campo **Valor** é obrigatório.'));
      return;
    }

    // Resolve ID de usuário Discord (ou mantém texto livre)
    const clientId = resolveUserId(clienteRaw);

    // Persiste no banco
    const proof = createProof(guildId, {
      vendorId:   interaction.user.id,
      clientId,
      clienteRaw: clientId ? null : clienteRaw, // guarda raw apenas se não resolveu ID
      produto,
      valor,
      ticketId:   ticket || null,
      notas:      notas  || null,
    });

    // Dispara conexões registradas para a ação 'proof' — fire-and-forget
    // (não bloqueia a resposta ao usuário; erros são logados)
    const context = {
      guildId,
      vendedor: interaction.user,
      cliente:  clientId ?? clienteRaw,
      produto,
      valor,
      ticket:   ticket || null,
      channel:  interaction.channel,
    };
    executeConnections('proof', context, interaction.client).catch(err => {
      logger.error('[Proofs] Erro ao executar conexões:', err?.message ?? err);
    });

    // Etapa 16: hook de automações — fire-and-forget
    fireAutomationTrigger('proof_created', {
      guildId,
      userId:  interaction.user.id,
      proofId: proof.id,
      produto,
      valor,
    }, interaction.client).catch(err => {
      logger.warn('[Proofs] Automation hook error:', err?.message);
    });

    logger.info(`[Proofs] Proof registrada | guild: ${guildId} | id: ${proof.id} | vendedor: ${proof.vendorId}`);

    // Auditoria
    logAudit(guildId, {
      actorId: interaction.user.id,
      module: MODULE_NAME,
      action: 'proof_created',
      entity: 'proof',
      entityId: proof.id,
      result: 'success',
      beforeData: null,
      afterData: { produto, valor, clientId: clientId || clienteRaw },
    });

    await interaction.editReply(buildSuccessPayload(proof));

  } catch (err) {
    logger.error('[Proofs] Erro em handleModalSubmit:', err);
    await safeEditReply(interaction, buildErrorPayload('Erro interno ao registrar a prova. Tente novamente.'));
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * Exibe as provas recentes do servidor (ephemeral).
 */
async function handleList(interaction) {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      await safeReply(interaction, '⚠️ Este componente só funciona em servidores.');
      return;
    }

    const proofs = listProofs(guildId, { limit: 10 });
    const embed  = buildProofListEmbed(proofs);

    await safeReply(interaction, { embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (err) {
    logger.error('[Proofs] Erro em handleList:', err);
    await safeReply(interaction, '❌ Erro ao listar provas. Tente novamente.');
  }
}

// ── Utilitários ───────────────────────────────────────────────────────────────

async function safeReply(interaction, content) {
  const payload = typeof content === 'string'
    ? { content, flags: MessageFlags.Ephemeral }
    : content;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* interação expirada ou já respondida */ }
}

async function safeEditReply(interaction, content) {
  try {
    await interaction.editReply(content);
  } catch {
    await safeReply(interaction, content);
  }
}
