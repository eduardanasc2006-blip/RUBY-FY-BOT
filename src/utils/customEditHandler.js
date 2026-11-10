const { Events, MessageFlags } = require('discord.js');
const custom = require('./customCommands');
const { modalEditar } = require('./customEditPanel');
const { comandoPode } = require('./permissions');
const { parseCopiaveis } = require('./copiaveis');

function registrar(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.customId && interaction.customId.startsWith('gerencmd:') && !comandoPode(interaction.member, interaction.user.id, 'gerenciarcomandos')) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      if (interaction.isAnySelectMenu() && interaction.customId === 'gerencmd:editar') {
        const nome = interaction.values[0];
        const cmd = custom.obter(interaction.guildId, nome);
        if (!cmd) {
          return interaction.reply({ content: '❌ Comando não encontrado.', flags: MessageFlags.Ephemeral });
        }
        return interaction.showModal(modalEditar(cmd));
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('gerencmd:editmodal:')) {
        const nomeOriginal = (interaction.customId.split(':')[2] || '' ).toLowerCase().trim();
        const cmdAntigo = custom.obter(interaction.guildId, nomeOriginal);
        if (!cmdAntigo) {
          return interaction.reply({ content: '❌ Comando original não encontrado.', flags: MessageFlags.Ephemeral });
        }
        const nomeNovo = (interaction.fields.getTextInputValue('nome') || '' ).trim();
        const descricao = interaction.fields.getTextInputValue('descricao') || '';
        const mensagem = interaction.fields.getTextInputValue('mensagem') || '';
        const copiaveisBruto = interaction.fields.getTextInputValue('copiaveis') || '';
        const tituloNovo = (interaction.fields.getTextInputValue('titulo') || '' ).trim() || null;
        if (!/^[a-z0-9_-]{1,32}$/i.test(nomeNovo)) {

          return interaction.reply({ content: '❌ Nome inválido. Use apenas letras, números, _ ou -. (máx. 32).', flags: MessageFlags.Ephemeral });
        }
        let linkInvalido = null;
        const { itens: copiaveis, linkInvalido: inval, excedeu } = parseCopiaveis(copiaveisBruto, 5);
        linkInvalido = inval;
        if (linkInvalido) {
          return interaction.reply({ content: `❌ O link \`${linkInvalido.nome}\` não é uma URL válida (use http/https).`, flags: MessageFlags.Ephemeral });
        }
        if (excedeu) {
          return interaction.reply({ content: `❌ Máximo de **5** conteúdos copiáveis por comando (limite do Discord).`, flags: MessageFlags.Ephemeral });
        }
        const slug = nomeNovo.toLowerCase().trim();
        if (slug !== nomeOriginal && custom.existe(interaction.guildId, slug)) {



          return interaction.reply({ content: `❌ Já existe um comando \`/${nomeNovo}\`. Escolha outro nome.`, flags: MessageFlags.Ephemeral });
        }
        const embedAntigo = cmdAntigo.embed || null;
        const editado = custom.editar(interaction.guildId, nomeOriginal, {
          descricao,
          mensagem,
          embed: {
            ...(embedAntigo || { descricao: null, cor: null, imagem: null, fields: [] }),
            titulo: tituloNovo,
          },
          ephemeral: !!cmdAntigo.ephemeral,
          copiaveis,
        });
        if (!editado) {
          return interaction.reply({ content: '❌ Falha ao salvar a edição.', flags: MessageFlags.Ephemeral });
        }
        if (slug !== nomeOriginal) {
          custom.excluir(interaction.guildId, nomeOriginal);
          const dados = { ...editado, nome: nomeNovo };
          custom.criar(interaction.guildId, slug, dados);
          custom.editar(interaction.guildId, slug, { nome: nomeNovo });
        }
        return interaction.reply({
          content: '✅ Comando !' + nomeNovo + ' atualizado com sucesso!' + (slug !== nomeOriginal ? ' (nome alterado de !' + nomeOriginal + ')' : ''),
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error('[Editar custom]', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Erro ao editar.', flags: MessageFlags.Ephemeral });
        }
      } catch {}
    }
  });
}
module.exports = { registrar };
