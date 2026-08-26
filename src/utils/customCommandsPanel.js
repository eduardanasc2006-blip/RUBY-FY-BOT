const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { resolverCor } = require('../prefixCommands/embed');

// Monta a resposta de um comando customizado (com embed, mensagem e botoes copiaveis)
function buildResposta(cmd) {
  const payload = {};

  if (cmd.embed) {
    const embed = new EmbedBuilder()
      .setColor(resolverCor(cmd.embed.cor))
      .setTitle(cmd.embed.titulo)
      .setDescription(cmd.embed.descricao);
    if (cmd.embed.imagem) embed.setImage(cmd.embed.imagem);
    payload.embeds = [embed];
  } else if (cmd.mensagem) {
    payload.content = cmd.mensagem;
  }

  // Botoes copiaveis (max 5 por linha, 1 linha por simplicidade)
  if (cmd.copiaveis && cmd.copiaveis.length > 0) {
    const row = new ActionRowBuilder();
    cmd.copiaveis.slice(0, 5).forEach((c, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`custom:copy:${cmd.nome.toLowerCase()}:${i}`)
          .setLabel(`📋 ${c.nome}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    payload.components = [row];
  }

  return payload;
}

module.exports = { buildResposta };
