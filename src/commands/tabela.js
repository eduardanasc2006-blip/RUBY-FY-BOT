const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { publishOrUpdatePanel } = require('../utils/panelStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Publica (ou atualiza) o painel de conversão no canal'),

  async execute(interaction) {
    const ids = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const autorizado =
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      ids.includes(interaction.user.id);

    if (!autorizado) {
      return interaction.reply({
        content: '🔒 Somente administradores podem publicar o painel de conversão.',
        ephemeral: true,
      });
    }

    const { atualizado } = await publishOrUpdatePanel(interaction.channel);

    return interaction.reply({
      content: atualizado
        ? '✅ Painel de conversão **atualizado** com as taxas atuais.'
        : '✅ Painel de conversão publicado! Qualquer pessoa pode usar os botões.',
      ephemeral: true,
    });
  },
};
