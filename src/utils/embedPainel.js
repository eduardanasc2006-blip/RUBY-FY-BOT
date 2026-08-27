const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, RoleSelectMenuBuilder } = require('discord.js');
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

// Normaliza um campo solto para os limites da API do Discord e evita
// name/value vazios que fazem o Discord rejeitar a embed.
function camposValidos(fields) {
  if (!Array.isArray(fields)) return [];
  const validos = [];
  for (const f of fields) {
    if (!f) continue;
    const name = String(f.name || '').trim().slice(0, 256);
    const value = String(f.value || '').trim().slice(0, 1024);
    if (!name || !value) continue; // field sem nome/valor é inválido na API
    validos.push({ name, value: value || '\u200b', inline: !!f.inline });
  }
  return validos.slice(0, 25);
}

// Monta a embed de preview a partir do estado
function buildEmbed(estado) {
  const fields = camposValidos(estado.fields);
  const temConteudo = !!(
    estado.titulo || estado.descricao || estado.autor || estado.rodape ||
    estado.imagem || estado.thumbnail || fields.length
  );
  // Embed totalmente vazia é rejeitada pela API do Discord ("empty embed").
  // Retorna null nesse caso para que o painel não quebre ao abrir/previewar.
  if (!temConteudo) return null;

  const embed = new EmbedBuilder().setColor(resolverCor(estado.cor));
  if (estado.titulo) embed.setTitle(String(estado.titulo).slice(0, 256));
  if (estado.descricao) embed.setDescription(String(estado.descricao).slice(0, 4096));
  if (estado.imagem) embed.setImage(estado.imagem);
  if (estado.thumbnail) embed.setThumbnail(estado.thumbnail);
  if (estado.autor) embed.setAuthor({ name: String(estado.autor).slice(0, 256) });
  if (estado.rodape) embed.setFooter({ text: String(estado.rodape).slice(0, 2048) });
  if (fields.length > 0) embed.addFields(fields);

  // O Discord rejeita embed sem description (erro embeds[i].description).
  // Garante uma descricao invisivel (espaco) sempre que nao houver uma real,
  // para o envio nunca falhar com "description required".
  if (!estado.descricao) embed.setDescription('\u200b');
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
        estado.imagem ? `🖼️ Imagem: ✅ ${estado.imagem.slice(0, 60)}` : '🖼️ Imagem: *(nenhuma — **anexe a foto** e rode **!embed** para usar upload)*',
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
    new ButtonBuilder().setCustomId(`embedpainel:preview:${userId}`).setLabel('👁️ Preview').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:enviar:${userId}`).setLabel('✅ Enviar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`embedpainel:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  // Menu de selecao de cargos (nativo do Discord)
  const linha4 = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`embedpainel:selcargos:${userId}`)
      .setPlaceholder('👥 Selecionar cargos para mencionar')
      .setMinValues(0)
      .setMaxValues(10)
  );

  return {
    content: estado.textoFora || null,
    embeds: embed ? [resumo, embed] : [resumo],
    components: [linha1, linha2, linha3, linha4],
  };
}

// Preview da embed final: mostra apenas o que será publicado (sem o painel de
// edição) com botões de voltar/editar, enviar e cancelar.
function buildPreview(userId) {
  const estado = getSessao(userId);
  const embed = buildEmbed(estado);

  if (!embed) {
    return {
      content: '⚠️ **Nada para pré-visualizar.** Preencha pelo menos o **título** ou a **descrição**.',
      embeds: [],
      components: [],
    };
  }

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`embedpainel:voltar:${userId}`).setLabel('✏️ Voltar a editar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`embedpainel:enviar:${userId}`).setLabel('✅ Enviar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`embedpainel:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    content: estado.textoFora || null,
    embeds: [embed],
    components: [botoes],
  };
}

module.exports = { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview, camposValidos };
