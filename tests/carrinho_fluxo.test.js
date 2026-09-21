const assert = require('node:assert');
const carrinhoStore = require('../src/utils/carrinhoStore');
const { montarCarrinho, finalizarCarrinho, escolherCategoria } = require('../src/utils/comprarPanel');
const pedidoStore = require('../src/utils/pedidoStore');
const estoque = require('../src/utils/estoque');

// Guild/usuário de teste isolados
const GUILD = 'g-fluxo-carrinho';
const USER = 'u-fluxo-carrinho';

function resetar() {
  carrinhoStore.limpar(GUILD, USER);
  pedidoStore.removerDaGuild(GUILD);
}

function cadastrarProduto(catNome, prodNome, valor, qtd) {
  // O estoque gera o id a partir do nome (slug). Categorias/produtos são
  // criados uma única vez; execuções repetidas apenas reajustam a quantidade.
  const catId = prodNome.startsWith('Cookieblade') ? 'doces' : 'espadas';
  if (!estoque.categoria(GUILD, catId)) {
    estoque.addCategoria(GUILD, catNome);
  }
  const prodId = prodNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const existente = estoque.produto(GUILD, catId, prodId);
  if (!existente) {
    estoque.addProduto(GUILD, catId, {
      nome: prodNome,
      valor,
      controlarQtd: qtd !== null,
      quantidade: qtd || 0,
    });
  } else {
    estoque.setQuantidade(GUILD, catId, prodId, qtd || 0);
  }
}

try {
  resetar();
  pedidoStore.removerDaGuild(GUILD);

  // Setup: Produto A (Cookieblade), Produto B (Ghostblade), Produto C (Saw)
  cadastrarProduto('Doces', 'Cookieblade', 3, 50);
  cadastrarProduto('Espadas', 'Ghostblade', 3, 50);
  cadastrarProduto('Espadas', 'Saw', 3, 50);

  // Passo 1 e 2: escolher Produto A e clicar diretamente em 1x
  // (o handler comp:qtd agora chama carrinhoStore.adicionar)
  carrinhoStore.adicionar(GUILD, USER, { catId: 'doces', prodId: 'cookieblade', nome: 'Cookieblade', quantidade: 1, valorUnitario: 3 });

  // Passo 3: confirmar que Produto A entrou no carrinho
  let itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 1, 'carrinho com 1 item');
  assert.strictEqual(itens[0].nome, 'Cookieblade', 'item é Cookieblade');
  assert.strictEqual(itens[0].quantidade, 1, 'quantidade 1x');

  // Passo 4: escolher "mais produtos" = voltar às categorias (comp:voltar agenda escolherCategoria)
  const categorias = escolherCategoria(GUILD);
  assert.ok(categorias.components.length > 0, 'tela de categorias segue disponível com item no carrinho');

  // Passo 5 e 6: escolher Produto B e clicar em 2x
  carrinhoStore.adicionar(GUILD, USER, { catId: 'espadas', prodId: 'ghostblade', nome: 'Ghostblade', quantidade: 2, valorUnitario: 3 });

  // Passo 7: carrinho tem Produto A + Produto B
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 2, 'carrinho com 2 itens');
  const nomes = itens.map((i) => i.nome).sort();
  assert.deepStrictEqual(nomes, ['Cookieblade', 'Ghostblade'], 'Cookieblade + Ghostblade no carrinho');
  assert.strictEqual(carrinhoStore.total(GUILD, USER), 9, 'total 1*3 + 2*3 = 9');

  // Passo 8: remover somente Produto A (comp:rem usa carrinhoStore.remover)
  carrinhoStore.remover(GUILD, USER, 'doces', 'cookieblade');

  // Passo 9: confirmar que Produto B continua no carrinho
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 1, 'carrinho com 1 item após remover');
  assert.strictEqual(itens[0].nome, 'Ghostblade', 'Ghostblade continua no carrinho');
  assert.strictEqual(carrinhoStore.total(GUILD, USER), 6, 'total 2*3 = 6');

  // Passo 10: adicionar Produto C
  carrinhoStore.adicionar(GUILD, USER, { catId: 'espadas', prodId: 'saw', nome: 'Saw', quantidade: 1, valorUnitario: 3 });

  // Passo 11: carrinho tem Produto B + Produto C
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 2, 'carrinho com 2 itens (B + C)');
  const nomes2 = itens.map((i) => i.nome).sort();
  assert.deepStrictEqual(nomes2, ['Ghostblade', 'Saw'], 'Ghostblade + Saw no carrinho');

  // A tela do carrinho mostra os itens (embed) e o select de remoção + ações
  const tela = montarCarrinho(GUILD, USER);
  const descricao = tela.embeds[0].data.description || '';
  assert.ok(descricao.includes('Ghostblade'), 'carrinho lista Ghostblade');
  assert.ok(descricao.includes('Saw'), 'carrinho lista Saw');
  assert.ok(descricao.includes('Total'), 'carrinho mostra o total');
  // O select de editar item e montado como ActionRow (type 1) na 1a linha
  const select = tela.components[0].toJSON().components[0];
  assert.strictEqual(select.type, 3, 'select e um StringSelect (type 3)');
  assert.strictEqual(select.custom_id, 'comp:iteditar', 'select de editar item do carrinho');
  const valoresSelect = (select.options || []).map((o) => o.value);
  assert.ok(valoresSelect.includes('espadas:ghostblade'), 'select lista Ghostblade para editar');
  assert.ok(valoresSelect.includes('espadas:saw'), 'select lista Saw para editar');
  const labels = JSON.stringify(tela.components.map((r) => r.components.map((b) => b.data.label)));
  assert.ok(labels.includes('Finalizar'), 'carrinho tem botão finalizar');
  assert.ok(labels.includes('Limpar'), 'carrinho tem botão limpar');
  assert.ok(labels.includes('Escolher mais'), 'carrinho tem botão escolher mais');

  // A tela de acoes do item oferece aumentar/diminuir/remover (sem estourar linhas)
  const { editarItemCarrinho } = require('../src/utils/comprarPanel');
  const acoes = editarItemCarrinho(GUILD, USER, 'espadas', 'ghostblade');
  const idsAcoes = acoes.components.flatMap((r) => r.components.map((b) => b.data.custom_id));
  assert.ok(idsAcoes.includes('comp:qmais:espadas:ghostblade'), 'acao aumentar');
  assert.ok(idsAcoes.includes('comp:qmenos:espadas:ghostblade'), 'acao diminuir');
  assert.ok(idsAcoes.includes('comp:qrem:espadas:ghostblade'), 'acao remover');
  assert.ok(acoes.components.length <= 5, 'respeita o limite de 5 ActionRows');
  assert.ok((acoes.embeds[0].data.footer?.text || '').includes('Ghostblade'), 'footer indica o item');

  // Aumentar/diminuir mexem no carrinho e recalculam o total
  const qtdAntes = carrinhoStore.listar(GUILD, USER).find((i) => i.prodId === 'ghostblade').quantidade;
  carrinhoStore.alterarQuantidade(GUILD, USER, 'espadas', 'ghostblade', 1);
  assert.strictEqual(
    carrinhoStore.listar(GUILD, USER).find((i) => i.prodId === 'ghostblade').quantidade,
    qtdAntes + 1,
    'aumentou 1'
  );
  carrinhoStore.alterarQuantidade(GUILD, USER, 'espadas', 'ghostblade', -1);
  assert.strictEqual(
    carrinhoStore.listar(GUILD, USER).find((i) => i.prodId === 'ghostblade').quantidade,
    qtdAntes,
    'diminuiu 1'
  );
  // Deixa o item em 1 e confirma que nao desce para 0 (operacao recusada)
  carrinhoStore.alterarQuantidade(GUILD, USER, 'espadas', 'ghostblade', 1 - qtdAntes);
  assert.strictEqual(
    carrinhoStore.listar(GUILD, USER).find((i) => i.prodId === 'ghostblade').quantidade,
    1,
    'chegou em 1'
  );
  const rMin = carrinhoStore.alterarQuantidade(GUILD, USER, 'espadas', 'ghostblade', -1);
  assert.strictEqual(rMin.ok, false, 'diminuir de 1 e recusado');
  assert.strictEqual(rMin.motivo, 'minimo', 'motivo minimo');
  assert.strictEqual(
    carrinhoStore.listar(GUILD, USER).find((i) => i.prodId === 'ghostblade').quantidade,
    1,
    'segue em 1 (nunca 0)'
  );
  // Volta a quantidade original para o resto do teste
  carrinhoStore.alterarQuantidade(GUILD, USER, 'espadas', 'ghostblade', qtdAntes - 1);

  // Passo 12 e 13: limpar carrinho remove todos os itens
  carrinhoStore.limpar(GUILD, USER);
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 0, 'carrinho vazio após limpar');
  assert.strictEqual(carrinhoStore.total(GUILD, USER), 0, 'total zerado');

  // Passo 14: repetir o fluxo e finalizar uma compra
  carrinhoStore.adicionar(GUILD, USER, { catId: 'doces', prodId: 'cookieblade', nome: 'Cookieblade', quantidade: 1, valorUnitario: 3 });
  carrinhoStore.adicionar(GUILD, USER, { catId: 'espadas', prodId: 'ghostblade', nome: 'Ghostblade', quantidade: 2, valorUnitario: 3 });
  itens = carrinhoStore.listar(GUILD, USER);
  assert.strictEqual(itens.length, 2, '2 itens antes de finalizar');

  const criado = finalizarCarrinho(GUILD, USER, 'teste');
  assert.ok(criado && criado.id, 'pedido criado na finalização');
  assert.strictEqual(criado.itens.length, 2, 'os 2 itens ficam no mesmo pedido');
  assert.strictEqual(carrinhoStore.listar(GUILD, USER).length, 0, 'carrinho limpo após finalizar');
  assert.strictEqual(criado.status, 'pendente', 'pedido pendente');
  assert.strictEqual(criado.itens.find((i) => i.nome === 'Cookieblade').quantidade, 1, 'Cookieblade 1x');
  assert.strictEqual(criado.itens.find((i) => i.nome === 'Ghostblade').quantidade, 2, 'Ghostblade 2x');
  assert.strictEqual(criado.valor, 9, 'total 1*3 + 2*3 = 9');

  console.log('testes fluxo carrinho OK');
} finally {
  carrinhoStore.limpar(GUILD, USER);
  pedidoStore.removerDaGuild(GUILD);
}