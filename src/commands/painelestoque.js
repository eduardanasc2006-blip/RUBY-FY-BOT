const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { publicarOuAtualizar } = require('../utils/estoquePanelStore');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painelestoque')
    .setDescription('Publica (ou atualiza) o painel fixo de estoque no canal'),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const { atualizado } = await publicarOuAtualizar(interaction.channel, false);

    return interaction.reply({
      content: atualizado
        ? '✅ Painel de estoque **atualizado**.'
        : '✅ Painel de estoque publicado! Qualquer pessoa pode clicar nas categorias — cada um vê a lista de forma privada.',
      flags: MessageFlags.Ephemeral,
    });
  },
};