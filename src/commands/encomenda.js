const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { escolherCategoria } = require('../utils/encomendaPanel');
const encomendaStore = require('../utils/encomendaStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('encomenda')
    .setDescription('Encomenda um item que não está disponível no estoque imediato'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Use este comando dentro de um servidor (ex.: canal de ticket).',
        flags: MessageFlags.Ephemeral,
      });
    }
    // Painel publico no ticket: o cliente escolhe categoria/produto/quantidade
    // e confirma. Nada e reservado nem baixado do estoque nesta etapa.
    const conteudo = escolherCategoria(interaction.guildId);
    try {
      const enviada = await interaction.reply({ ...conteudo, fetchReply: true });
      // Registra a posse do painel para as acoes seguintes (mesmo padrao do
      // /comprar: painel publico, so quem iniciou navega/confirma).
      if (enviada?.id) encomendaStore.registrarPainel(interaction.guildId, enviada.id, interaction.user.id);
      return enviada;
    } catch {
      return interaction.reply(conteudo).catch(() => {});
    }
  },
};