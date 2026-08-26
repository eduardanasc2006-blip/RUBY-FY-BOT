const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { resolverCor } = require('../prefixCommands/embed');

// Estado temporario da embed sendo montada (por usuario)
const sessoes = new Map();

function getSessao(userId) {
  if (!sessoes.has(userId)) {
    sessoes.set(userId, {
      titulo: null,
      descricao: null,
      cor: null,
      imagem: null,
      thumbnail: null,
      autor: null,
      rodape: null,
      fields: [],
      textoFora: null,
      cargos: [],
    });
  }
  return sessoes.get(userId);
}

function limparSessao(userId) {
  sessoes.delete(userId);
}

// Monta a embed de preview a partir do estado
function buildEmbed(estado) {
  const embed = new EmbedBuilder().setColor(resolverCor(estado.cor));
  if (estado.titulo) embed.setTitle(estado.titulo);
  if (estado.descricao) embed.setDescription(estado.descricao);
  if (estado.imagem) embed.setImage(estado.imagem);
  if (estado.thumbnail) embed.setThumbnail(estado.thumbnail);
  if (estado.autor) embed.setAuthor({ name: estado.autor });
  if (estado.rodape) embed.setFooter({ text: estado.rodape });
  if (estado.fields.length > 0) embed.addFields(estado.fields);
  return embed;
}

// Painel de edicao
function buildPainel(userId) {
  const estado = getSessao(userId);
  const embed = buildEmbed(estado);

  // Resumo do que esta preenchido
  const resumo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('☁️ Montar Embed')
    .setDescription(
      [
        estado.titulo ? `📝 Título: ${estado.titulo}` : '📝 Título: *(vazio)*',
        estado.descricao ? `📄 Descrição: ${estado.descricao.slice(0, 50)}...` : '📄 Descrição: *(vazio)*',
        estado.cor ? `🎨 Cor: ${estado.cor}` : '🎨 Cor: lilas (padrão)',
        estado.imagem ? '🖼️ Imagem: ✅' : '🖼️ Imagem: *(nenhuma)*',
        estado.thumbnail ? '🔳 Thumbnail: ✅' : '🔳 Thumbnail: *(nenhuma)*',
        estado.cargos.length ? `👥 Cargos: ${estado.cargos.map((c) => `<@&${c}>`).join(' ')}` : '👥 Cargos: *(nenhum)*',
      ].join('\n')
    );

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:titulo:${userId}`).setLabel('📝 Título').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embedpainel:descricao:${userId}`).setLabel('📄 Descrição').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embedpainel:cor:${userId}`).setLabel('🎨 Cor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`embedpainel:imagem:${userId}`).setLabel('🖼️ Imagem').setStyle(ButtonStyle.Secondary)
  );

  const linha2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:thumbnail:${userId}`).setLabel('🔳 Thumbnail').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:autor:${userId}`).setLabel('👤 Autor').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:rodape:${userId}`).setLabel('📝 Rodapé').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:fields:${userId}`).setLabel('➕ Fields').setStyle(ButtonStyle.Secondary)
  );

  const linha3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:textofora:${userId}`).setLabel('💬 Texto fora').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:cargos:${userId}`).setLabel('👥 Cargos').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:preview:${userId}`).setLabel('👁️ Preview').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:enviar:${userId}`).setLabel('✅ Enviar').setStyle(ButtonStyle.Success)
  );

  const linha4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    content: estado.textoFora || null,
    embeds: [resumo, embed],
    components: [linha1, linha2, linha3, linha4],
  };
}

module.exports = { getSessao, limparSessao, buildEmbed, buildPainel };
