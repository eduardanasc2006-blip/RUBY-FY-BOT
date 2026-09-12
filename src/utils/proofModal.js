const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const proofStore = require('./proofStore');

// Cria o modal de /proof reutilizável pelo comando slash e pelo botão do !proof.
function buildProofModal(guildId, extras = {}) {
  const canalPadrao = proofStore.obter(guildId);

  const numero = new TextInputBuilder()
    .setCustomId('numero')
    .setLabel('Número do proof')
    .setPlaceholder('ex: 26')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(extras.numero || '');

  const produto = new TextInputBuilder()
    .setCustomId('produto')
    .setLabel('Produto / Item')
    .setPlaceholder('ex: Testando')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(extras.produto || '');

  const cliente = new TextInputBuilder()
    .setCustomId('cliente')
    .setLabel('Cliente')
    .setPlaceholder('ex: @finix.yin (deixe vazio se não quiser)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(extras.cliente || '');

  const valor = new TextInputBuilder()
    .setCustomId('valor')
    .setLabel('Valor')
    .setPlaceholder('ex: 3,00')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(extras.valor || '');

  const canal = new TextInputBuilder()
    .setCustomId('canal')
    .setLabel('Canal (ID ou #nome; vazio = configurado)')
    .setPlaceholder(canalPadrao ? `Padrão: <#${canalPadrao}>` : 'ex: 123456789012345678')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(extras.canal || '');

  return new ModalBuilder()
    .setCustomId('proofmodal')
    .setTitle('📸 Postar Proof')
    .addComponents(
      new ActionRowBuilder().addComponents(numero),
      new ActionRowBuilder().addComponents(produto),
      new ActionRowBuilder().addComponents(cliente),
      new ActionRowBuilder().addComponents(valor),
      new ActionRowBuilder().addComponents(canal)
    );
}

module.exports = { buildProofModal };