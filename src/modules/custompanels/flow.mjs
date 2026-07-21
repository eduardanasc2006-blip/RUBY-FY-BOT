/**
 * Sistema de Painéis Personalizados — Lógica central (Etapa 17A + Fase 3).
 *
 * Funções reutilizadas pelo handler de componentes e pelo comando /paineis.
 *
 * Responsabilidades:
 *   - buildPanelEmbed         — embed de preview/publicado
 *   - buildPublishedPayload   — mensagem completa com embed + botões publicados
 *   - buildEditorPayload      — painel de edição (ephemeral, para admins)
 *   - evaluateButtonAction    — executa a ação de um botão clicado
 *   - validateActionData      — valida dados de uma ação antes de salvar
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { build } from '../../utils/customId.mjs';
import {
  listButtons,
  countButtons,
  MAX_BUTTONS,
  VALID_ACTION_TYPES,
  VALID_STYLES,
} from '../../database/repositories/CustomPanels.mjs';
import { logger } from '../../utils/logger.mjs';
import {
  checkBotManageRolesPermission,
  validateRole,
  safeAddRole,
  safeRemoveRole,
  ERROR_MESSAGES,
} from './botValidator.mjs';

// ── Mapa de estilos ───────────────────────────────────────────────────────────

const STYLE_MAP = {
  Primary:   ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success:   ButtonStyle.Success,
  Danger:    ButtonStyle.Danger,
};

// ── buildPanelEmbed ───────────────────────────────────────────────────────────

/**
 * Constrói o EmbedBuilder a partir dos dados do painel.
 *
 * @param {object} panel — objeto normalizado do repositório
 * @returns {import('discord.js').EmbedBuilder}
 */
export function buildPanelEmbed(panel) {
  const embed = new EmbedBuilder();

  // Cor — aceita hex (#RRGGBB) ou número
  try {
    if (panel.embedColor) embed.setColor(panel.embedColor);
  } catch { embed.setColor('#5865F2'); }

  if (panel.embedTitle)       embed.setTitle(panel.embedTitle.slice(0, 256));
  if (panel.embedDescription) embed.setDescription(panel.embedDescription.slice(0, 4096));
  if (panel.embedThumbnail)   { try { embed.setThumbnail(panel.embedThumbnail); } catch { /* ignorado */ } }
  if (panel.embedImage)       { try { embed.setImage(panel.embedImage); } catch { /* ignorado */ } }
  if (panel.embedFooter)      embed.setFooter({ text: panel.embedFooter.slice(0, 2048) });

  // Fallback: sem título e sem descrição
  if (!panel.embedTitle && !panel.embedDescription) {
    embed.setDescription('*Painel sem descrição configurada.*');
  }

  return embed;
}

// ── buildPublishedPayload ─────────────────────────────────────────────────────

/**
 * Constrói o payload completo (embeds + components) para publicação do painel.
 * Os botões têm customId `cpnlb:click:<panelId>:<buttonId>`.
 *
 * @param {object} panel — objeto normalizado do repositório
 * @param {string} guildId
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildPublishedPayload(panel, guildId) {
  const embed   = buildPanelEmbed(panel);
  const buttons = listButtons(guildId, panel.id);

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const slice = buttons.slice(i, i + 5);
    const row   = new ActionRowBuilder();
    for (const btn of slice) {
      const b = new ButtonBuilder()
        .setCustomId(build('cpnlb', 'click', panel.id, btn.id))
        .setLabel(btn.label)
        .setStyle(STYLE_MAP[btn.style] ?? ButtonStyle.Primary);
      if (btn.emoji) { try { b.setEmoji(btn.emoji); } catch { /* ignorado */ } }
      row.addComponents(b);
    }
    rows.push(row);
  }

  return { embeds: [embed], components: rows };
}

// ── buildEditorPayload ────────────────────────────────────────────────────────

/**
 * Constrói o painel de edição (ephemeral) mostrando detalhes e botões de ação.
 *
 * @param {string} sessionId
 * @param {object} panel
 * @param {string} guildId
 * @returns {{ content: string|null, embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function buildEditorPayload(sessionId, panel, guildId) {
  const buttons      = listButtons(guildId, panel.id);
  const buttonCount  = buttons.length;
  const statusEmoji  = panel.status === 'published' ? '🟢' : '⚫';
  const statusLabel  = panel.status === 'published' ? 'Publicado' : 'Rascunho';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`✏️ Painel: ${panel.name}`)
    .addFields(
      { name: '📊 Status',   value: `${statusEmoji} ${statusLabel}`,       inline: true },
      { name: '🔘 Botões',   value: `${buttonCount}/${MAX_BUTTONS}`,        inline: true },
      { name: '🎨 Cor',      value: panel.embedColor ?? '#5865F2',          inline: true },
      { name: '📝 Título',   value: panel.embedTitle        ?? '*(sem título)*',       inline: false },
      { name: '📄 Descrição',value: (panel.embedDescription ?? '*(sem descrição)*').slice(0, 200), inline: false },
    );

  if (panel.status === 'published' && panel.channelId) {
    embed.addFields({ name: '📢 Canal',  value: `<#${panel.channelId}>`, inline: true });
  }

  // Lista de botões configurados
  if (buttons.length > 0) {
    const btnList = buttons.map((b, i) => `**${i + 1}.** ${b.label} (${b.actionType})`).join('\n');
    embed.addFields({ name: '🔘 Botões configurados', value: btnList.slice(0, 1024), inline: false });
  }

  // Botões de ação do editor
  const canAdd = buttonCount < MAX_BUTTONS;
  const row1   = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'edit_embed', sessionId, panel.id))
      .setLabel('✏️ Editar Embed')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'add_btn', panel.id))
      .setLabel('➕ Adicionar Botão')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canAdd),
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'publish', panel.id))
      .setLabel('📢 Publicar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(buttonCount === 0),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'delete', panel.id))
      .setLabel('🗑️ Excluir Painel')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(build('cpnl', 'back', sessionId))
      .setLabel('← Voltar')
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [row1, row2];

  // Botões de remoção de botões (se existirem)
  if (buttons.length > 0) {
    const delBtns = buttons.slice(0, 5).map(b =>
      new ButtonBuilder()
        .setCustomId(build('cpnl', 'del_btn', panel.id, b.id))
        .setLabel(`🗑 ${b.label.slice(0, 15)}`)
        .setStyle(ButtonStyle.Danger),
    );
    components.splice(1, 0, new ActionRowBuilder().addComponents(delBtns));
  }

  return { content: null, embeds: [embed], components };
}

// ── evaluateButtonAction ──────────────────────────────────────────────────────

/**
 * Executa a ação associada a um botão publicado.
 * SEGURANÇA: nenhuma ação executa código arbitrário (sem eval / Function).
 *
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {object} button — objeto normalizado do repositório
 * @returns {Promise<void>}
 */
export async function evaluateButtonAction(interaction, button) {
  const { actionType, actionData } = button;

  try {
    switch (actionType) {
      case 'message':
        return await handleMessageAction(interaction, actionData);
      case 'give_role':
        return await handleGiveRole(interaction, actionData);
      case 'take_role':
        return await handleTakeRole(interaction, actionData);
      case 'toggle_role':
        return await handleToggleRole(interaction, actionData);
      case 'open_ticket':
        return await handleOpenTicket(interaction);
      case 'execute_connection':
        return await handleExecuteConnection(interaction, actionData);
      default:
        return safeReply(interaction, `⚠️ Ação não suportada: \`${actionType}\``);
    }
  } catch (err) {
    logger.error(`[CustomPanels] Erro ao executar ação "${actionType}":`, err?.message);
    return safeReply(interaction, '❌ Ocorreu um erro ao executar esta ação.');
  }
}

// ── Handlers de ação ──────────────────────────────────────────────────────────

async function handleMessageAction(interaction, data) {
  const content = data?.content?.slice(0, 2000) || '*(sem mensagem configurada)*';
  return safeReply(interaction, content, true);
}

async function handleGiveRole(interaction, data) {
  const roleId = data?.role_id;
  if (!roleId) return safeReply(interaction, '⚠️ Cargo não configurado neste botão.', true);

  const guild = interaction.guild;
  const member = interaction.member;
  const botMember = guild?.members?.me;
  const role = guild?.roles?.cache?.get(roleId);

  // 1. Verifica se o bot tem permissão Manage Roles
  const permissionCheck = checkBotManageRolesPermission(guild);
  if (!permissionCheck.hasPermission) {
    await logRoleAction(interaction, 'role_give_failed', roleId, role?.name, 'error', permissionCheck.reason);
    return safeReply(interaction, ERROR_MESSAGES.BOT_NO_PERMISSION, true);
  }

  // 2. Valida o cargo
  const roleCheck = validateRole(role, botMember);
  if (!roleCheck.valid) {
    await logRoleAction(interaction, 'role_give_failed', roleId, role?.name, 'error', roleCheck.reason);
    if (roleCheck.reason?.includes('hierarquia')) {
      return safeReply(interaction, ERROR_MESSAGES.BOT_ROLE_NOT_MANAGEABLE, true);
    }
    return safeReply(interaction, ERROR_MESSAGES.ROLE_NOT_FOUND, true);
  }

  // 3. Verifica se o membro já tem o cargo
  if (member?.roles?.cache?.has(roleId)) {
    await logRoleAction(interaction, 'role_give_skipped', roleId, role.name, 'skipped', 'Already has role');
    return safeReply(interaction, ERROR_MESSAGES.MEMBER_ALREADY_HAS_ROLE, true);
  }

  // 4. Executa a ação
  const result = await safeAddRole(member, role);
  if (!result.success) {
    await logRoleAction(interaction, 'role_give_failed', roleId, role.name, 'error', result.reason);
    return safeReply(interaction, ERROR_MESSAGES.ERROR_ADD(role.name), true);
  }

  // 5. Sucesso
  await logRoleAction(interaction, 'role_give_success', roleId, role.name, 'success');
  return safeReply(interaction, ERROR_MESSAGES.SUCCESS_GIVE(role.name), true);
}

async function handleTakeRole(interaction, data) {
  const roleId = data?.role_id;
  if (!roleId) return safeReply(interaction, '⚠️ Cargo não configurado neste botão.', true);

  const guild = interaction.guild;
  const member = interaction.member;
  const botMember = guild?.members?.me;
  const role = guild?.roles?.cache?.get(roleId);

  // 1. Verifica se o bot tem permissão Manage Roles
  const permissionCheck = checkBotManageRolesPermission(guild);
  if (!permissionCheck.hasPermission) {
    await logRoleAction(interaction, 'role_take_failed', roleId, role?.name, 'error', permissionCheck.reason);
    return safeReply(interaction, ERROR_MESSAGES.BOT_NO_PERMISSION, true);
  }

  // 2. Valida o cargo
  const roleCheck = validateRole(role, botMember);
  if (!roleCheck.valid) {
    await logRoleAction(interaction, 'role_take_failed', roleId, role?.name, 'error', roleCheck.reason);
    if (roleCheck.reason?.includes('hierarquia')) {
      return safeReply(interaction, ERROR_MESSAGES.BOT_ROLE_NOT_MANAGEABLE, true);
    }
    return safeReply(interaction, ERROR_MESSAGES.ROLE_NOT_FOUND, true);
  }

  // 3. Verifica se o membro tem o cargo
  if (!member?.roles?.cache?.has(roleId)) {
    await logRoleAction(interaction, 'role_take_skipped', roleId, role.name, 'skipped', 'Does not have role');
    return safeReply(interaction, ERROR_MESSAGES.MEMBER_DOES_NOT_HAVE_ROLE, true);
  }

  // 4. Executa a ação
  const result = await safeRemoveRole(member, role);
  if (!result.success) {
    await logRoleAction(interaction, 'role_take_failed', roleId, role.name, 'error', result.reason);
    return safeReply(interaction, ERROR_MESSAGES.ERROR_REMOVE(role.name), true);
  }

  // 5. Sucesso
  await logRoleAction(interaction, 'role_take_success', roleId, role.name, 'success');
  return safeReply(interaction, ERROR_MESSAGES.SUCCESS_TAKE(role.name), true);
}

async function handleToggleRole(interaction, data) {
  const roleId = data?.role_id;
  if (!roleId) return safeReply(interaction, '⚠️ Cargo não configurado neste botão.', true);

  const guild = interaction.guild;
  const member = interaction.member;
  const botMember = guild?.members?.me;
  const role = guild?.roles?.cache?.get(roleId);

  // 1. Verifica se o bot tem permissão Manage Roles
  const permissionCheck = checkBotManageRolesPermission(guild);
  if (!permissionCheck.hasPermission) {
    await logRoleAction(interaction, 'role_toggle_failed', roleId, role?.name, 'error', permissionCheck.reason);
    return safeReply(interaction, ERROR_MESSAGES.BOT_NO_PERMISSION, true);
  }

  // 2. Valida o cargo
  const roleCheck = validateRole(role, botMember);
  if (!roleCheck.valid) {
    await logRoleAction(interaction, 'role_toggle_failed', roleId, role?.name, 'error', roleCheck.reason);
    if (roleCheck.reason?.includes('hierarquia')) {
      return safeReply(interaction, ERROR_MESSAGES.BOT_ROLE_NOT_MANAGEABLE, true);
    }
    return safeReply(interaction, ERROR_MESSAGES.ROLE_NOT_FOUND, true);
  }

  // 3. Verifica e executa o toggle
  const hasRole = member?.roles?.cache?.has(roleId);
  let result;

  if (hasRole) {
    result = await safeRemoveRole(member, role);
    if (result.success) {
      await logRoleAction(interaction, 'role_toggle_remove', roleId, role.name, 'success');
      return safeReply(interaction, ERROR_MESSAGES.SUCCESS_TOGGLE_TAKE(role.name), true);
    }
  } else {
    result = await safeAddRole(member, role);
    if (result.success) {
      await logRoleAction(interaction, 'role_toggle_add', roleId, role.name, 'success');
      return safeReply(interaction, ERROR_MESSAGES.SUCCESS_TOGGLE_GIVE(role.name), true);
    }
  }

  // 4. Erro
  await logRoleAction(interaction, 'role_toggle_failed', roleId, role.name, 'error', result.reason);
  return safeReply(interaction, `❌ Erro ao gerenciar o cargo **${role.name}**.`, true);
}

// ── Auditoria de Ações de Cargo ───────────────────────────────────────────────

/**
 * Registra ação de cargo no audit log.
 */
async function logRoleAction(interaction, action, roleId, roleName, result, reason = null) {
  try {
    const { logAudit } = await import('../../database/repositories/AuditLog.mjs');
    logAudit({
      guildId: interaction.guildId,
      actorId: interaction.user.id,
      module: 'painel',
      action,
      entity: 'role',
      entityId: roleId,
      result,
      details: {
        roleName,
        roleId,
        reason,
        buttonId: interaction.customId,
      },
      source: 'discord_event',
    });
  } catch (err) {
    logger.warn('[CustomPanels] Falha ao registrar auditoria de cargo:', err?.message);
  }
}

async function handleOpenTicket(interaction) {
  // Delega ao handler de tickets (tkt:open) de forma segura
  try {
    const { handleTktComponent } = await import('../tickets/userHandler.mjs');
    await handleTktComponent(interaction, 'open', []);
  } catch (err) {
    logger.error('[CustomPanels] Erro ao abrir ticket:', err?.message);
    return safeReply(interaction, '❌ Não foi possível abrir um ticket.', true);
  }
}

async function handleExecuteConnection(interaction, data) {
  const actionName = data?.action;
  if (!actionName) return safeReply(interaction, '⚠️ Ação de conexão não configurada.', true);

  try {
    const { executeConnections } = await import('../connections/index.mjs');
    const context = {
      guildId: interaction.guildId,
      guild:   interaction.guild,
      channel: interaction.channel,
      member:  interaction.member,
      user:    interaction.user,
    };
    await executeConnections(actionName, context, interaction.client);
    return safeReply(interaction, '✅ Conexão executada com sucesso.', true);
  } catch (err) {
    logger.error('[CustomPanels] Erro ao executar conexão:', err?.message);
    return safeReply(interaction, '❌ Erro ao executar a conexão.', true);
  }
}

// ── validateActionData ────────────────────────────────────────────────────────

/**
 * Valida os dados de uma ação antes de persistir.
 *
 * @param {string} actionType
 * @param {object} actionData
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateActionData(actionType, actionData) {
  if (!VALID_ACTION_TYPES.includes(actionType)) {
    return { valid: false, reason: `actionType inválido: ${actionType}` };
  }

  switch (actionType) {
    case 'message':
      if (!actionData?.content) return { valid: false, reason: 'message requer campo "content"' };
      return { valid: true };
    case 'give_role':
    case 'take_role':
    case 'toggle_role':
      if (!actionData?.role_id) return { valid: false, reason: `${actionType} requer campo "role_id"` };
      return { valid: true };
    case 'execute_connection':
      if (!actionData?.action) return { valid: false, reason: 'execute_connection requer campo "action"' };
      return { valid: true };
    case 'open_ticket':
      return { valid: true }; // sem dados extras
    default:
      return { valid: false, reason: `actionType não suportado: ${actionType}` };
  }
}

// ── Utilitário ────────────────────────────────────────────────────────────────

async function safeReply(interaction, content, ephemeral = true) {
  try {
    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ...(flags ? { flags } : {}) });
    } else {
      await interaction.reply({ content, ...(flags ? { flags } : {}) });
    }
  } catch { /* ignorado */ }
}
