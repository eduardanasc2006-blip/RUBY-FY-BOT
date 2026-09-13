const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const store = require('./canalComandoStore');
const { GRUPOS } = require('./permissions');

const COR = 0xbeb6ff;

// Comandos públicos (sem grupo de permissão) que faz sentido restringir.
const COMANDOS_PUBLICOS = [
  'robux', 'reais', 'gamepass', 'taxa', 'calc', 'estoque', 'comprar', 'cliente',
  'proof', 'criarcomando', 'gerenciarcomandos',
];

// Categorias exibidas no painel. Cada uma agrupa comandos (máx 25 por select).
function categoriasDeComandos() {
  const cats = [
    { id: 'publicos', nome: '🌐 Públicos', comandos: COMANDOS_PUBLICOS },
  ];
  for (const g of GRUPOS) {
    cats.push({
      id: g.id,
      nome: g.nome,
      comandos: g.comandos.filter((c) => !cats.some((x) => x.id === 'publicos' && x.comandos.includes(c))),
    });
  }
  // Remove o grupo 'permissoes' do GRUPOS se existir (sem comandos mapeados?).
  // Garante categorias com pelo menos 1 comando.
  return cats.filter((c) => c.comandos.length > 0);
}

// Retorna o rótulo amigável de um comando.
function rotuloComando(cmd) {
  return `!${cmd}`;
}

// Painel principal: escolher a categoria de comandos.
function buildCanalComandoPanel(guildId, userId) {
  const catList = categoriasDeComandos();
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📢 Comandos por Canal')
    .setDescription(
      'Restrinja **cada comando** a canais específicos do servidor.\n' +
      '**Admins e cargos com permissão nunca são limitados** — podem usar em qualquer canal.\n\n' +
      'Escolha uma **categoria** para ver seus comandos:'
    );

  const msgGlobal = store.mensagemGlobal(guildId);
  if (msgGlobal) {
    embed.addFields({ name: '✏️ Mensagem de bloqueio atual', value: `> ${msgGlobal}` });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`canalcmd:escolhercat:${userId}`)
    .setPlaceholder('Escolha a categoria…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      catList.map((cat) => ({
        label: cat.nome,
        value: cat.id,
      }))
    );

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`canalcmd:mensagem:${userId}`)
      .setLabel('✏️ Mensagem de bloqueio')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), botoes],
  };
}

// Painel de uma categoria: lista os comandos (máx 25) para configurar.
function buildCanalComandoLista(guildId, userId, categoriaId) {
  const cat = categoriasDeComandos().find((c) => c.id === categoriaId);
  if (!cat) return { content: '❌ Categoria não encontrada.', embeds: [], components: [] };

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${cat.nome} — comandos`)
    .setDescription('Selecione o comando para configurar os canais permitidos:');

  const select = new StringSelectMenuBuilder()
    .setCustomId(`canalcmd:escolher:${userId}`)
    .setPlaceholder('Selecione o comando…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      cat.comandos.sort().map((cmd) => ({
        label: rotuloComando(cmd),
        value: cmd,
      }))
    );

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`canalcmd:voltar:${userId}`)
      .setLabel('⬅️ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select), botoes] };
}

// Painel de um comando: mostra estado atual + botões de ação.
function buildCanalComandoDetalhe(guildId, userId, comando) {
  const canais = store.canaisParaComando(guildId, comando);
  const msg = store.mensagemParaComando(guildId, comando);
  const estado = canais === null
    ? '🌐 **Todos os canais** (sem restrição)'
    : canais.length === 0
      ? '🚫 **Nenhum canal** (comando bloqueado para membros comuns)'
      : `📌 **${canais.length} canal(is)**:\n${canais.map((id) => `<#${id}>`).join(' ')}`;

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`📢 !${comando}`)
    .setDescription(
      `**Estado atual:**\n${estado}\n\n` +
      'Escolha uma ação abaixo:'
    );

  if (msg) {
    embed.addFields({ name: '✏️ Mensagem atual', value: `> ${msg}` });
  }

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`canalcmd:canais:${comando}:${userId}`)
      .setLabel('📌 Escolher canais')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`canalcmd:todos:${comando}:${userId}`)
      .setLabel('🌐 Todos os canais')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`canalcmd:nenhum:${comando}:${userId}`)
      .setLabel('🚫 Nenhum')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`canalcmd:voltar:${userId}`)
      .setLabel('⬅️ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [botoes] };
}

// Painel para escolher os canais permitidos (multi-select). Lista até 25 canais.
function buildCanalComandoCanais(guild, userId, comando) {
  const canaisAtuais = store.canaisParaComando(guild.id, comando) || [];
  const canais = guild.channels.cache
    .filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased())
    .sort((a, b) => a.position - b.position)
    .first(25);

  if (!canais.length) {
    return {
      content: '❌ Nenhum canal de texto disponível neste servidor.',
      embeds: [],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`canalcmd:voltar:${userId}`).setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
      )],
    };
  }

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`📌 Canais permitidos para !${comando}`)
    .setDescription(
      'Selecione **um ou mais canais** onde este comando poderá ser usado pelos membros.\n' +
      'Admins e cargos com permissão continuam podendo usar em qualquer canal.'
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`canalcmd:setcanais:${comando}:${userId}`)
    .setPlaceholder('Escolha os canais permitidos…')
    .setMinValues(1)
    .setMaxValues(Math.max(1, canais.length))
    .addOptions(
      canais.map((c) => ({
        label: c.name.length > 90 ? c.name.slice(0, 87) + '…' : c.name,
        description: canaisAtuais.includes(c.id) ? 'Atualmente permitido' : undefined,
        value: c.id,
      }))
    );

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`canalcmd:voltar:${userId}`)
      .setLabel('⬅️ Voltar')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select), botoes] };
}

module.exports = {
  buildCanalComandoPanel,
  buildCanalComandoLista,
  buildCanalComandoDetalhe,
  buildCanalComandoCanais,
};