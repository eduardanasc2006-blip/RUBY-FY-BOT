const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { obter, definir, desativar } = require('../utils/logComprasStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logcompras')
    .setDescription('Define o canal de logs das compras (admin)')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal de texto onde os logs de compras serão enviados')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('desativar')
        .setDescription('use "sim" para desativar os logs de compras')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'comprar')) {
      return interaction.reply({ content: '🔒 Somente administradores ou equipe autorizada.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guildId;
    const desativarOpt = interaction.options.getString('desativar');
    if (desativarOpt && ['sim', 'yes', '1', 'true', 'off'].includes(desativarOpt.toLowerCase()())) {
      desativar(guildId);
      return interaction.reply({ content: '✅ Logs de compras **desativados** neste servidor.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal');
    if (!canal) {
      const atual = obter(guildId);
      if (atual) {
        return interaction.reply({ content: `📋 Logs de compras estão sendo enviados em <#${atual}>.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: '📋 Nenhum canal de logs de compras configurado neste servidor. Use `/logcompras #canal` para definir.', flags: MessageFlags.Ephemeral });
    }

    if (!canal.isTextBased() || !canal.isSendable?.()) {

      return interaction.reply({ content: `❌ ${canal ? 'Este canal não é de texto.' : 'Canal inválido.'} Use um canal de texto.`, flags: MessageFlags.Ephemeral });
    }

    definir(guildId, canal.id);
    return interaction.reply({ content: `✅ Logs de compras serão enviados em ${canal}.`, flags: MessageFlags.Ephemeral });
  },
};