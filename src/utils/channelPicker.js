const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ----- Sistema comum de seleção de canal para comandos que publicam -----
// Lista apenas canais de texto em que o bot tem permissão de enviar mensagens.
// Reutilize em qualquer comando/botão que publique mensagens no servidor.

// Canais de texto onde publicar faz sentido (ou canais que o usuário escolheu).
function canaisPublicaveis(guild) {
  if (!guild) return [];
  return guild.channels.cache
    .filter((c) =>
      c.isTextBased() &&
      !c.isThread() &&
      !c.isVoiceBased() &&
      c.permissionsFor(guild.members.me)?.has('SendMessages')
    )
    .sort((a, b) => a.position - b.position)
    .first(25);
}

// Monta a linha de seleção de canal para uso em uma resposta (reply/update/followUp).
// Retorna { row, botoes, canais } para adicionar aos componentes.
function linhaSelecaoCanalDe(guild, callbackId, canalAtualId = null, rotulo = '📣 Publicar em…') {
  const canais = canaisPublicaveis(guild);
  const select = new StringSelectMenuBuilder()
    .setCustomId(callbackId)
    .setPlaceholder(rotulo)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      canais.map((c) => ({
        label: (canalAtualId && c.id === canalAtualId ? '📌 ' : '') + (c.name.length > 95 ? c.name.slice(0, 92) + '…' : c.name),
        description: canalAtualId && c.id === canalAtualId ? 'Canal atual' : `#${c.parent?.name || 'sem categoria'}`.slice(0, 100),
        value: c.id,
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  const botoes = new ActionRowBuilder();
  if (canalAtualId) {
    botoes.addComponents(
      new ButtonBuilder().setCustomId(`${callbackId}:atual`).setLabel('📌 Canal atual').setStyle(ButtonStyle.Primary)
    );
  }
  botoes.addComponents(
    new ButtonBuilder().setCustomId(`${callbackId}:cancelar`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );
  return { select, row, botoes, canais };
}

// Resolve o canal escolhido a partir de um interaction (select ou botão).
// Retorna { canal, cancelado }.
function resolverSelecaoCanal(interaction, callbackId) {
  if (interaction.isStringSelectMenu() && interaction.customId === callbackId) {
    const id = interaction.values[0];
    const canal = interaction.guild?.channels.cache.get(id) || null;
    return { canal, cancelado: false };
  }
  if (interaction.isButton() && interaction.customId === `${callbackId}:cancelar`) {
    return { canal: null, cancelado: true };
  }
  if (interaction.isButton() && interaction.customId === `${callbackId}:atual`) {
    return { canal: interaction.channel, cancelado: false };
  }
  return { canal: null, cancelado: false };
}

module.exports = { canaisPublicaveis, linhaSelecaoCanalDe, resolverSelecaoCanal };