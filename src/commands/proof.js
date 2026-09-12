const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const pedidoStore = require('../utils/pedidoStore');
const proofStore = require('../utils/proofStore');

const COR = 0xbeb6ff;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proof')
    .setDescription('Envia o comprovante (proof) de pagamento dos seus pedidos confirmados')
    .addStringOption((option) =>
      option
        .setName('link')
        .setDescription('Link do comprovante (print, imagur, etc.)')
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

    const link = interaction.options.getString('link');
    if (!link) {
      const embed = new EmbedBuilder()
        .setColor(COR)
        .setTitle('🧾 Seus pedidos confirmados')
        .setDescription(
          pedidos.map((p) => `**#${p.id}** — ${p.itemNome} × ${p.quantidade} — ${'R$ ' + p.valor.toFixed(2).replace('.', ',')}`).join('\n') +
          '\n\nUse `/proof link:<url>` para enviar seu comprovante.'
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Procura o pedido confirmado mais recente sem proof para vincular o link
    const pedido = pedidos.find((p) => !p.proofUrl) || pedidos[pedidos.length - 1];
    pedidoStore.atualizar(interaction.guildId, pedido.id, { proofUrl: link });

    // Publica o proof no canal configurado (se houver) para a equipe conferir
    await proofStore.publicarProof(interaction.client, interaction.guildId, interaction.user, pedido, link);

    return interaction.reply({
      content: `✅ Comprovante registrado para o pedido **#${pedido.id}**. A equipe vai verificar!`,
      flags: MessageFlags.Ephemeral,
    });
  },
};