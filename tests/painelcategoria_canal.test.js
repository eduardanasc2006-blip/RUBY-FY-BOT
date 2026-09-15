const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const estoque = require('../src/utils/estoque');
const painelCategoria = require('../src/prefixCommands/painelcategoria');

// Guild isolada de teste
const G = 'gcanal' + 'test';
const arq = path.join(__dirname, '..', 'data', 'estoque', G + '.json');
fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, JSON.stringify({ categorias: [] }, null, 2));

estoque.addCategoria(G, 'vip');
estoque.addProduto(G, 'vip', { nome: 'KVM', valor: 100, controlarQtd: true, quantidade: 5 });

let falhas = 0;
const check = (cond, msg) => { if (!cond) { falhas++; console.log('FALHA:', msg); } };

// --- 1. Fluxo de selecao de canal (novo) ---
const canais = [
  { id: 'c1', name: 'geral', isTextBased: () => true, isThread: () => false, isVoiceBased: () => false, position: 1, parent: null, permissionsFor: () => ({ has: (p) => p === 'SendMessages' }) },
  { id: 'c2', name: 'vendas', isTextBased: () => true, isThread: () => false, isVoiceBased: () => false, position: 2, parent: { name: 'TEXTO' }, permissionsFor: () => ({ has: (p) => p === 'SendMessages' }) },
  { id: 'c3', name: 'privado', isTextBased: () => false, isThread: () => false, isVoiceBased: () => true, position: 3, parent: null, permissionsFor: () => ({ has: (p) => p === 'SendMessages' }) },
];
const guild = { id: G, channels: { cache: new Collection(canais.map((c) => [c.id, c])) }, members: { me: { id: 'bot' } } };

const tela = painelCategoria.construirSelecaoCanal(guild, 'vip', 'c1');
check(tela.embeds.length === 1, 'deve retornar 1 embed');
check(tela.embeds[0].data.title.includes('qual canal'), 'titulo deve perguntar o canal');
check(tela.components.length >= 1, 'deve ter components');
const select = tela.components[0]?.components?.find((c) => (c.type || c.data?.type) === 3 || c.options);
check(Boolean(select), 'deve ter um select (StringSelectMenu)');
if (select) {
  check(select.data.custom_id === 'painelcat:vip:canal', 'customId do select deve ser painelcat:vip:canal, veio: ' + select.data.custom_id);
  const opcoes = select.options || select.data.options;
  check(opcoes.length === 2, 'so canais de texto publicaveis (2), veio: ' + opcoes.length);
  check(opcoes.some((o) => o.data?.value === 'c1' || o.value === 'c1'), 'deve listar #geral');
  check(opcoes.some((o) => o.data?.value === 'c2' || o.value === 'c2'), 'deve listar #vendas');
  check(!opcoes.some((o) => (o.data?.value || o.value) === 'c3'), 'NÃO deve listar canal de voz');
}
// botões: canal atual (porque passamos c1 como atual) + cancelar
const idsBotoes = tela.components.flatMap((r) => (r.components || []).map((c) => c.data?.custom_id)).filter(Boolean);
check(idsBotoes.includes('painelcat:vip:canal:atual'), 'deve ter botão Canal atual');
check(idsBotoes.includes('painelcat:vip:canal:cancelar'), 'deve ter botão Cancelar');

// sem canal atual: só botão cancelar
const telaSemAtual = painelCategoria.construirSelecaoCanal(guild, 'vip');
const idsBotoesSemAtual = telaSemAtual.components.flatMap((r) => (r.components || []).map((c) => c.data?.custom_id)).filter(Boolean);
check(!idsBotoesSemAtual.includes('painelcat:vip:canal:atual'), 'sem canal atual NAO deve ter botão Canal atual');
check(idsBotoesSemAtual.includes('painelcat:vip:canal:cancelar'), 'sem canal atual ainda tem Cancelar');

// categoria inexistente não quebra o seletor
const telaMiss = painelCategoria.construirSelecaoCanal(guild, 'naoexiste');
check(telaMiss.embeds.length === 1, 'categoria inexistente ainda monta a tela');
check((telaMiss.components[0]?.components?.length || 0) >= 1, 'categoria inexistente ainda mostra o seletor');

// --- 2. buildCategoria continua igual (regressão) ---
const embed = painelCategoria.buildCategoria(G, 'vip');
const desc = embed.data.description.replace(/\u00a0/g, ' ');
check(desc.includes('🟢 **KVM** — R$ 100,00 • 5x'), 'buildCategoria mantém listagem: ' + desc);
check(desc.endsWith('🟢 Disponível • 🔴 Esgotado'), 'mantém legenda');

// --- 3. construirPainelSelecao continua (regressão) ---
const sel = painelCategoria.construirPainelSelecao(G);
check(sel.embeds.length === 1, 'seletor de categoria tem embed');
const botoesSel = sel.components.flatMap((r) => (r.components || []).map((c) => c.data?.custom_id)).filter(Boolean);
check(botoesSel.includes('painelcat:vip'), 'seletor deve ter botão painelcat:vip: ' + JSON.stringify(botoesSel));

console.log(falhas ? `FALHAS: ${falhas}` : 'PAINELCATEGORIA-CANAL-OK');
fs.rmSync(arq);
if (falhas) process.exit(1);