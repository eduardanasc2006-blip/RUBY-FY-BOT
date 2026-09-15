const fs = require('node:fs');
const path = require('node:path');
const estoque = require('../src/utils/estoque');
const painelcategoria = require('../src/prefixCommands/painelcategoria');

const G = 'gvis' + 'cat';
const arq = path.join(__dirname, '..', 'data', 'estoque', G + '.json');
fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, JSON.stringify({ categorias: [] }, null, 2));

estoque.addCategoria(G, 'godly');
estoque.addProduto(G, 'godly', { nome: 'Cookieblade', valor: 3, controlarQtd: true, quantidade: 1 });
estoque.addProduto(G, 'godly', { nome: 'Pumpking', valor: 2.5, controlarQtd: true, quantidade: 0 });
estoque.addProduto(G, 'godly', { nome: 'Deathshard', valor: 4, controlarQtd: true, quantidade: 1 });
estoque.addProduto(G, 'godly', { nome: 'Eternal 2', valor: 2.5, controlarQtd: true, quantidade: 0 });
estoque.addProduto(G, 'godly', { nome: 'Mult', valor: 1, controlarQtd: false, quantidade: null });

const embed = painelcategoria.buildCategoria(G, 'godly');
const desc = embed.data.description.replace(/\u00a0/g, ' ');
const linhas = desc.split('\n');

let falhas = 0;
const check = (cond, msg) => { if (!cond) { falhas++; console.log('FALHA:', msg); } };

check(embed.data.title === '📦 godly', 'titulo deve ser a categoria');
check(desc.includes('🟢 **Cookieblade** — R$ 3,00 • 1x'), 'Cookieblade disponivel: ' + desc);
check(desc.includes('🔴 **Pumpking** — R$ 2,50 • 0x'), 'Pumpking esgotado');
check(desc.includes('🟢 **Deathshard** — R$ 4,00 • 1x'), 'Deathshard disponivel');
check(desc.includes('🔴 **Eternal 2** — R$ 2,50 • 0x'), 'Eternal 2 esgotado');
check(linhas.some((l) => l.startsWith('🟢 **Mult**')), 'sem controle de qtd deve mostrar verde');
check(linhas[linhas.length - 1] === '🟢 Disponível • 🔴 Esgotado', 'legenda no final: ' + linhas[linhas.length - 1]);

estoque.toggleAtivo(G, 'godly', 'cookieblade');
const embed2 = painelcategoria.buildCategoria(G, 'godly');
check(!embed2.data.description.includes('Cookieblade'), 'produto inativo nao deve aparecer');

check(desc.includes('• 1x'), 'formato de quantidade deve ser Nx');

console.log(falhas ? `FALHAS: ${falhas}` : 'PAINELCATEGORIA-VISUAL-OK');
fs.rmSync(arq);
if (falhas) process.exit(1);