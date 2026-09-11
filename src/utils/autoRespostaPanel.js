const { ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const store = require('./autoRespostaStore');
const { linhaSelecaoCanalDe, canaisPublicaveis } = require('./channelPicker');

function botaoVoltar() {
  return new ButtonBuilder()
    .setCustomId('autoresp:voltar')
    .setLabel('⬅️ Voltar ao menu')
    .setStyle(ButtonStyle.Secondary);
}

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
  return {
    content: '✏️ **Editar auto-resposta** — selecione abaixo qual alterar:',
    components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(botaoVoltar())],
  };
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

function modalAdicionar(comCanal = false, preenchimento = null) {
  const pre = preenchimento || {};
  const palavraInput = new TextInputBuilder()
    .setCustomId('palavra')
    .setLabel('Palavra que dispara a resposta')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(32)
    .setPlaceholder('ex: estoque');
  if (pre.palavra) palavraInput.setValue(String(pre.palavra));
  const respostaInput = new TextInputBuilder()
    .setCustomId('resposta')
    .setLabel('Mensagem que o bot vai responder')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setPlaceholder('ex: veja #canal-estoque');
  if (pre.resposta) respostaInput.setValue(String(pre.resposta));
  const rows = [
    new ActionRowBuilder().addComponents(palavraInput),
    new ActionRowBuilder().addComponents(respostaInput),
  ];
  if (comCanal) {
    const canaisInput = new TextInputBuilder()
      .setCustomId('canais')
      .setLabel('Canais (opcional): IDs separados por virgula')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('ex: 123456789012345678, 876543210987654321');
    if (pre.canais) canaisInput.setValue(String(pre.canais));
    rows.push(new ActionRowBuilder().addComponents(canaisInput));
  }
  return new ModalBuilder()
    .setCustomId('autoresp:addmodal' + (comCanal ? ':canais' : ''))
    .setTitle('➕ Adicionar auto-resposta')
    .addComponents(...rows);
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
  return {
    content: '🗑️ **Remover auto-resposta** — selecione abaixo qual apagar:',
    components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(botaoVoltar())],
  };
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
      { label: '➕ Adicionar nova', description: 'Abre um modal para criar palavra, mensagem e canais', value: 'adicionar' },
      { label: '✏️ Editar existente', description: 'Altera palavra, mensagem ou canais de uma resposta', value: 'editar' },
      { label: '🗑️ Remover', description: 'Apaga uma resposta existente', value: 'remover' },
      { label: '📋 Ver lista', description: 'Mostra todas as respostas e canais atuais', value: 'ver' },
      { label: '📣 Canais (comuns)', description: 'Escolhe em quais canais TODAS as respostas respondem (ou todas)', value: 'canais' },
      { label: '🧹 Limpar tudo', description: 'Apaga todas as respostas do servidor', value: 'limpar' },
    ]);
  const linhas = lista.slice(0, 10).map((r, i) => `\`${i + 1}\` **${r.palavra}** → ${String(r.resposta || '' ).replace(/\s+/g, ' ').slice(0, 60)}`).join('\n');
  const content = '⚙️ **Painel de auto-respostas**\n' +
    (lista.length ? `📄 **${lista.length}** resposta(s):\n${linhas}${lista.length > 10 ? '\n…' : ''}` : '📭 Nenhuma auto-resposta ainda.') +
    '\n**Canais (comuns):** ' + (canaisIds.length ? canaisIds.map((id) => `<#${id}>`).join(', ') : 'todos os canais');
  if (!lista.length) {
    return { content: content + '\n*Escolha ➕ Abaixo para adicionar.*', components: [new ActionRowBuilder().addComponents(acao)] };
  }
  const linhasExtras = [menuCanaisRapido(guild, canaisIds), botoesCanais(guild)].filter(Boolean);
  return { content, components: [new ActionRowBuilder().addComponents(acao), ...linhasExtras] };
}

// Select de UM canal rápido para definir a lista global (comum) de canais. No
// mesmo painel, sem precisar trocar de página/select.
function menuCanaisRapido(guild, canaisIds) {
  const canais = canaisPublicaveis(guild);
  if (!canais.length) return null;
  return new StringSelectMenuBuilder()
    .setCustomId('autoresp:canalrapido')
    .setPlaceholder('📣 Definir canais comuns (adicione/remova na hora)…')
    .setMinValues(1)
    .setMaxValues(Math.min(canais.length, 25))
    .addOptions(
      canais.map((c) => ({
        label: (canaisIds.includes(c.id) ? '✅ ' : '') + c.name,
        description: canaisIds.includes(c.id) ? 'Clique para remover' : 'Clique para adicionar',
        value: c.id,
      }))
    );
}

function botoesCanais(guild) {
  const canais = canaisPublicaveis(guild);
  if (!canais.length) return null;
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('autoresp:canalrapido:todos').setLabel('🌐 Todos os canais').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('autoresp:canalrapido:limpar').setLabel('🧹 Limpar lista').setStyle(ButtonStyle.Danger)
    );
}

// Tela exibida apos o submit do modal de criação quando o campo de canais
// veio vazio: oferece um ChannelSelectMenu nativo (canais reais da guild,
// multi-seleção) para escolher os canais sem digitar IDs// A palavra a resposta são passadas só para exibição (os dados ficam no cache do handler).
function telaEscolherCanais(guild, palavra, resposta) {
  const canais = canaisPublicaveis(guild);
  const select = new ChannelSelectMenuBuilder()
    .setCustomId('autoresp:pickcanais')
    .setPlaceholder('📣 Selecione um ou mais canais…')
    .setChannelTypes(ChannelType.GuildText)
    .setMinValues(1)
    .setMaxValues(Math.min(Math.max(canais.length, 1), 25))
  const rowSelect = new ActionRowBuilder().addComponents(select);
  const rowBotoes = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('autoresp:picksalvar').setLabel('✅ Salvar sem canais').setStyle(ButtonStyle.Primary),
      botaoVoltar()
    );
  return {
    content: '📣 **Escolha os canais** onde esta resposta vai responder (ou salve sem canais):\n\n**Palavra:** `' + palavra + '`\n**Resposta:** ' + (String(resposta || '' ).length > 100 ? String(resposta).slice(0, 100) + '…' : String(resposta || '' )) ,
    components: [rowSelect, rowBotoes],
  };
}

module.exports = { menuEditar, modalEditar, modalAdicionar, selectRemover, painelCentral, botaoVoltar, telaEscolherCanais };
