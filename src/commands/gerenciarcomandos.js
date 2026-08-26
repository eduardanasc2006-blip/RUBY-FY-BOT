const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const custom = require('../utils/customCommands');
const { registrarTodos, excluirUm } = require('../utils/customSync');

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
      await registrarTodos(interaction.client); // garante que todos os salvos estejam ativos no Discord
      const lista = Object.values(custom.listar());
      if (!lista.length) {
        return interaction.reply({ content: '📋 Nenhum comando personalizado criado ainda. Use /criarcomando.', flags: MessageFlags.Ephemeral });
      }
      const texto = lista.map((c) =>
        `/${c.nome}` + (c.descricao ? ` — ${c.descricao}` : '') + (c.copiaveis.length ? ` 📋 ${c.copiaveis.length} copiável(is)` : '')
      ).join('\n');
      return interaction.reply({ content: `**Comandos personalizados (${lista.length}):**\n${texto}`, flags: MessageFlags.Ephemeral });
    }

    if (acao === 'excluir') {
      if (!nome) return interaction.reply({ content: '❌ Informe o nome do comando para excluir.', flags: MessageFlags.Ephemeral });
      const ok = custom.excluir(nome);
      if (ok) {
        try {
          await excluirUm(interaction.client, nome);
        } catch (error) {
          console.error('[gerenciarcomandos] Falha ao remover do Discord:', error?.message || error);
        }
      }
      return interaction.reply({
        content: ok ? `✅ Comando /${nome} excluído.` : `❌ Comando /${nome} não encontrado.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
