const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { isAdmin } = require('../prefixCommands/settaxa');
const { comandoPode } = require('../utils/permissions');
const custom = require('../utils/customCommands');
const { menuEditar } = require('../utils/customEditPanel');

// Menu com os comandos salvos para o admin escolher sem digitar o nome.
function menuExcluir(guildId) {
  const lista = Object.values(custom.listar(guildId));
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
        label: '!' + c.nome,
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
      { name: 'editar', value: 'editar' },
      { name: 'excluir', value: 'excluir' }
    )),

  async execute(interaction) {
    if (!interaction.guild || !comandoPode(interaction.member, interaction.user.id, 'gerenciarcomandos')) {
      return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
    }

    const acao = interaction.options.getString('acao');

    if (acao === 'listar') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const lista = Object.values(custom.listar(interaction.guildId));
      if (!lista.length) {
        return interaction.editReply('📋 Nenhum comando personalizado criado ainda. Use /criarcomando.');
      }
      const texto = lista.map((c, i) =>
        '`' + (i + 1) + '`' + ' — ' + '**!' + c.nome + '**' + (c.descricao ? ' · ' + c.descricao : '') + (c.copiaveis.length ? ' · 📋 ' + c.copiaveis.length + ' copiável(is)' : '')
      ).join('\n');
      const aviso = '\n\n_Use /criarcomando para adicionar._';
      return interaction.editReply('**Comandos personalizados (' + lista.length + '):**\n' + texto + aviso);
    }

    if (acao === 'editar') {
      const menu = menuEditar(interaction.guildId);
      return interaction.reply({ content: menu.content, components: menu.components, flags: MessageFlags.Ephemeral });
    }

    if (acao === 'excluir') {
      // Sempre abre a caixinha (select) com os comandos salvos, para o admin
      // escolher qual excluir sem precisar digitar o nome.



      const menu = menuExcluir(interaction.guildId);
      return interaction.reply({ content: menu.content, components: menu.components, flags: MessageFlags.Ephemeral });
    }
  },
};
