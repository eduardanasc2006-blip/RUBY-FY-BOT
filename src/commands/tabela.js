const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { publishOrUpdatePanel } = require('../utils/panelStore');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Publica (ou atualiza) o painel de conversão no canal'),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({
        content: '🔒 Somente administradores podem publicar o painel de conversão.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { atualizado } = await publishOrUpdatePanel(interaction.channel);

    return interaction.reply({
      content: atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
