const assert = require('node:assert');
const carrinhoStore = require('../src/utils/carrinhoStore');
const { finalizarCarrinho, montarCarrinho } = require('../src/utils/comprarPanel');
const pedidoStore = require('../src/utils/pedidoStore');
const estoque = require('../src/utils/estoque');

// Usa guilds de teste isoladas para não contaminar dados reais
const GUILD = 'g-teste-carrinho';
const USER = 'u-teste-carrinho';

function resetar() {
  carrinhoStore.limpar(GUILD, USER);
  for (const cat of estoque.categorias(GUILD)) {
    for (const prod of cat.produtos) {
      estoque.setQuantidade(GUILD, cat.id, prod.id, 999999);
    }
  }
}

try {
  // Adiciona itens
  carrinhoStore.limpar(GUILD, USER);
  carrinhoStore.adicionar(GUILD, USER, { catId: 'cat-a', prodId: 'item-1', nome: 'Item 1', quantidade: 2, valorUnitario: 5 });
  carrinhoStore.adicionar(GUILD, USER, { catId: 'cat-b', prodId: 'item-2', nome: 'Item 2', quantidade: 1, valorUnitario: 10 });

  let itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 2, 'deve ter 2 itens');
  assert.strictEqual(carrinhoStore.total(GUILD, USER), 20, 'total deve ser 2*5 + 1*10 = 20');

  // Adicionar item repetido soma quantidade
  carrinhoStore.adicionar(GUILD, USER, { catId: 'cat-a', prodId: 'item-1', nome: 'Item 1', quantidade: 3, valorUnitario: 5 });
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 2, 'continua 2 itens');
  assert.strictEqual(itens[0].quantidade, 5, 'quantidade somada (2+3)');
  assert.strictEqual(carrinhoStore.total(GUILD, USER), 35, 'total agora 5*5 + 10 = 35');

  // Montar carrinho retorna embed e botões
  const tela = montarCarrinho(GUILD, USER);
  assert.strictEqual(tela.embeds.length, 1, '1 embed no carrinho');
  assert.ok(tela.components.length > 0, 'carrinho com botões');

  // Finaliza (cria pedidos)
  estoque.addCategoria(GUILD, 'cat-a');
  estoque.addProduto(GUILD, 'cat-a', { nome: 'Item 1', valor: 5, controlarQtd: false, quantidade: 0 });
  estoque.addCategoria(GUILD, 'cat-b');
  estoque.addProduto(GUILD, 'cat-b', { nome: 'Item 2', valor: 10, controlarQtd: false, quantidade: 0 });

  const criados = finalizarCarrinho(GUILD, USER, 'teste');
  assert.strictEqual(criados.length, 2, '2 pedidos criados');
  assert.strictEqual(carrinhoStore.listar(GUILD, USER).length, 0, 'carrinho limpo após finalizar');

  // Pedidos criados têm id sequencial
  assert.strictEqual(criados[0].clienteId, USER, 'cliente correto');
  assert.strictEqual(criados[0].status, 'pendente', 'status pendente');

  // doCliente filtra por status
  const doCliente = pedidoStore.doCliente(GUILD, USER, 'pendente');
  assert.strictEqual(doCliente.length, 2, '2 pedidos pendentes do cliente');

  console.log('testes carrinho OK');
} finally {
  // Limpa o que foi criado para não vazar para o ambiente
  carrinhoStore.limpar(GUILD, USER);
}