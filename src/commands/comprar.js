const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { escolherCategoria } = require('../utils/comprarPanel');
const carrinhoStore = require('../utils/carrinhoStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Inicia uma compra pelos produtos do estoque'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Use este comando dentro de um servidor (ex.: canal de ticket).',
        flags: MessageFlags.Ephemeral,
      });
    }
    // Registra a posse da mensagem publica do painel: os botoes de quantidade
    // so editam o carrinho de quem iniciou o /comprar.
    const conteudo = escolherCategoria(interaction.guildId, interaction.user.id);
    try {
      const enviada = await interaction.reply({ ...conteudo, fetchReply: true });
      if (enviada?.id) {
        carrinhoStore.setRef(interaction.guildId, interaction.user.id, interaction.channelId, enviada.id);
      }
      return enviada;
    } catch {
      // Sem fetchReply (interacao expirada/DM): mantem o painel funcionando.
      return interaction.reply(conteudo).catch(() => {});
    }
  },
};