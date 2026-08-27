const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const { resolverCor } = require('../prefixCommands/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Cria uma embed personalizada no canal (admin)')
    .addStringOption((o) => o.setName('titulo').setDescription('Título da embed (deixe vazio para o editor visual)').setRequired(false))
    .addStringOption((o) => o.setName('descricao').setDescription('Texto da embed (deixe vazio para o editor visual)').setRequired(false))
    .addStringOption((o) => o.setName('cor').setDescription('Cor: lilas, roxo, azul, verde, rosa, ou #hex').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem').setDescription('Foto/imagem (upload)').setRequired(false))
    .addStringOption((o) => o.setName('link_imagem').setDescription('Link da imagem (alternativa)').setRequired(false)),

  async execute(interaction) {
    if (!comandoPode(interaction.member, interaction.user.id, 'embed')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const cor = interaction.options.getString('cor');
    const anexo = interaction.options.getAttachment('imagem');
    const link = interaction.options.getString('link_imagem');

    // Sem título e sem descrição: abre o editor visual (mesmo comportamento do !embed sem args).
    // Isso vale também em DM (User Install), onde montar uma embed e enviar para um canal
    // do servidor é feito pela seleção de canal dentro do editor.
    if ((!titulo || !titulo.trim()) && (!descricao || !descricao.trim())) {
      const { buildPainel, getSessao, buildEmbed, limparSessao } = require('../utils/embedPainel');
      const sessao = getSessao(interaction.user.id);
      if (cor) sessao.cor = cor;
      if (anexo && anexo.contentType?.startsWith('image/')) sessao.imagem = anexo.url;
      else if (link && link.startsWith('http')) sessao.imagem = link;
      if (interaction.guild) {
        return interaction.reply({ ...buildPainel(interaction.user.id), flags: MessageFlags.Ephemeral });
      }
      // Em DM não dá para publicar no servidor; avisa para usar no servidor ou usa o editor com envio direto.
      return interaction.reply({
        content: '⚠️ O editor **precisa ser usado no servidor** (ou use `/embed titulo:… descricao:…` na DM).',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(resolverCor(cor))
      .setTitle(titulo)
      .setDescription(descricao);

    // Anexo (upload) tem prioridade sobre link
    if (anexo && anexo.contentType?.startsWith('image/')) {
      embed.setImage(anexo.url);
    } else if (link && link.startsWith('http')) {
      embed.setImage(link);
    }

    if (titulo.length > 256) {
      return interaction.reply({ content: '❌ O **título** deve ter no máximo 256 caracteres.', flags: MessageFlags.Ephemeral });
    }
    if (descricao.length > 4096) {
      return interaction.reply({ content: '❌ A **descrição** deve ter no máximo 4096 caracteres.', flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild) {
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: '✅ Embed publicada!', flags: MessageFlags.Ephemeral });
    }
    // Em DM, envia para o próprio usuário (não existe canal de servidor para publicar).
    await interaction.reply({ content: '📩 Aqui está sua embed:', embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {
      interaction.followUp({ content: '📩 Aqui está sua embed:', embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
    });
    return;
  },
};
