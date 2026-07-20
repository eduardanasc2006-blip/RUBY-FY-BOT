/**
 * Evento: Canal criado — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.ChannelCreate,
  once: false,

  async execute(channel) {
    try {
      if (!channel.guildId) return;

      logAudit({
        guildId:  channel.guildId,
        actorId:  null,
        module:   'discord_events',
        action:   'channel_create',
        entity:   'channel',
        entityId: channel.id,
        after:    {
          name: channel.name ?? null,
          type: String(channel.type),
          id:   channel.id,
        },
        source: AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
