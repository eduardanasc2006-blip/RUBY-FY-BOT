const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const sessoes = new Map();

function getSessao(userId) {
  if (!sessoes.has(userId)) sessoes.set(userId, { mensagem: null, imagem: null, tipo: 'normal' });
  return sessoes.get(userId);
}

function limparSessao(userId) {
  sessoes.delete(userId);
}

// Monta a embed de preview a partir do estado (aceita mensagem + imagem).
function buildEmbed(estado) {
  if (!estado.mensagem && !estado.imagem) return null;
  const embed = new EmbedBuilder().setColor(0xbeb6ff);
  if (estado.imagem) embed.setImage(estado.imagem);
  embed.setDescription(estado.mensagem || " ");
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
  const titulo = tipo === 'embed' ? '📨 Publicar embed' : '📨 Publicar mensagem';
  const resumo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle(titulo)
    .setDescription(
      [
        estado.mensagem ? `📝 Mensagem: ${estado.mensagem.slice(0, 80)}${estado.mensagem.length > 80 ? '…' : ''}` : '📝 Mensagem: *(vazia)*',
        estado.imagem ? '🖼️ Imagem: ✅ (sera enviada junto)' : '🖼️ Imagem: *(nenhuma)*',
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
  if (!estado.mensagem && !estado.imagem) {
    return {
      content: '⚠️ **Nada para publicar.** Escreva uma mensagem ou escolha uma imagem primeiro.',
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
    embeds: estado.imagem ? [new EmbedBuilder().setColor(0xbeb6ff).setDescription(estado.mensagem || ' ').setImage(estado.imagem)] : [],
    components: [botoes],
  };
}

module.exports = { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview, buildEscolhaPainel };