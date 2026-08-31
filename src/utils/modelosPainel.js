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

function buildModelosPainel(guildId, uid) {
  const porCat = {};
  for (const ach of modelos.listar(guildId)) {
    const cat = ach.categoria || 'outros';
    if (!porCat[cat]) porCat[cat] = [];
    porCat[cat].push(ach);
  }
  const cats = modelos.CATEGORIAS_PADRAO;
  const linhasDesc = cats.map((ch) => `${ch.nome} — **${(porCat[ch.id] || []).length}** modelo(s)`);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('💾 Modelos de Embed')
    .setDescription([
      'Escolha uma **categoria** para ver os modelos deste servidor:',
      '',
      ...linhasDesc,
      '',
      'Use **💾 Salvar modelo** dentro do editor de `!embed` depois de montar a embed;',
    ].join(NL));
  const botoes = cats.map((ch) => new ButtonBuilder()
    .setCustomId(`modelos:cat:${guildId}:${uid}:${ch.id}`)
    .setLabel(ch.nome.split(' ').slice(1).join(' '))
    .setStyle(ButtonStyle.Primary))
  return { embeds: [embed], components: botoesPorLinha(botoes) };
}

function buildCategoriaPainel(guildId, catId, uid) {
  const lista = modelos.listar(guildId).filter((m) => (m.categoria || 'outros') === catId);
  const cat = modelos.CATEGORIAS_PADRAO.find((c) => c.id === catId);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(cat ? cat.nome : '✨ Outros')
    .setDescription(lista.length
      ? lista.map((m, i) => `**${i + 1}.** ${m.nome}` ).join(NL)
      : '*(Nenhum modelo nesta categoria ainda.)*');
  const botoes = [];
  for (const m of lista) {
    botoes.push(new ButtonBuilder().setCustomId(`modelos:ver:${guildId}:${uid}:${m.id}`).setLabel('👁️ Ver').setStyle(ButtonStyle.Secondary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:usar:${guildId}:${uid}:${m.id}`).setLabel('📋 Usar').setStyle(ButtonStyle.Primary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:editar:${guildId}:${uid}:${m.id}`).setLabel('✏️ Editar').setStyle(ButtonStyle.Secondary));
    botoes.push(new ButtonBuilder().setCustomId(`modelos:excluir:${guildId}:${uid}:${m.id}`).setLabel('🗑️ Excluir').setStyle(ButtonStyle.Danger));
  }
  botoes.push(new ButtonBuilder().setCustomId(`modelos:voltar:${guildId}:${uid}`).setLabel('⬅ Voltar').setStyle(ButtonStyle.Secondary));
  return { embeds: [embed], components: botoesPorLinha(botoes, 4) };
}

module.exports = { buildModelosPainel, buildCategoriaPainel };
