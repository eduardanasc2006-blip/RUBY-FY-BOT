const { ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const custom = require('./customCommands');

function menuEditar() {
  const lista = Object.values(custom.listar());
  if (!lista.length) {
    return { content: '📋 Nenhum comando personalizado criado ainda. Use /criarcomando.', components: [] };
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId('gerencmd:editar')
    .setPlaceholder('Escolha o comando para editar…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      lista.slice(0, 25).map((c) => ({
        label: '/' + (c.nome || '?'),
        description: (c.descricao || (c.mensagem ? 'Resposta personalizada' : 'Sem descrição')).slice(0, 100),
        value: String(c.nome || '').toLowerCase(),
      }))
    );
  return { content: '✏️ **Editar comando personalizado** — selecione abaixo qual alterar:', components: [new ActionRowBuilder().addComponents(select)] };
}

function formatarCopiaveis(copiaveis) {
  if (!Array.isArray(copiaveis) || !copiaveis.length) return '';
 return copiaveis.map((c) => `${c.nome || 'Copiar'}:${c.tipo === 'link' ? 'link' : 'copiavel'}:${c.valor || ''}`).join(';');
}

function modalEditar(cmd) {
  return new ModalBuilder()
    .setCustomId('gerencmd:editmodal:' + String(cmd.nome || '').toLowerCase())
    .setTitle(('✏️ Editar /' + (cmd.nome || '')).slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('Nome do comando')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32)
          .setValue(String(cmd.nome || ''))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('descricao')
          .setLabel('Descrição')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setValue(String(cmd.descricao || ''))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('mensagem')
          .setLabel('Mensagem de resposta')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
          .setValue(String(cmd.mensagem || ''))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('copiaveis')
          .setLabel('Copiáveis: nome:tipo:valor (link ou copiar)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(4000)
          .setValue(formatarCopiaveis(cmd.copiaveis))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ephemeral')
          .setLabel('Resposta privada? (sim ou nao)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(3)
          .setValue(cmd.ephemeral ? 'sim' : 'nao')
      )
    );
}

module.exports = { menuEditar, modalEditar, formatarCopiaveis };
