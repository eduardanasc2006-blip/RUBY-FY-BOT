// Teste de ISOLAMENTO ENTRE SERVIDORES.
// Garante que dados configurados no Servidor A NUNCA aparecem no Servidor B,
// mesmo com o MESMO usuário presente nos dois.
//
// Usa guilds de teste (prefixo g-iso-) para não tocar nos dados reais de data/.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DATA = path.join(__dirname, '..', 'data');

// Limpa dados de teste ANTES dos require (os stores leem o arquivo uma única vez
// no primeiro require — se limpar depois, o cache em memória mantém dados velhos).
function limparArquivosTeste() {
  for (const g of ['g-iso-A', 'g-iso-B', 'g-iso-debug']) {
    for (const arq of [
      ['estoque', `${g}.json`],
      ['autorespostas', `${g}.json`],
      ['comandos_custom', `${g}.json`],
      ['paineis', `${g}.json`],
      ['painel_estoque', `${g}.json`],
    ]) {
      try { fs.rmSync(path.join(DATA, arq[0], arq[1])); } catch {}
    }
    for (const arq of ['welcome.json', 'pedidos.json', 'carrinhos.json', 'compras.json', 'metas.json', 'canal_avisos.json', 'canal_comandos.json', 'log_compras.json', 'modelos_embed.json']) {
      try {
        const f = path.join(DATA, arq);
        if (fs.existsSync(f)) {
          const dados = JSON.parse(fs.readFileSync(f, 'utf8'));
          if (dados && typeof dados === 'object') {
            delete dados[g];
            // Garante que salva sem referências da guild
            const { [g]: _removido, ...resto } = dados;
            fs.writeFileSync(f, JSON.stringify(resto, null, 2));
          }
        }
      } catch {}
    }
  }
}
limparArquivosTeste();

const estoque = require('../src/utils/estoque');
const autoRespostaStore = require('../src/utils/autoRespostaStore');
const avisos = require('../src/utils/avisos');
const welcomeStore = require('../src/utils/welcomeStore');
const proofStore = require('../src/utils/proofStore');
const proofModal = require('../src/utils/proofModal');
const metasStore = require('../src/utils/metasStore');
const comprasStore = require('../src/utils/comprasStore');
const pedidoStore = require('../src/utils/pedidoStore');
const carrinhoStore = require('../src/utils/carrinhoStore');
const canalComandoStore = require('../src/utils/canalComandoStore');
const customComandos = require('../src/utils/customCommands');
const painelCenter = require('../src/utils/painelCenter');
const logComprasStore = require('../src/utils/logComprasStore');

const GA = 'g-iso-A';
const GB = 'g-iso-B';
const USER = 'u-iso-user'; // MESMO usuário nos dois servidores

let falhas = 0;
function check(nome, cond, detalhe) {
  if (cond) {
    console.log(`[OK] ${nome}`);
  } else {
    console.log(`[FALHA] ${nome} ${detalhe ? '— ' + detalhe : ''}`);
    falhas++;
  }
}

// Limpa dados de teste ANTES, para cada run ser determinística.

(async () => {

  console.log('===== ISOLAMENTO ENTRE SERVIDORES =====\n');

  // 1) ESTOQUE: produto cadastrado só em A não aparece em B
  estoque.addCategoria(GA, 'Cat A');
  estoque.addProduto(GA, 'cat-a', { nome: 'Produto A', valor: 10, controlarQtd: true, quantidade: 5 });
  estoque.addCategoria(GB, 'Cat B');
  estoque.addProduto(GB, 'cat-b', { nome: 'Produto B', valor: 20, controlarQtd: true, quantidade: 7 });

  const catsA = estoque.categorias(GA).map((c) => c.nome);
  const catsB = estoque.categorias(GB).map((c) => c.nome);
  const prodsA = estoque.categorias(GA).flatMap((c) => c.produtos.map((p) => p.nome));
  const prodsB = estoque.categorias(GB).flatMap((c) => c.produtos.map((p) => p.nome));

  check('estoque A tem só Produto A', prodsA.length === 1 && prodsA[0] === 'Produto A', JSON.stringify(prodsA));
  check('estoque B tem só Produto B', prodsB.length === 1 && prodsB[0] === 'Produto B', JSON.stringify(prodsB));
  check('Produto A NÃO existe em B', !prodsB.includes('Produto A'));
  check('Produto B NÃO existe em A', !prodsA.includes('Produto B'));

  // 2) AUTO-RESPOSTAS
  autoRespostaStore.adicionar(GA, 'ola', 'Resposta A', []);
  autoRespostaStore.adicionar(GB, 'tchau', 'Resposta B', []);
  const respA = autoRespostaStore.listar(GA);
  const respB = autoRespostaStore.listar(GB);
  check('autoresposta A tem a palavra de A', respA.some((r) => r.palavras?.includes('ola')), JSON.stringify(respA));
  check('autoresposta B tem a palavra de B', respB.some((r) => r.palavras?.includes('tchau')), JSON.stringify(respB));
  check('palavra de A NÃO existe em B', !respB.some((r) => r.palavras?.includes('ola')));
  check('palavra de B NÃO existe em A', !respA.some((r) => r.palavras?.includes('tchau')));

  // 3) CANAL DE AVISOS por guild
  avisos.definir(GA, '100000000000000001');
  avisos.definir(GB, '200000000000000002');
  check('aviso de A usa canal de A', avisos.carregar(GA) === '100000000000000001');
  check('aviso de B usa canal de B', avisos.carregar(GB) === '200000000000000002');
  check('NÃO há aviso global compartilhado', avisos.carregar(GA) !== avisos.carregar(GB));

  // 4) WELCOME por guild
  welcomeStore.salvar(GA, { ativo: true, canalId: '100000000000000001', tipo: 'mensagem', mensagem: 'Bem-vindo ao A' });
  welcomeStore.salvar(GB, { ativo: true, canalId: '200000000000000002', tipo: 'mensagem', mensagem: 'Bem-vindo ao B' });
  check('welcome de A é de A', welcomeStore.obter(GA)?.mensagem === 'Bem-vindo ao A');
  check('welcome de B é de B', welcomeStore.obter(GB)?.mensagem === 'Bem-vindo ao B');
  check('welcome de A NÃO vaza para B', welcomeStore.obter(GB)?.mensagem !== 'Bem-vindo ao A');

  // 5) PROOF: canal por guild + rascunho por guild+user
  proofStore.definir(GA, '100000000000000001');
  proofStore.definir(GB, '200000000000000002');
  check('channel de proof de A', proofStore.obter(GA) === '100000000000000001');
  check('channel de proof de B', proofStore.obter(GB) === '200000000000000002');

  // Rascunho: mesmo usuário em guilds diferentes NÃO se misturam
  proofStore.salvarRascunho(GA, USER, { urls: ['https://a.com/x.png'], nomes: ['x.png'] });
  proofStore.salvarRascunho(GB, USER, { urls: ['https://b.com/y.png'], nomes: ['y.png'] });
  const draftA = proofStore.obterRascunho(GA, USER);
  const draftB = proofStore.obterRascunho(GB, USER);
  check('rascunho proof em A é o de A', draftA?.urls[0] === 'https://a.com/x.png');
  check('rascunho proof em B é o de B', draftB?.urls[0] === 'https://b.com/y.png');
  check('rascunho de A NÃO vaza para B', draftB?.urls[0] !== 'https://a.com/x.png');
  proofStore.limparRascunho(GA, USER);
  proofStore.limparRascunho(GB, USER);

  // Fluxo do proofModal (key guildId+userId)
  const fluxoA = proofModal.salvarFluxo(GA, USER, { numero: 1 });
  const fluxoB = proofModal.salvarFluxo(GB, USER, { numero: 2 });
  check('fluxo proof em A é A', proofModal.obterFluxo(GA, USER)?.numero === 1);
  check('fluxo proof em B é B', proofModal.obterFluxo(GB, USER)?.numero === 2);
  check('fluxo de A NÃO vaza para B', proofModal.obterFluxo(GB, USER)?.numero !== 1);
  proofModal.limparFluxo(GA, USER);
  proofModal.limparFluxo(GB, USER);

  // 6) COMANDOS POR CANAL (canalComando)
  canalComandoStore.definir(GA, 'robux', ['100000000000000001']);
  canalComandoStore.definir(GB, 'robux', ['200000000000000002']);
  const canaisA = canalComandoStore.canaisParaComando(GA, 'robux');
  const canaisB = canalComandoStore.canaisParaComando(GB, 'robux');
  check('canalcomando A', canaisA[0] === '100000000000000001');
  check('canalcomando B', canaisB[0] === '200000000000000002');
  check('canalcomando A NÃO vaza para B', !canaisB.includes('100000000000000001'));

  // 7) COMANDOS PERSONALIZADOS
  customComandos.criar(GA, 'aaa', { mensagem: 'cmd A', canal: '123' });
  customComandos.criar(GB, 'bbb', { mensagem: 'cmd B', canal: '456' });
  check('custom A', customComandos.obter(GA, 'aaa')?.mensagem === 'cmd A');
  check('custom B', customComandos.obter(GB, 'bbb')?.mensagem === 'cmd B');
  check('custom de A NÃO existe em B', !customComandos.obter(GB, 'aaa'));
  check('custom de B NÃO existe em A', !customComandos.obter(GA, 'bbb'));

  // 8) METAS por guild + CARGOS CUMULATIVOS
  metasStore.addCargo(GA, { id: 'cargo-A', nome: 'VIP A' });
  metasStore.addCargo(GB, { id: 'cargo-B', nome: 'VIP B' });
  metasStore.definirMeta(GA, 'total', 50);
  metasStore.definirMeta(GB, 'total', 100);
  check('meta de A', metasStore.obterMeta(GA, 'total') === 50);
  check('meta de B', metasStore.obterMeta(GB, 'total') === 100);
  check('meta de A NÃO vaza para B', metasStore.obterMeta(GB, 'total') !== 50);

  // 9) PEDIDOS de A ficam em A (mesmo usuário)
  const pedA = pedidoStore.criar(GA, { clienteId: USER, clienteTag: 'u', catId: 'cat-a', prodId: 'x', itemNome: 'Item A', quantidade: 1, valor: 10 });
  const pedB = pedidoStore.criar(GB, { clienteId: USER, clienteTag: 'u', catId: 'cat-b', prodId: 'y', itemNome: 'Item B', quantidade: 1, valor: 20 });
  check('pedido de A em A', pedidoStore.lista(GA).some((p) => p.itemNome === 'Item A'));
  check('pedido de A NÃO em B', !pedidoStore.lista(GB).some((p) => p.itemNome === 'Item A'));
  check('pedido de B em B', pedidoStore.lista(GB).some((p) => p.itemNome === 'Item B'));
  check('pedido de B NÃO em A', !pedidoStore.lista(GA).some((p) => p.itemNome === 'Item B'));
  const pendentesA = pedidoStore.doCliente(GA, USER, 'pendente');
  const pendentesB = pedidoStore.doCliente(GB, USER, 'pendente');
  check('cliente A tem só 1 pedido em A', pendentesA.length === 1 && pendentesA[0].id === pedA.id);
  check('cliente B tem só 1 pedido em B', pendentesB.length === 1 && pendentesB[0].id === pedB.id);

  // 10) CARRINHO por guild+user
  carrinhoStore.adicionar(GA, USER, { catId: 'cat-a', prodId: 'prod-a', nome: 'Car A', quantidade: 1, valorUnitario: 10 });
  carrinhoStore.adicionar(GB, USER, { catId: 'cat-b', prodId: 'prod-b', nome: 'Car B', quantidade: 1, valorUnitario: 20 });
  check('carrinho A só tem item A', carrinhoStore.listar(GA, USER).length === 1 && carrinhoStore.listar(GA, USER)[0].nome === 'Car A');
  check('carrinho B só tem item B', carrinhoStore.listar(GB, USER).length === 1 && carrinhoStore.listar(GB, USER)[0].nome === 'Car B');
  check('item de A NÃO no carrinho de B', !carrinhoStore.listar(GB, USER).some((i) => i.nome === 'Car A'));

  // 11) COMPRAS/VENDAS por guild + CUMULATIVO (não re-conquista)
  comprasStore.registrarVenda(GA, USER, 60, ['VIP A']);
  const dadosClienteA = comprasStore.dadosDoCliente(GA, USER);
  const dadosClienteB = comprasStore.dadosDoCliente(GB, USER);
  check('gasto de A', dadosClienteA.gasto === 60);
  check('gasto de B independente (0)', dadosClienteB.gasto === 0, `gasto B = ${dadosClienteB.gasto}`);
  check('cargos de A NÃO vazam para B', comprasStore.cargosDoCliente(GB, USER).length === 0);
  check('cargos de A ficam em A', comprasStore.cargosDoCliente(GA, USER).includes('VIP A'));

  // 12) LOG COMPRAS por guild
  logComprasStore.definir(GA, '100000000000000001');
  logComprasStore.definir(GB, '200000000000000002');
  check('log compras A', logComprasStore.obter(GA) === '100000000000000001');
  check('log compras B', logComprasStore.obter(GB) === '200000000000000002');
  check('log de A NÃO vaza para B', logComprasStore.obter(GB) !== '100000000000000001');

  // 13) PAINEL CENTRAL por guild (não espelha global)
  painelCenter.salvarConversao(GA, { channelId: '100000000000000001', messageId: 'm1' });
  painelCenter.salvarEstoque(GA, { channelId: '100000000000000001', messageId: 'm2' });
  painelCenter.salvarConversao(GB, { channelId: '200000000000000002', messageId: 'm3' });
  check('painelCentral conversao de A', painelCenter.readConversao(GA)?.channelId === '100000000000000001');
  check('painelCentral conversao de B', painelCenter.readConversao(GB)?.channelId === '200000000000000002');
  check('painelCentral conversao de A NÃO vaza para B', painelCenter.readConversao(GB)?.channelId !== '100000000000000001');
  check('painelCentral estoque de A', painelCenter.readEstoque(GA)?.channelId === '100000000000000001');
  check('painelCentral estoque de B NÃO tem o de A', painelCenter.readEstoque(GB)?.channelId !== '100000000000000001');

  console.log('\n===== RESULTADO ISOLAMENTO =====');
  console.log(falhas === 0 ? `TODOS OS CHECKS PASSARAM` : `${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error('ERRO na execução:', e);
  process.exit(1);
});