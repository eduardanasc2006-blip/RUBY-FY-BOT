const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { definir } = require('../utils/avisos');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canalavisos')
    .setDescription('Define o canal de avisos de estoque esgotado (admin)')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal onde os avisos serão enviados')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal') || interaction.channel;
    definir(canal.id);
    return interaction.reply({ content: `✅ Avisos de estoque serão enviados em ${canal}.`, flags: MessageFlags.Ephemeral });
  },
};
