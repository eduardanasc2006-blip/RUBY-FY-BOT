const fs = require('node:fs');
const path = require('node:path');

// Carrinho de compras por usuário/guild, em memória + persistência opcional.
// Estrutura: { [guildId]: { [userId]: { itens: [{ catId, prodId, nome, quantidade, valorUnitario }] } } }

const FILE = path.join(__dirname, '..', '..', 'data', 'carrinhos.json');

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

function sessao(guildId, userId) {
  if (!dados[guildId]) dados[guildId] = {};
  if (!dados[guildId][userId]) dados[guildId][userId] = { itens: [] };
  return dados[guildId][userId];
}

function listar(guildId, userId) {
  return sessao(guildId, userId).itens;
}

// Adiciona item (soma quantidade se o mesmo produto já estiver no carrinho).
function adicionar(guildId, userId, { catId, prodId, nome, quantidade, valorUnitario }) {
  const s = sessao(guildId, userId);
  const existente = s.itens.find((i) => i.catId === catId && i.prodId === prodId);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    s.itens.push({ catId, prodId, nome, quantidade, valorUnitario });
  }
  salvar();
  return s.itens;
}

function limpar(guildId, userId) {
  sessao(guildId, userId).itens = [];
  salvar();
}

function remover(guildId, userId, catId, prodId) {
  const s = sessao(guildId, userId);
  s.itens = s.itens.filter((i) => !(i.catId === catId && i.prodId === prodId));
  salvar();
  return s.itens;
}

function total(guildId, userId) {
  const itens = listar(guildId, userId);
  return Math.round(itens.reduce((acc, i) => acc + (i.valorUnitario || 0) * i.quantidade, 0) * 100) / 100;
}

module.exports = { listar, adicionar, limpar, remover, total, sessao };