const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const proofStore = require('../utils/proofStore');
const { buildProofModal } = require('../utils/proofModal');

const QUANTIDADE_MAX = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Posta o comprovante (proof) no canal de proofs — anexe as imagens, preencha o modal (admin)')
    // Discord permite no máximo 5 anexos por comando: múltiplas opções de imagem
    .addAttachmentOption((o) => o.setName('imagem1').setDescription('Imagem do comprovante (1)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem2').setDescription('Imagem do comprovante (2)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem3').setDescription('Imagem do comprovante (3)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem4').setDescription('Imagem do comprovante (4)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem5').setDescription('Imagem do comprovante (5)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'comprar')) {
      return interaction.reply({ content: '🔒 Somente administradores ou equipe autorizada.', flags: MessageFlags.Ephemeral });
    }

    // Coleta todas as imagens anexadas (imagem1..imagem5)
    const imagens = [];
    for (let i = 1; i <= QUANTIDADE_MAX; i++) {
      const anexo = interaction.options.getAttachment(`imagem${i}`);
      if (anexo) imagens.push(anexo);
    }

    if (!imagens.length) {
      return interaction.reply({
        content: '❌ Anexe pelo menos 1 imagem no comando (ex: `imagem1:print.png`). O modal não aceita upload.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Guarda as imagens do anexo para quando o modal for enviado (modal não carrega anexos)
    proofStore.salvarRascunho(interaction.user.id, {
      urls: imagens.map((a) => a.url),
      nomes: imagens.map((a) => a.name),
      canalPadrao: proofStore.obter(interaction.guildId),
    });

    return interaction.showModal(buildProofModal(interaction.guildId));
  },
};