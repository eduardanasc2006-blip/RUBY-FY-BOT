const { ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const store = require('./autoRespostaStore');

function menuEditar(guildId) {
  const lista = store.listar(guildId);
  if (!lista.length) {
    return { content: '📋 Nenhuma auto-resposta ainda. Use `!autoresposta adicionar <palavra> <resposta>` (ou `/autoresposta adicionar`).', components: [] };
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId('autoresp:editar')
    .setPlaceholder('Escolha a auto-resposta para editar…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      lista.slice(0, 25).map((r) => ({
        label: r.palavra,
        description: String(r.resposta || '' ).replace(/\s+/g, ' ').slice(0, 100),
        value: String(r.palavra).toLowerCase(),
      }))
    );
  return { content: '✏️ **Editar auto-resposta** — selecione abaixo qual alterar:', components: [new ActionRowBuilder().addComponents(select)] };
}

function modalEditar(item) {
  return new ModalBuilder()
    .setCustomId('autoresp:editmodal:' + String(item.palavra || '' ).toLowerCase())
    .setTitle('✏️ Editar auto-resposta')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('palavra')
          .setLabel('Palavra que dispara a resposta')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32)
          .setValue(String(item.palavra || '' ))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('resposta')
          .setLabel('Mensagem que o bot vai responder')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
          .setValue(String(item.resposta || '' ))
      )
    );
}

module.exports = { menuEditar, modalEditar };