// Regressão do lançamento manual de venda (/venda e !venda).
//
// Cobre o caso que o sistema não atendia: venda feita FORA do /comprar (pix
// direto, DM, outro canal) precisa entrar no gasto do cliente e contar para as
// metas de cargo, exatamente como uma compra confirmada.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const comprasStore = require('../src/utils/comprasStore');
const metasStore = require('../src/utils/metasStore');
const { parseValor, parseQuantidade, lancarVenda, resumoCliente } = require('../src/utils/vendaPanel');

const DATA = path.join(__dirname, '..', 'data');
const GUILD = 'g-venda-teste';
const CLIENTE = '910000000000000001';
const OUTRO = '910000000000000002';
const OPERADOR = '910000000000000003';

const RESULTADOS = [];
function check(nome, fn) {
  try {
    fn();
    RESULTADOS.push({ nome, ok: true });
    console.log('[OK] ' + nome);
  } catch (e) {
    RESULTADOS.push({ nome, ok: false, erro: e?.message || String(e) });
    console.log('[FALHA] ' + nome + ' -> ' + (e?.message || e));
  }
}

function limpar() {
  const b = comprasStore.base(GUILD);
  b.pedidos = 0;
  b.gasto = 0;
  b.clientes = {};
  b.lancamentos = [];
  metasStore.listaMetas(GUILD).length = 0;
}

// guild fake: sem membros em cache, o que também testa o caminho "não achei o
// membro" (o valor tem de ser creditado mesmo assim).
const guild = {
  id: GUILD,
  members: { cache: new Map(), fetch: async () => null },
};
const client = { channels: { fetch: async () => null } };

(async () => {
  limpar();

  // ===== parseValor =====
  check('parseValor aceita formatos comuns (vírgula, ponto, R$)', () => {
    assert.strictEqual(parseValor('10'), 10);
    assert.strictEqual(parseValor('10,50'), 10.5);
    assert.strictEqual(parseValor('R$ 10,50'), 10.5);
    assert.strictEqual(parseValor('1.234,56'), 1234.56);
    assert.strictEqual(parseValor('10.5'), 10.5);
  });
  check('parseValor rejeita entrada inválida', () => {
    assert.strictEqual(parseValor('abc'), null);
    assert.strictEqual(parseValor(''), null);
    assert.strictEqual(parseValor('-5'), null);
    assert.strictEqual(parseValor(null), null);
  });
  check('parseQuantidade usa 1 como padrão e ignora lixo', () => {
    assert.strictEqual(parseQuantidade(undefined), 1);
    assert.strictEqual(parseQuantidade(''), 1);
    assert.strictEqual(parseQuantidade('2'), 2);
    assert.strictEqual(parseQuantidade('0'), 1);
    assert.strictEqual(parseQuantidade('abc'), 1);
  });

  // ===== lançamento básico =====
  await lancarVenda(client, guild, { clienteId: CLIENTE, valor: 25.5, registradoPor: OPERADOR, descricao: 'pix fora do ticket' });
  check('lançar venda credita o gasto do cliente', () => {
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.strictEqual(d.gasto, 25.5, 'gasto somado');
    assert.strictEqual(d.vendas, 1, 'uma venda contada');
  });
  check('lançamento manual fica registrado com autor e descrição', () => {
    const lista = comprasStore.listarLancamentos(GUILD, CLIENTE);
    assert.strictEqual(lista.length, 1, 'um lançamento');
    assert.strictEqual(lista[0].valor, 25.5);
    assert.strictEqual(lista[0].registradoPor, OPERADOR);
    assert.strictEqual(lista[0].descricao, 'pix fora do ticket');
  });
  check('gasto do servidor (base) também é somado', () => {
    const b = comprasStore.base(GUILD);
    assert.strictEqual(b.gasto, 25.5, 'gasto da guild');
    assert.strictEqual(b.pedidos, 1, 'pedidos da guild');
  });
  check('não vaza para outro cliente', () => {
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, OUTRO).gasto, 0, 'outro cliente zerado');
  });

  // ===== quantidade > 1 =====
  await lancarVenda(client, guild, { clienteId: CLIENTE, valor: 10, quantidade: 3 });
  check('quantidade conta várias vendas pelo mesmo valor', () => {
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.strictEqual(d.gasto, 35.5, 'gasto acumulado (25,5 + 10 do total da venda)');
    assert.strictEqual(d.vendas, 4, 'vendas acumuladas (1 + 3)');
  });

  // ===== metas por valor =====
  const cargoValor = { id: 'cargo-valor', nome: 'VIP Valor' };
  metasStore.addMeta(GUILD, { cargoId: cargoValor.id, cargoNome: cargoValor.nome, tipo: 'valor', meta: 50 });
  const r1 = await lancarVenda(client, guild, { clienteId: OUTRO, valor: 60 });
  check('venda manual dispara meta por VALOR', () => {
    assert.strictEqual(r1.conquistadas.length, 1, 'uma meta conquistada');
    assert.strictEqual(r1.conquistadas[0].cargoId, cargoValor.id, 'cargo correto');
    assert.ok(
      comprasStore.cargosDoCliente(GUILD, OUTRO).includes('VIP Valor'),
      'cargo registrado no histórico do cliente'
    );
  });
  const r2 = await lancarVenda(client, guild, { clienteId: OUTRO, valor: 10 });
  check('meta já conquistada não é concedida de novo', () => {
    assert.strictEqual(r2.conquistadas.length, 0, 'não repete a meta');
  });

  // ===== metas por quantidade de vendas =====
  const cargoVendas = { id: 'cargo-vendas', nome: 'Comprador Fiel' };
  metasStore.addMeta(GUILD, { cargoId: cargoVendas.id, cargoNome: cargoVendas.nome, tipo: 'vendas', meta: 5 });
  const r3 = await lancarVenda(client, guild, { clienteId: CLIENTE, valor: 1 });
  check('venda manual dispara meta por QUANTIDADE de vendas', () => {
    assert.strictEqual(r3.conquistadas.length, 1, 'uma meta por vendas');
    assert.strictEqual(r3.conquistadas[0].cargoId, cargoVendas.id, 'cargo de vendas');
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).vendas, 5, 'chegou a 5 vendas');
  });

  // ===== consulta (resumo) =====
  const resumo = resumoCliente(GUILD, CLIENTE);
  check('resumo do cliente mostra gasto, vendas e cargos', () => {
    assert.strictEqual(resumo.acumulado.gasto, 36.5, 'gasto total');
    assert.strictEqual(resumo.acumulado.vendas, 5, 'vendas totais');
    assert.ok(resumo.cargos.includes('Comprador Fiel'), 'cargo conquistado listado');
    assert.strictEqual(resumo.totalManual, 36.5, 'total lançado manualmente');
  });
  check('resumo calcula o que falta para as próximas metas', () => {
    const alvo = resumo.faltando.find((f) => f.meta.cargoId === cargoValor.id);
    assert.ok(alvo, 'meta de valor pendente');
    assert.strictEqual(alvo.restante, 13.5, 'falta R$ 13,50 para a meta de R$ 50');
  });

  // ===== remover lançamento =====
  const lista = comprasStore.listarLancamentos(GUILD, CLIENTE);
  const removido = comprasStore.removerLancamento(GUILD, lista[0].id);
  check('remover lançamento devolve o valor que tinha somado', () => {
    assert.ok(removido, 'lançamento removido');
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.strictEqual(d.gasto, 11, 'gasto corrigido (36,5 - 25,5)');
    assert.strictEqual(d.vendas, 4, 'vendas corrigidas');
  });
  check('remover lançamento não derruba o gasto abaixo de zero', () => {
    const l = comprasStore.listarLancamentos(GUILD, CLIENTE)[0];
    comprasStore.removerLancamento(GUILD, l.id);
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.ok(d.gasto >= 0 && d.vendas >= 0, 'sem valores negativos');
  });

  // ----- limpeza -----
  limpar();
  try { fs.rmSync(path.join(DATA, 'estoque', `${GUILD}.json`), { force: true }); } catch {}

  const falhas = RESULTADOS.filter((r) => !r.ok);
  console.log(`\n===== RESULTADO: ${RESULTADOS.length - falhas.length}/${RESULTADOS.length} checks OK =====`);
  if (falhas.length) {
    falhas.forEach((f) => console.log('FALHA: ' + f.nome + ' -> ' + f.erro));
    process.exit(1);
  }
  console.log('testes de lançamento manual de venda OK');
})();
