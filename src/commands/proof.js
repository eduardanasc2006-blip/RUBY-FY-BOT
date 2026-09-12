const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const proofStore = require('../utils/proofStore');

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

    const modal = new ModalBuilder()
      .setCustomId('proofmodal')
      .setTitle('📸 Postar Proof');

    // Campo: número
    const numero = new TextInputBuilder()
      .setCustomId('numero')
      .setLabel('Número do proof')
      .setPlaceholder('ex: 26')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Campo: produto
    const produto = new TextInputBuilder()
      .setCustomId('produto')
      .setLabel('Produto / Item')
      .setPlaceholder('ex: Testando')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Campo: cliente (aceita @menção ou texto livre)
    const cliente = new TextInputBuilder()
      .setCustomId('cliente')
      .setLabel('Cliente')
      .setPlaceholder('ex: @finix.yin (deixe vazio se não quiser)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Campo: valor
    const valor = new TextInputBuilder()
      .setCustomId('valor')
      .setLabel('Valor')
      .setPlaceholder('ex: 3,00')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Campo: canal
    const canalPadrao = proofStore.obter(interaction.guildId);
    const canal = new TextInputBuilder()
      .setCustomId('canal')
      .setLabel('Canal para postar (ID ou #nome — vazio = canal configurado)')
      .setPlaceholder(canalPadrao ? `<#${canalPadrao}>` : 'ex: 123456789012345678')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(numero),
      new ActionRowBuilder().addComponents(produto),
      new ActionRowBuilder().addComponents(cliente),
      new ActionRowBuilder().addComponents(valor),
      new ActionRowBuilder().addComponents(canal)
    );

    return interaction.showModal(modal);
  },
};