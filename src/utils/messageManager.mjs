/**
 * Gerenciador Universal de Mensagens.
 *
 * Fornece funções para publicar, atualizar e republicar mensagens
 * de forma consistente em todo o bot.
 *
 * Princípios:
 * 1. Sempre tente editar a mensagem existente antes de criar uma nova
 * 2. Salve channel_id e message_id no banco quando publicar
 * 3. Se a mensagem foi apagada, informe o usuário e permita republicar
 * 4. Mantenha referências (IDs) para permitir edição futura
 *
 * Uso:
 *   import { publishMessage, updateMessage, fetchAndUpdate } from '../utils/messageManager.mjs';
 */

import { logger } from './logger.mjs';

/**
 * Publica uma mensagem em um canal.
 * Se já existir uma mensagem salva no banco, tenta editar ao invés de criar.
 *
 * @param {import('discord.js').Guild} guild - Guild onde publicar
 * @param {string} channelId - ID do canal
 * @param {string} messageId - ID da mensagem existente (opcional)
 * @param {object} payload - Payload do Discord (embeds, components, content)
 * @param {Function} saveFn - Função para salvar os IDs no banco (channelId, messageId) => void
 * @returns {{ success: boolean, message?: Message, error?: string, republished?: boolean }}
 */
export async function publishMessage(guild, channelId, messageId, payload, saveFn = null) {
  try {
    const channel = guild?.channels?.cache?.get(channelId);
    if (!channel) {
      return { success: false, error: 'Canal não encontrado' };
    }

    // Se temos messageId, tenta editar a mensagem existente
    if (messageId) {
      try {
        const existingMessage = await channel.messages.fetch(messageId);
        const updated = await existingMessage.edit(payload);
        logger.info(`[MessageManager] Mensagem editada | canal: ${channelId} | msg: ${messageId}`);
        return { success: true, message: updated, republished: false };
      } catch (fetchErr) {
        // Mensagem não existe mais, vamos criar uma nova
        if (fetchErr?.code !== 10008) { // Unknown Message
          logger.warn(`[MessageManager] Erro ao buscar mensagem: ${fetchErr?.message}`);
        }
        logger.info(`[MessageManager] Mensagem não existe, criando nova | canal: ${channelId}`);
      }
    }

    // Criar nova mensagem
    const newMessage = await channel.send(payload);

    // Salvar IDs se função fornecida
    if (saveFn) {
      saveFn(channelId, newMessage.id);
    }

    logger.info(`[MessageManager] Mensagem criada | canal: ${channelId} | msg: ${newMessage.id}`);
    return { success: true, message: newMessage, republished: true };
  } catch (err) {
    logger.error('[MessageManager] Erro ao publicar mensagem:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Atualiza uma mensagem existente.
 *
 * @param {import('discord.js').Guild} guild - Guild
 * @param {string} channelId - ID do canal
 * @param {string} messageId - ID da mensagem
 * @param {object} payload - Payload do Discord
 * @returns {{ success: boolean, message?: Message, deleted?: boolean }}
 */
export async function updateMessage(guild, channelId, messageId, payload) {
  try {
    const channel = guild?.channels?.cache?.get(channelId);
    if (!channel) {
      return { success: false, error: 'Canal não encontrado' };
    }

    const message = await channel.messages.fetch(messageId);
    const updated = await message.edit(payload);

    logger.info(`[MessageManager] Mensagem atualizada | canal: ${channelId} | msg: ${messageId}`);
    return { success: true, message: updated };
  } catch (err) {
    if (err?.code === 10008) {
      // Mensagem foi apagada
      logger.warn(`[MessageManager] Mensagem apagada | canal: ${channelId} | msg: ${messageId}`);
      return { success: false, deleted: true, error: 'Mensagem foi apagada' };
    }
    logger.error('[MessageManager] Erro ao atualizar mensagem:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Verifica se uma mensagem ainda existe.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} channelId
 * @param {string} messageId
 * @returns {Promise<boolean>}
 */
export async function messageExists(guild, channelId, messageId) {
  try {
    const channel = guild?.channels?.cache?.get(channelId);
    if (!channel) return false;

    await channel.messages.fetch(messageId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Atualiza a mensagem de um painel personalizado.
 * Requer que o painel tenha channel_id e message_id salvos.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object} panel - Painel com channelId e messageId
 * @param {object} payload - Payload do Discord
 * @returns {{ success: boolean, deleted?: boolean, error?: string }}
 */
export async function updatePanelMessage(guild, panel, payload) {
  if (!panel?.channelId || !panel?.messageId) {
    return { success: false, error: 'Painel não está publicado (sem channel_id ou message_id)' };
  }

  const result = await updateMessage(guild, panel.channelId, panel.messageId, payload);

  if (result.deleted) {
    // Atualiza o banco para marcar como não publicado
    const { markUnpublished } = await import('../database/repositories/CustomPanels.mjs');
    markUnpublished(guild.id, panel.id);
    logger.info(`[MessageManager] Painel marcado como não publicado | id: ${panel.id}`);
  }

  return result;
}

/**
 * Publica ou republica a mensagem de um painel.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object} panel - Painel
 * @param {object} payload - Payload do Discord
 * @returns {{ success: boolean, message?: Message, deleted?: boolean, error?: string }}
 */
export async function publishPanelMessage(guild, panel, payload) {
  const { markPublished } = await import('../database/repositories/CustomPanels.mjs');

  const result = await publishMessage(
    guild,
    panel.channelId,
    panel.messageId,
    payload,
    (channelId, messageId) => markPublished(guild.id, panel.id, channelId, messageId)
  );

  return result;
}

/**
 * Notifica o usuário que a mensagem foi apagada e sugere republicar.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} itemName - Nome do item (painel, embed, etc)
 * @returns {Promise<void>}
 */
export async function notifyMessageDeleted(interaction, itemName) {
  const { MessageFlags } = await import('discord.js');

  await interaction.followUp({
    content: `⚠️ A mensagem do **${itemName}** foi apagada.\n\nUse o comando novamente para republicá-la.`,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
}

/**
 * Constrói payload para publicar/edição de painel.
 *
 * @param {object} panel
 * @param {string} guildId
 * @returns {Promise<object>}
 */
export async function buildPanelPayload(panel, guildId) {
  const { buildPublishedPayload } = await import('../modules/custompanels/flow.mjs');
  return buildPublishedPayload(panel, guildId);
}

/**
 * Constrói payload para publicar/edição de embed.
 *
 * @param {object} template
 * @param {object} context
 * @returns {Promise<object>}
 */
export async function buildEmbedPayload(template, context) {
  const { buildPublishedPayload } = await import('../modules/templates/flow.mjs');
  return buildPublishedPayload(template, context);
}
