/**
 * Evento: Mensagem apagada — Auditoria (Etapa 18).
 *
 * Registra mensagens deletadas na tabela audit_log.
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.MessageDelete,
  once: false,

  async execute(message) {
    try {
      if (!message.guildId) return; // ignora DMs
      if (message.author?.bot) return; // ignora bots

      logAudit({
        guildId:  message.guildId,
        actorId:  message.author?.id ?? null,
        module:   'discord_events',
        action:   'message_delete',
        entity:   'message',
        entityId: message.id,
        after:    null,
        before:   {
          content:   message.content?.slice(0, 500) ?? null,
          channelId: message.channelId ?? null,
          authorId:  message.author?.id ?? null,
          authorTag: message.author?.tag ?? null,
        },
        source:  AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch {
      // Falha silenciosa
    }
  },
};
