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
    .addStringOption((o) => o.setName('copiaveis').setDescription('Itens: nome:tipo:valor; — tipo: copiavel ou link').setRequired(false)),

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

    // Parse copiaveis: "nome:tipo:valor" separados por ;
    // tipo: copiavel (ou copia/copiar) | link
    // Ex: "PIX:copiavel:12345678900; Instagram:link:https://instagram.com/rubyfy"
    const copiaveis = copiaveisBruto
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        // Formato: nome:tipo:valor — mas URLs tem : (https://), entao pega os 2 primeiros e junta o resto
        const idx1 = s.indexOf(':');
        const idx2 = s.indexOf(':', idx1 + 1);
        if (idx2 === -1) {
          // nome:valor (copiavel por padrao)
          return { nome: s.slice(0, idx1).trim(), tipo: 'copiavel', valor: s.slice(idx1 + 1).trim() };
        }
        // nome:tipo:valor
        return {
          nome: s.slice(0, idx1).trim(),
          tipo: s.slice(idx1 + 1, idx2).trim().toLowerCase(),
          valor: s.slice(idx2 + 1).trim(),
        };
      })
      .filter((c) => c.nome && c.valor)
      .map((c) => {
        // Normaliza tipo
        const tipo = ['link', 'url'].includes(c.tipo) ? 'link' : 'copiavel';
        let valor = c.valor;
        // Valida link: normaliza para https:// se nao tiver protocolo
        if (tipo === 'link') {
          if (!/^https?:\/\//i.test(valor)) valor = 'https://' + valor;
          // Valida URL
          try { new URL(valor); } catch { return null; }
        }
        return { nome: c.nome, tipo, valor };
      })
      .filter(Boolean);

    // Valida: links precisam ser URL valida
    const linkInvalido = copiaveis.find((c) => c.tipo === 'link' && !/^https?:\/\/.+/i.test(c.valor));
    if (linkInvalido) {
      return interaction.reply({ content: `❌ O link \`${linkInvalido.nome}\` não é uma URL válida. Use formato: https://...`, flags: MessageFlags.Ephemeral });
    }

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
