/**
 * Evento: Cargos do membro alterados — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(oldMember, newMember) {
    try {
      const oldRoles = oldMember.roles?.cache?.map(r => r.id) ?? [];
      const newRoles = newMember.roles?.cache?.map(r => r.id) ?? [];

      const added   = newRoles.filter(r => !oldRoles.includes(r));
      const removed = oldRoles.filter(r => !newRoles.includes(r));

      if (added.length === 0 && removed.length === 0) return;

      logAudit({
        guildId:  newMember.guild.id,
        actorId:  newMember.id,
        module:   'discord_events',
        action:   'member_roles_changed',
        entity:   'member',
        entityId: newMember.id,
        before:   { roles: oldRoles },
        after:    { roles: newRoles, added, removed },
        source:   AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
