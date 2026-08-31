const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const modelos = require('./embedModelos');
const { buildEmbed } = require('./embedPainel');

const NL = String.fromCharCode(10);
const COR = 0xbeb6ff;

function botoesPorLinha(botoes, max = 5) {
  const out = [];
  let linha = new ActionRowBuilder();
  for (const b of botoes) {
    if (linha.components.length >= max) {
      out.push(linha);
      linha = new ActionRowBuilder();
    }
    linha.addComponents(b);
  }
  if (linha.components.length) out.push(linha);
  return out;
}

function nomeCategoria(c) {
  return c ? c.nome : 'Sem categoria';
}

function buildModelosPainel(guildId, uid) {
  const cats = modelos.listarCategorias(guildId);
  const todos = modelos.listarTodos(guildId);
  const sem = modelos.listar(guildId, null);
  const linhasDesc = [];
  for (const c of cats) {
    const qtd = modelos.listar(guildId, c.id).length;
    linhasDesc.push(`${c.nome} — **${qtd}** modelo(s)`);
  }
  linhasDesc.push(`Sem categoria — **${sem.length}** modelo(s)`);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('💾 Modelos de Embed')
    .setDescription([
      'Escolha uma **categoria** para ver os modelos deste servidor:',
      '',
      ...linhasDesc,
      '',
      `**${todos.length}** modelo(s) no total.`,
      '',
      'Use **💾 Salvar modelo** dentro do editor de `!embed` depois de montar a embed.',
    ].join(NL));
  const botoes = [];
  for (const c of cats) {
    botoes.push(new ButtonBuilder()
      .setCustomId(`modelos:cat:${guildId}:${uid}:${c.id}`)
      .setLabel(c.nome)
      .setStyle(ButtonStyle.Primary));
  }
  botoes.push(new ButtonBuilder()
    .setCustomId(`modelos:cat:${guildId}:${uid}:sem`)
    .setLabel('Sem categoria')
    .setStyle(ButtonStyle.Secondary));
  botoes.push(new ButtonBuilder()
    .setCustomId(`modelos:novacat:${guildId}:${uid}`)
    .setLabel('➕ Nova categoria')
    .setStyle(ButtonStyle.Success));
  return { embeds: [embed], components: botoesPorLinha(botoes) };
}

function buildCategoriaPainel(guildId, catId, uid) {
  const ehSem = catId === 'sem' || catId === 'null' || !catId;
  let cat = null;
  if (!ehSem) cat = modelos.obterCategoria(guildId, catId)
  const lista = ehSem ? modelos.listar(guildId, null) : modelos.listar(guildId, catId)
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(ehSem ? '🗂 Sem categoria' : cat ? cat.nome : 'Categoria')
    .setDescription(lista.length
      ? lista.map((m, i) => `**${i + 1}.** ${m.nome}` ).join(NL)
      : '*(Nenhum modelo nesta categoria ainda.)*');
  const botoes = [];
  for (const m of lista) {
    botoes.push(new ButtonBuilder().setCustomId(`modelos:ver:${guildId}:${uid}:${m.id}`).setLabel('👁 Ver').setStyle(ButtonStyle.Secondary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:usar:${guildId}:${uid}:${m.id}`).setLabel('📋 Usar').setStyle(ButtonStyle.Primary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:editar:${guildId}:${uid}:${m.id}`).setLabel('✏ Editar').setStyle(ButtonStyle.Secondary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:excluir:${guildId}:${uid}:${m.id}`).setLabel('🗑 Excluir').setStyle(ButtonStyle.Danger));
  }
  if (!ehSem && cat) {
    botoes.push(new ButtonBuilder().setCustomId(`modelos:catedit:${guildId}:${uid}:${cat.id}`).setLabel('✏ Renomear').setStyle(ButtonStyle.Secondary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:catexcluir:${guildId}:${uid}:${cat.id}`).setLabel('🗑 Excluir cat.').setStyle(ButtonStyle.Danger));
  }
  botoes.push(new ButtonBuilder().setCustomId(`modelos:voltar:${guildId}:${uid}`).setLabel('⬅ Voltar').setStyle(ButtonStyle.Secondary));
  return { embeds: [embed], components: botoesPorLinha(botoes, 4) };
}

module.exports = { buildModelosPainel, buildCategoriaPainel };
