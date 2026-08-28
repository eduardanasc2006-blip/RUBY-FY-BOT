const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildPainel, getSessao } = require('../utils/mensagemPainel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mensagem')
    .setDescription('Publica uma mensagem simples (texto e/ou imagem) num canal (admin)')
    .addStringOption((o) => o.setName('mensagem').setDescription('Texto da mensagem (opcional)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem').setDescription('Imagem anexada').setRequired(false))
    .addStringOption((o) => o.setName('link_imagem').setDescription('URL da imagem (alternativa ao anexo)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'mensagem')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const texto = interaction.options.getString('mensagem');
    const anexo = interaction.options.getAttachment('imagem');
    const link = interaction.options.getString('link_imagem');

    const sessao = getSessao(interaction.user.id);
    if (anexo && anexo.contentType?.startsWith('image/')) sessao.imagem = anexo.url;

    else if (link && link.startsWith('http')) sessao.imagem = link;



    if (texto && texto.trim()) {

      sessao.mensagem = texto.trim();
    }

    return interaction.reply({ ...buildPainel(interaction.user.id), flags: MessageFlags.Ephemeral });
  },
};
