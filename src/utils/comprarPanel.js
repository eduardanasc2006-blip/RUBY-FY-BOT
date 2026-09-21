const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const estoque = require('./estoque');
const pedidoStore = require('./pedidoStore');
const carrinhoStore = require('./carrinhoStore');
const pedidoComprasStore = require('./pedidoComprasStore');
const { formatBRL } = require('./robuxConverter');

const COR = 0xbeb6ff;

function row(...btns) {
  return new ActionRowBuilder().addComponents(...btns);
}

function btn(id, label, style, emoji) {
  const estilo = style || ButtonStyle.Secondary;
  const b = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(estilo);
  if (emoji) b.setEmoji(emoji);
  return b;
}

// Linha de resumo do carrinho exibida nas telas de escolha (o cliente lembra
// do que ja adicionou sem precisar abrir o carrinho).
function resumoCarrinho(guildId, userId) {
  if (!userId) return '';
  const itens = carrinhoStore.listar(guildId, userId);
  if (!itens.length) return '';
  return `\n\n🛒 *No carrinho:* ${itens.map((i) => `${i.nome} × ${i.quantidade}`).join(', ')}` +
    ` — **${formatBRL(carrinhoStore.total(guildId, userId))}**`;
}

// ----- Tela 1: selecionar categoria -----

function escolherCategoria(guildId, userId) {
  const cats = estoque.categorias(guildId).filter((c) => c.produtos.some((p) => p.ativo));
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🛒 Comprar — Passo 1 de  3')
    .setDescription(
      cats.length
        ? '**Selecione a categoria do produto que deseja comprar:**' +
          resumoCarrinho(guildId, userId)
        : '*Nenhum produto disponível no momento.*'
    );
  const linhas = [];
  cats.slice(0,  15).forEach((c) => {
    if (linhas.length ===  0 || linhas[linhas.length -  1].components.length ===  5) {
      linhas.push(new ActionRowBuilder());
    }
    linhas[linhas.length -  1].addComponents(
      btn(`comp:cat:${c.id}`, `${c.emoji || '📦'} ${c.nome}`, ButtonStyle.Primary)
    );
  });
  return {
    embeds: [embed],
    components: linhas,
  };
}

// ----- Tela 2: selecionar produto -----

function escolherProduto(guildId, catId, userId) {
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return escolherCategoria(guildId, userId);
  const produtos = cat.produtos.filter((p) => p.ativo);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${cat.emoji || '📦'} ${cat.nome} — Passo 2 de 3`)
    .setDescription(
      produtos.length
        ? '**Selecione o produto desejado:**' + resumoCarrinho(guildId, userId)
        : '*Nenhum produto disponível nesta categoria.*'
    );
  const linhas = [];
  produtos.slice(0, 15).forEach((p) => {
    if (linhas.length ===  0 || linhas[linhas.length -  1].components.length ===  5) {
      linhas.push(new ActionRowBuilder());
    }
    const s = estoque.status(p);
    const disp = p.controlarQtd ? ` ${pedidoStore.disponivel(guildId, p, catId, p.id)}` : ' ilimitado';
    linhas[linhas.length -  1].addComponents(
      btn(`comp:prod:${catId}:${p.id}`, `${p.nome} — ${formatBRL(p.valor)} (${s.emoji}${disp})`, ButtonStyle.Primary)
    );
  });
  linhas.push(row(btn('comp:voltar', '⬅️ Voltar às categorias', ButtonStyle.Secondary)));
  return {
    embeds: [embed],
    components: linhas,
  };
}

// ----- Tela 3: selecionar quantidade -----

function escolherQuantidade(guildId, catId, prodId) {
  const p = estoque.produto(guildId, catId, prodId);
  if (!p) return escolherCategoria(guildId);
  const disponivel = pedidoStore.disponivel(guildId, p, catId, p.id);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`🔢 ${p.nome} — Passo 3 de  3`)
    .setDescription(
      `**Preço:** ${formatBRL(p.valor)} cada\n` +
      `**Disponível:** ${disponivel === null ? 'ilimitado' : `${disponivel} unidade(s)`}\n\n` +
      'Clique na quantidade para **adicionar ao carrinho** e continuar comprando:'
    );
  if (disponivel !== null && disponivel <=  0) {
    embed.setDescription(`**${p.nome}** está esgotado no momento.`);
    return {
      embeds: [embed],
      // comp:cat volta para a LISTA de produtos da categoria (comp:prod reabriria
      // a tela de quantidade do mesmo produto, criando um loop).
      components: [
        row(
          btn(`comp:cat:${catId}`, '⬅️ Voltar aos produtos', ButtonStyle.Secondary),
          btn('comp:voltar', '🏠 Voltar às categorias', ButtonStyle.Secondary)
        ),
      ],
    };
  }
  const quantidades = [];
  if (disponivel === null) {
  quantidades.push(1, 2, 3,  5, 10);
  } else {
  for (let n =  1; n <= Math.min(disponivel, 10); n++) quantidades.push(n);
  if (disponivel > 10) quantidades.push(disponivel);
  }
  const linhas = [];
  quantidades.forEach((q) => {
  if (linhas.length ===  0 || linhas[linhas.length -  1].components.length ===  5) {
  linhas.push(new ActionRowBuilder());
  }
  linhas[linhas.length -  1].addComponents(
  btn(`comp:qtd:${catId}:${p.id}:${q}`, `${q}x`, ButtonStyle.Secondary)
  );
  });

  // Ações do carrinho: adicionar por modal (multi-compra) e ver carrinho
  linhas.push(row(
    btn(`comp:addcarrinho:${catId}:${p.id}`, '🛒 Adicionar ao carrinho', ButtonStyle.Primary, '🛒'),
    btn(`comp:carrinho`, 'Ver carrinho', ButtonStyle.Secondary)
  ));
  linhas.push(row(btn(`comp:cat:${catId}`, '⬅️ Voltar aos produtos', ButtonStyle.Secondary)));
  return {
  embeds: [embed],
  components: linhas,
  };
}

// ----- Modal: quantidade personalizada -----
function modalQuantidade(catId, prodId, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`comp:modaldigitar:${catId}:${prodId}`)
    .setTitle('🔢 Quantidade')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantidade')
          .setLabel('Digite a quantidade desejada')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(4)
      )
    );
  return modal;
}

// ----- Tela: carrinho de compras -----
function montarCarrinho(guildId, userId) {
  const itens = carrinhoStore.listar(guildId, userId);
  const total = carrinhoStore.total(guildId, userId);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🛒 CARRINHO')
    .setDescription(
      itens.length
        ? itens.map((i) => `**${i.nome}** × ${i.quantidade} — ${formatBRL((i.valorUnitario || 0) * i.quantidade)}`).join('\n') +
          `\n\n💰 **Total: ${formatBRL(total)}**`
        : '*Carrinho vazio. Adicione itens pelo painel de compra.*'
    );

  const linhas = [];
  if (itens.length) {
    // Um select para remover itens: evita dezenas de botões quando o carrinho
    // tem muitos produtos (limite de 5 ActionRows por mensagem).
    const opcoes = itens.slice(0, 25).map((i) => ({
      label: `${i.nome} × ${i.quantidade}`.slice(0, 100),
      description: formatBRL((i.valorUnitario || 0) * i.quantidade),
      value: `${i.catId}:${i.prodId}`,
    }));
    linhas.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('comp:removeritem')
          .setPlaceholder('🗑️ Remover um item do carrinho')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(opcoes)
      )
    );
  }
  linhas.push(row(
    btn('comp:voltar', '🎁 Escolher mais produtos', ButtonStyle.Primary),
    btn('comp:limpar', '🧹 Limpar carrinho', ButtonStyle.Danger),
    btn('comp:finalizar', '✅ Finalizar compra', ButtonStyle.Success)
  ));
  return { embeds: [embed], components: linhas };
}

// Referência da mensagem pública do carrinho no ticket (para edit posterior).
function painelRef(guildId, userId) {
  return carrinhoStore.ref(guildId, userId);
}

// ----- Finalizar o carrinho: cria UM pedido com todos os itens -----
function finalizarCarrinho(guildId, userId, clienteTag) {
  const itens = carrinhoStore.listar(guildId, userId);
  if (!itens.length) return null;

  // Valida cada item antes de criar o pedido: nada e reservado se algum item
  // saiu do estoque, foi desativado ou nao tem quantidade disponivel.
  const validos = [];
  for (const item of itens) {
    const p = estoque.produto(guildId, item.catId, item.prodId);
    if (!p || !p.ativo) continue;
    if (p.controlarQtd && pedidoStore.disponivel(guildId, p, item.catId, item.prodId) < item.quantidade) continue;
    validos.push({
      catId: item.catId,
      prodId: item.prodId,
      nome: p.nome,
      quantidade: item.quantidade,
      valorUnitario: p.valor || 0,
    });
  }
  if (!validos.length) return null;

  const valor = Math.round(validos.reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0) * 100) / 100;
  const pedido = pedidoStore.criar(guildId, {
    clienteId: userId,
    clienteTag,
    itens: validos,
    itemNome: validos.map((i) => `${i.nome} × ${i.quantidade}`).join(', '),
    quantidade: validos.reduce((acc, i) => acc + i.quantidade, 0),
    valor,
  });

  // Limpa o carrinho após tentativa
  carrinhoStore.limpar(guildId, userId);
  return pedido;
}

// ----- Mensagem do pedido publica no ticket -----

// Log do pedido no canal de logs: UMA embed por evento (nada de separar em
// varias), com todos os campos do pedido em ordem fixa e legivel.
// `acao` define titulo/cor e quem registrou (confirmou/cancelou).
function logDoPedido(pedido, { acao = 'criado', por = null } = {}) {
  const cabecalhos = {
    criado: { titulo: '📥 Pedido criado', cor: 0xf1c40f },
    confirmado: { titulo: '✅ Pedido confirmado', cor: 0x2ecc71 },
    cancelado: { titulo: '❌ Pedido cancelado', cor: 0xe74c3c },
  };
  const { titulo, cor } = cabecalhos[acao] || cabecalhos.criado;
  const itens = itensDoPedido(pedido);

  const campos = [
    { name: '🆔 Pedido', value: `\`#${pedido.id}\``, inline: true },
    { name: '👤 Cliente', value: `${pedido.clienteTag || `<@${pedido.clienteId}>`} (\`${pedido.clienteId}\`)`, inline: true },
    { name: '💰 Total', value: formatBRL(pedido.valor), inline: true },
    { name: '📦 Itens', value: itens.map((i) => `**${i.nome}** × ${i.quantidade} — ${formatBRL((i.valorUnitario || 0) * i.quantidade)}`).join('\n') },
  ];

  if (acao === 'criado') {
    campos.push({ name: '🟡 Status', value: 'Aguardando pagamento', inline: true });
  } else {
    campos.push({ name: acao === 'confirmado' ? '🟢 Status' : '❌ Status', value: acao === 'confirmado' ? 'Pago' : 'Cancelado', inline: true });
    const quando = acao === 'confirmado' ? pedido.confirmadoEm : pedido.canceladoEm;
    campos.push({
      name: acao === 'confirmado' ? '👮 Confirmado por' : '👮 Cancelado por',
      value: `<@${por || (acao === 'confirmado' ? pedido.confirmadoPor : pedido.canceladoPor)}>${quando ? ` — <t:${Math.floor(quando / 1000)}:f>` : ''}`,
      inline: true,
    });
  }

  return { titulo, cor, campos, timestamp: true };
}

// Itens do pedido (compativel com pedidos antigos, criados antes de existir `itens[]`).
function itensDoPedido(p) {
  if (Array.isArray(p?.itens) && p.itens.length) return p.itens;
  return [{
    catId: p.catId,
    prodId: p.prodId,
    nome: p.itemNome,
    quantidade: p.quantidade,
    valorUnitario: p.quantidade ? Math.round(((p.valor || 0) / p.quantidade) * 100) / 100 : p.valor || 0,
  }];
}

// Mensagem do ticket. O canalId e usado para trocar {canal} na mensagem de
// pagamento configurada via /setcomprar.
function mensagemPedido(guildId, pedido, canalId) {
  const p = pedidoStore.obter(guildId, pedido.id);
  if (!p) return { content: '❌ Pedido não encontrado.', embeds: [], components: [] };
  const itens = itensDoPedido(p);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`🧾 PEDIDO #${p.id}`)
    .setDescription(
      itens.map((i) => `**${i.nome}** × ${i.quantidade} — ${formatBRL((i.valorUnitario || 0) * i.quantidade)}`).join('\n') +
      `\n\n💰 **Total: ${formatBRL(p.valor)}**\n${statusTexto(p.status)}`
    )
    .addFields({ name: '👤 Cliente', value: `${p.clienteTag || `<@${p.clienteId}>`} (\`${p.clienteId}\`)`, inline: true });

  // Instrucoes de pagamento apenas enquanto o pedido aguarda pagamento.
  if (p.status === 'pendente') {
    embed.addFields({ name: '💳 Pagamento', value: pedidoComprasStore.mensagem(guildId, { total: p.valor, canalId }) });
  } else {
    embed.addFields({ name: '🔎 Registro', value: registroDoPedido(p) });
  }

  return {
    embeds: [embed],
    components: componentesDoPedido(p),
  };
}

// Linha de auditoria (quem confirmou/cancelou e quando) mostrada no ticket.
function registroDoPedido(p) {
  if (p.status === 'confirmado') {
    const quando = p.confirmadoEm ? `<t:${Math.floor(p.confirmadoEm / 1000)}:f>` : '—';
    return `Confirmado por <@${p.confirmadoPor}> em ${quando}`;
  }
  if (p.status === 'cancelado') {
    const quando = p.canceladoEm ? `<t:${Math.floor(p.canceladoEm / 1000)}:f>` : '—';
    const por = p.canceladoPor ? ` por <@${p.canceladoPor}>` : '';
    return `Cancelado${por} em ${quando} — reserva liberada`;
  }
  return statusTexto(p.status);
}

function statusTexto(status) {
  switch (status) {
    case 'pendente': return '🟡 Aguardando pagamento';
    case 'confirmado': return '🟢 Pago';
    case 'cancelado': return '❌ Pedido cancelado';
    default: return String(status || '');
  }
}

// Botoes de acao do pedido. Confirmar/cancelar ficam no ticket para a equipe
// (permissao de Vendas e pedidos, validada no handler).
function componentesDoPedido(p) {
  if (p.status === 'pendente') {
    return [
      row(
        btn(`comp:confirmar:${p.id}`, 'Confirmar pagamento', ButtonStyle.Success, '🟢'),
        btn(`comp:cancelar:${p.id}`, 'Cancelar pedido', ButtonStyle.Danger, '❌')
      ),
    ];
  }
  return [];
}

// Confirmacao do cancelamento (o cancelamento so acontece em comp:confcanc).
function confirmacaoCancelamento(pedidoId) {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('⚠️ Cancelar pedido')
    .setDescription(
      `Tem certeza que deseja cancelar o pedido **#${pedidoId}**?\n\n` +
      'Isso irá liberar a reserva do estoque.'
    );
  return {
    embeds: [embed],
    components: [
      row(
        btn(`comp:confcanc:${pedidoId}`, 'Sim, cancelar', ButtonStyle.Danger, '✅'),
        btn(`comp:voltcanc:${pedidoId}`, 'Não', ButtonStyle.Secondary, '🔙')
      ),
    ],
  };
}

module.exports = {
  escolherCategoria,
  escolherProduto,
  escolherQuantidade,
  modalQuantidade,
  resumoCarrinho,
  montarCarrinho,
  painelRef,
  finalizarCarrinho,
  mensagemPedido,
  confirmacaoCancelamento,
  itensDoPedido,
  logDoPedido,
  statusTexto,
  componentesDoPedido,
};
