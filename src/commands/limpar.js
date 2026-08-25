const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Apaga mensagens do canal (admin)')
    .addIntegerOption((option) =>
      option
        .setName('quantidade')
        .setDescription('Quantas mensagens apagar (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const qtd = interaction.options.getInteger('quantidade');
    try {
      const apagadas = await interaction.channel.bulkDelete(qtd, true);
      return interaction.reply({ content: `🧹 ${apagadas.size} mensagens apagadas.`, flags: MessageFlags.Ephemeral });
    } catch {
      return interaction.reply({ content: '❌ Não consegui apagar. Mensagens com mais de 14 dias não podem ser removidas em massa.', flags: MessageFlags.Ephemeral });
    }
  },
};
