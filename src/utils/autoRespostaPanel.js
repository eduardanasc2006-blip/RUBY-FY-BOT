const { ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const store = require('./autoRespostaStore');
const { linhaSelecaoCanalDe } = require('./channelPicker');

function menuEditar(guildId) {
  const lista = store.listar(guildId);
  if (!lista.length) {
    return { content: '📋 Nenhuma auto-resposta ainda. Escolha ➕ Abaixo para adicionar.', components: [] };
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

function modalAdicionar() {
  return new ModalBuilder()
    .setCustomId('autoresp:addmodal')
    .setTitle('➕ Adicionar auto-resposta')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('palavra')
          .setLabel('Palavra que dispara a resposta')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32)
          .setPlaceholder('ex: estoque')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('resposta')
          .setLabel('Mensagem que o bot vai responder')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
          .setPlaceholder('ex: veja #canal-estoque')
      )
    );
}

function selectRemover(guildId) {
  const lista = store.listar(guildId);
  if (!lista.length) {
    return { content: '📋 Nenhuma auto-resposta para remover.', components: [] };
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId('autoresp:remover')
    .setPlaceholder('Escolha qual remover…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      lista.slice(0, 25).map((r) => ({
        label: r.palavra,
        description: String(r.resposta || '' ).replace(/\s+/g, ' ').slice(0, 100),
        value: String(r.palavra).toLowerCase(),
      }))
    );
  return { content: '🗑️ **Remover auto-resposta** — selecione abaixo qual apagar:', components: [new ActionRowBuilder().addComponents(select)] };
}

function painelCentral(guildId, guild) {
  const lista = store.listar(guildId);
  const canaisIds = store.canais(guildId);
  const acao = new StringSelectMenuBuilder()
    .setCustomId('autoresp:acao')
    .setPlaceholder('📌 O que deseja fazer?…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      { label: '➕ Adicionar nova', description: 'Abre um modal para criar palavra e mensagem', value: 'adicionar' },
      { label: '✏️ Editar existente', description: 'Altera palavra ou mensagem de uma resposta', value: 'editar' },
      { label: '🗑️ Remover', description: 'Apaga uma resposta existente', value: 'remover' },
      { label: '📋 Ver lista', description: 'Mostra todas as respostas e canais atuais', value: 'ver' },
      { label: '🧹 Limpar tudo', description: 'Apaga todas as respostas do servidor', value: 'limpar' },
    ]);
  const canaisSelecao = linhaSelecaoCanalDe(guild, 'autorespcanal', canaisIds[0] || null, '📣 Canais onde responder…');
  const linhas = lista.slice(0, 10).map((r, i) => `\`${i + 1}\` **${r.palavra}** → ${String(r.resposta || '' ).replace(/\s+/g, ' ').slice(0, 60)}`).join('\n');
  const content = '⚙️ **Painel de auto-respostas**\n' +
    (lista.length ? `📄 **${lista.length}** resposta(s):\n${linhas}${lista.length > 10 ? '\n…' : ''}` : '📭 Nenhuma auto-resposta ainda.') +
    '\n**Canais:** ' + (canaisIds.length ? canaisIds.map((id) => `<#${id}>`).join(', ') : 'todos os canais');
  if (!canaisSelecao.canais.length) {
    return { content: content + '\n*Sem canais de texto disponíveis.*', components: [new ActionRowBuilder().addComponents(acao)] };
  }
  return { content, components: [new ActionRowBuilder().addComponents(acao), canaisSelecao.row, canaisSelecao.botoes] };
}

module.exports = { menuEditar, modalEditar, modalAdicionar, selectRemover, painelCentral };
