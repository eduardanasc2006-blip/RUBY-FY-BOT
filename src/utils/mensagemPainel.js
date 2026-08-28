const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const sessoes = new Map();

function getSessao(userId) {
  if (!sessoes.has(userId)) sessoes.set(userId, { mensagem: null, imagem: null });
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
  return embed;
}

// Painel de edicao da mensagem
function buildPainel(userId) {
  const estado = getSessao(userId);
  const resumo = new EmbedBuilder()
    .setColor(0xbeb6ff)
    .setTitle('📨 Publicar mensagem')
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
    embeds: estado.imagem ? [new EmbedBuilder().setColor(0xbeb6ff).setImage(estado.imagem)] : [],
    components: [botoes],
  };
}

module.exports = { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview };