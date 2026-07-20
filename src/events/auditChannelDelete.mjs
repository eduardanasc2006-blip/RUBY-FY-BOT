/**
 * Evento: Canal excluído — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.ChannelDelete,
  once: false,

  async execute(channel) {
    try {
      if (!channel.guildId) return;

      logAudit({
        guildId:  channel.guildId,
        actorId:  null,
        module:   'discord_events',
        action:   'channel_delete',
        entity:   'channel',
        entityId: channel.id,
        before:   {
          name: channel.name ?? null,
          type: String(channel.type),
          id:   channel.id,
        },
        source: AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
