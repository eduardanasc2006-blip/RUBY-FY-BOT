const assert = require('node:assert');
const estoquePanel = require('../src/utils/estoquePanel');
const estoque = require('../src/utils/estoque');

// Navegação entre categorias no painel público (!estoque / painel fixo)
function testeNavegacao() {
  const G = 'g-nav-test';
  const c1 = estoque.addCategoria(G, 'Godlys');
  const c2 = estoque.addCategoria(G, 'Soltas');
  const c3 = estoque.addCategoria(G, 'Míticas');
  estoque.addProduto(G, c1.id, { nome: 'Iceblaster', valor: 150, controlarQtd: true, quantidade: 3 });

  const first = estoquePanel.publicoProdutos(G, c1.id);
  const idsFirst = first.components[0].components.map((b) => b.data.custom_id);
  assert.ok(idsFirst.includes(`estfixo:next:${c2.id}`), 'primeira categoria mostra a próxima');
  assert.ok(idsFirst.includes('estfixo:voltar'), 'tem botão voltar');
  assert.ok(!idsFirst.some((i) => i.startsWith('estfixo:prev:')), 'primeira categoria não mostra anterior');

  const middle = estoquePanel.publicoProdutos(G, c2.id);
  const idsMiddle = middle.components[0].components.map((b) => b.data.custom_id);
  assert.ok(idsMiddle.includes(`estfixo:prev:${c1.id}`), 'categoria do meio mostra anterior');
  assert.ok(idsMiddle.includes(`estfixo:next:${c3.id}`), 'categoria do meio mostra próxima');

  const last = estoquePanel.publicoProdutos(G, c3.id);
  const idsLast = last.components[0].components.map((b) => b.data.custom_id);
  assert.ok(idsLast.includes(`estfixo:prev:${c2.id}`), 'última categoria mostra anterior');
  assert.ok(!idsLast.some((i) => i.startsWith('estfixo:next:')), 'última categoria não mostra próxima');

  const fs = require('node:fs');
  const path = require('node:path');
  try { fs.rmSync(path.join(__dirname, '..', 'data', 'estoque', `${G}.json`)); } catch {}
  console.log('teste navegação painel estoque OK');
}

// Paginação das telas de escolha de categoria/produto no painel de estoque.
// Antes, só os 5 primeiros itens apareciam (slice(0,5)) e o resto ficava inacessível.

const GUILD = 'g-pag-test';
const GID_PREFIX = 'categoria-pag';

try {
  const cat = estoque.addCategoria(GUILD, 'Categoria Pag');
  for (let i = 1; i <= 12; i++) {
    estoque.addProduto(GUILD, cat.id, { nome: 'Produto ' + i, valor: i, controlarQtd: true, quantidade: 5 });
  }

  // Página 0 mostra os 5 primeiros
  const p0 = estoquePanel.adminEscolherProduto(GUILD, 'vender3', cat.id, 0);
  const labels0 = p0.components[0].components.map((c) => c.data.label);
  assert.deepStrictEqual(labels0, ['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4', 'Produto 5'], 'página 0 = 5 primeiros');
  assert.ok(p0.components[1].components.some((c) => c.data.label === 'Próxima ▶️'), 'página 0 tem Próxima');
  assert.ok(!p0.components[1].components.some((c) => c.data.label === '◀️ Anterior'), 'página 0 não tem Anterior');

  // Última página alcança o produto 11 e 12, incluindo o de id produto-12
  const p2 = estoquePanel.adminEscolherProduto(GUILD, 'vender3', cat.id, 2);
  assert.deepStrictEqual(p2.components[0].components.map((c) => c.data.label), ['Produto 11', 'Produto 12'], 'última página tem os últimos produtos');
  assert.ok(p2.components[0].components.some((c) => c.data.custom_id === `estadm:vender3:${cat.id}:produto-12`), 'produto-12 acessível via página 2');
  assert.ok(p2.embeds[0].data.title.includes('(3/3)'), 'título indica página 3/3');

  // Custom ids de navegação corretos: estadm:prodpag:<acao>:<catId>:<pag>
  const nav = p2.components[1].components.map((c) => c.data.custom_id);
  assert.ok(nav.includes(`estadm:prodpag:vender3:${cat.id}:1`), 'nav Anterior com customId correto');

  // Clamping: página além do fim cai na última; NaN vira 0
  const p99 = estoquePanel.adminEscolherProduto(GUILD, 'vender3', cat.id, 99);
  assert.strictEqual(p99.components[0].components[0].data.label, 'Produto 11', 'página 99 clampa para a última');
  const pNaN = estoquePanel.adminEscolherProduto(GUILD, 'vender3', cat.id, NaN);
  assert.strictEqual(pNaN.components[0].components[0].data.label, 'Produto 1', 'NaN vira página 0');

  // Paginação de categorias (8 categorias = 2 páginas)
  for (let i = 1; i <= 8; i++) estoque.addCategoria(GUILD, 'Cat ' + i);
  const c0 = estoquePanel.adminEscolherCategoria(GUILD, 'qtd2', 0);
  assert.strictEqual(c0.components[0].components.length, 5, 'página 0 de categoria = 5');
  assert.ok(c0.components[1].components.some((c) => c.data.custom_id.startsWith('estadm:catpag:qtd2:1')), 'nav categoria Próxima');
  const c1 = estoquePanel.adminEscolherCategoria(GUILD, 'qtd2', 1);
  assert.ok(c1.components[0].components.some((c) => c.data.label.includes('Cat 8')), 'categoria 8 acessível na página 1');

  console.log('testes estoquePanel paginação OK');
} finally {
  estoque.removeCategoria(GUILD, GID_PREFIX);
  // remove categorias Cat N
  const fs = require('node:fs');
  const path = require('node:path');
  const arquivo = path.join(__dirname, '..', 'data', 'estoque', `${GUILD}.json`);
  try { fs.rmSync(arquivo); } catch {}
}

testeNavegacao();
console.log('SUITE PAGINACAO + NAVEGACAO OK');