const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildPainel, getSessao } = require('../utils/mensagemPainel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mensagem')
    .setDescription('Publica uma mensagem simples (texto e/ou imagem) num canal (admin)')
    .addStringOption((o) => o.setName('mensagem').setDescription('Texto da mensagem (opcional)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem').setDescription('Imagem anexada (1)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem2').setDescription('Imagem anexada (2)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem3').setDescription('Imagem anexada (3)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem4').setDescription('Imagem anexada (4)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem5').setDescription('Imagem anexada (5)').setRequired(false))
    .addStringOption((o) => o.setName('link_imagem').setDescription('URL da imagem (alternativa aos anexos)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'mensagem')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const texto = interaction.options.getString('mensagem');
    const link = interaction.options.getString('link_imagem');

    const sessao = getSessao(interaction.user.id);
    const anexos = [
      'imagem',
      'imagem2',
      'imagem3',
      'imagem4',
      'imagem5',
    ]
      .map((nome) => interaction.options.getAttachment(nome))
      .filter(Boolean);
    for (const anexo of anexos) {
      if (anexo.contentType?.startsWith('image/')) sessao.imagens.push(anexo.url);
    }

    if (link && link.startsWith('http')) sessao.imagens.push(link);



    if (texto && texto.trim()) {

      sessao.mensagem = texto.trim();
    }

    return interaction.reply({ ...buildPainel(interaction.user.id), flags: MessageFlags.Ephemeral });
  },
};
