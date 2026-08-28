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

    // Sem título E/OU sem descrição: abre o mesmo editor visual do !embed sem args.
    // Assim o /embed nunca monta uma embed inválida (o Discord exige description
    // ou fields) e reutiliza todo o editor (título, descrição, cor, imagem,
    // thumbnail, autor, rodapé, fields, preview, voltar, enviar, cancelar).
    // Com anexo/link, o editor já vem com a imagem pré-preenchida.
    // Se um dos dois campos (título ou descrição) vier informado, o /embed
    // pré-preenche ele no editor visual e mantém todos os demais campos disponíveis
    // pelos botões do editor; se nenhum vier, abre o editor vazio (igual ao !embed).
    // Assim nunca perde o que o usuário já digitou nem monta embed inválida.

    if (!titulo || !titulo.trim() || !descricao || !descricao.trim()) {
      const { buildPainel, getSessao } = require('../utils/embedPainel');
      const sessao = getSessao(interaction.user.id);
      if (cor) sessao.cor = cor;
      if (anexo && anexo.contentType?.startsWith('image/')) sessao.imagem = anexo.url;
      else if (link && link.startsWith('http')) sessao.imagem = link;
      if (titulo && titulo.trim()) sessao.titulo = titulo.trim();
      if (descricao && descricao.trim()) sessao.descricao = descricao.trim();
      // Mesmo editor visual do !embed sem args. Em DM o envio funciona quando o
      // bot está no servidor e o editor oferece o seletor de canal.
      return interaction.reply({ ...buildPainel(interaction.user.id), flags: MessageFlags.Ephemeral });
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
