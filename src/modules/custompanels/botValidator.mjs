/**
 * Validador de Bot para Painéis Personalizados.
 *
 * Centraliza todas as validações de segurança e permissão do bot
 * antes de executar ações em painéis personalizados.
 *
 * Responsabilidades:
 *   - Verificar se o bot tem permissão Manage Roles
 *   - Verificar hierarquia de cargos
 *   - Verificar se o cargo existe
 *   - Verificar se o cargo não é @everyone
 */

import { logger } from '../../utils/logger.mjs';

// ── Permissão do Bot ────────────────────────────────────────────────────────────

/**
 * Verifica se o bot tem permissão para gerenciar cargos no servidor.
 *
 * @param {import('discord.js').Guild} guild
 * @returns {{ hasPermission: boolean, reason?: string }}
 */
export function checkBotManageRolesPermission(guild) {
  if (!guild) {
    return { hasPermission: false, reason: 'Guild não disponível' };
  }

  const botMember = guild.members?.me;
  if (!botMember) {
    return { hasPermission: false, reason: 'Membro do bot não encontrado' };
  }

  if (!botMember.permissions?.has('ManageRoles')) {
    logger.warn(`[BotValidator] Bot não tem permissão ManageRoles no servidor ${guild.id}`);
    return { hasPermission: false, reason: 'O bot não tem permissão para gerenciar cargos' };
  }

  return { hasPermission: true };
}

// ── Validação de Cargo ─────────────────────────────────────────────────────────

/**
 * Verifica se um cargo é válido para manipulação.
 *
 * @param {import('discord.js').Role} role
 * @param {import('discord.js').GuildMember} botMember
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRole(role, botMember) {
  if (!role) {
    return { valid: false, reason: 'Cargo não encontrado' };
  }

  // @everyone tem ID igual ao guild ID
  if (role.id === role.guild?.id) {
    return { valid: false, reason: 'Não é possível gerenciar o cargo @everyone' };
  }

  // Verifica se o bot pode gerenciar este cargo
  if (!role.editable) {
    logger.warn(`[BotValidator] Bot não pode gerenciar o cargo ${role.id} (hierarquia)`);
    return { valid: false, reason: 'O cargo está acima do cargo do bot na hierarquia' };
  }

  return { valid: true };
}

/**
 * Verifica se o bot pode atribuir um cargo específico a um membro.
 *
 * @param {import('discord.js').GuildMember} targetMember
 * @param {import('discord.js').Role} role
 * @param {import('discord.js').GuildMember} botMember
 * @returns {{ canAssign: boolean, reason?: string }}
 */
export function canBotAssignRole(targetMember, role, botMember) {
  // Valida cargo
  const roleCheck = validateRole(role, botMember);
  if (!roleCheck.valid) {
    return { canAssign: false, reason: roleCheck.reason };
  }

  // Verifica se o membro tem o cargo
  if (targetMember?.roles?.cache?.has(role.id)) {
    return { canAssign: false, reason: 'Membro já possui este cargo' };
  }

  return { canAssign: true };
}

/**
 * Verifica se o bot pode remover um cargo específico de um membro.
 *
 * @param {import('discord.js').GuildMember} targetMember
 * @param {import('discord.js').Role} role
 * @param {import('discord.js').GuildMember} botMember
 * @returns {{ canRemove: boolean, reason?: string }}
 */
export function canBotRemoveRole(targetMember, role, botMember) {
  // Valida cargo
  const roleCheck = validateRole(role, botMember);
  if (!roleCheck.valid) {
    return { canRemove: false, reason: roleCheck.reason };
  }

  // Verifica se o membro tem o cargo
  if (!targetMember?.roles?.cache?.has(role.id)) {
    return { canRemove: false, reason: 'Membro não possui este cargo' };
  }

  return { canRemove: true };
}

// ── Execução de Ações ─────────────────────────────────────────────────────────

/**
 * Executa a ação de adicionar um cargo com validação completa.
 *
 * @param {import('discord.js').GuildMember} member - Membro que receberá o cargo
 * @param {import('discord.js').Role} role - Cargo a ser adicionado
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
export async function safeAddRole(member, role) {
  if (!member || !role) {
    return { success: false, reason: 'Membro ou cargo inválido' };
  }

  try {
    await member.roles.add(role);
    return { success: true };
  } catch (err) {
    logger.error(`[BotValidator] Erro ao adicionar cargo ${role.id}:`, err?.message);
    
    // Analisa o erro
    if (err?.code === 50013) { // Missing Permissions
      return { success: false, reason: 'O bot não tem permissão para adicionar este cargo' };
    }
    if (err?.code === 50001) { // Missing Access
      return { success: false, reason: 'O bot não tem acesso a este canal ou cargo' };
    }
    
    return { success: false, reason: 'Erro ao adicionar o cargo' };
  }
}

/**
 * Executa a ação de remover um cargo com validação completa.
 *
 * @param {import('discord.js').GuildMember} member - Membro que terá o cargo removido
 * @param {import('discord.js').Role} role - Cargo a ser removido
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
export async function safeRemoveRole(member, role) {
  if (!member || !role) {
    return { success: false, reason: 'Membro ou cargo inválido' };
  }

  try {
    await member.roles.remove(role);
    return { success: true };
  } catch (err) {
    logger.error(`[BotValidator] Erro ao remover cargo ${role.id}:`, err?.message);
    
    // Analisa o erro
    if (err?.code === 50013) { // Missing Permissions
      return { success: false, reason: 'O bot não tem permissão para remover este cargo' };
    }
    if (err?.code === 50001) { // Missing Access
      return { success: false, reason: 'O bot não tem acesso a este canal ou cargo' };
    }
    
    return { success: false, reason: 'Erro ao remover o cargo' };
  }
}

// ── Construção de Mensagens ───────────────────────────────────────────────────

/**
 * Mensagens de erro padronizadas para o usuário.
 */
export const ERROR_MESSAGES = {
  BOT_NO_PERMISSION: '⚠️ O bot não tem permissão para gerenciar cargos neste servidor.',
  BOT_ROLE_NOT_MANAGEABLE: '⚠️ O cargo do bot está abaixo do cargo que você está tentando gerenciar.',
  ROLE_NOT_FOUND: '⚠️ Cargo não encontrado.',
  ROLE_IS_EVERYONE: '⚠️ Não é possível gerenciar o cargo @everyone.',
  MEMBER_ALREADY_HAS_ROLE: 'ℹ️ Você já possui este cargo.',
  MEMBER_DOES_NOT_HAVE_ROLE: 'ℹ️ Você não possui este cargo.',
  SUCCESS_GIVE: (roleName) => `✅ Cargo **${roleName}** concedido!`,
  SUCCESS_TAKE: (roleName) => `✅ Cargo **${roleName}** removido.`,
  SUCCESS_TOGGLE_GIVE: (roleName) => `✅ Cargo **${roleName}** concedido!`,
  SUCCESS_TOGGLE_TAKE: (roleName) => `✅ Cargo **${roleName}** removido.`,
  ERROR_ADD: (roleName) => `❌ Erro ao adicionar o cargo **${roleName}**.`,
  ERROR_REMOVE: (roleName) => `❌ Erro ao remover o cargo **${roleName}**.`,
};
