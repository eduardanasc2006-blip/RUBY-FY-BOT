const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { resolverCor } = require('../prefixCommands/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Cria uma embed personalizada no canal (admin)')
    .addStringOption((o) => o.setName('titulo').setDescription('Título da embed').setRequired(true))
    .addStringOption((o) => o.setName('descricao').setDescription('Texto da embed').setRequired(true))
    .addStringOption((o) => o.setName('cor').setDescription('Cor: lilas, roxo, azul, verde, rosa, ou #hex').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem').setDescription('Foto/imagem (upload)').setRequired(false))
    .addStringOption((o) => o.setName('link_imagem').setDescription('Link da imagem (alternativa)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const cor = interaction.options.getString('cor');
    const anexo = interaction.options.getAttachment('imagem');
    const link = interaction.options.getString('link_imagem');

    const embed = new EmbedBuilder()
      .setColor(resolverCor(cor))
      .setTitle(titulo)
      .setDescription(descricao);

    // Anexo (upload) tem prioridade sobre link
    if (anexo && anexo.contentType?.startsWith('image/')) {
      embed.setImage(anexo.url);
    } else if (link && link.startsWith('http')) {
      embed.setImage(link);
    }

    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ Embed publicada!', flags: MessageFlags.Ephemeral });
  },
};
