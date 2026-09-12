const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const proofStore = require('./proofStore');
const estoque = require('./estoque');

// Lista os produtos ativos do servidor para o seletor do proof.
// Só leitura — não altera estoque/quantidade em hipótese alguma.
function listarProdutos(guildId) {
  const lista = [];
  for (const cat of estoque.categorias(guildId)) {
    for (const p of cat.produtos || []) {
      if (!p.ativo) continue;
      lista.push({ id: p.id, nome: p.nome, valor: p.valor, categoria: cat.nome });
    }
  }
  return lista.slice(0, 25);
}

// Monta as opções do seletor de produtos (nome — R$ valor)
function opcoesProdutos(guildId) {
  return listarProdutos(guildId).map((p) => ({
    label: p.nome.slice(0, 90),
    value: String(p.id).slice(0, 90),
    description:
      p.valor != null
        ? `R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : undefined,
  }));
}

// Rascunho do fluxo em dois passos: modal (numero/produto/valor) → painel
// com selects (cliente/canal/produto) → confirmar. Modal não aceita select menus.
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

// Cliente é um dos dois: menção do Discord (<@id> + ID) ou um nome livre
// de plataforma externa (Instagram, TikTok, etc.) digitado via modal.
function linhasDoCliente(dados) {
  if (dados.clienteNome) return [`👤 Cliente: ${dados.clienteNome}`];
  if (dados.clienteId) return [`👤 Cliente: <@${dados.clienteId}>`, `🆔 ID: \`${dados.clienteId}\``];
  return [];
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

  desc.push(...linhasDoCliente(dados));
  if (dados.canalId) {
    desc.push(`📥 Canal: <#${dados.canalId}>`);
  }

  const embed = new EmbedBuilder().setColor(0xbeb6ff).setTitle('📸 Revisar Proof').setDescription(desc.join('\n'));

  const produtos = opcoesProdutos(guild.id);
  const linhas = [];
  if (produtos.length) {
    linhas.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('proofsel:produto')
          .setPlaceholder(dados.produto ? `Produto: ${dados.produto}` : 'Selecione o produto (não altera estoque)')
          .setMinValues(0)
          .setMaxValues(1)
          .setOptions(produtos)
      )
    );
  }

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
      .setPlaceholder(dados.clienteNome ? `Cliente: ${dados.clienteNome} (fora do Discord)` : 'Selecione o cliente (busca por @)')
      .setMinValues(0)
      .setMaxValues(1),
    new ButtonBuilder().setCustomId('proofsel:plataforma').setLabel('🌐 Fora do Discord').setStyle(ButtonStyle.Secondary)
  );

  const linhaBotao = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('proofsel:confirmar').setLabel('✅ Confirmar e postar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('proofsel:cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger)
  );
  linhas.push(linhaCanal, linhaCliente, linhaBotao);

  return {
    embeds: [embed],
    components: linhas,
    flags: 64, // efêmera
  };
}

// Modal para digitar o nome do cliente quando a venda é fora do Discord
// (Instagram, TikTok, etc.). O texto vira o valor de "Cliente:" no proof.
function modalClientePlataforma(valorAtual = '') {
  const cliente = new TextInputBuilder()
    .setCustomId('clienteNome')
    .setLabel('Cliente fora do Discord')
    .setPlaceholder('ex: Instagram, TikTok, @usuario…')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80)
    .setValue(valorAtual || '');

  return new ModalBuilder()
    .setCustomId('proofsel:plataformamodal')
    .setTitle('🌐 Cliente fora do Discord')
    .addComponents(new ActionRowBuilder().addComponents(cliente));
}

module.exports = { buildProofModal, buildProofFormulario, modalClientePlataforma, salvarFluxo, obterFluxo, limparFluxo, listarProdutos, opcoesProdutos };