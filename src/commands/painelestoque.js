const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { publicarOuAtualizar } = require('../utils/estoquePanelStore');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painelestoque')
    .setDescription('Publica (ou atualiza) o painel fixo de estoque no canal')
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
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'painelestoque')) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal') || interaction.channel;
    const forcarNovo = interaction.options.getBoolean('nova') || false;

    if (!canal.isTextBased() || !canal.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content: `❌ Não posso publicar em <#${canal.id}> (precisa ser um canal de texto com permissão de envio para mim).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const { atualizado } = await publicarOuAtualizar(canal, forcarNovo);

    return interaction.reply({
      content: atualizado
        ? `✅ Painel de estoque **atualizado** em <#${canal.id}>.`
        : `✅ Painel de estoque **publicado** em <#${canal.id}>! Qualquer pessoa pode clicar nas categorias — cada um vê a lista de forma privada.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};