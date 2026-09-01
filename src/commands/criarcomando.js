const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { camposValidos } = require('../utils/embedPainel');
const { comandoPode } = require('../utils/permissions');
const { isAdmin } = require('../prefixCommands/settaxa');
const custom = require('../utils/customCommands');
const { registrarUm } = require('../utils/customSync');

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
    .addStringOption((o) => o.setName('nome').setDescription('Nome do comando (pode usar espaço; vira - no /)').setRequired(true))
    .addStringOption((o) => o.setName('descricao').setDescription('Descrição do comando').setRequired(true))
    .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem de resposta').setRequired(true))
    .addBooleanOption((o) => o.setName('ephemeral').setDescription('Resposta privada (ephemeral)? Padrão: sim').setRequired(false))
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
    .addStringOption((o) => o.setName('copiaveis').setDescription('Itens: nome:tipo:valor; — tipo: copiavel ou link').setRequired(false)),

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
    if (custom.existe(nomeSlug)) {
      return interaction.reply({ content: `❌ O comando \`${nome}\` já existe. Use \`/gerenciarcomandos\` para editar.`, flags: MessageFlags.Ephemeral });
    }

    // Parse copiaveis: "nome:tipo:valor" separados por ;
    // tipo: copiavel (ou copia/copiar) | link
    // Ex: "PIX:copiavel:12345678900; Instagram:link:https://instagram.com/rubyfy"
    let linkInvalido = null;
    const copiaveis = copiaveisBruto
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        // Formato: nome:tipo:valor — mas URLs tem : (https://), entao pega os 2 primeiros e junta o resto
        const idx1 = s.indexOf(':');
        const idx2 = s.indexOf(':', idx1 + 1);
        let nome;
        let tipo;
        let valor;
        if (idx1 === -1) {
          // Apenas o valor (sem nome:tipo:): rotulo generico, valor = a string inteira
          nome = 'Copiar';
          tipo = 'copiavel';
          valor = s;
        } else if (idx2 === -1) {
          // nome:valor (copiavel por padrao)
          nome = s.slice(0, idx1).trim();
          tipo = 'copiavel';
          valor = s.slice(idx1 + 1).trim();
        } else {
          // nome:tipo:valor
          nome = s.slice(0, idx1).trim();
          tipo = s.slice(idx1 + 1, idx2).trim().toLowerCase();
          valor = s.slice(idx2 + 1).trim();
        }
        if (!nome || !valor) return null;
        // Normaliza tipo
        const tipoFinal = ['link', 'url'].includes(tipo) ? 'link' : 'copiavel';
        let valorFinal = valor;
        // Valida link: normaliza para https:// se nao tiver protocolo
        if (tipoFinal === 'link') {
          if (!/^https?:\/\//i.test(valorFinal)) valorFinal = 'https://' + valorFinal;
          try {
            new URL(valorFinal);
          } catch {
            if (!linkInvalido) linkInvalido = { nome };
            return null;
          }
        }
        return { nome, tipo: tipoFinal, valor: valorFinal };
      })
      .filter(Boolean);

    if (linkInvalido) {
      return interaction.reply({ content: `❌ O link \`${linkInvalido.nome}\` não é uma URL válida. Use formato: https://...`, flags: MessageFlags.Ephemeral });
    }

    // O Discord limita a 5 botoes por linha: limita a criacao p/ nao haver itens "fantasma"
    // (criar mais de 5 criaria itens sem botao proprio, confundindo o painel).
    const COPIAVEIS_MAX = 5;
    if (copiaveis.length > COPIAVEIS_MAX) {
      return interaction.reply({
        content: `❌ Máximo de **${COPIAVEIS_MAX}** conteúdos copiáveis por comando (limite do Discord).`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = (tituloEmbed || corEmbed || imagemEmbed || fieldsEmbed.length)
      ? { titulo: tituloEmbed, descricao: descricao, cor: corEmbed, imagem: imagemEmbed, fields: fieldsEmbed }
      : null;
    const cmd = custom.criar(nomeSlug, { nome, descricao, mensagem, ephemeral, copiaveis, embed });
    if (!cmd) {
      return interaction.reply({ content: '❌ Não consegui criar o comando.', flags: MessageFlags.Ephemeral });
    }

    // Registra o comando no Discord para que o /nome apareca e responda.
    try {
      await registrarUm(interaction.client, nomeSlug, descricao);
    } catch (error) {
      console.error('[criarcomando] Falha ao registrar no Discord:', error?.message || error);
      return interaction.reply({
        content: `✅ Comando \`/${nome}\` salvo, mas não consegui registrá-lo no Discord agora.\n` +
          'Tente de novo daqui a pouco ou reinicie o bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const aviso = copiaveis.length
      ? `📋 ${copiaveis.length} conteúdo(s) copiável(is): ${copiaveis.map((c) => c.nome).join(', ')}`
      : 'Sem conteúdo copiável.';

    return interaction.reply({
      content: `✅ Comando \`/${nome}\` criado!\n${aviso}\n` +
        '🕒 Pode levar alguns minutos até o / aparecer para todos no servidor (o Discord atualiza globalmente).',
      flags: MessageFlags.Ephemeral,
    });
  },
};
