const fs = require('node:fs');
const { escreverAtomico } = require('./escritaAtomica');
const { arredondar, somar, subtrair } = require('./dinheiro');
const path = require('node:path');
const FILE = path.join(__dirname, '..', '..', 'data', 'compras.json');

let dados = {};
try {
  const raw = fs.readFileSync(FILE, 'utf8');
  dados = JSON.parse(raw);
} catch {
  dados = {};
}

function salvar() {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });
  const texto = JSON.stringify(dados, null, 2);
  escreverAtomico(FILE, texto);
}

function base(guildId) {
  if (!dados[guildId]) dados[guildId] = { pedidos: 0, gasto: 0, cargos: [] };
  return dados[guildId];
}

function somarPedido(guildId, valor) {
  const b = base(guildId);
  b.pedidos = b.pedidos + 1;
  b.gasto = somar(b.gasto, valor);
  salvar();
}

function addCargoMeta(guildId, cargoNome) {


  const b = base(guildId);
b.cargos.push(cargoNome);
  salvar();
}


// ----- Controle por cliente (para as metas e o perfil) -----
// Os dados ficam internos: o /cliente so mostra cargos conquistados.


function cliente(guildId, clienteId) {
  const b = base(guildId);
  if (!b.clientes) b.clientes = {};
  if (!b.clientes[clienteId]) {
    b.clientes[clienteId] = { vendas:  0, gasto:  0, cargos: [] };
    salvar();
  }
  return b.clientes[clienteId];
}

// Registra uma venda confirmada para um cliente (uma unica vez por pedido).
function registrarVenda(guildId, clienteId, valor, cargosNovos = []) {

  const c = cliente(guildId, clienteId);
  c.vendas += 1;
  c.gasto = somar(c.gasto, valor);
  c.cargos = [...new Set([...c.cargos, ...cargosNovos])];
  salvar();
}

// Lista os cargos ja conquistados pelo cliente.

function cargosDoCliente(guildId, clienteId) {

  const c = cliente(guildId, clienteId);
  return c.cargos || [];
}

// Dados brutos de venda do cliente (para o sistema de metas;nao exibir no perfil).
function dadosDoCliente(guildId, clienteId) {

  const c = cliente(guildId, clienteId);
  return { vendas: c.vendas ||  0, gasto: c.gasto ||  0 };
}

// ----- Lançamentos manuais (vendas fora do /comprar) -----
// Servem para creditar no cliente uma venda que aconteceu por fora do bot
// (pagamento direto, DM, outro canal...), para o sistema de metas/cargos contar
// esse valor. Ficam na mesma base do cliente, então somam no gasto e no número
// de vendas usados por metasConquistadas.

function lancamentos(guildId) {
  const b = base(guildId);
  if (!Array.isArray(b.lancamentos)) b.lancamentos = [];
  return b.lancamentos;
}

function novoIdLancamento(guildId) {
  const lista = lancamentos(guildId);
  let n = lista.length + 1;
  while (lista.some((l) => l.id === String(n))) n++;
  return String(n);
}

// Registra uma venda manual e devolve o lançamento criado.
// `cargosNovos` são os cargos das metas conquistadas por esta venda (mesmo
// padrão de registrarVenda): entram no histórico do cliente sem contar a venda 2x.
function registrarVendaManual(guildId, clienteId, valor, { descricao = '', registradoPor = null, clienteTag = null, quantidade = 1, cargosNovos = [] } = {}) {
  const b = base(guildId);
  const c = cliente(guildId, clienteId);
  const valorNum = Number(valor) || 0;
  const qtd = Number(quantidade) > 0 ? Math.floor(Number(quantidade)) : 1;

  c.vendas += qtd;
  c.gasto = somar(c.gasto, valorNum);
  c.cargos = [...new Set([...(c.cargos || []), ...cargosNovos])];
  b.pedidos += qtd;
  b.gasto = somar(b.gasto, valorNum);

  const lancamento = {
    id: novoIdLancamento(guildId),
    clienteId,
    clienteTag: clienteTag || null,
    valor: valorNum,
    quantidade: qtd,
    descricao: String(descricao || '').slice(0, 200),
    registradoPor,
    registradoEm: Date.now(),
  };
  lancamentos(guildId).push(lancamento);
  salvar();
  return lancamento;
}

function obterLancamento(guildId, lancamentoId) {
  return lancamentos(guildId).find((l) => l.id === lancamentoId) || null;
}

function listarLancamentos(guildId, clienteId = null) {
  const lista = lancamentos(guildId);
  return clienteId ? lista.filter((l) => l.clienteId === clienteId) : lista;
}

// Desfaz um lançamento manual, devolvendo o valor/vendas que ele tinha somado.
// Não remove cargos já concedidos — o cargo conquistado fica com o cliente.
function removerLancamento(guildId, lancamentoId) {
  const lista = lancamentos(guildId);
  const i = lista.findIndex((l) => l.id === lancamentoId);
  if (i === -1) return null;
  const [lancamento] = lista.splice(i, 1);

  const b = base(guildId);
  const c = cliente(guildId, lancamento.clienteId);
  c.vendas = Math.max(0, (c.vendas || 0) - (lancamento.quantidade || 1));
  c.gasto = Math.max(0, subtrair(c.gasto, lancamento.valor));
  b.pedidos = Math.max(0, (b.pedidos || 0) - (lancamento.quantidade || 1));
  b.gasto = Math.max(0, subtrair(b.gasto, lancamento.valor));
  salvar();
  return lancamento;
}

// Remove UMA venda de um lançamento que tem várias (remoção parcial). Se o
// lançamento tiver só 1 venda, remove o lançamento inteiro (igual a removerLancamento).
// Devolve { removido: {id, valor, quantidade, descricao}, restante: {valor, quantidade}|null }.
function removerVendaParcial(guildId, lancamentoId) {
  const lista = lancamentos(guildId);
  const l = lista.find((x) => x.id === lancamentoId);
  if (!l) return null;

  const q = Math.max(1, Number(l.quantidade) || 1);
  if (q <= 1) {
    const removido = removerLancamento(guildId, lancamentoId);
    if (!removido) return null;
    return {
      removido: { id: removido.id, valor: removido.valor, quantidade: removido.quantidade || 1, descricao: removido.descricao },
      restante: null,
    };
  }

  // valor é o total do lançamento; a venda removida vale valor/quantidade.
  const valorAntigo = Number(l.valor) || 0;
  const valorNovo = arredondar((valorAntigo * (q - 1)) / q);
  const valorRemovido = subtrair(valorAntigo, valorNovo);

  l.quantidade = q - 1;
  l.valor = valorNovo;

  const b = base(guildId);
  const c = cliente(guildId, l.clienteId);
  c.vendas = Math.max(0, (c.vendas || 0) - 1);
  c.gasto = Math.max(0, subtrair(c.gasto, valorRemovido));
  b.pedidos = Math.max(0, (b.pedidos || 0) - 1);
  b.gasto = Math.max(0, subtrair(b.gasto, valorRemovido));
  salvar();

  return {
    removido: { id: l.id, valor: valorRemovido, quantidade: 1, descricao: l.descricao },
    restante: { valor: l.valor, quantidade: l.quantidade },
  };
}

// Lista os clientes com compras (gasto/vendas), do que mais gastou para o que
// menos gastou. Usado pelo painel admin /clientes.
function listarClientes(guildId) {
  const b = base(guildId);
  const mapa = b.clientes || {};
  return Object.entries(mapa)
    .map(([clienteId, c]) => ({
      clienteId,
      vendas: c.vendas || 0,
      gasto: c.gasto || 0,
      cargos: c.cargos || [],
    }))
    .filter((c) => c.vendas > 0 || c.gasto > 0)
    .sort((a, c) => c.gasto - a.gasto || c.vendas - a.vendas);
}

module.exports = { base, somarPedido, addCargoMeta, cliente, registrarVenda, cargosDoCliente, dadosDoCliente, registrarVendaManual, obterLancamento, listarLancamentos, removerLancamento, removerVendaParcial, listarClientes };
