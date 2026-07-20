/**
 * Clients — Handler do namespace 'clients' no componentHandler.
 *
 * Ações tratadas:
 *   modal_submit   — criação via modal
 *   pick           — select da listagem → view
 *   view:<id>      — detalhes do cliente
 *   delete:<id>    — confirmação de exclusão
 *   delete_ok:<id> — executa exclusão
 *
 * CustomIds (todos ≤ 100 chars com UUID de 36 chars):
 *   clients:modal_submit    (20 chars)
 *   clients:pick            (12 chars)
 *   clients:view:UUID       (49 chars)
 *   clients:delete:UUID     (51 chars)
 *   clients:delete_ok:UUID  (54 chars)
 */

import { MessageFlags } from 'discord.js';
import { fireAutomationTrigger } from '../automations/index.mjs';
import {
  createClient,
  getClient,
  deleteClient,
  listClients,
} from '../../database/repositories/Clients.mjs';
import { countProofs } from '../../database/repositories/Proofs.mjs';
import { countOrders } from '../../database/repositories/Orders.mjs';
import {
  parseClientModal,
  resolveClientDiscordId,
  buildClientEmbed,
  buildClientViewComponents,
  buildDeleteConfirmPayload,
  buildSuccessPayload,
  buildErrorPayload,
} from './flow.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Roteador ──────────────────────────────────────────────────────────────────

export async function handleClientsComponent(interaction, action, partes) {
  const clientId = partes[0] ?? null;

  switch (action) {
    case 'modal_submit': return handleModalSubmit(interaction);
    case 'pick':         return handlePick(interaction);
    case 'view':         return handleView(interaction, clientId);
    case 'delete':       return handleDelete(interaction, clientId);
    case 'delete_ok':    return handleDeleteOk(interaction, clientId);
    default:
      logger.warn(`[Clients] Ação desconhecida: '${action}'`);
      await safeReply(interaction, '⚠️ Componente não reconhecido.');
  }
}

// ── Modal Submit ──────────────────────────────────────────────────────────────

async function handleModalSubmit(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply(buildErrorPayload('Este comando só pode ser usado em servidores.'));
      return;
    }

    const { name, discord, email, phone, notas } = parseClientModal(interaction);

    if (!name) {
      await interaction.editReply(buildErrorPayload('O campo **Nome** é obrigatório.'));
      return;
    }

    const discordId = resolveClientDiscordId(discord);

    let client;
    try {
      client = createClient(guildId, { displayName: name, discordId, email, phone, notas });
    } catch (err) {
      // UNIQUE constraint: discord_id já registrado
      if (err?.message?.includes('UNIQUE')) {
        await interaction.editReply(buildErrorPayload('Este usuário Discord já está registrado como cliente neste servidor.'));
        return;
      }
      throw err;
    }

    logger.info(`[Clients] Cliente criado | guild: ${guildId} | id: ${client.id} | nome: ${client.displayName}`);

    // Etapa 16: hook de automações — fire-and-forget
    fireAutomationTrigger('client_registered', {
      guildId,
      userId:   interaction.user.id,
      clientId: client.id,
      name:     client.displayName,
    }, interaction.client).catch(err => {
      logger.warn('[Clients] Automation hook error:', err?.message);
    });

    await interaction.editReply(buildSuccessPayload(client));

  } catch (err) {
    logger.error('[Clients] Erro em handleModalSubmit:', err);
    await safeEditReply(interaction, buildErrorPayload('Erro interno ao registrar o cliente.'));
  }
}

// ── Pick ──────────────────────────────────────────────────────────────────────

async function handlePick(interaction) {
  const clientId = interaction.values?.[0];
  if (!clientId) {
    await safeUpdate(interaction, { content: '⚠️ Nenhum cliente selecionado.', components: [], embeds: [] });
    return;
  }
  await handleView(interaction, clientId);
}

// ── View ──────────────────────────────────────────────────────────────────────

async function handleView(interaction, clientId) {
  const guildId = interaction.guildId;
  if (!clientId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Cliente inválido.', components: [], embeds: [] });
    return;
  }

  const client = getClient(guildId, clientId);
  if (!client) {
    await safeUpdate(interaction, { content: '⚠️ Cliente não encontrado.', components: [], embeds: [] });
    return;
  }

  // Calcula estatísticas do cliente (provas e pedidos vinculados ao discord_id)
  let stats = null;
  if (client.discordId) {
    try {
      // Filtra por vendor_id=discordId seria o vendedor; para o cliente,
      // precisamos de uma query por client_id. Mas os repos atuais filtram por
      // vendorId, não clientId. Vamos fazer um count direto.
      const { getDb } = await import('../../database/client.mjs');
      const db = getDb();
      const proofCount = db
        .prepare('SELECT COUNT(*) as total FROM proofs WHERE guild_id = ? AND client_id = ?')
        .get(guildId, client.discordId)?.total ?? 0;
      const orderCount = db
        .prepare('SELECT COUNT(*) as total FROM orders WHERE guild_id = ? AND client_id = ?')
        .get(guildId, client.discordId)?.total ?? 0;
      stats = { proofs: proofCount, orders: orderCount };
    } catch { /* estatísticas opcionais */ }
  }

  const embed      = buildClientEmbed(client, stats);
  const components = buildClientViewComponents(client);

  await safeUpdate(interaction, { embeds: [embed], components, flags: MessageFlags.Ephemeral });
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

async function handleDelete(interaction, clientId) {
  const guildId = interaction.guildId;
  if (!clientId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Cliente inválido.', components: [], embeds: [] });
    return;
  }

  const client = getClient(guildId, clientId);
  if (!client) {
    await safeUpdate(interaction, { content: '⚠️ Cliente não encontrado.', components: [], embeds: [] });
    return;
  }

  await safeUpdate(interaction, buildDeleteConfirmPayload(client));
}

// ── Delete OK ─────────────────────────────────────────────────────────────────

async function handleDeleteOk(interaction, clientId) {
  const guildId = interaction.guildId;
  if (!clientId || !guildId) {
    await safeUpdate(interaction, { content: '⚠️ Cliente inválido.', components: [], embeds: [] });
    return;
  }

  const deleted = deleteClient(guildId, clientId);
  if (!deleted) {
    await safeUpdate(interaction, { content: '⚠️ Cliente não encontrado ou já removido.', components: [], embeds: [] });
    return;
  }

  logger.info(`[Clients] Cliente removido | guild: ${guildId} | id: ${clientId}`);

  await safeUpdate(interaction, {
    content:    '✅ Cliente removido com sucesso.',
    embeds:     [],
    components: [],
    flags:      MessageFlags.Ephemeral,
  });
}

// ── Utilitários ───────────────────────────────────────────────────────────────

async function safeUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else if (typeof interaction.update === 'function') {
      await interaction.update(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch { /* expirada */ }
}

async function safeReply(interaction, content) {
  const payload = typeof content === 'string' ? { content, flags: MessageFlags.Ephemeral } : content;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch { /* expirada */ }
}

async function safeEditReply(interaction, content) {
  try { await interaction.editReply(content); }
  catch { await safeReply(interaction, content); }
}
