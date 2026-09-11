const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { cargosDoCliente } = require('../utils/comprasStore');

const COR = 0xbeb6ff;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cliente')
    .setDescription('Mostra os cargos de cliente conquistados')
    .addUserOption((o) =>
      o
        .setName('usuario')
        .setDescription('Cliente para consultar (padrão: você)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Use este comando dentro de um servidor.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const alvo = interaction.options.getUser('usuario') || interaction.user;
    const cargos = cargosDoCliente(interaction.guildId, alvo.id);

    const embed = new EmbedBuilder()
      .setColor(COR)
      .setTitle('🏆 PERFIL DO CLIENTE')
      .setDescription(
        `👤 Cliente: <@${alvo.id}>\n\n` +
        `**🏆 Cargos conquistados:**\n` +
        (cargos.length ? cargos.map((c) => `• ${c}`).join('\n') : '*Nenhum cargo conquistado ainda.*')
      );

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};