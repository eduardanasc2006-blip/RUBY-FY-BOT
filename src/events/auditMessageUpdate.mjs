/**
 * Evento: Mensagem editada — Auditoria (Etapa 18).
 *
 * Registra mensagens editadas na tabela audit_log.
 * Falha silenciosa: nunca interrompe o bot.
 */

import { Events } from 'discord.js';
import { logAudit, AUDIT_SOURCE } from '../database/repositories/AuditLog.mjs';

export default {
  name: Events.MessageUpdate,
  once: false,

  async execute(oldMessage, newMessage) {
    try {
      if (!newMessage.guildId) return; // ignora DMs
      if (newMessage.author?.bot) return; // ignora bots

      // Ignora se o conteúdo não mudou (ex: embeds que carregam depois)
      if (oldMessage.content === newMessage.content) return;

      logAudit({
        guildId:  newMessage.guildId,
        actorId:  newMessage.author?.id ?? null,
        module:   'discord_events',
        action:   'message_update',
        entity:   'message',
        entityId: newMessage.id,
        before:   {
          content:   oldMessage.content?.slice(0, 500) ?? null,
          channelId: oldMessage.channelId ?? null,
        },
        after:    {
          content:   newMessage.content?.slice(0, 500) ?? null,
          channelId: newMessage.channelId ?? null,
          url:       newMessage.url ?? null,
        },
        source:  AUDIT_SOURCE.DISCORD_EVENT,
      });
    } catch {
      // Falha silenciosa
    }
  },
};
