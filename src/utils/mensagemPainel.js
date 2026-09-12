const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const sessoes = new Map();

function getSessao(userId) {
  if (!sessoes.has(userId)) {
    const sessao = { mensagem: null, imagens: [], tipo: 'normal' };
    sessoes.set(userId, sessao);
    return sessao;
  }
  const sessao = sessoes.get(userId);
  // Migracao do estado antigo (imagem unica → lista)
  if (sessao.imagem && !sessao.imagens) {

    sessao.imagens = [sessao.imagem];
    delete sessao.imagem;
  }
  if (!Array.isArray(sessao.imagens)) sessao.imagens = [];
  return sessao;
}

function limparSessao(userId) {
  sessoes.delete(userId);
}

// Monta a embed de preview a partir do estado (aceita mensagem + imagem).
function buildEmbed(estado) {
  const imgs = estado.imagens || [];
  if (!estado.mensagem && imgs.length === 0) return null;
  const embed = new EmbedBuilder().setColor(0xbeb6ff);
  embed.setDescription(estado.mensagem || " ");
  if (imgs.length) {
    embed.addFields({ name: '🖼️ Imagens', value: `${imgs.length} imagem(ns) serão anexadas`, inline: false });
  }
  return embed;
}

function buildEscolhaPainel(userId) {
  const resumo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('📨 Publicar no canal')
    .setDescription('Escolha o **tipo** da publicação:');

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`msgescolha:normal:${userId}`).setLabel('💬 Mensagem normal').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`msgescolha:embed:${userId}`).setLabel('✨ Embed (editor completo)').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`msgescolha:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [resumo],
    components: [botoes],
  };
}

// Painel de edicao da mensagem
function buildPainel(userId, tipo = 'normal') {
  const estado = getSessao(userId);
  const imgs = estado.imagens || [];
  const titulo = tipo === 'embed' ? '📨 Publicar embed' : '📨 Publicar mensagem';
  const resumo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(titulo)
    .setDescription(
      [
        estado.mensagem ? `📝 Mensagem: ${estado.mensagem.slice(0, 80)}${estado.mensagem.length > 80 ? '…' : ''}` : '📝 Mensagem: *(vazia)*',
        imgs.length ? `🖼️ Imagens: ${imgs.length} anexada(s) — adicione mais por link no 🖼️` : '🖼️ Imagens: *(nenhuma)*',
      ].join('\n')
    );

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`msgpainel:mensagem:${userId}`).setLabel('📝 Mensagem').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`msgpainel:imagem:${userId}`).setLabel('🖼️ Imagem').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`msgpainel:preview:${userId}`).setLabel('👁️ Preview').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`msgpainel:publicar:${userId}`).setLabel('📤 Publicar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`msgpainel:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [resumo],
    content: estado.mensagem || null,
    components: [linha1],
  };
}

// Preview: mostra o que sera publicado (texto +/ou imagem) com voltar/publicar/cancelar
function buildPreview(userId) {
  const estado = getSessao(userId);
  const imgs = estado.imagens || [];
  if (!estado.mensagem && imgs.length === 0) {
    return {
      content: '⚠️ **Nada para publicar.** Escreva uma mensagem ou envie imagens primeiro.',
      embeds: [],
      components: [],
    };
  }

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`msgpainel:voltar:${userId}`).setLabel('✏️ Voltar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`msgpainel:publicar:${userId}`).setLabel('📤 Publicar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`msgpainel:cancelar:${userId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    content: estado.mensagem || null,
    embeds: [new EmbedBuilder().setColor(0xbeb6ff).setDescription(
      `${estado.mensagem || '_Sem texto_'}\n\n🖼️ **${imgs.length} imagem(ns) serão anexadas na publicação.**`
    )],
    components: [botoes],
  };
}

module.exports = { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview, buildEscolhaPainel };