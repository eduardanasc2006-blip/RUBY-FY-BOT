const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { resolverCor } = require('../prefixCommands/embed');

// Monta a resposta de um comando customizado (com embed, mensagem e botoes copiaveis)
function buildResposta(cmd) {
  const payload = {};

  // Monta a descricao: apenas a mensagem do comando.
  // Os valores copiaveis nao entram aqui para nao duplicarem: cada um aparece
  // uma unica vez como botao (abaixo), onde o usuario clica para copiar.
  let descricao = cmd.mensagem || '';

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
        // Botao copiavel: rotulo mostra o proprio item (o valor) a ser copiado,
        // em vez de usar o nome salvo (que podia vir truncado/errado)
        const itemRotulo = (c.valor || c.nome || 'Copiar').slice(0, 80);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`custom:copy:${cmd.nome.toLowerCase()}:${i}`)
            .setLabel(`📋 ${itemRotulo}`)
            .setStyle(ButtonStyle.Secondary)
        );
      }
    });
    payload.components = [row];
  }

  return payload;
}

module.exports = { buildResposta };
