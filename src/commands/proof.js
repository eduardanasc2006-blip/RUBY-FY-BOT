const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const pedidoStore = require('../utils/pedidoStore');
const proofStore = require('../utils/proofStore');

const COR = 0xbeb6ff;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Envia o comprovante (proof) de pagamento dos seus pedidos confirmados')
    .addAttachmentOption((option) =>
      option
        .setName('imagem')
        .setDescription('Imagem do comprovante/entrega (print) — envie o arquivo aqui')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('link')
        .setDescription('Link do comprovante (print, imgur, etc.) — alternativa à imagem')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Use este comando dentro de um servidor.', flags: MessageFlags.Ephemeral });
    }

    const pedidos = pedidoStore.doCliente(interaction.guildId, interaction.user.id, 'confirmado');
    if (!pedidos.length) {
      return interaction.reply({ content: '❌ Nenhum pedido confirmado seu aguardando comprovante.', flags: MessageFlags.Ephemeral });
    }

    const imagem = interaction.options.getAttachment('imagem');
    const link = interaction.options.getString('link');

    if (!imagem && !link) {
      // Lista os pedidos confirmados e explica como enviar
      const embed = new EmbedBuilder()
        .setColor(COR)
        .setTitle('🧾 Seus pedidos confirmados')
        .setDescription(
          pedidos.map((p) => `**#${p.id}** — ${p.itemNome} × ${p.quantidade} — ${'R$ ' + p.valor.toFixed(2).replace('.', ',')}`).join('\n') +
          '\n\n**Como enviar o comprovante:**\n' +
          '`/proof imagem:<arquivo>` — envie a foto/print direto\n' +
          '`/proof link:<url>` — ou cole um link do comprovante'
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Procura o pedido confirmado mais recente sem proof para vincular o link
    const pedido = pedidos.find((p) => !p.proofUrl) || pedidos[pedidos.length - 1];

    // Guarda a URL do anexo (imagem do Discord) ou o link informado
    const url = imagem ? imagem.url : link;
    pedidoStore.atualizar(interaction.guildId, pedido.id, {
      proofUrl: url,
      proofTipo: imagem ? 'imagem' : 'link',
    });

    // Publica o proof no canal configurado (se houver) para a equipe conferir
    await proofStore.publicarProof(interaction.client, interaction.guildId, interaction.user, pedido, url, imagem ? true : false);

    return interaction.reply({
      content: `✅ Comprovante registrado para o pedido **#${pedido.id}**. A equipe vai verificar!`,
      flags: MessageFlags.Ephemeral,
    });
  },
};