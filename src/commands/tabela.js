const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { publishOrUpdatePanel } = require('../utils/panelStore');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tabela')
    .setDescription('Publica (ou atualiza) o painel de conversão no canal')
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription('Canal para publicar (padrão: canal atual)')
        .setRequired(false)
    )
    .addBooleanOption((o) =>
      o
        .setName('nova')
        .setDescription('Forçar publicação de um painel novo (mesmo se já existir)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'tabela')) {
      return interaction.reply({
        content: '🔒 Somente administradores podem publicar o painel de conversão.',
        flags: MessageFlags.Ephemeral,
      });
    }

    let canal = interaction.options.getChannel('canal') || interaction.channel;
    const forcarNovo = interaction.options.getBoolean('nova') || false;

    // Respeita permissão: só publica em canais onde o bot pode enviar.
    if (!canal.isTextBased() || !canal.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content: `❌ Não posso publicar em <#${canal.id}> (precisa ser um canal de texto com permissão de envio para mim).`,
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { atualizado } = await publishOrUpdatePanel(canal, forcarNovo);

    return interaction.editReply({
      content: atualizado
        ? `✅ Painel de conversão **atualizado** em <#${canal.id}> com as taxas atuais.`
        : `✅ Painel de conversão **publicado** em <#${canal.id}>! Qualquer pessoa pode usar os botões.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
