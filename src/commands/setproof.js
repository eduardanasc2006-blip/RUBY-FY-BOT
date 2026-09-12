const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { obter, definir, desativar } = require('../utils/proofStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setproof')
    .setDescription('Define o canal para onde os comprovantes (proofs) serão enviados (admin)')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal de texto para os proofs')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('desativar')
        .setDescription('use "sim" para desativar o envio de proofs')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'comprar')) {
      return interaction.reply({ content: '🔒 Somente administradores ou equipe autorizada.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guildId;
    const desativarOpt = interaction.options.getString('desativar');
    if (desativarOpt && ['sim', 'yes', '1', 'true', 'off'].includes(desativarOpt.toLowerCase())) {
      desativar(guildId);
      return interaction.reply({ content: '✅ Envio de proofs **desativado** neste servidor.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal');
    if (!canal) {
      const atual = obter(guildId);
      if (atual) {
        return interaction.reply({ content: `📋 Proofs serão enviados em <#${atual}>.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: '📋 Nenhum canal de proofs configurado. Use `/setproof #canal`.', flags: MessageFlags.Ephemeral });
    }

    if (!canal.isTextBased() || !canal.isSendable?.()) {
      return interaction.reply({ content: '❌ Use um canal de texto.', flags: MessageFlags.Ephemeral });
    }

    definir(guildId, canal.id);
    return interaction.reply({ content: `✅ Proofs serão enviados em ${canal}.`, flags: MessageFlags.Ephemeral });
  },
};