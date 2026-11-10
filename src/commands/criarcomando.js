const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { camposValidos } = require('../utils/embedPainel');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const custom = require('../utils/customCommands');
const { parseCopiaveis, montarBotoes } = require('../utils/copiaveis');
const { normalizarUrl } = require('../utils/links');

// Nomes de comandos nativos do bot (nao podem ser usado por comandos personalizados,
// senao o comando nativo sempre "vence" e o personalizado fica sem funcionar)
const COMANDOS_RESERVADOS = [
  'ajuda', 'backup', 'calc', 'canalavisos', 'configestoque', 'configtaxa', 'criarcomando',
  'embed', 'estoque', 'gamepass', 'gerenciarcomandos', 'info', 'limpar', 'lock',
  'mensagem', 'modelos', 'painel', 'painelcategoria', 'painelestoque', 'permissoes',
  'ping', 'reais', 'robux', 'rolegive', 'settaxa', 'setwelcome', 'tabela',
  'taxa', 'testwelcome', 'unlock',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('criarcomando')
    .setDescription('Cria um comando personalizado (admin)')
    .addStringOption((o) => o.setName('nome').setDescription('Nome do comando (pode usar espaço; vira - no !)').setRequired(true))
    .addStringOption((o) => o.setName('descricao').setDescription('Descrição do comando').setRequired(true))
    .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem de resposta').setRequired(true))
    .addBooleanOption((o) => o.setName('ephemeral').setDescription('Botão copiável responde em privado (só quem clica vê)? Padrão: sim').setRequired(false))
    .addStringOption((o) => o.setName('titulo').setDescription('Título da embed (opcional)').setRequired(false))
    .addStringOption((o) => o.setName('cor').setDescription('Cor: lilas, roxo, azul, verde, rosa, ou #hex (opcional)').setRequired(false))
    .addStringOption((o) => o.setName('imagem').setDescription('URL da imagem da embed (opcional)').setRequired(false))
    .addAttachmentOption((o) => o.setName('imagem_anexo').setDescription('Ou anexe a imagem aqui (opcional; tem prioridade sobre a URL)').setRequired(false))
    .addStringOption((o) => o.setName('field_nome').setDescription('Nome do 1º campo (opcional)').setRequired(false))
    .addStringOption((o) => o.setName('field_valor').setDescription('Valor do 1º campo (opcional)').setRequired(false))
    .addBooleanOption((o) => o.setName('field_inline').setDescription('1º campo em linha? (padrão: sim)').setRequired(false))
    .addStringOption((o) => o.setName('field2_nome').setDescription('Nome do 2º campo (opcional)').setRequired(false))
    .addStringOption((o) => o.setName('field2_valor').setDescription('Valor do 2º campo (opcional)').setRequired(false))
    .addBooleanOption((o) => o.setName('field2_inline').setDescription('2º campo em linha?').setRequired(false))
    .addStringOption((o) => o.setName('link_rotulo').setDescription('Texto do botão de link (opcional; ex: Entrar no servidor)').setRequired(false))
    .addStringOption((o) => o.setName('link_url').setDescription('URL do botão de link (opcional; ex: discord.gg/abc). Botão que redireciona ao clicar.').setRequired(false))
    .addStringOption((o) => o.setName('copiaveis').setDescription('Itens copiáveis: nome:valor; (ou nome:copiavel:valor). Ex: PIX:12345678900').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'criarcomando')) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const nome = interaction.options.getString('nome').trim();
    const descricao = interaction.options.getString('descricao').trim();
    const mensagem = interaction.options.getString('mensagem').trim();
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
    const copiaveisBruto = interaction.options.getString('copiaveis') || '';
    const tituloEmbed = (interaction.options.getString('titulo') || '' ).trim() || null;
    const corEmbed = (interaction.options.getString('cor') || '' ).trim() || null;
    const anexoImg = interaction.options.getAttachment('imagem_anexo');
    const imagemEmbed = ((anexoImg && anexoImg.contentType && anexoImg.contentType.startsWith('image/')) ? anexoImg.url : (interaction.options.getString('imagem') || '').trim()) || null;
    const fieldsBrutos = [
      { name: interaction.options.getString('field_nome'), value: interaction.options.getString('field_valor'), inline: interaction.options.getBoolean('field_inline') ?? true },
      { name: interaction.options.getString('field2_nome'), value: interaction.options.getString('field2_valor'), inline: interaction.options.getBoolean('field2_inline') ?? true },
    ].filter((f) => f.name || f.value);
    const fieldsEmbed = camposValidos(fieldsBrutos);

    // O nome informado pode ter espacos; o Discord nao aceita espaco em comandos /,
    // entao geramos um slug com hifen no lugar dos espacos (ex: "Ruby Fisk" -> ruby-fisk).
    const nomeSlug = nome.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    if (!nomeSlug) return interaction.reply({ content: '❌ Informe um nome para o comando.', flags: MessageFlags.Ephemeral });
    if (!/^[a-z0-9_-]+$/i.test(nomeSlug)) {
      return interaction.reply({ content: '❌ Nome inválido. Use letras, números, espaço, `-` ou `_`.', flags: MessageFlags.Ephemeral });
    }
    if (nomeSlug.length > 32) {
      return interaction.reply({ content: '❌ O nome deve ter no máximo 32 caracteres (limite do Discord).', flags: MessageFlags.Ephemeral });
    }
    if (COMANDOS_RESERVADOS.includes(nomeSlug)) {
      return interaction.reply({ content: `❌ O nome **${nome}** é um comando padrão do bot. Escolha outro nome.`, flags: MessageFlags.Ephemeral });
    }
    if (custom.existe(interaction.guildId, nomeSlug)) {
      return interaction.reply({ content: `❌ O comando \`${nome}\` já existe neste servidor. Use \`/gerenciarcomandos\` para editar.`, flags: MessageFlags.Ephemeral });
    }

    // Copiaveis (botoes de copiar) + link dedicado (botao que abre uma URL).
    // Formato dos copiaveis: "nome:valor" ou "nome:tipo:valor" separados por ";".
    const COPIAVEIS_MAX = 5;
    const { itens: copiaveisBase, linkInvalido, excedeu } = parseCopiaveis(copiaveisBruto, COPIAVEIS_MAX);
    if (linkInvalido) {
      return interaction.reply({ content: `❌ O link \`${linkInvalido.nome}\` não é uma URL válida (use http/https).`, flags: MessageFlags.Ephemeral });
    }
    if (excedeu) {
      return interaction.reply({
        content: `❌ Máximo de **${COPIAVEIS_MAX}** conteúdos copiáveis por comando (limite do Discord).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Botão de link dedicado (link_rotulo/link_url) — atalho pra criar comando de
    // entrega sem saber o formato "nome:link:valor".
    const linkRotuloBruto = (interaction.options.getString('link_rotulo') || '').trim();
    const linkUrlBruto = (interaction.options.getString('link_url') || '').trim();
    if (linkUrlBruto && !normalizarUrl(linkUrlBruto)) {
      return interaction.reply({ content: '❌ A URL do botão de link é inválida (use http/https).', flags: MessageFlags.Ephemeral });
    }
    if (linkUrlBruto && !linkRotuloBruto) {
      return interaction.reply({ content: '❌ Informe o **texto do botão** (`link_rotulo`) junto com a URL.', flags: MessageFlags.Ephemeral });
    }
    const copiaveis = montarBotoes({ linkRotulo: linkRotuloBruto, linkUrl: linkUrlBruto, copiaveis: copiaveisBase }, COPIAVEIS_MAX);

    const embed = (tituloEmbed || corEmbed || imagemEmbed || fieldsEmbed.length)
      ? { titulo: tituloEmbed, descricao: descricao, cor: corEmbed, imagem: imagemEmbed, fields: fieldsEmbed }
      : null;
    const cmd = custom.criar(interaction.guildId, nomeSlug, { nome, descricao, mensagem, ephemeral, copiaveis, embed });
    if (!cmd) {
      return interaction.reply({ content: '❌ Não consegui criar o comando.', flags: MessageFlags.Ephemeral });
    }

    const botoes = copiaveis.map((c) => (c.tipo === 'link' ? `🔗 ${c.nome}` : `📋 ${c.nome}`));
    const aviso = botoes.length ? `${botoes.length} botão(ões): ${botoes.join(', ')}` : 'Sem botões.';
    const privado = ephemeral ? '\n🔒 O botão copiável responde em **privado** (só quem clica vê).' : '\n🌐 O botão copiável responde em **público** (todos veem).';

    return interaction.reply({
      content: `✅ Comando \`!${nome}\` criado!\n${aviso}${privado}\n` +
        'Use **!comandos** para ver os comandos personalizados.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
