const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
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
        .setDescription('ID da categoria (ex: mm2, ftf)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const catId = interaction.options.getString('categoria').toLowerCase().trim();
    const embed = painelCategoria.buildCategoria(catId);
    if (!embed) {
      const cats = estoque.categorias().map((c) => `\`${c.id}\``).join(', ') || '(nenhuma)';
      return interaction.reply({ content: `❌ Categoria \`${catId}\` não encontrada. Categorias: ${cats}`, flags: MessageFlags.Ephemeral });
    }

    const msg = await interaction.channel.send({ embeds: [embed] });
    painelCategoria.salvar(msg.id, catId);

    return interaction.reply({ content: `✅ Painel da categoria **${catId}** fixado no canal.`, flags: MessageFlags.Ephemeral });
  },
};
