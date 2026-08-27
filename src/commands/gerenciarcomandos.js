const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const custom = require('../utils/customCommands');
const { registrarTodos, excluirUm } = require('../utils/customSync');

// Menu com os comandos salvos para o admin escolher sem digitar o nome.
function menuExcluir() {
  const lista = Object.values(custom.listar());
  if (!lista.length) {
    return {
      content: '📋 Nenhum comando personalizado criado ainda. Use /criarcomando.',
      components: [],
    };
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId('gerencmd:excluir')
    .setPlaceholder('Escolha o comando para excluir…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      lista.slice(0, 25).map((c) => ({
        label: '/' + c.nome,
        description: (c.descricao || (c.mensagem ? 'Resposta personalizada' : 'Sem descrição')).slice(0, 100),
        value: c.nome.toLowerCase(),
      }))
    );
  return {
    content: '🗑️ **Excluir comando personalizado** — selecione abaixo qual apagar:',
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gerenciarcomandos')
    .setDescription('Lista, edita ou exclui comandos personalizados (admin)')
    .addStringOption((o) => o.setName('acao').setDescription('O que fazer').setRequired(true).addChoices(
      { name: 'listar', value: 'listar' },
      { name: 'excluir', value: 'excluir' }
    ))
    .addStringOption((o) => o.setName('nome').setDescription('Nome do comando (para excluir)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild || !isAdmin(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const acao = interaction.options.getString('acao');
    const nome = interaction.options.getString('nome');

    if (acao === 'listar') {
      // Sincroniza antes de listar para garantir que todos os salvos estejam ativos.
      // usa defer pois registrar no Discord (global) pode demorar.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await registrarTodos(interaction.client);
      } catch (error) {
        console.error('[gerenciarcomandos] Erro ao sincronizar:', error?.message || error);
      }

      const lista = Object.values(custom.listar());
      if (!lista.length) {
        return interaction.editReply('📋 Nenhum comando personalizado criado ainda. Use /criarcomando.');
      }
      const texto = lista.map((c, i) =>
        '`' + (i + 1) + '`' + ' — ' + '**/' + c.nome + '**' + (c.descricao ? ' · ' + c.descricao : '') + (c.copiaveis.length ? ' · 📋 ' + c.copiaveis.length + ' copiável(is)' : '')
      ).join('\n');
      const aviso = '\n\n_Use /criarcomando para adicionar; demora até 1h para aparecer para todos no Discord._';
      return interaction.editReply('**Comandos personalizados (' + lista.length + '):**\n' + texto + aviso);
    }

    if (acao === 'excluir') {
      // Sem nome: mostra uma caixinha (select) com os comandos salvos, para
      // o admin escolher sem precisar digitar.
      if (!nome) {
        const menu = menuExcluir();
        return interaction.reply({ content: menu.content, components: menu.components, flags: MessageFlags.Ephemeral });
      }
      // Remover do Discord (comando global) pode demorar: usa defer para nao dar timeout de 3s.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const ok = custom.excluir(nome);
      if (ok) {
        try {
          await excluirUm(interaction.client, nome);
        } catch (error) {
          console.error('[gerenciarcomandos] Falha ao remover do Discord:', error?.message || error);
        }
      }
      return interaction.editReply(
        ok ? '✅ Comando /' + nome + ' excluído.' : '❌ Comando /' + nome + ' não encontrado.'
      );
    }
  },
};
