const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { resolverCor } = require('../prefixCommands/embed');

// Monta a resposta de um comando customizado (com embed, mensagem e botoes copiaveis)
function buildResposta(cmd) {
  const payload = {};

  // Monta a descricao: mensagem + valores copiaveis listados
  let descricao = cmd.mensagem || '';
  const copiaveisLista = (cmd.copiaveis || []).filter((c) => c.tipo !== 'link');
  if (copiaveisLista.length > 0) {
    descricao += (descricao ? '\n\n' : '') + copiaveisLista.map((c) => `**${c.nome}:** \`${c.valor}\``).join('\n');
  }

  // Sempre usa embed (mais bonito)
  const embed = new EmbedBuilder()
    .setColor(resolverCor(cmd.embed?.cor))
    .setTitle(cmd.embed?.titulo || cmd.descricao || cmd.nome)
    .setDescription(cmd.embed?.descricao || descricao);
  if (cmd.embed?.imagem) embed.setImage(cmd.embed.imagem);
  payload.embeds = [embed];

  // Botoes: copiaveis (handler) + links (ButtonStyle.Link nativo)
  if (cmd.copiaveis && cmd.copiaveis.length > 0) {
    const row = new ActionRowBuilder();
    cmd.copiaveis.slice(0, 5).forEach((c, i) => {
      if (c.tipo === 'link') {
        // Botao nativo de link: abre a URL direto, sem handler
        row.addComponents(
          new ButtonBuilder()
            .setURL(c.valor)
            .setLabel(`🔗 ${c.nome}`)
            .setStyle(ButtonStyle.Link)
        );
      } else {
        // Botao copiavel: handler mostra o valor em ephemeral
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`custom:copy:${cmd.nome.toLowerCase()}:${i}`)
            .setLabel(`📋 ${c.nome}`)
            .setStyle(ButtonStyle.Secondary)
        );
      }
    });
    payload.components = [row];
  }

  return payload;
}

module.exports = { buildResposta };
