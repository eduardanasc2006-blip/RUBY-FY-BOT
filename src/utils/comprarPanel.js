const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const estoque = require('./estoque');
const pedidoStore = require('./pedidoStore');
const carrinhoStore = require('./carrinhoStore');
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

// ----- Tela 1: selecionar categoria -----

function escolherCategoria(guildId) {
  const cats = estoque.categorias(guildId).filter((c) => c.produtos.some((p) => p.ativo));
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🛒 Comprar — Passo 1 de  3')
    .setDescription(
      cats.length
        ? '**Selecione a categoria do produto que deseja comprar:**'
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

function escolherProduto(guildId, catId) {
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return escolherCategoria(guildId);
  const produtos = cat.produtos.filter((p) => p.ativo);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${cat.emoji || '📦'} ${cat.nome} — Passo 2 de 3`)
    .setDescription(
      produtos.length
        ? '**Selecione o produto desejado:**'
        : '*Nenhum produto disponível nesta categoria.*'
    );
  const linhas = [];
  produtos.slice(0, 15).forEach((p) => {
    if (linhas.length ===  0 || linhas[linhas.length -  1].components.length ===  5) {
      linhas.push(new ActionRowBuilder());
    }
    const s = estoque.status(p);
    const disp = p.controlarQtd ? ` ${pedidoStore.disponivel(guildId, p)}` : ' ilimitado';
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
  const disponivel = pedidoStore.disponivel(guildId, p);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`🔢 ${p.nome} — Passo 3 de  3`)
    .setDescription(
      `**Preço:** ${formatBRL(p.valor)} cada\n` +
      `**Disponível:** ${disponivel === null ? 'ilimitado' : `${disponivel} unidade(s)`}\n\n` +
      'Selecione a quantidade ou **adicione ao carrinho** para escolher mais produtos depois:'
    );
  if (disponivel !== null && disponivel <=  0) {
    embed.setDescription(`**${p.nome}** está esgotado no momento.`);
    return {
      embeds: [embed],
      components: [row(btn(`comp:prod:${catId}:${p.id}`, '⬅️ Voltar aos produtos', ButtonStyle.Secondary))],
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
  linhas.push(row(btn(`comp:prod:${catId}:${p.id}`, '⬅️ Voltar aos produtos', ButtonStyle.Secondary)));
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
    .setTitle('🛒 Carrinho')
    .setDescription(
      itens.length
        ? itens.map((i) => `**${i.nome}** × ${i.quantidade} — ${formatBRL((i.valorUnitario || 0) * i.quantidade)}`).join('\n') +
          `\n\n**Total: ${formatBRL(total)}**`
        : '*Carrinho vazio. Adicione itens pelo painel de compra.*'
    );

  const linhas = [];
  if (itens.length) {
    // Botões de remover item (máx 5 por linha; no máx 4 linhas, senão estoura ActionRow)
    const exibidos = itens.slice(0, 20);
    for (let i = 0; i < exibidos.length; i++) {
      if (i % 5 === 0) linhas.push(new ActionRowBuilder());
      linhas[linhas.length - 1].addComponents(
        btn(`comp:rem:${exibidos[i].catId}:${exibidos[i].prodId}`, `✖ ${exibidos[i].nome}`, ButtonStyle.Danger)
      );
    }
    linhas.push(row(
      btn('comp:finalizar', '✅ Finalizar compra', ButtonStyle.Success, '✅'),
      btn(`comp:voltar`, '🎁 Escolher mais produtos', ButtonStyle.Primary),
      btn('comp:limpar', '🗑️ Limpar carrinho', ButtonStyle.Danger, '🗑️')
    ));
  } else {
    linhas.push(row(
      btn('comp:voltar', '🎁 Escolher produtos', ButtonStyle.Primary)
    ));
  }
  if (linhas.length > 5) {
    // Se ainda passou de 5 linhas, mantém só as ações de finalizar/limpar
    linhas.splice(0, linhas.length - 5);
  }
  return { embeds: [embed], components: linhas };
}

// ----- Finalizar o carrinho: cria um pedido por item -----
function finalizarCarrinho(guildId, userId, clienteTag) {
  const itens = carrinhoStore.listar(guildId, userId);
  const criados = [];
  for (const item of itens) {
    const p = estoque.produto(guildId, item.catId, item.prodId);
    if (!p) continue;
    // Reserva (se controlar quantidade)
    if (p.controlarQtd) {
      const disp = pedidoStore.disponivel(guildId, p);
      if (disp < item.quantidade) continue;
    }
    const pedido = pedidoStore.criar(guildId, {
      clienteId: userId,
      clienteTag,
      catId: item.catId,
      prodId: item.prodId,
      itemNome: item.nome,
      quantidade: item.quantidade,
      valor: Math.round((item.valorUnitario || 0) * item.quantidade * 100) / 100,
    });
    criados.push(pedido);
  }
  // Limpa o carrinho após tentativa
  carrinhoStore.limpar(guildId, userId);
  return criados;
}

// ----- Mensagem do pedido pendente -----

function mensagemPedido(guildId, pedido) {
  const p = pedidoStore.obter(guildId, pedido.id);
  if (!p) return { content: '❌ Pedido não encontrado.', embeds: [], components: [] };
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🛒 PEDIDO PENDENTE')
    .addFields({ name: '👤 Cliente', value: p.clienteTag || `<@${p.clienteId}>` })
    .addFields(
      { name: '📦 Item', value: p.itemNome, inline: true },
      { name: '🔢 Quantidade', value: String(p.quantidade), inline: true },
      { name: '💰 Valor', value: formatBRL(p.valor), inline: true }
    )
    .addFields({ name: '⏳ Status', value: statusTexto(p.status) });
  return {
    embeds: [embed],
    components: componentesDoPedido(p),
  };
}

function statusTexto(status) {
  switch (status) {
    case 'pendente': return '⏳ Aguardando confirmação do pagamento';
    case 'confirmado': return '✅ Pagamento confirmado';
    case 'cancelado': return '❌ Cancelado';
    default: return String(status || '');
  }
}

function componentesDoPedido(p) {
  if (p.status === 'pendente') {
    return [
      row(
        btn(`comp:confirmar:${p.id}`, 'Confirmar pagamento', ButtonStyle.Success, '🟢'),
        btn(`comp:cancelar:${p.id}`, 'Cancelar pedido', ButtonStyle.Danger, '🔴')
      ),
    ];
  }
  return [];
}
module.exports = { escolherCategoria, escolherProduto, escolherQuantidade, modalQuantidade, montarCarrinho, finalizarCarrinho, mensagemPedido, statusTexto, componentesDoPedido };
