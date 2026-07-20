/**
 * Variáveis — Handler de componentes (namespace 'variaveis').
 *
 * Gerencia o fluxo visual de criação, edição e exclusão de variáveis
 * personalizadas de servidor.
 *
 * CustomIds tratados:
 *   variaveis:list            — volta à lista
 *   variaveis:new             — abre modal de criação
 *   variaveis:modal_create    — submit do modal de criação
 *   variaveis:pick            — seleciona variável no dropdown
 *   variaveis:view:{id}       — exibe detalhe
 *   variaveis:edit:{id}       — abre modal de edição
 *   variaveis:modal_edit:{id} — submit do modal de edição
 *   variaveis:delete:{id}     — pede confirmação de exclusão
 *   variaveis:delete_ok:{id}  — confirma e executa exclusão
 *   variaveis:cancel          — fecha o painel
 */

import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';
import {
  createServerVariable,
  getServerVariable,
  listServerVariables,
  updateServerVariable,
  deleteServerVariable,
  existsServerVariable,
} from '../../database/repositories/ServerVariables.mjs';
import {
  buildCreateModal,
  buildEditModal,
  buildListPayload,
  buildDetailPayload,
  buildDeletePayload,
  buildSuccessPayload,
  buildErrorPayload,
  validateName,
  validateValue,
  MODAL_CREATE_ID,
  MODAL_EDIT_ID,
} from './flow.mjs';

// ── Handler principal ─────────────────────────────────────────────────────────

/**
 * Handler central do namespace 'variaveis'.
 * Recebe (interaction, action, partes) do componentHandler.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} action
 * @param {string[]} partes
 */
export async function handleVariablesComponent(interaction, action, partes) {
  // Verifica permissão para todas as ações
  if (!hasModulePermission(interaction.member, interaction.guildId, 'variaveis')) {
    return safeReply(interaction, buildDeniedMessage('variaveis'));
  }

  switch (action) {
    case 'list':         return handleList(interaction);
    case 'new':          return handleNew(interaction);
    case 'modal_create': return handleModalCreate(interaction);
    case 'pick':         return handlePick(interaction);
    case 'view':         return handleView(interaction, partes[0]);
    case 'edit':         return handleEdit(interaction, partes[0]);
    case 'modal_edit':   return handleModalEdit(interaction, partes[0]);
    case 'delete':       return handleDelete(interaction, partes[0]);
    case 'delete_ok':    return handleDeleteOk(interaction, partes[0]);
    case 'cancel':       return handleCancel(interaction);
    default:
      logger.warn(`[Variables] Ação desconhecida: '${action}'`);
      return safeReply(interaction, buildErrorPayload('Ação não reconhecida.'));
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleList(interaction) {
  const variables = listServerVariables(interaction.guildId);
  const payload   = buildListPayload(variables);
  return safeUpdate(interaction, { ...payload, flags: MessageFlags.Ephemeral });
}

async function handleNew(interaction) {
  return interaction.showModal(buildCreateModal());
}

async function handleModalCreate(interaction) {
  const guildId = interaction.guildId;

  const rawName  = interaction.fields.getTextInputValue('name')?.trim() ?? '';
  const rawValue = interaction.fields.getTextInputValue('value')?.trim() ?? '';

  const nameErr  = validateName(rawName);
  if (nameErr) {
    return interaction.reply({ content: `❌ ${nameErr}`, flags: MessageFlags.Ephemeral });
  }

  const valueErr = validateValue(rawValue);
  if (valueErr) {
    return interaction.reply({ content: `❌ ${valueErr}`, flags: MessageFlags.Ephemeral });
  }

  // Normaliza para minúsculas (ex: "PIX" → "pix")
  const name = rawName.toLowerCase();

  if (existsServerVariable(guildId, name)) {
    return interaction.reply({
      content: `❌ Já existe uma variável chamada \`{${name}}\` neste servidor.\nUse "Editar" para alterar seu valor.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const variable = createServerVariable(guildId, { name, value: rawValue });
    logger.info(`[Variables] Variável criada: {${name}} no guild ${guildId}`);

    // Responde com detalhe da variável criada
    const payload = buildDetailPayload(variable);
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (err) {
    logger.error('[Variables] Erro ao criar variável:', err);
    return interaction.reply(buildErrorPayload('Não foi possível criar a variável.'));
  }
}

async function handlePick(interaction) {
  const id = interaction.values?.[0];
  if (!id) return safeReply(interaction, buildErrorPayload('Nenhuma variável selecionada.'));

  await interaction.deferUpdate();

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return interaction.followUp({ content: '⚠️ Variável não encontrada.', flags: MessageFlags.Ephemeral });
  }

  const payload = buildDetailPayload(variable);
  return interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
}

async function handleView(interaction, id) {
  if (!id) return safeReply(interaction, buildErrorPayload('ID não informado.'));

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return safeReply(interaction, buildErrorPayload('Variável não encontrada.'));
  }

  const payload = buildDetailPayload(variable);
  return safeUpdate(interaction, { ...payload, flags: MessageFlags.Ephemeral });
}

async function handleEdit(interaction, id) {
  if (!id) return safeReply(interaction, buildErrorPayload('ID não informado.'));

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return safeReply(interaction, buildErrorPayload('Variável não encontrada.'));
  }

  return interaction.showModal(buildEditModal(variable));
}

async function handleModalEdit(interaction, id) {
  if (!id) {
    return interaction.reply(buildErrorPayload('ID da variável não encontrado.'));
  }

  const rawValue = interaction.fields.getTextInputValue('value')?.trim() ?? '';

  const valueErr = validateValue(rawValue);
  if (valueErr) {
    return interaction.reply({ content: `❌ ${valueErr}`, flags: MessageFlags.Ephemeral });
  }

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return interaction.reply(buildErrorPayload('Variável não encontrada.'));
  }

  try {
    const updated = updateServerVariable(interaction.guildId, id, { value: rawValue });
    logger.info(`[Variables] Variável editada: {${variable.name}} no guild ${interaction.guildId}`);

    const payload = buildDetailPayload(updated);
    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (err) {
    logger.error('[Variables] Erro ao editar variável:', err);
    return interaction.reply(buildErrorPayload('Não foi possível salvar a alteração.'));
  }
}

async function handleDelete(interaction, id) {
  if (!id) return safeReply(interaction, buildErrorPayload('ID não informado.'));

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return safeReply(interaction, buildErrorPayload('Variável não encontrada.'));
  }

  const payload = buildDeletePayload(variable);
  return safeUpdate(interaction, { ...payload, flags: MessageFlags.Ephemeral });
}

async function handleDeleteOk(interaction, id) {
  if (!id) return safeReply(interaction, buildErrorPayload('ID não informado.'));

  const variable = getServerVariable(interaction.guildId, id);
  if (!variable) {
    return safeReply(interaction, buildErrorPayload('Variável não encontrada.'));
  }

  try {
    deleteServerVariable(interaction.guildId, id);
    logger.info(`[Variables] Variável excluída: {${variable.name}} no guild ${interaction.guildId}`);

    // Volta para a lista atualizada
    const variables = listServerVariables(interaction.guildId);
    const payload   = buildListPayload(variables);
    return safeUpdate(interaction, {
      ...payload,
      content: `✅ Variável \`{${variable.name}}\` excluída com sucesso.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[Variables] Erro ao excluir variável:', err);
    return safeReply(interaction, buildErrorPayload('Não foi possível excluir a variável.'));
  }
}

async function handleCancel(interaction) {
  try {
    await interaction.update({ embeds: [], components: [], content: '❌ Painel fechado.' });
  } catch {
    await safeReply(interaction, { content: '❌ Painel fechado.', flags: MessageFlags.Ephemeral });
  }
}

// ── Utilitários ───────────────────────────────────────────────────────────────

async function safeReply(interaction, payload) {
  const flags = MessageFlags.Ephemeral;
  const p     = typeof payload === 'string' ? { content: payload, flags } : payload;
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(p);
    } else {
      await interaction.reply(p);
    }
  } catch { /* expirada */ }
}

async function safeUpdate(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(payload);
    } else {
      await interaction.update(payload);
    }
  } catch {
    await safeReply(interaction, payload);
  }
}
