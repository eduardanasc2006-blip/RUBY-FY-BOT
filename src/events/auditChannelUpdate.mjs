/**
 * Evento: Canal atualizado — Auditoria (Etapa 18).
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.ChannelUpdate,
  once: false,

  async execute(oldChannel, newChannel) {
    try {
      if (!newChannel.guildId) return;

      // Só registra se algo relevante mudou
      if (oldChannel.name === newChannel.name && oldChannel.topic === newChannel.topic) return;

      logAudit({
        guildId:  newChannel.guildId,
        actorId:  null,
        module:   'discord_events',
        action:   'channel_update',
        entity:   'channel',
        entityId: newChannel.id,
        before:   {
          name:  oldChannel.name  ?? null,
          topic: oldChannel.topic ?? null,
        },
        after:    {
          name:  newChannel.name  ?? null,
          topic: newChannel.topic ?? null,
        },
        source: AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch { /* silencioso */ }
  },
};
