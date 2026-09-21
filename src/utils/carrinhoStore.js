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
  if (!Array.isArray(dados[guildId][userId].itens)) dados[guildId][userId].itens = [];
  return dados[guildId][userId];
}

// Referência da mensagem pública do carrinho no ticket (canal + mensagem), para
// editar a mesma mensagem em vez de enviar uma nova a cada ação.
function ref(guildId, userId) {
  const s = sessao(guildId, userId);
  return { canalId: s.canalId || null, msgId: s.msgId || null };
}

function setRef(guildId, userId, canalId, msgId) {
  // Nunca "rouba" um painel que ja pertence a outro usuario: sem isso um
  // intruso com acesso ao ticket poderia reassumir o painel publico do cliente.
  if (msgId) {
    const donoAtual = donoDoPainel(guildId, msgId);
    if (donoAtual && donoAtual !== userId) return ref(guildId, userId);
  }
  const s = sessao(guildId, userId);
  s.canalId = canalId || null;
  s.msgId = msgId || null;
  salvar();
  return ref(guildId, userId);
}

// Descobre o dono do carrinho pela mensagem publica do painel no ticket.
// Serve para bloquear quem nao e o cliente dono, sem criar outro sistema de permissao.
function donoDoPainel(guildId, msgId) {
  if (!guildId || !msgId) return null;
  const guild = dados[guildId];
  if (!guild) return null;
  for (const [userId, s] of Object.entries(guild)) {
    if (s && s.msgId === msgId) return userId;
  }
  return null;
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
  const s = sessao(guildId, userId);
  s.itens = [];
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

module.exports = { listar, adicionar, limpar, remover, total, sessao, ref, setRef, donoDoPainel };