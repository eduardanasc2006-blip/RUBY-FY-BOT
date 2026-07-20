/**
 * Evento: Membro entrou no servidor — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    try {
      logAudit({
        guildId:  member.guild.id,
        actorId:  member.id,
        module:   'discord_events',
        action:   'member_join',
        entity:   'member',
        entityId: member.id,
        after:    {
          tag:            member.user?.tag      ?? null,
          username:       member.user?.username ?? null,
          accountCreated: member.user?.createdAt?.toISOString() ?? null,
        },
        source: AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
