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

function criar(guildId, { clienteId, clienteTag, canalId, msgId, catId, prodId, itemNome, quantidade, valor, itens = null }) {
  const pedido = {
    id: novoId(guildId),
    clienteId,
    clienteTag,
    canalId,
    msgId,
    catId: catId || (itens && itens[0] ? itens[0].catId : null),
    prodId: prodId || (itens && itens[0] ? itens[0].prodId : null),
    itens: itens || null,
    itemNome,
    quantidade,
    valor,
    status: 'pendente',
    criadoEm: Date.now(),
    confirmadoEm: null,
    canceladoEm: null,
    confirmadoPor: null,
    canceladoPor: null,
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
// Pedidos novos guardam a lista `itens[]`; pedidos antigos tinham um item so.
function reservado(guildId, catId, prodId) {
  let total = 0;
  for (const p of lista(guildId)) {
    if (p.status !== 'pendente') continue;
    if (Array.isArray(p.itens) && p.itens.length) {
      for (const i of p.itens) {
        if (i.catId === catId && i.prodId === prodId) total += i.quantidade || 0;
      }
    } else if (p.catId === catId && p.prodId === prodId) {
      total += p.quantidade || 0;
    }
  }
  return total;
}

// Quantidade efetivamente compravel: estoque real - reservado em pendentes.
// O produto do estoque nao guarda catId/prodId, entao o chamador informa os ids.
function disponivel(guildId, p, catId, prodId) {
  if (!p || !p.controlarQtd) return null;
  const cId = catId || p.catId;
  const pId = prodId || p.prodId;
  if (!cId || !pId) return p.quantidade;
  const pends = reservado(guildId, cId, pId);
  return Math.max(0, p.quantidade - pends);
}

// Pedidos de um cliente por status (para /proof e consultas).
function doCliente(guildId, clienteId, status) {
  return lista(guildId).filter(
    (p) => p.clienteId && String(p.clienteId) === String(clienteId) &&
      (!status || p.status === status)
  );
}

// Remove todos os pedidos de uma guild (usado em testes e limpeza).
function removerDaGuild(guildId) {
  if (!dados[guildId]) return;
  delete dados[guildId];
  salvar();
}

module.exports = { lista, criar, obter, atualizar, reservado, disponivel, doCliente, removerDaGuild };