const fs = require('node:fs');
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
  fs.writeFileSync(FILE, texto);
}

function base(guildId) {
  if (!dados[guildId]) dados[guildId] = { pedidos: 0, gasto: 0, cargos: [] };
  return dados[guildId];
}

function somarPedido(guildId, valor) {
  const b = base(guildId);
  b.pedidos = b.pedidos + 1;
  b.gasto = b.gasto + valor;;
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
  c.gasto += valor;
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

module.exports = { base, somarPedido, addCargoMeta, cliente, registrarVenda, cargosDoCliente, dadosDoCliente };
