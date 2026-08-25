const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Abre o formulário para criar uma embed personalizada (admin)'),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    // O modal é aberto pelo handler no index.js (customId: embmodal)
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const modal = new ModalBuilder()
      .setCustomId('embmodal:criar')
      .setTitle('Criar Embed Personalizada')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('descricao').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('cor').setLabel('Cor (nome ou #hex) — ex: lilas ou #beb6ff').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('imagem').setLabel('Link da imagem (opcional)').setStyle(TextInputStyle.Short).setRequired(false)
        )
      );
    return interaction.showModal(modal);
  },
};
