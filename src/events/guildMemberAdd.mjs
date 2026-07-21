/**
 * Evento: guildMemberAdd
 *
 * Atribui cargos automáticos ao novo membro, respeitando:
 *   - Cargos ativos apenas
 *   - Prioridade (menor número = executa primeiro)
 *   - Hierarquia de cargos do bot
 *   - Permissão Manage Roles
 *
 * Fase 4.
 */

import { Events } from 'discord.js';
import { getActiveAutoRoles } from '../database/repositories/AutoRoles.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Verifica se o bot pode gerenciar um cargo específico.
 *
 * @param {import('discord.js').GuildMember} botMember
 * @param {import('discord.js').Role} role
 * @returns {{ canManage: boolean, reason?: string }}
 */
function canBotManageRole(botMember, role) {
  if (!role) {
    return { canManage: false, reason: 'Cargo não encontrado' };
  }

  // @everyone tem ID igual ao guild ID
  if (role.id === role.guild?.id) {
    return { canManage: false, reason: 'Não é possível gerenciar @everyone' };
  }

  if (!role.editable) {
    return { canManage: false, reason: 'Cargo está acima do cargo do bot na hierarquia' };
  }

  return { canManage: true };
}

export default {
  name: Events.GuildMemberAdd,

  /**
   * @param {import('discord.js').GuildMember} member
   */
  async execute(member) {
    const guildId   = member.guild.id;
    const botMember = member.guild.members?.me;

    // Verificar se o bot tem permissão Manage Roles
    if (!botMember?.permissions?.has('ManageRoles')) {
      logger.warn(`[AutoRole] Bot sem permissão ManageRoles no servidor ${guildId}`);
      return;
    }

    // Buscar cargos automáticos ativos
    const autoRoles = getActiveAutoRoles(guildId);

    if (autoRoles.length === 0) {
      return;
    }

    logger.info(`[AutoRole] Novo membro ${member.user.tag} (${member.id}) — ${autoRoles.length} cargo(s) automático(s) para aplicar`);

    let appliedCount = 0;
    let failedCount  = 0;

    for (const autoRole of autoRoles) {
      const role = member.guild.roles?.cache?.get(autoRole.roleId);

      // Verificar se o cargo existe
      if (!role) {
        logger.warn(`[AutoRole] Cargo ${autoRole.roleId} não encontrado no servidor ${guildId}`);
        failedCount++;
        continue;
      }

      // Verificar se o bot pode gerenciar este cargo
      const { canManage, reason } = canBotManageRole(botMember, role);
      if (!canManage) {
        logger.warn(`[AutoRole] Bot não pode gerenciar cargo ${role.name}: ${reason}`);
        failedCount++;
        continue;
      }

      // Verificar se o membro já tem o cargo
      if (member.roles?.cache?.has(autoRole.roleId)) {
        logger.debug(`[AutoRole] Membro ${member.id} já tem cargo ${role.name}`);
        continue;
      }

      // Atribuir o cargo
      try {
        await member.roles.add(role);
        appliedCount++;

        logger.info(`[AutoRole] Cargo ${role.name} atribuído a ${member.user.tag}`);

        // Registrar no audit log
        await logRoleAssigned(member, autoRole, role);
      } catch (err) {
        failedCount++;
        logger.error(`[AutoRole] Erro ao atribuir cargo ${role.name}: ${err?.message}`);

        // Registrar falha
        await logRoleFailed(member, autoRole, role, err);
      }
    }

    if (appliedCount > 0 || failedCount > 0) {
      logger.info(`[AutoRole] Resultado para ${member.user.tag}: ${appliedCount} aplicado(s), ${failedCount} falhou(ram)`);
    }
  },
};

// ── Auditoria ─────────────────────────────────────────────────────────────────

/**
 * Registra cargo atribuído no audit log.
 */
async function logRoleAssigned(member, autoRole, role) {
  try {
    const { logAudit } = await import('../database/repositories/AuditLog.mjs');

    logAudit({
      guildId: member.guild.id,
      actorId: null, // sistema
      module: 'autorole',
      action: 'auto_role_assigned',
      entity: 'auto_role',
      entityId: autoRole.id,
      result: 'success',
      details: {
        memberId: member.id,
        memberTag: member.user.tag,
        roleId: role.id,
        roleName: role.name,
        priority: autoRole.priority,
      },
      source: 'system',
    });
  } catch (err) {
    logger.warn('[AutoRole] Falha ao registrar auditoria:', err?.message);
  }
}

/**
 * Registra falha ao atribuir cargo no audit log.
 */
async function logRoleFailed(member, autoRole, role, err) {
  try {
    const { logAudit } = await import('../database/repositories/AuditLog.mjs');

    logAudit({
      guildId: member.guild.id,
      actorId: null, // sistema
      module: 'autorole',
      action: 'auto_role_failed',
      entity: 'auto_role',
      entityId: autoRole.id,
      result: 'error',
      details: {
        memberId: member.id,
        memberTag: member.user.tag,
        roleId: role?.id ?? autoRole.roleId,
        roleName: role?.name ?? 'desconhecido',
        priority: autoRole.priority,
        error: err instanceof Error ? err.message : String(err),
      },
      source: 'system',
    });
  } catch (err) {
    logger.warn('[AutoRole] Falha ao registrar auditoria de erro:', err?.message);
  }
}
