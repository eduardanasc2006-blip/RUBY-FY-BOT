import { SlashCommandBuilder } from 'discord.js';
import { buildHelpMenu, buildSimpleHelpEmbed } from '../utils/helpBuilder.mjs';
import { getSetting, setSetting } from '../database/repositories/GuildConfig.mjs';

const HELP_MODULE = 'ajuda';

/**
 * Obtém os IDs da mensagem de ajuda publicada.
 */
function getHelpPublished(guildId) {
  return {
    channelId: getSetting(guildId, HELP_MODULE, 'channel_id'),
    messageId: getSetting(guildId, HELP_MODULE, 'message_id'),
  };
}

/**
 * Salva os IDs da mensagem de ajuda publicada.
 */
function setHelpPublished(guildId, channelId, messageId) {
  setSetting(guildId, HELP_MODULE, 'channel_id', channelId);
  setSetting(guildId, HELP_MODULE, 'message_id', messageId);
}

/**
 * Limpa os IDs da mensagem de ajuda publicada.
 */
function clearHelpPublished(guildId) {
  setSetting(guildId, HELP_MODULE, 'channel_id', null);
  setSetting(guildId, HELP_MODULE, 'message_id', null);
}

export default {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe todos os comandos disponíveis do bot.')
    .addStringOption(option =>
      option.setName('acao')
        .setDescription('Publicar o menu de ajuda permanentemente ou atualizar')
        .setRequired(false)
        .addChoices(
          { name: '📢 Publicar Menu', value: 'publish' },
          { name: '🗑️ Remover Publicação', value: 'remove' },
        )
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal para publicar (apenas para ação "Publicar Menu")')
        .setRequired(false)
    ),

  async execute(interaction) {
    const action = interaction.options.getString('acao');
    const channel = interaction.options.getChannel('canal');

    // Se é um interaction com ação
    if (action === 'publish') {
      return this.publishHelp(interaction, channel);
    }

    if (action === 'remove') {
      return this.removeHelp(interaction);
    }

    // Comportamento padrão: exibe menu temporário
    const payload = buildHelpMenu(interaction.client, interaction);
    await interaction.reply(payload);
  },

  /**
   * Publica o menu de ajuda permanentemente em um canal.
   */
  async publishHelp(interaction, targetChannel) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    // Se não especificou canal, tenta usar o canal anterior ou o canal atual
    const { channelId: existingChannelId, messageId: existingMessageId } = getHelpPublished(guildId);
    const channel = targetChannel || guild.channels.cache.get(existingChannelId) || interaction.channel;

    if (!channel?.isTextBased()) {
      return interaction.reply({
        content: '⚠️ Canal inválido. Selecione um canal de texto.',
        ephemeral: true,
      });
    }

    // Verifica permissão
    const me = guild.members.me;
    if (me && !channel.permissionsFor(me)?.has('SendMessages')) {
      return interaction.reply({
        content: `⚠️ Não tenho permissão para enviar mensagens em ${channel}.`,
        ephemeral: true,
      });
    }

    // Constrói o payload
    const payload = buildHelpMenu(interaction.client, interaction);

    // Usa MessageManager centralizado
    const { publishOrUpdate } = await import('../utils/messageManager.mjs');

    const result = await publishOrUpdate({
      guild,
      channelId: channel.id,
      messageId: existingMessageId,
      payload,
      saveCallback: (chId, msgId) => setHelpPublished(guildId, chId, msgId),
    });

    if (result.success) {
      const action = result.updated ? 'atualizado' : 'publicado';
      return interaction.reply({
        content: `✅ Menu de ajuda ${action} em ${channel}!`,
        ephemeral: true,
      });
    }

    // Erro
    if (result.channelNotFound) {
      return interaction.reply({
        content: `⚠️ O canal foi deletado. Selecione outro canal.`,
        ephemeral: true,
      });
    }

    if (result.error === 'no_permission') {
      return interaction.reply({
        content: `⚠️ Não tenho permissão para enviar mensagens neste canal.`,
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `❌ Erro ao publicar o menu de ajuda: ${result.error}`,
      ephemeral: true,
    });
  },

  /**
   * Remove a publicação do menu de ajuda.
   */
  async removeHelp(interaction) {
    const guildId = interaction.guildId;
    const { channelId, messageId } = getHelpPublished(guildId);

    if (!channelId || !messageId) {
      return interaction.reply({
        content: '⚠️ O menu de ajuda não está publicado.',
        ephemeral: true,
      });
    }

    // Limpa os IDs
    clearHelpPublished(guildId);

    return interaction.reply({
      content: '✅ Publicação do menu de ajuda removida. Use `/ajuda publicar` para republicar.',
      ephemeral: true,
    });
  },

  name: 'ajuda',
  aliases: ['help'],

  async executePrefix(message) {
    const { config } = await import('../config/bot.mjs');
    const embed = buildSimpleHelpEmbed(message.client, config.prefix);
    await message.reply({ embeds: [embed] });
  },
};
