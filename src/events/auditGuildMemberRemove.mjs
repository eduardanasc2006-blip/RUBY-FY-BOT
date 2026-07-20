/**
 * Evento: Membro saiu do servidor — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.GuildMemberRemove,
  once: false,

  async execute(member) {
    try {
      logAudit({
        guildId:  member.guild.id,
        actorId:  member.id,
        module:   'discord_events',
        action:   'member_leave',
        entity:   'member',
        entityId: member.id,
        before:   {
          tag:      member.user?.tag      ?? null,
          username: member.user?.username ?? null,
          roles:    member.roles?.cache?.map(r => r.name).filter(n => n !== '@everyone') ?? [],
        },
        source: AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
