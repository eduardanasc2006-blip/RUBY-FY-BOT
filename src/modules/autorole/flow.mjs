/**
 * Módulo de Auto Roles — Lógica de UI (Fase 4).
 *
 * Constrói as interfaces visuais para gerenciamento de cargos automáticos:
 *   - buildAutoRoleListEmbed — lista de cargos configurados
 *   - buildAutoRoleConfirmRemove — confirmação de remoção
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';
import {
  listAutoRoles,
  addAutoRole,
  removeAutoRole,
  toggleAutoRole,
  updateAutoRole,
} from '../../database/repositories/AutoRoles.mjs';

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Constrói o embed principal com a lista de cargos automáticos.
 *
 * @param {string} guildId
 * @param {string} guildName
 * @returns {EmbedBuilder}
 */
export function buildAutoRoleListEmbed(guildId, guildName) {
  const roles = listAutoRoles(guildId);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ Gerenciar Cargos Automáticos')
    .setDescription(`Configure cargos que serão atribuídos automaticamente quando novos membros entrarem no servidor **${guildName}**.`)
    .addFields({
      name: 'ℹ️ Como funciona',
      value: 'Quando um novo membro entrar no servidor, os cargos automáticos ativos serão atribuídos em ordem de prioridade.\n\n**Prioridade**: número menor = executa primeiro.',
    });

  if (roles.length === 0) {
    embed.addFields({
      name: '📋 Cargos configurados',
      value: '*Nenhum cargo automático configurado.*\n\nUse o botão abaixo para adicionar.',
      inline: false,
    });
  } else {
    const active   = roles.filter(r => r.enabled);
    const inactive = roles.filter(r => !r.enabled);

    if (active.length > 0) {
      const activeList = active.map(r => {
        const roleName = getRoleNameSafe(guildId, r.roleId);
        return `🔹 <@&${r.roleId}> — Prioridade: **${r.priority}**`;
      }).join('\n');
      embed.addFields({ name: `🟢 Ativos (${active.length})`, value: activeList, inline: false });
    }

    if (inactive.length > 0) {
      const inactiveList = inactive.map(r => {
        const roleName = getRoleNameSafe(guildId, r.roleId);
        return `⚫ <@&${r.roleId}> — Prioridade: **${r.priority}**`;
      }).join('\n');
      embed.addFields({ name: `⚪ Inativos (${inactive.length})`, value: inactiveList, inline: false });
    }
  }

  embed.setFooter({ text: `Total: ${roles.length} cargo(s) automático(s)` });

  return embed;
}

/**
 * Constrói o embed de confirmação de remoção.
 *
 * @param {object} autoRole
 * @returns {EmbedBuilder}
 */
export function buildAutoRoleConfirmRemove(autoRole) {
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar Remoção')
    .setDescription(`Deseja realmente remover o cargo automático <@&${autoRole.roleId}>?\n\nEste cargo não será mais atribuído automaticamente a novos membros.`);

  return embed;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Processa a ação de listar/adicionar auto roles.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function openAutoRoleManager(interaction) {
  const guildId   = interaction.guildId;
  const guildName = interaction.guild?.name ?? 'Servidor';

  if (!guildId) {
    return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores.', flags: 64 });
  }

  const payload = buildAutoRoleManagerPayload(guildId, guildName);

  if (interaction.deferred) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

/**
 * Constrói o payload completo para o gerenciador de auto roles.
 *
 * @param {string} guildId
 * @param {string} guildName
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildAutoRoleManagerPayload(guildId, guildName) {
  const embed     = buildAutoRoleListEmbed(guildId, guildName);
  const components = buildAutoRoleManagerComponents(guildId);

  return { embeds: [embed], components };
}

/**
 * Constrói os componentes do gerenciador.
 *
 * @param {string} guildId
 * @returns {ActionRowBuilder[]}
 */
export function buildAutoRoleManagerComponents(guildId) {
  const roles = listAutoRoles(guildId);

  const components = [];

  // Row 1: Selecionar cargo para gerenciar
  if (roles.length > 0) {
    const roleOptions = roles.map(r => ({
      label: getRoleNameSafe(guildId, r.roleId).slice(0, 100),
      value: r.id,
      description: r.enabled ? `Prioridade: ${r.priority}` : `Prioridade: ${r.priority} (inativo)`,
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(build('ar', 'select', guildId))
        .setPlaceholder('Selecione um cargo para gerenciar...')
        .addOptions(roleOptions.slice(0, 25)),
    );
    components.push(selectRow);
  }

  // Row 2: Botões de ação
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('ar', 'add', guildId))
      .setLabel('➕ Adicionar Cargo')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(build('ar', 'refresh', guildId))
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Secondary),
  );
  components.push(actionRow);

  return components;
}

/**
 * Constrói os componentes de gestão de um cargo específico.
 *
 * @param {string} guildId
 * @param {string} roleId
 * @param {object} autoRole
 * @returns {ActionRowBuilder[]}
 */
export function buildAutoRoleManageComponents(guildId, roleId, autoRole) {
  const components = [];

  // Row 1: Toggle
  const toggleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('ar', 'toggle', autoRole.id))
      .setLabel(autoRole.enabled ? '🔒 Desativar' : '🔓 Ativar')
      .setStyle(autoRole.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  components.push(toggleRow);

  // Row 2: Prioridade
  const priorityRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('ar', 'priority_up', autoRole.id))
      .setLabel('⬆️ Subir Prioridade')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('ar', 'priority_down', autoRole.id))
      .setLabel('⬇️ Descer Prioridade')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(build('ar', 'remove_confirm', autoRole.id))
      .setLabel('🗑️ Remover')
      .setStyle(ButtonStyle.Danger),
  );
  components.push(priorityRow);

  // Row 3: Voltar
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('ar', 'back', guildId))
      .setLabel('← Voltar')
      .setStyle(ButtonStyle.Secondary),
  );
  components.push(backRow);

  return components;
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Obtém o nome do cargo de forma segura.
 *
 * @param {string} guildId
 * @param {string} roleId
 * @returns {string}
 */
function getRoleNameSafe(guildId, roleId) {
  try {
    const guild = globalThis.client?.guilds?.cache?.get(guildId);
    const role  = guild?.roles?.cache?.get(roleId);
    return role?.name ?? `Cargo ${roleId}`;
  } catch {
    return `Cargo ${roleId}`;
  }
}

/**
 * Handler de ações de componentes (button/select).
 *
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {string} action
 * @param {string[]} partes
 */
export async function handleAutoRoleComponent(interaction, action, partes) {
  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores.', flags: 64 });
  }

  const guildName = interaction.guild?.name ?? 'Servidor';

  try {
    switch (action) {
      case 'add':
        return await handleAddRole(interaction, guildId, guildName);

      case 'select':
        return await handleSelectRole(interaction, guildId, guildName, partes[0]);

      case 'toggle':
        return await handleToggleRole(interaction, guildId, guildName, partes[0]);

      case 'remove_confirm':
        return await handleRemoveConfirm(interaction, guildId, guildName, partes[0]);

      case 'remove':
        return await handleRemoveRole(interaction, guildId, guildName, partes[0]);

      case 'priority_up':
        return await handlePriorityChange(interaction, guildId, guildName, partes[0], -10);

      case 'priority_down':
        return await handlePriorityChange(interaction, guildId, guildName, partes[0], 10);

      case 'refresh':
      case 'back':
        return await handleBackToList(interaction, guildId, guildName);

      default:
        return interaction.reply({ content: '⚠️ Ação não reconhecida.', flags: 64 });
    }
  } catch (err) {
    const { logger } = await import('../../utils/logger.mjs');
    logger.error('[AutoRole] Erro ao processar ação:', err);
    return interaction.reply({ content: '❌ Ocorreu um erro ao processar sua solicitação.', flags: 64 });
  }
}

// ── Handlers de Ação ──────────────────────────────────────────────────────────

async function handleAddRole(interaction, guildId, guildName) {
  // Modal para adicionar cargo
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(build('ar', 'modal_add', guildId))
    .setTitle('Adicionar Cargo Automático');

  const roleIdInput = new TextInputBuilder()
    .setCustomId('role_id')
    .setLabel('ID do Cargo')
    .setPlaceholder('Cole aqui o ID do cargo')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const priorityInput = new TextInputBuilder()
    .setCustomId('priority')
    .setLabel('Prioridade (opcional)')
    .setPlaceholder('100 = padrão (menor = executa primeiro)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(roleIdInput),
    new ActionRowBuilder().addComponents(priorityInput),
  );

  return interaction.showModal(modal);
}

async function handleSelectRole(interaction, guildId, guildName, roleId) {
  const { getAutoRole } = await import('../../database/repositories/AutoRoles.mjs');
  const autoRole = getAutoRole(guildId, roleId);

  if (!autoRole) {
    return interaction.reply({ content: '⚠️ Cargo automático não encontrado.', flags: 64 });
  }

  const roleName = getRoleNameSafe(guildId, autoRole.roleId);
  const statusEmoji = autoRole.enabled ? '🟢' : '⚫';
  const statusText  = autoRole.enabled ? 'Ativo' : 'Inativo';

  const embed = new EmbedBuilder()
    .setColor(autoRole.enabled ? 0x57F287 : 0x747E8D)
    .setTitle(`${statusEmoji} ${roleName}`)
    .addFields(
      { name: '📊 Status',    value: statusText,                           inline: true },
      { name: '🔢 Prioridade', value: String(autoRole.priority),             inline: true },
      { name: '🆔 Role ID',   value: autoRole.roleId,                      inline: false },
    )
    .setTimestamp();

  const components = buildAutoRoleManageComponents(guildId, autoRole.roleId, autoRole);

  return interaction.reply({ embeds: [embed], components, flags: 64 });
}

async function handleToggleRole(interaction, guildId, guildName, roleId) {
  const { toggleAutoRole } = await import('../../database/repositories/AutoRoles.mjs');

  const autoRole = toggleAutoRole(guildId, roleId);
  if (!autoRole) {
    return interaction.reply({ content: '⚠️ Cargo automático não encontrado.', flags: 64 });
  }

  // Log de auditoria
  await logAutoRoleAudit(interaction, autoRole.enabled ? 'auto_role_enabled' : 'auto_role_disabled', autoRole);

  const statusText = autoRole.enabled ? 'ativado' : 'desativado';
  return interaction.reply({ content: `✅ Cargo automático ${statusText}!`, flags: 64 });
}

async function handleRemoveConfirm(interaction, guildId, guildName, roleId) {
  const { getAutoRole } = await import('../../database/repositories/AutoRoles.mjs');
  const autoRole = getAutoRole(guildId, roleId);

  if (!autoRole) {
    return interaction.reply({ content: '⚠️ Cargo automático não encontrado.', flags: 64 });
  }

  const roleName = getRoleNameSafe(guildId, autoRole.roleId);

  const embed = buildAutoRoleConfirmRemove(autoRole);

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('ar', 'remove', roleId))
      .setLabel('🗑️ Confirmar Remoção')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(build('ar', 'back', guildId))
      .setLabel('← Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  return interaction.reply({ embeds: [embed], components: [confirmRow], flags: 64 });
}

async function handleRemoveRole(interaction, guildId, guildName, roleId) {
  const { getAutoRole, removeAutoRole } = await import('../../database/repositories/AutoRoles.mjs');

  const autoRole = getAutoRole(guildId, roleId);
  if (!autoRole) {
    return interaction.reply({ content: '⚠️ Cargo automático não encontrado.', flags: 64 });
  }

  // Log de auditoria antes de remover
  await logAutoRoleAudit(interaction, 'auto_role_deleted', autoRole);

  removeAutoRole(guildId, roleId);

  return interaction.update({
    content: `✅ Cargo automático removido!`,
    embeds: [],
    components: [],
  }).catch(() => {
    return interaction.reply({ content: `✅ Cargo automático removido!`, flags: 64 });
  });
}

async function handlePriorityChange(interaction, guildId, guildName, roleId, delta) {
  const { getAutoRole, updateAutoRole } = await import('../../database/repositories/AutoRoles.mjs');

  const autoRole = getAutoRole(guildId, roleId);
  if (!autoRole) {
    return interaction.reply({ content: '⚠️ Cargo automático não encontrado.', flags: 64 });
  }

  const newPriority = Math.max(0, autoRole.priority + delta);
  updateAutoRole(guildId, roleId, { priority: newPriority });

  await logAutoRoleAudit(interaction, 'auto_role_priority_changed', { ...autoRole, priority: newPriority });

  // Refresh
  return handleSelectRole(interaction, guildId, guildName, roleId);
}

async function handleBackToList(interaction, guildId, guildName) {
  const payload = buildAutoRoleManagerPayload(guildId, guildName);
  return interaction.update(payload).catch(() => {
    return interaction.reply(payload);
  });
}

// ── Auditoria ─────────────────────────────────────────────────────────────────

/**
 * Registra ação no audit log.
 *
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {string} action
 * @param {object} autoRole
 */
async function logAutoRoleAudit(interaction, action, autoRole) {
  try {
    const { logAudit } = await import('../../database/repositories/AuditLog.mjs');
    const roleName = getRoleNameSafe(interaction.guildId, autoRole.roleId);

    logAudit({
      guildId: interaction.guildId,
      actorId: interaction.user.id,
      module: 'autorole',
      action,
      entity: 'auto_role',
      entityId: autoRole.id,
      result: 'success',
      details: {
        roleId: autoRole.roleId,
        roleName,
        priority: autoRole.priority,
        enabled: autoRole.enabled,
      },
      source: 'admin',
    });
  } catch (err) {
    // Falha silenciosa
  }
}
