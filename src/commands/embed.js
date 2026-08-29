const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const { camposValidos, getSessao, buildPainel } = require('../utils/embedPainel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Cria uma embed personalizada no canal (admin)')
    .addStringOption((o) => o.setName('titulo').setDescription('Título da embed').setRequired(false))
    .addStringOption((o) => o.setName('descricao').setDescription('Texto da embed').setRequired(false))
    .addStringOption((o) => o.setName('cor').setDescription('Cor: lilas, roxo, azul, verde, rosa, ou #hex').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem').setDescription('Foto/imagem (upload)').setRequired(false))
    .addStringOption((o) => o.setName('link_imagem').setDescription('Link da imagem (alternativa)').setRequired(false))
    .addChannelOption((o) => o.setName('canal').setDescription('Canal para publicar (padrão: canal atual)').setRequired(false))
    .addStringOption((o) => o.setName('field_nome').setDescription('Nome do 1º campo (field)').setRequired(false))
    .addStringOption((o) => o.setName('field_valor').setDescription('Valor do 1º campo').setRequired(false))
    .addBooleanOption((o) => o.setName('field_inline').setDescription('1º campo em linha? (padrão: sim)').setRequired(false))
    .addStringOption((o) => o.setName('field2_nome').setDescription('Nome do 2º campo (opcional)').setRequired(false))
    .addStringOption((o) => o.setName('field2_valor').setDescription('Valor do 2º campo (opcional)').setRequired(false))
    .addBooleanOption((o) => o.setName('field2_inline').setDescription('2º campo em linha?').setRequired(false)),

  async execute(interaction) {
    if (!comandoPode(interaction.member, interaction.user.id, 'embed')) {

      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }


    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const cor = interaction.options.getString('cor');
    const anexo = interaction.options.getAttachment('imagem');
    const link = interaction.options.getString('link_imagem');


    // Coleta os fields (até 2 via slash; o editor visual suporta até 25)e valida

    const fieldsBrutos = [
      { name: interaction.options.getString('field_nome'), value: interaction.options.getString('field_valor'), inline: interaction.options.getBoolean('field_inline') ?? true },
      { name: interaction.options.getString('field2_nome'), value: interaction.options.getString('field2_valor'), inline: interaction.options.getBoolean('field2_inline') ?? true },
    ];
    const fields = camposValidos(fieldsBrutos.filter((f) => f.name || f.value));


    // Anexo (upload) tem prioridade sobre link
    let imagem = null;
    if (anexo && anexo.contentType?.startsWith('image/')) imagem = anexo.url;

    else if (link && link.startsWith('http')) imagem = link;


    // ------------------------------------------------------------------
    // Fluxo com revisão (recomendado): qualquer conteúdo vindo pelo slash
    // (título, descrição, imagem/link ou fields) pré-preenche a sessão e
    // abre o editor visual ("caixinha") para o usuário revisar/editar —
    // incluindo os fields já preenchidos e a imagem — e só então "Enviar"
    // (que abre o seletor de canal antes de publicar).
    // Isso garante que fields e imagem por link nunca se percam e o usuário
    // sempre ve o preview antes de publicar.
    // ------------------------------------------------------------------
    const temAlgo = !!(titulo && titulo.trim() || descricao && descricao.trim() || imagem || fields.length);

    if (temAlgo) {

      const sessao = getSessao(interaction.user.id);
      if (cor && cor.trim()) sessao.cor = cor.trim();
      if (imagem) sessao.imagem = imagem;
      if (titulo && titulo.trim()) sessao.titulo = titulo.trim();
      if (descricao && descricao.trim()) sessao.descricao = descricao.trim();
      if (fields.length) sessao.fields = fields;
      return interaction.reply({ ...buildPainel(interaction.user.id, interaction.guildId), flags: MessageFlags.Ephemeral });
    }


    // Nada veio:(ou só canal): abre o editor vazio (igual ao !embed)
    return interaction.reply({ ...buildPainel(interaction.user.id, interaction.guildId), flags: MessageFlags.Ephemeral });
  },
};