const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildSorteioPainel } = require('../utils/sorteioPainel');
const { comandoPode } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Cria um sorteio (admin)')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal onde publicar o sorteio').setRequired(false))
    .addRoleOption((o) => o.setName('cargo').setDescription('Cargo obrigatório para participar').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'sorteio')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const canal = interaction.options.getChannel('canal');
    const cargo = interaction.options.getRole('cargo');
    return interaction.reply(buildSorteioPainel(interaction.guildId, interaction.user.id, canal ? canal.id : null, cargo ? cargo.id : null));
  },
};