/**
 * Ações de Comandos Personalizados.
 *
 * Contém os handlers de interação para criação, edição e gerenciamento
 * de comandos personalizados.
 */

import { logger } from '../../utils/logger.mjs';
import {
  createCommand,
  updateCommand,
  deleteCommand,
  setCommandEnabled,
  getCommand,
  getCommandByName,
  listCommands,
  existsCommand,
  CONTENT_TYPES,
} from '../../database/repositories/CustomCommands.mjs';
import { CONTENT_TYPES as VAR_CONTENT_TYPES } from '../../database/repositories/ServerVariables.mjs';
import { hasModulePermission, buildDeniedMessage } from '../../database/repositories/Permissions.mjs';
import { resolveVariables, applyVariablesToEmbedData } from '../variables/index.mjs';
import { loadServerVariablesMap } from '../../database/repositories/ServerVariables.mjs';
import {
  buildCommandsListEmbed,
  buildCommandDetailEmbed,
  buildCreateModal,
  buildEditModal,
  buildListButtons,
  buildDetailButtons,
  buildCommandSelectMenu,
  validateName,
  validateDescription,
  validateTextContent,
} from './flow.mjs';

// ── Auditoria ─────────────────────────────────────────────────────────────────

const AUDIT_MODULE = 'comandos';

async function logAudit(guildId, actorId, action, entityId, details, result = 'success') {
  try {
    const { logAction } = await import('../../database/repositories/AuditLog.mjs');
    await logAction({
      guildId,
      actorId,
      module: AUDIT_MODULE,
      action,
      entity: 'command',
      entityId,
      details,
      result,
    });
  } catch (err) {
    logger.warn('[CustomCommands] Falha ao registrar auditoria:', err?.message);
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

/**
 * Handler principal para componentes de comandos.
 *
 * @param {import('discord.js').ComponentInteraction} interaction
 */
export async function handleCustomCommandsComponent(interaction) {
  const guildId = interaction.guildId;
  const [namespace, action, ...rest] = interaction.customId.split(':');

  if (namespace !== 'comandos') return;

  // Verifica permissão do módulo
  if (!hasModulePermission(interaction.member, guildId, AUDIT_MODULE)) {
    await interaction.reply({
      content: buildDeniedMessage(AUDIT_MODULE),
      ephemeral: true,
    });
    return;
  }

  try {
    switch (action) {
      case 'list':
        await showCommandList(interaction);
        break;
      case 'create':
        await showCreateModal(interaction);
        break;
      case 'modal_create':
        await handleCreateSubmit(interaction);
        break;
      case 'select':
        await handleSelect(interaction);
        break;
      case 'detail':
        await showCommandDetail(interaction, rest[0]);
        break;
      case 'edit':
        await showEditModal(interaction, rest[0]);
        break;
      case 'modal_edit':
        await handleEditSubmit(interaction, rest[0]);
        break;
      case 'toggle':
        await handleToggle(interaction, rest[0]);
        break;
      case 'delete':
        await handleDelete(interaction, rest[0]);
        break;
      case 'back':
        await showCommandList(interaction);
        break;
      case 'refresh':
        await showCommandList(interaction);
        break;
      default:
        logger.warn(`[CustomCommands] Ação desconhecida: ${action}`);
    }
  } catch (err) {
    logger.error('[CustomCommands] Erro no handler:', err);
    if (interaction.deferred) {
      await interaction.editReply({ content: '❌ Ocorreu um erro ao processar sua solicitação.' });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua solicitação.', ephemeral: true });
    }
  }
}

// ── Listagem ──────────────────────────────────────────────────────────────────

async function showCommandList(interaction) {
  const guildId   = interaction.guildId;
  const guildName = interaction.guild?.name;

  const commands = listCommands(guildId);

  // Se só um comando, mostra diretamente
  if (commands.length === 1) {
    return showCommandDetail(interaction, commands[0].id);
  }

  // Se nenhum comando, mostra lista vazia com botão de criar
  if (commands.length === 0) {
    const embed = buildCommandsListEmbed([], guildName);
    const buttons = await buildListButtons();

    if (interaction.deferred) {
      await interaction.editReply({ ...embed, components: [buttons] });
    } else {
      await interaction.reply({ ...embed, components: [buttons], ephemeral: true });
    }
    return;
  }

  // Se 2+ comandos, mostra seletor
  const selectMenu = await buildCommandSelectMenu(commands);
  const embed     = buildCommandsListEmbed(commands, guildName);
  const buttons   = await buildListButtons();

  // Se já existe um menu, atualiza
  if (interaction.message?.components?.length > 0) {
    await interaction.update({
      ...embed,
      components: [selectMenu, buttons],
    });
  } else {
    if (interaction.deferred) {
      await interaction.editReply({ ...embed, components: [selectMenu, buttons] });
    } else {
      await interaction.reply({ ...embed, components: [selectMenu, buttons], ephemeral: true });
    }
  }
}

async function showCommandDetail(interaction, commandId) {
  const guildId   = interaction.guildId;
  const guildName = interaction.guild?.name;

  const command = getCommand(guildId, commandId);
  if (!command) {
    await interaction.reply({ content: '❌ Comando não encontrado.', ephemeral: true });
    return;
  }

  const embed   = buildCommandDetailEmbed(command, guildName);
  const buttons = await buildDetailButtons(command);

  if (interaction.deferred) {
    await interaction.editReply({ ...embed, components: buttons });
  } else {
    await interaction.reply({ ...embed, components: buttons, ephemeral: true });
  }
}

async function handleSelect(interaction) {
  const commandId = interaction.values[0];
  await showCommandDetail(interaction, commandId);
}

// ── Criação ───────────────────────────────────────────────────────────────────

async function showCreateModal(interaction) {
  const modal = await buildCreateModal();
  await interaction.showModal(modal);
}

async function handleCreateSubmit(interaction) {
  const guildId = interaction.guildId;
  const actorId = interaction.user.id;

  const name        = interaction.fields.getTextInputValue('comandos:name').trim();
  const description = interaction.fields.getTextInputValue('comandos:description')?.trim() || null;
  const content      = interaction.fields.getTextInputValue('comandos:content').trim();

  // Validações
  const nameError = validateName(name);
  if (nameError) {
    await interaction.reply({ content: `❌ ${nameError}`, ephemeral: true });
    return;
  }

  const descError = validateDescription(description);
  if (descError) {
    await interaction.reply({ content: `❌ ${descError}`, ephemeral: true });
    return;
  }

  const contentError = validateTextContent(content);
  if (contentError) {
    await interaction.reply({ content: `❌ ${contentError}`, ephemeral: true });
    return;
  }

  // Verifica se nome já existe
  if (existsCommand(guildId, name)) {
    await interaction.reply({
      content: `❌ Já existe um comando chamado **${name}** neste servidor.`,
      ephemeral: true,
    });
    return;
  }

  try {
    const command = createCommand(guildId, {
      name,
      description,
      contentType: CONTENT_TYPES.TEXT,
      contentData: { text: content },
    });

    await logAudit(guildId, actorId, 'command_created', command.id, `Comando "${name}" criado`);

    const embed   = buildCommandDetailEmbed(command, interaction.guild?.name);
    const buttons = await buildDetailButtons(command);

    await interaction.reply({
      content: '✅ Comando criado com sucesso!',
      ...embed,
      components: buttons,
      ephemeral: true,
    });
  } catch (err) {
    logger.error('[CustomCommands] Erro ao criar comando:', err);
    await interaction.reply({ content: '❌ Erro ao criar o comando.', ephemeral: true });
  }
}

// ── Edição ────────────────────────────────────────────────────────────────────

async function showEditModal(interaction, commandId) {
  const guildId = interaction.guildId;

  const command = getCommand(guildId, commandId);
  if (!command) {
    await interaction.reply({ content: '❌ Comando não encontrado.', ephemeral: true });
    return;
  }

  const modal = await buildEditModal(command);
  await interaction.showModal(modal);
}

async function handleEditSubmit(interaction, commandId) {
  const guildId = interaction.guildId;
  const actorId = interaction.user.id;

  const name        = interaction.fields.getTextInputValue('comandos:name').trim();
  const description = interaction.fields.getTextInputValue('comandos:description')?.trim() || null;
  const content      = interaction.fields.getTextInputValue('comandos:content').trim();

  // Validações
  const nameError = validateName(name);
  if (nameError) {
    await interaction.reply({ content: `❌ ${nameError}`, ephemeral: true });
    return;
  }

  const descError = validateDescription(description);
  if (descError) {
    await interaction.reply({ content: `❌ ${descError}`, ephemeral: true });
    return;
  }

  const contentError = validateTextContent(content);
  if (contentError) {
    await interaction.reply({ content: `❌ ${contentError}`, ephemeral: true });
    return;
  }

  // Verifica se nome já existe (exceto se for o mesmo)
  const existing = getCommandByName(guildId, name);
  if (existing && existing.id !== commandId) {
    await interaction.reply({
      content: `❌ Já existe um comando chamado **${name}** neste servidor.`,
      ephemeral: true,
    });
    return;
  }

  try {
    const command = updateCommand(guildId, commandId, {
      name,
      description,
      contentType: CONTENT_TYPES.TEXT,
      contentData: { text: content },
    });

    await logAudit(guildId, actorId, 'command_edited', command.id, `Comando "${name}" editado`);

    const embed   = buildCommandDetailEmbed(command, interaction.guild?.name);
    const buttons = await buildDetailButtons(command);

    await interaction.reply({
      content: '✅ Comando atualizado com sucesso!',
      ...embed,
      components: buttons,
      ephemeral: true,
    });
  } catch (err) {
    logger.error('[CustomCommands] Erro ao editar comando:', err);
    await interaction.reply({ content: '❌ Erro ao editar o comando.', ephemeral: true });
  }
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

async function handleToggle(interaction, commandId) {
  const guildId = interaction.guildId;
  const actorId = interaction.user.id;

  const command = getCommand(guildId, commandId);
  if (!command) {
    await interaction.reply({ content: '❌ Comando não encontrado.', ephemeral: true });
    return;
  }

  const newEnabled = !command.enabled;

  const updated = setCommandEnabled(guildId, commandId, newEnabled);

  if (!updated) {
    await interaction.reply({ content: '❌ Erro ao atualizar o comando.', ephemeral: true });
    return;
  }

  await logAudit(
    guildId,
    actorId,
    newEnabled ? 'command_enabled' : 'command_disabled',
    commandId,
    `Comando "${command.name}" ${newEnabled ? 'ativado' : 'desativado'}`,
  );

  const embed   = buildCommandDetailEmbed(updated, interaction.guild?.name);
  const buttons = await buildDetailButtons(updated);

  await interaction.reply({
    content: newEnabled ? '✅ Comando ativado!' : '⏸️ Comando desativado!',
    ...embed,
    components: buttons,
    ephemeral: true,
  });
}

// ── Exclusão ───────────────────────────────────────────────────────────────────

async function handleDelete(interaction, commandId) {
  const guildId = interaction.guildId;
  const actorId = interaction.user.id;

  const command = getCommand(guildId, commandId);
  if (!command) {
    await interaction.reply({ content: '❌ Comando não encontrado.', ephemeral: true });
    return;
  }

  // Confirmação
  const confirmId = `comandos:confirm_delete:${commandId}`;

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('⚠️ Confirmar Exclusão')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('comandos:back')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: `⚠️ Tem certeza que deseja excluir o comando **${command.name}**? Esta ação não pode ser desfeita.`,
    components: [row],
    ephemeral: true,
  });
}

/**
 * Confirma exclusão de comando.
 * Chamado pelo component handler quando o ID começa com "comandos:confirm_delete:".
 *
 * @param {import('discord.js').ComponentInteraction} interaction
 */
export async function handleDeleteConfirm(interaction) {
  const guildId = interaction.guildId;
  const actorId = interaction.user.id;

  const parts   = interaction.customId.split(':');
  const commandId = parts[2];

  const command = getCommand(guildId, commandId);
  if (!command) {
    await interaction.update({
      content: '❌ Comando não encontrado.',
      components: [],
    });
    return;
  }

  const deleted = deleteCommand(guildId, commandId);

  if (!deleted) {
    await interaction.update({
      content: '❌ Erro ao excluir o comando.',
      components: [],
    });
    return;
  }

  await logAudit(guildId, actorId, 'command_deleted', commandId, `Comando "${command.name}" excluído`);

  const commands = listCommands(guildId);
  const embed    = buildCommandsListEmbed(commands, interaction.guild?.name);
  const buttons  = await buildListButtons();

  await interaction.update({
    content: `✅ Comando **${command.name}** excluído com sucesso!`,
    ...embed,
    components: [buttons],
  });
}
