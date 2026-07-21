/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GERENCIADOR UNIVERSAL DE MENSAGENS — RUBY FY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sistema centralizado para publicação e atualização de mensagens persistentes.
 *
 * PRINCÍPIOS:
 * 1. Sempre tente editar a mensagem existente antes de criar uma nova
 * 2. Salve channel_id e message_id no banco quando publicar
 * 3. Se a mensagem foi apagada, limpe os IDs e permita republicar
 * 4. Mantenha referências (IDs) para permitir edição futura
 * 5. Nenhum módulo deve duplicar essa lógica
 *
 * CLASSIFICAÇÃO DE MENSAGENS:
 *
 * • PUBLICAÇÕES EDITÁVEIS (usam este sistema):
 *   - Menu de ajuda
 *   - Embeds
 *   - Painéis de configuração
 *   - Painéis de tickets
 *   - Painéis personalizados
 *
 * • MENSAGENS TRANSIENTES (NÃO usam este sistema):
 *   - Logs
 *   - Notificações
 *   - Respostas de comandos
 *   - Mensagens de erro
 *   - Mensagens de boas-vindas
 *
 * USO:
 *
 * import {
 *   publishOrUpdate,
 *   updateMessage,
 *   clearPublished,
 *   checkPublished,
 * } from '../utils/messageManager.mjs';
 *
 * // Publicar ou atualizar
 * const result = await publishOrUpdate({
 *   guild,
 *   channelId,
 *   messageId,       // null para primeira publicação
 *   payload,
 *   saveCallback,    // (channelId, messageId) => {}
 * });
 *
 * if (result.updated) {
 *   // Mensagem foi EDITADA
 * } else if (result.created) {
 *   // Nova mensagem foi CRIADA
 * } else if (result.deleted) {
 *   // Mensagem não existe mais, IDs limpos
 * } else if (result.channelNotFound) {
 *   // Canal foi deletado
 * }
 */

import { logger } from './logger.mjs';

/**
 * Resultado de publishOrUpdate
 * @typedef {Object} PublishResult
 * @property {boolean} success - Operação foi bem sucedida
 * @property {boolean} updated - Mensagem foi editada
 * @property {boolean} created - Nova mensagem foi criada
 * @property {boolean} deleted - Mensagem original foi deletada
 * @property {boolean} channelNotFound - Canal não existe mais
 * @property {object|null} message - Objeto Message se sucesso
 * @property {string|null} error - Mensagem de erro se falhou
 * @property {string|null} newChannelId - Canal usado (pode mudar se recrear)
 * @property {string|null} newMessageId - ID da mensagem (novo se criada)
 */

/**
 * Resultado de updateMessage
 * @typedef {Object} UpdateResult
 * @property {boolean} success - Operação foi bem sucedida
 * @property {boolean} deleted - Mensagem foi deletada
 * @property {boolean} channelNotFound - Canal não existe mais
 * @property {object|null} message - Objeto Message se editada
 * @property {string|null} error - Mensagem de erro
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNÇÕES PRINCIPAIS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Publica uma mensagem nova ou atualiza uma existente.
 *
 * Este é o método principal para publicar/edita mensagens persistentes.
 *
 * @param {Object} options
 * @param {import('discord.js').Guild} options.guild - Guild do Discord
 * @param {string} options.channelId - ID do canal (null para apenas criar)
 * @param {string|null} options.messageId - ID da mensagem existente (null = nova)
 * @param {object} options.payload - Payload do Discord (embeds, components, content)
 * @param {Function|null} options.saveCallback - (newChannelId, newMessageId) => void
 * @returns {Promise<PublishResult>}
 */
export async function publishOrUpdate({
  guild,
  channelId,
  messageId,
  payload,
  saveCallback = null,
}) {
  // Valida canal
  if (!channelId) {
    return {
      success: false,
      error: 'channelId_required',
      created: false,
      updated: false,
      deleted: false,
      channelNotFound: false,
      message: null,
    };
  }

  const channel = guild?.channels?.cache?.get(channelId);
  if (!channel) {
    logger.warn(`[MessageManager] Canal não encontrado | canal: ${channelId}`);
    return {
      success: false,
      error: 'channel_not_found',
      created: false,
      updated: false,
      deleted: false,
      channelNotFound: true,
      message: null,
    };
  }

  // Verifica permissão de envio
  const me = guild?.members?.me;
  if (me && !channel.permissionsFor(me)?.has('SendMessages')) {
    return {
      success: false,
      error: 'no_permission',
      created: false,
      updated: false,
      deleted: false,
      channelNotFound: false,
      message: null,
    };
  }

  // Tenta editar mensagem existente
  if (messageId) {
    const updateResult = await updateMessage(guild, channelId, messageId, payload);

    if (updateResult.success) {
      logger.info(`[MessageManager] Mensagem editada | canal: ${channelId} | msg: ${messageId}`);
      return {
        success: true,
        updated: true,
        created: false,
        deleted: false,
        channelNotFound: false,
        message: updateResult.message,
        newChannelId: channelId,
        newMessageId: messageId,
      };
    }

    if (updateResult.channelNotFound) {
      return {
        success: false,
        error: 'channel_not_found',
        created: false,
        updated: false,
        deleted: false,
        channelNotFound: true,
        message: null,
      };
    }

    if (updateResult.deleted) {
      // Mensagem foi deletada, vamos criar nova
      logger.info(`[MessageManager] Mensagem deletada, criando nova | canal: ${channelId}`);
    }
  }

  // Criar nova mensagem
  try {
    const newMessage = await channel.send(payload);

    // Salvar IDs se callback fornecido
    if (saveCallback) {
      saveCallback(channelId, newMessage.id);
    }

    logger.info(`[MessageManager] Mensagem criada | canal: ${channelId} | msg: ${newMessage.id}`);
    return {
      success: true,
      created: true,
      updated: false,
      deleted: !!messageId, // Deletada se havia ID anterior
      channelNotFound: false,
      message: newMessage,
      newChannelId: channelId,
      newMessageId: newMessage.id,
    };
  } catch (err) {
    logger.error(`[MessageManager] Erro ao criar mensagem:`, err?.message);
    return {
      success: false,
      error: err?.message,
      created: false,
      updated: false,
      deleted: false,
      channelNotFound: false,
      message: null,
    };
  }
}

/**
 * Atualiza uma mensagem existente.
 *
 * @param {import('discord.js').Guild} guild - Guild
 * @param {string} channelId - ID do canal
 * @param {string} messageId - ID da mensagem
 * @param {object} payload - Payload do Discord
 * @returns {Promise<UpdateResult>}
 */
export async function updateMessage(guild, channelId, messageId, payload) {
  try {
    const channel = guild?.channels?.cache?.get(channelId);
    if (!channel) {
      return {
        success: false,
        deleted: false,
        channelNotFound: true,
        error: 'channel_not_found',
        message: null,
      };
    }

    const message = await channel.messages.fetch(messageId);
    const updated = await message.edit(payload);

    logger.info(`[MessageManager] Mensagem atualizada | canal: ${channelId} | msg: ${messageId}`);
    return {
      success: true,
      deleted: false,
      channelNotFound: false,
      error: null,
      message: updated,
    };
  } catch (err) {
    if (err?.code === 10008) {
      // Mensagem foi apagada
      logger.warn(`[MessageManager] Mensagem deletada | canal: ${channelId} | msg: ${messageId}`);
      return {
        success: false,
        deleted: true,
        channelNotFound: false,
        error: 'message_deleted',
        message: null,
      };
    }

    logger.error(`[MessageManager] Erro ao atualizar mensagem:`, err?.message);
    return {
      success: false,
      deleted: false,
      channelNotFound: false,
      error: err?.message,
      message: null,
    };
  }
}

/**
 * Limpa os IDs de publicação (channel_id e message_id).
 *
 * @param {Function} clearCallback - Função para limpar os IDs no banco
 * @returns {void}
 */
export function clearPublished(clearCallback) {
  if (clearCallback) {
    clearCallback();
    logger.info('[MessageManager] IDs de publicação limpos');
  }
}

/**
 * Verifica se uma mensagem publicada ainda existe.
 *
 * @param {import('discord.js').Guild} guild - Guild
 * @param {string|null} channelId - ID do canal
 * @param {string|null} messageId - ID da mensagem
 * @returns {Promise<{exists: boolean, channelFound: boolean, messageDeleted: boolean}>}
 */
export async function checkPublished(guild, channelId, messageId) {
  if (!channelId || !messageId) {
    return { exists: false, channelFound: true, messageDeleted: false };
  }

  const channel = guild?.channels?.cache?.get(channelId);
  if (!channel) {
    return { exists: false, channelFound: false, messageDeleted: false };
  }

  try {
    await channel.messages.fetch(messageId);
    return { exists: true, channelFound: true, messageDeleted: false };
  } catch (err) {
    if (err?.code === 10008) {
      return { exists: false, channelFound: true, messageDeleted: true };
    }
    return { exists: false, channelFound: true, messageDeleted: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNÇÕES AUXILIARES PARA INTERAÇÕES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Envia resposta padrão para interação, tratando deferred.
 *
 * @param {import('discord.js').ChatInputCommandInteraction|import('discord.js').ButtonInteraction} interaction
 * @param {object} payload - Payload do Discord
 * @param {boolean} [ephemeral=false] - Se a mensagem deve ser efêmera
 * @returns {Promise<void>}
 */
export async function safeReply(interaction, payload, ephemeral = false) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ ...payload, flags: ephemeral ? 64 : 0 });
    } else {
      await interaction.reply({ ...payload, flags: ephemeral ? 64 : 0 });
    }
  } catch (err) {
    logger.error('[MessageManager] Erro ao responder interação:', err?.message);
  }
}

/**
 * Notifica o usuário sobre o resultado da publicação.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} itemName - Nome do item (painel, embed, etc)
 * @param {PublishResult} result - Resultado da publicação
 * @returns {Promise<void>}
 */
export async function notifyPublishResult(interaction, itemName, result) {
  const { MessageFlags } = await import('discord.js');

  if (result.success) {
    if (result.updated) {
      await safeReply(interaction, {
        content: `✅ **${itemName}** atualizado com sucesso!`,
      });
    } else {
      await safeReply(interaction, {
        content: `📢 **${itemName}** publicado com sucesso!`,
      });
    }
  } else if (result.channelNotFound) {
    await safeReply(interaction, {
      content: `⚠️ O canal foi deletado. Selecione outro canal para publicar.`,
      flags: MessageFlags.Ephemeral,
    });
  } else if (result.error === 'no_permission') {
    await safeReply(interaction, {
      content: `⚠️ Não tenho permissão para enviar mensagens neste canal.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await safeReply(interaction, {
      content: `❌ Erro ao publicar **${itemName}**: ${result.error}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Notifica que a mensagem foi deletada e precisa ser republicada.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} itemName - Nome do item
 * @returns {Promise<void>}
 */
export async function notifyMessageDeleted(interaction, itemName) {
  const { MessageFlags } = await import('discord.js');

  await safeReply(interaction, {
    content: `⚠️ A mensagem do **${itemName}** foi apagada.\n\nUse o comando novamente para republicá-la.`,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNÇÕES DE COMPATIBILIDADE (para módulos legados)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * @deprecated Use publishOrUpdate() ao invés
 */
export async function publishMessage(guild, channelId, messageId, payload, saveFn = null) {
  const result = await publishOrUpdate({
    guild,
    channelId,
    messageId,
    payload,
    saveCallback: saveFn,
  });

  return {
    success: result.success,
    message: result.message,
    error: result.error,
    republished: result.created,
  };
}

/**
 * @deprecated Use updateMessage() ao invés
 */
export async function updatePanelMessage(guild, panel, payload) {
  if (!panel?.channelId || !panel?.messageId) {
    return { success: false, error: 'Painel não está publicado' };
  }

  const result = await updateMessage(guild, panel.channelId, panel.messageId, payload);
  return result;
}

/**
 * @deprecated Use publishOrUpdate() com saveCallback ao invés
 */
export async function publishPanelMessage(guild, panel, payload) {
  const { markPublished } = await import('../database/repositories/CustomPanels.mjs');

  const result = await publishOrUpdate({
    guild,
    channelId: panel.channelId,
    messageId: panel.messageId,
    payload,
    saveCallback: (chId, msgId) => markPublished(guild.id, panel.id, chId, msgId),
  });

  return result;
}

/**
 * @deprecated Use safeReply() ao invés
 */
export async function notifyPublish(interaction, itemName, result) {
  return notifyPublishResult(interaction, itemName, result);
}

/**
 * Constrói payload para painel customizado.
 */
export async function buildPanelPayload(panel, guildId) {
  const { buildPublishedPayload } = await import('../modules/custompanels/flow.mjs');
  return buildPublishedPayload(panel, guildId);
}

/**
 * Verifica se uma mensagem existe.
 */
export async function messageExists(guild, channelId, messageId) {
  const result = await checkPublished(guild, channelId, messageId);
  return result.exists;
}
