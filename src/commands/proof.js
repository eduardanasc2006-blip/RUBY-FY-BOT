const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const pedidoStore = require('../utils/pedidoStore');
const proofStore = require('../utils/proofStore');

const COR = 0xbeb6ff;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Envia as imagens do comprovante de pagamento dos seus pedidos confirmados')
    // Discord permite no máximo 5 anexos por comando: múltiplas opções de imagem
    .addAttachmentOption((o) => o.setName('imagem1').setDescription('Imagem do comprovante (1)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem2').setDescription('Imagem do comprovante (2)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem3').setDescription('Imagem do comprovante (3)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem4').setDescription('Imagem do comprovante (4)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem5').setDescription('Imagem do comprovante (5)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Use este comando dentro de um servidor.', flags: MessageFlags.Ephemeral });
    }

    const pedidos = pedidoStore.doCliente(interaction.guildId, interaction.user.id, 'confirmado');
    if (!pedidos.length) {
      return interaction.reply({ content: '❌ Nenhum pedido confirmado seu aguardando comprovante.', flags: MessageFlags.Ephemeral });
    }

    // Coleta todas as imagens enviadas (imagem1..imagem5)
    const imagens = [];
    for (let i = 1; i <= 5; i++) {
      const anexo = interaction.options.getAttachment(`imagem${i}`);
      if (anexo) imagens.push(anexo);
    }

    if (!imagens.length) {
      // Lista os pedidos confirmados e explica como enviar
      const embed = new EmbedBuilder()
        .setColor(COR)
        .setTitle('🧾 Seus pedidos confirmados')
        .setDescription(
          pedidos.map((p) => `**#${p.id}** — ${p.itemNome} × ${p.quantidade} — ${'R$ ' + p.valor.toFixed(2).replace('.', ',')}`).join('\n') +
          '\n\n**Como enviar o comprovante:**\n' +
          '`/proof imagem1:<arquivo> imagem2:<arquivo> ...` — anexe as fotos da entrega (até 5)'
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Procura o pedido confirmado mais recente sem proof (ou o último)
    const pedido = pedidos.find((p) => !p.proofUrls || !p.proofUrls.length) || pedidos[pedidos.length - 1];

    // Guarda as URLs das imagens no pedido
    pedidoStore.atualizar(interaction.guildId, pedido.id, {
      proofUrls: imagens.map((a) => a.url),
      proofTipo: 'imagem',
    });

    // Publica as imagens + info no canal de proofs (por servidor) para a equipe conferir
    await proofStore.publicarProof(interaction.client, interaction.guildId, interaction.user, pedido, imagens);

    return interaction.reply({
      content: `✅ Comprovante registrado para o pedido **#${pedido.id}** com **${imagens.length} imagem(ns)**. A equipe vai verificar!`,
      flags: MessageFlags.Ephemeral,
    });
  },
};