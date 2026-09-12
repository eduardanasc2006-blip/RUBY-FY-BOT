const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'pedidos.json');

let dados = {};
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  dados = {};
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function lista(guildId) {
  if (!dados[guildId]) dados[guildId] = [];
  return dados[guildId];
}

function novoId(guildId) {
  const existentes = lista(guildId);
  let n = existentes.length + 1;
  while (existentes.some((p) => p.id === String(n))) n++;
  return String(n);
}

function criar(guildId, { clienteId, clienteTag, canalId, msgId, catId, prodId, itemNome, quantidade, valor }) {
  const pedido = {
    id: novoId(guildId),
    clienteId,
    clienteTag,
    canalId,
    msgId,
    catId,
    prodId,
    itemNome,
    quantidade,
    valor,
    status: 'pendente',
    criadoEm: Date.now(),
    confirmadoEm: null,
    canceladoEm: null,
    confirmadoPor: null,
  };
  lista(guildId).push(pedido);
  salvar();
  return pedido;
}

function obter(guildId, pedidoId) {
  return lista(guildId).find((p) => p.id === pedidoId) || null;
}

function atualizar(guildId, pedidoId, mudancas) {
  const p = obter(guildId, pedidoId);
  if (!p) return null;
  Object.assign(p, mudancas);
  salvar();
  return p;
}

// Soma as quantidades reservadas em pedidos pendentes de um produto.
function reservado(guildId, catId, prodId) {

  return lista(guildId)
    .filter((p) => p.status === 'pendente' && p.catId === catId && p.prodId === prodId)
    .reduce((acc, p) => acc + (p.quantidade || 0), 0);
}

// Quantidade efetivamente compravel: estoque real - reservado em pendentes.

function disponivel(guildId, p) {
  if (!p || !p.controlarQtd) return null;
  const pends = reservado(guildId, p.catId, p.prodId);
  return Math.max(0, p.quantidade - pends);
}

// Pedidos de um cliente por status (para /proof e consultas).
function doCliente(guildId, clienteId, status) {
  return lista(guildId).filter(
    (p) => p.clienteId && String(p.clienteId) === String(clienteId) &&
      (!status || p.status === status)
  );
}

module.exports = { lista, criar, obter, atualizar, reservado, disponivel, doCliente };