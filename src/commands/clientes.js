const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildClientesPainel } = require('../utils/clientesPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clientes')
    .setDescription('Lista os clientes que já compraram, com o gasto e o número de vendas (adm)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'clientes')) {
      return interaction.reply({
        content: '🔒 Somente administradores ou equipe autorizada.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({ ...buildClientesPainel(interaction.guildId, 0), flags: MessageFlags.Ephemeral });
  },
};
