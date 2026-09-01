const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const welcomeStore = require('./welcomeStore');
const { resolverCor } = require('../prefixCommands/embed');
const { camposValidos, urlValida } = require('./embedPainel');
const { linhaSelecaoCanalDe } = require('./channelPicker');

const sessoesWelcome = new Map();

function getSessaoWelcome(userId, guildId) {
  if (!sessoesWelcome.has(userId)) {
    const salvo = welcomeStore.obter(guildId);
    const config = salvo ? JSON.parse(JSON.stringify(salvo)) : welcomeStore.padrao();
    sessoesWelcome.set(userId, { guildId, config });
  }
  return sessoesWelcome.get(userId);
}

function limparSessaoWelcome(userId) {
  sessoesWelcome.delete(userId);
}

// Monta a embed de boas-vindas a partir da config.
// `thumbnailResolvida` e usado quando o thumbnail for <@user>/<user>.
function buildWelcomeEmbed(config, thumbnailResolvida = null) {
  const conf = (config && config.embed) ? config.embed : (config || {});
  const fields = camposValidos(conf.fields);
  const temConteudo = !!(conf.titulo || conf.descricao || conf.imagem || conf.thumbnail || conf.rodape || fields.length);
  if (!temConteudo) return null;

  const embed = new EmbedBuilder().setColor(resolverCor(conf.cor));
  if (conf.titulo) embed.setTitle(String(conf.titulo).slice(0, 256));
  if (conf.descricao) embed.setDescription(String(conf.descricao).slice(0, 4096));
  if (conf.imagem && urlValida(conf.imagem)) embed.setImage(conf.imagem);

  let thumb = conf.thumbnail;
  if ((thumb === '<@user>' || thumb === '<user>') && thumbnailResolvida) thumb = thumbnailResolvida;
  if (thumb && urlValida(thumb)) embed.setThumbnail(thumb);

  if (conf.rodape) embed.setFooter({ text: String(conf.rodape).slice(0, 2048) });
  if (conf.timestamp) embed.setTimestamp(new Date());

  if (fields.length > 0) embed.addFields(fields);
  if (!conf.descricao&& !conf.titulo&& !fields.length) embed.setDescription('\u200b');

  return embed;
}

// Embed de resumo do estado atual (mostrado no painel principal)
function embedStatus(donoId, guildId) {
  const sessao = getSessaoWelcome(donoId, guildId);
  const conf = sessao.config;
  const e = conf.embed || {};


  const linhas = [];
  linhas.push('**Status:** ' + (conf.ativo ? '\u{1F7E2} Ativado' : '\u{1F534} Desativado'));
  linhas.push('**Canal:** ' + (conf.canalId ? `<#${conf.canalId}>` : '*(nenhum — use **Escolher canal**)*'));
  linhas.push('**Tipo:** ' + (conf.tipo === 'embed' ? '\u{1F4E7} Embed' : '\u{1F4AC} Mensagem'));
  linhas.push('');

  if (conf.tipo === 'embed') {
    linhas.push('**Titulo:** ' + (e.titulo ? e.titulo.slice(0,  60) : '*(vazio — opcional)*'));
    linhas.push('**Descricao:** ' + (e.descricao ? e.descricao.slice(0,  70) : '*(vazia — opcional)*'));
    linhas.push('**Cor:** ' + (e.cor ? e.cor : 'lilas (padrao)'));
     const extras = [];
    if (e.imagem) extras.push('\u{1F5BC}\uFE0F imagem');
    if (e.thumbnail) extras.push('\u{1F533} thumbnail');
    if (e.rodape) extras.push('\u{1F4DD} rodape');
    if (e.timestamp) extras.push('\u23F0 timestamp');
    const nFields = camposValidos(e.fields).length;
    if (nFields) extras.push('\u2795 ' + nFields + ' field(s)');
    linhas.push('**Extras:** ' + (extras.length ? extras.join(', ') : '*(nenhum)*'));
  } else {
    linhas.push('**Mensagem:** ' + (conf.mensagem ? conf.mensagem.slice(0,  80) : '*(vazia)*'));
  }

  linhas.push('');
  linhas.push('\u{1F525} **Variaveis:** use **Variaveis** para ver as disponiveis.');


  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('\u2601\uFE0F CONFIGURACAO DE BOAS-VINDAS')
    .setDescription(linhas.join('\n'))
    .setFooter({ text: 'Configuracao por servidor — clique em Salvar para persistir' });


  return embed;
}


// ---- Painel principal ----
function buildWelcomePainel(donoId, guildId) {
  const embed = embedStatus(donoId, guildId);
  const sessao = getSessaoWelcome(donoId, guildId);
  const conf = sessao.config;

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`welcome:${conf.ativo ? 'desativar' : 'ativar'}:${donoId}`).setLabel(conf.ativo ? '\u{1F534} Desativar' : '\u{1F7E2} Ativar').setStyle(conf.ativo ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`welcome:canal:${donoId}`).setLabel('\u{1F4E3} Escolher canal').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:tipo:${donoId}`).setLabel(conf.tipo === 'embed' ? '\u{1F4AC} Tipo: Mensagem' : '\u{1F4E7} Tipo: Embed').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:variaveis:${donoId}`).setLabel('\u{1F525} Variaveis').setStyle(ButtonStyle.Secondary)
  );

  const linha2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`welcome:editar:${conf.tipo}:${donoId}`).setLabel(conf.tipo === 'embed' ? '\u{1F4DD} Editar Embed' : '\u{1F4AC} Editar mensagem').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:preview:${donoId}`).setLabel('\u{1F441}\uFE0F Pre-visualizar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:salvar:${donoId}`).setLabel('\u{1F4BE} Salvar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`welcome:padrao:${donoId}`).setLabel('\u267B\uFE0F Restaurar padrao').setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [linha1, linha2],
  };
}

// ---- Tela de edicao da embed ----
function buildWelcomeEmbedEdit(donoId, guildId) {
  const sessao = getSessaoWelcome(donoId, guildId);
  const e = sessao.config.embed || {};


  const linhas = [];
  linhas.push('Titulo: ' + (e.titulo ? e.titulo : '(vazio)'));
  linhas.push('Descricao: ' + (e.descricao ? e.descricao : '(vazia)'));
  linhas.push('Cor: ' + (e.cor ? e.cor : 'lilas (padrao)'));
  linhas.push('Imagem: ' + (e.imagem ? e.imagem : '(nenhuma)'));
  linhas.push('Thumbnail: ' + (e.thumbnail ? (e.thumbnail === '<@user>' ? 'Avatar do usuario' : e.thumbnail) : '(nenhum)'));
  linhas.push('Rodape: ' + (e.rodape ? e.rodape : '(vazio)'));
  linhas.push('Timestamp: ' + (e.timestamp ? 'ativado' : 'desativado'));
  const nFields = camposValidos(e.fields).length;
  linhas.push('Fields: ' + (nFields ? nFields + ' configurado(s)' : '(nenhum)'));


  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('Editar Embed de boas-vindas')
    .setDescription([
      'Todos os campos sao **opcionais**.',
      '',
      ...linhas,
      '',
      'O **titulo** pode ficar vazio sem problemas.',
    ].join('\n'));


  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`welcome:embed:titulo:${donoId}`).setLabel('Titulo').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:embed:descricao:${donoId}`).setLabel('Descricao').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:embed:cor:${donoId}`).setLabel('Cor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:embed:imagem:${donoId}`).setLabel('Imagem').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:embed:thumbnail:${donoId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary)
  );

  const linha2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`welcome:embed:rodape:${donoId}`).setLabel('Rodape').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:embed:timestamp:${donoId}`).setLabel('Timestamp').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:embed:fields:${donoId}`).setLabel('Fields').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`welcome:embed:voltar:${donoId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [linha1, linha2],
  };
}

// ---- Modais ----
function modalCampo(donoId, campo, titulo, label, multiline = false, atual = '', placeholder = '') {
  const valorStr = multiline ? String(atual).slice(0, 4000) : String(atual).slice(0, 1024);
  return new ModalBuilder()
    .setCustomId(`welcome:modal:${campo}:${donoId}`)
    .setTitle(titulo)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('valor')
          .setLabel(label)
          .setStyle(multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(multiline ? 4000 : 1024)
          .setValue(valorStr)
          .setPlaceholder(placeholder)
      )
    );
}

function modalField(donoId, idx = null, field = null) {
  const tituloM = idx === null ? 'Novo Field' : 'Editar Field ' + (idx + 1);
  const modal = new ModalBuilder()
    .setCustomId(idx === null ? `welcome:modal:fieldnew:${donoId}` : `welcome:modal:fieldedit:${donoId}:${idx}`)
    .setTitle(tituloM)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('fname').setLabel('Nome do campo').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256).setPlaceholder('Ex: Membro').setValue(field ? String(field.name).slice(0, 256) : '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('fvalue').setLabel('Valor do campo').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1024).setPlaceholder('Ex: <user>').setValue(field ? String(field.value).slice(0, 1024) : '')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('finline').setLabel('Em linha? (sim/nao)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(3).setValue(field ? (field.inline ? 'sim' : 'nao') : 'nao')
      )
    );
  return modal;
}

function canalSelecao(guildId, callbackId, canalAtualId) {

  return linhaSelecaoCanalDe(guildId, callbackId, canalAtualId, 'Escolha o canal de boas-vindas');
}


// ---- Tela de fields da embed ----
function buildWelcomeFieldsPainel(donoId, guildId) {
  const sessao = getSessaoWelcome(donoId, guildId);
  const fields = camposValidos(sessao.config.embed.fields);

  const linhas = fields.length
    ? fields.map((f, i) => (i + 1) + '. ' + f.name + ' — ' + f.value + (f.inline ? ' *(em linha)*' : ''))
    : ['*(nenhum field ainda)*'];

  const embed = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('Fields da embed de boas-vindas')
    .setDescription([
      fields.length + ' field(s) configurado(s).',
      '',
      ...linhas,
      '',
      'Escolha no menu abaixo para **editar** um field, ou use os botoes.',
    ].join('\n'));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`welcome:fieldsel:${donoId}`)
    .setPlaceholder(fields.length ? 'Escolha um field para editar' : 'Nenhum field ainda')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      fields.length
        ? fields.map((f, i) => ({
            label: 'Field ' + (i + 1) + ': ' + f.name.slice(0, 80),
            value: String(i),
            description: (f.value || '').slice(0, 80) || '\u2014',
          }))
        : [{ label: 'Nenhum field', value: '-1', description: 'Use Adicionar' }]
    );

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`welcome:fieldadd:${donoId}`).setLabel('Adicionar').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`welcome:fieldclear:${donoId}`).setLabel('Limpar').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`welcome:embed:voltar:${donoId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
  );

  const linha2 = new ActionRowBuilder().addComponents(select);

  return {
    embeds: [embed],
    components: [linha1, linha2],
  };
}
module.exports = {
  getSessaoWelcome,
  limparSessaoWelcome,
  buildWelcomeEmbed,
  buildWelcomePainel,
  buildWelcomeEmbedEdit,
  buildWelcomeFieldsPainel,
  modalCampo,
  modalField,
  canalSelecao,
};
