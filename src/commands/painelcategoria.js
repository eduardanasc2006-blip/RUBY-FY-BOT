const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const estoque = require('../utils/estoque');
const painelCategoria = require('../prefixCommands/painelcategoria');
const { isAdmin } = require('../prefixCommands/settaxa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painelcategoria')
    .setDescription('Fixa no canal os produtos de uma categoria (admin)')
    .addStringOption((option) =>
      option
        .setName('categoria')
        .setDescription('ID da categoria (ex: mm2, ftf). Deixe vazio para abrir o seletor.')
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal para publicar (padrão: canal atual)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'painelcategoria')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.options.getChannel('canal') || interaction.channel;

    // Sem categoria informada: abre o seletor visual (mesmo comportamento do !painelcategoria sem args)
    const catBruto = interaction.options.getString('categoria');
    if (!catBruto || !catBruto.trim()) {
      const selecao = painelCategoria.construirPainelSelecao();
      return interaction.reply({ ...selecao, content: selecao.content || '📌 Escolha a categoria para fixar:', flags: MessageFlags.Ephemeral });
    }

    const catId = catBruto.toLowerCase().trim();
    const embed = painelCategoria.buildCategoria(catId);
    if (!embed) {
      const cats = estoque.categorias().map((c) => `\`${c.id}\``).join(', ') || '(nenhuma)';
      return interaction.reply({ content: `❌ Categoria \`${catId}\` não encontrada. Categorias: ${cats}`, flags: MessageFlags.Ephemeral });
    }

    if (!canal.isTextBased() || !canal.permissionsFor(interaction.guild.members.me)?.has('SendMessages')) {
      return interaction.reply({
        content: `❌ Não posso publicar em <#${canal.id}> (precisa ser um canal de texto com permissão de envio para mim).`,
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const msg = await canal.send({ embeds: [embed] });
    painelCategoria.salvar(msg.id, catId, canal.id);

    return interaction.editReply({ content: `✅ Painel da categoria **${catId}** fixado em <#${canal.id}>.` });
  },
};
