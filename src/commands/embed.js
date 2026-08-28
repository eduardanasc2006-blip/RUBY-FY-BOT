const { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const { resolverCor } = require('../prefixCommands/embed');
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
    const canalOpcao = interaction.options.getChannel('canal');

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

    // Publica direto quando houver conteúdo suficiente: fields OU titulo+descricao.

    // Caso contrário (campo solto ou vazio), abre o editor visual pre-preenchido



    const temConteudoDireto = !!(fields.length || (titulo && titulo.trim() && descricao && descricao.trim()));

    if (!temConteudoDireto) {

      // Pre-preenche o editor visual com o que veio (imagem, titulo, descricao, cor)


      const sessao = getSessao(interaction.user.id);
      if (cor) sessao.cor = cor;

      if (imagem) sessao.imagem = imagem;

      if (titulo && titulo.trim()) sessao.titulo = titulo.trim();

      if (descricao && descricao.trim()) sessao.descricao= descricao.trim();

      return interaction.reply({ ...buildPainel(interaction.user.id), flags: MessageFlags.Ephemeral });
    }



    // Monta a embed final (mesma logica do buildEmbed do editor: valida tamanhos e


    // garante descricao invisivel quando nao houver, para nunca falhar na API).


    const embed = new EmbedBuilder()
      .setColor(resolverCor(cor));
    if (titulo) embed.setTitle(titulo.slice(0, 256));
    if (descricao) embed.setDescription(descricao.slice(0, 4096));
    if (imagem) embed.setImage(imagem);
    if (fields.length) embed.addFields(fields);
    if (!descricao) embed.setDescription('\u200b');

    // Canal: o informado, senao o atual; valida se é canal de texto com permissao



    let canal = canalOpcao || interaction.channel;
    if (canal && interaction.guild && !(canal.isTextBased() && !canal.isThread() && canal.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages))) {


      return interaction.reply({ content: `❌ Não posso publicar em <#${canal.id}> (precisa ser um canal de texto com permissão de envio para mim.`, flags: MessageFlags.Ephemeral });
    }



    // Sem guild (DM: envia na DM do próprio usuário)

    if (!interaction.guild || !canal) {



      try {
        await interaction.user.send({ embeds: [embed] });

      } catch {
        return interaction.reply({ content: '❌ Não consegui te enviar a embed na DM.', flags: MessageFlags.Ephemeral });

      }
      return interaction.reply({ content: '📩 Embed enviada na sua DM)', flags: MessageFlags.Ephemeral });

    }



    // Publica no canal escolhido com mensagem efêmera confirmando

    try {
      await canal.send({ embeds: [embed] });

    } catch (sendError) {
      console.error('[Embed] Falha ao enviar no canal:', sendError?.message || sendError);
      return interaction.reply({ content: `❌ Não consegui enviar em <#${canal.id}>. Verifique minha permissão nesse canal.`, flags: MessageFlags.Ephemeral });

    }




    return interaction.reply({ content: `✅ Embed publicada em <#${canal.id}>)`, flags: MessageFlags.Ephemeral });

  },
};