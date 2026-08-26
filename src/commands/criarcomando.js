const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const custom = require('../utils/customCommands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('criarcomando')
    .setDescription('Cria um comando personalizado (admin)')
    .addStringOption((o) => o.setName('nome').setDescription('Nome do comando (sem espaços)').setRequired(true))
    .addStringOption((o) => o.setName('descricao').setDescription('Descrição do comando').setRequired(true))
    .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem de resposta').setRequired(true))
    .addBooleanOption((o) => o.setName('ephemeral').setDescription('Resposta privada (ephemeral)? Padrão: sim').setRequired(false))
    .addStringOption((o) => o.setName('copiaveis').setDescription('Itens copiáveis: nome:valor; nome2:valor2').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores podem usar este comando.', flags: MessageFlags.Ephemeral });
    }

    const nome = interaction.options.getString('nome').trim();
    const descricao = interaction.options.getString('descricao').trim();
    const mensagem = interaction.options.getString('mensagem').trim();
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
    const copiaveisBruto = interaction.options.getString('copiaveis') || '';

    if (!/^[a-z0-9_-]+$/i.test(nome)) {
      return interaction.reply({ content: '❌ Nome inválido. Use apenas letras, números, `-` ou `_` (sem espaços).', flags: MessageFlags.Ephemeral });
    }
    if (custom.existe(nome)) {
      return interaction.reply({ content: `❌ O comando \`${nome}\` já existe. Use \`/gerenciarcomandos\` para editar.`, flags: MessageFlags.Ephemeral });
    }

    // Parse copiaveis: "PIX:12345678900; WhatsApp:11999998888"
    const copiaveis = copiaveisBruto
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [n, ...v] = s.split(':');
        return { nome: n.trim(), valor: v.join(':').trim() };
      })
      .filter((c) => c.nome && c.valor);

    const cmd = custom.criar(nome, { descricao, mensagem, ephemeral, copiaveis });
    if (!cmd) {
      return interaction.reply({ content: '❌ Não consegui criar o comando.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({
      content: `✅ Comando \`/${nome}\` criado!\n` +
        (copiaveis.length ? `📋 ${copiaveis.length} conteúdo(s) copiável(is): ${copiaveis.map((c) => c.nome).join(', ')}` : 'Sem conteúdo copiável.'),
      flags: MessageFlags.Ephemeral,
    });
  },
};
