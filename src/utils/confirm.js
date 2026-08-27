const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Monta a estrutura de confirmação com botões Confirmar/Cancelar.
// - texto: mensagem de aviso (string)
// - confirmId: customId do botão confirmar
// - cancelId: customId do botão cancelar
// Retorna um payload compatível com interaction.update/reply.
function montarConfirmacao(texto, confirmId, cancelId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel('Confirmar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );
  return { content: texto, embeds: [], components: [row] };
}

module.exports = { montarConfirmacao };