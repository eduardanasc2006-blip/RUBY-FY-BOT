const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { buildListaClientes } = require('../utils/clientesPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clientes')
    .setDescription('Painel de clientes: veja e gerencie quem já comprou (adm)'),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'clientes')) {
      return interaction.reply({
        content: '🔒 Somente administradores ou equipe autorizada.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({ ...buildListaClientes(interaction.guild, 0), flags: MessageFlags.Ephemeral });
  },
};
