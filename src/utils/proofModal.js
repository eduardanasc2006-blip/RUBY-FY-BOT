const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const proofStore = require('./proofStore');

// Rascunho do fluxo em dois passos: modal (numero/produto/valor) → painel
// com selects (cliente/canal) → confirmar. Modal não aceita select menus.
// Key: `${userId}`  value: { urls, nomes, numero, produto, valor, clienteId, canalId }
const fluxos = new Map();

function salvarFluxo(userId, dados) {
  fluxos.set(userId, dados);
  const timer = setTimeout(() => {
    if (fluxos.get(userId) === dados) fluxos.delete(userId);
  }, 10 * 60 * 1000);
  timer.unref?.();
  return dados;
}
function obterFluxo(userId) {
  return fluxos.get(userId) || null;
}
function limparFluxo(userId) {
  fluxos.delete(userId);
}

// Cria o modal de /proof (só campos de texto; cliente/canal ficam nos selects).
function buildProofModal(guildId, extras = {}) {
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

  const valor = new TextInputBuilder()
    .setCustomId('valor')
    .setLabel('Valor')
    .setPlaceholder('ex: 3,00')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(extras.valor || '');

  return new ModalBuilder()
    .setCustomId('proofmodal')
    .setTitle('📸 Postar Proof')
    .addComponents(
      new ActionRowBuilder().addComponents(numero),
      new ActionRowBuilder().addComponents(produto),
      new ActionRowBuilder().addComponents(valor)
    );
}

// Monta a mensagem efêmera com os seletores (cliente + canal) e o botão final.
function buildProofFormulario(userId, guild, dados) {
  const canalPadrao = proofStore.obter(guild.id);
  const desc = [`🧾 **Proof #${dados.numero}**`];
  if (dados.produto) desc.push(`📦 Produto: ${dados.produto}`);
  if (dados.valor) {
    const v = dados.valor.toLowerCase().startsWith('r$') ? dados.valor : `R$ ${dados.valor}`;
    desc.push(`💰 Valor: ${v}`);
  }

  // Usuário selecionado: mostra @nome (o UserSelect já filtra pela busca do Discord)
  if (dados.clienteId) {
    const u = guild.members.cache.get(dados.clienteId)?.user;
    desc.push(`👤 Cliente: ${u ? `<@${u.id}> (\`${u.username}\`)` : `<@${dados.clienteId}>`}`);
  }
  if (dados.canalId) {
    desc.push(`📥 Canal: <#${dados.canalId}>`);
  }

  const embed = new EmbedBuilder().setColor(0xbeb6ff).setTitle('📸 Revisar Proof').setDescription(desc.join('\n'));

  const linhaCanal = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('proofsel:canal')
      .setPlaceholder(canalPadrao ? `Canal: <#${canalPadrao}>` : 'Selecione o canal')
      .setMinValues(0)
      .setMaxValues(1)
      .setChannelTypes([ChannelType.GuildText])
  );

  const linhaCliente = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('proofsel:cliente')
      .setPlaceholder('Selecione o cliente (busca por @)')
      .setMinValues(0)
      .setMaxValues(1)
  );

  const linhaBotao = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('proofsel:confirmar').setLabel('✅ Confirmar e postar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('proofsel:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [linhaCanal, linhaCliente, linhaBotao],
    flags: 64, // efêmera
  };
}

module.exports = { buildProofModal, buildProofFormulario, salvarFluxo, obterFluxo, limparFluxo };