const fs = require("node:fs");
const path2 = require("node:path");

const FILE = path2.join(__dirname, "..", "..", "data", "modelos_embed.json");

const CATEGORIAS_PADRAO = [
  { id: "boasvindas", nome: "👋 Boas-vindas" },
  { id: "loja", nome: "🛒 Loja" },
  { id: "suporte", nome: "🎫 Suporte" },
  { id: "avisos", nome: "📢 Avisos" },
  { id: "pagamentos", nome: "💰 Pagamentos" },
  { id: "pedidos", nome: "📦 Pedidos" },
  { id: "outros", nome: "✨ Outros" },
];

const CATEGORIA_FALLBACK = "outros";

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvar(dados) {
  fs.mkdirSync(path2.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function listar(guildId) {
  const porGuild = carregar()[guildId] || {};
  const lista = Object.values(porGuild);
  return lista.sort(function (a, b) {
    const ca = String(a.categoria || "+").localeCompare(String(a.categoria || "+")) || 0;
    const cb = String(b.categoria || "+").localeCompare(String(b.categoria || "+")) || 0;
    if (ca !== cb) return ca - cb;
    return String(a.nome || "" ).localeCompare(String(b.nome || ""));
  });
}

function obter(guildId, modeloId) {
  if (!guildId || !modeloId) return null;
  return carregar()[guildId]?.[modeloId] || null;
}

function criar(guildId, dados) {
  var nome = (dados.nome || "").trim();
  if (!guildId || !nome) return { ok: false, msg: "Informe um nome para o modelo." };
  var id = crypto.createHash("sha1").update(String(Date.now()) + ":" + String(Math.random())).digest("hex").slice(0, 10);
  var porGuild = carregar()[guildId] || {};
  porGuild[id] = {
    id: id,
    nome: String(nome).slice(0, 80),
    categoria: CATEGORIAS_PADRAO.some(function (c) { return c.id === dados.categoria; })? dados.categoria : CATEGORIA_FALLBACK,
    dados: dados.dados ? JSON.parse(JSON.stringify(dados.dados)) : null,
    criadoEm: Date.now(),
  };
  var todo = carregar();
  todo[guildId] = porGuild;
  salvar(todo);
  return { ok: true, modelo: porGuild[id] };
}

function atualizar(guildId, modeloId, dados) {
  var porGuild = carregar()[guildId] || {};
  var m = porGuild[modeloId];
  if (!m) return { ok: false, msg: "Modelo não encontrado." };
  if (dados.nome && String(dados.nome).trim()) m.nome = String(dados.nome). trim().slice(0, 80);
  if (dados.categoria) m.categoria = CATEGORIAS_PADRAO.some(function (c) { return c.id === dados.categoria; })? dados.categoria : CATEGORIA_FALLBACK;
  if (dados.dados) m.dados = JSON.parse(JSON.stringify(dados.dados));
  salvar({ ...carregar(), [guildId]: porGuild });
  return { ok: true, modelo: m };
}

function excluir(guildId, modeloId) {
  var porGuild = carregar()[guildId] || {};
  if (!porGuild[modeloId]) return { ok: false, msg: "Modelo não encontrado." };
  delete porGuild[modeloId];
  salvar({ ...carregar(), [guildId]: porGuild });
  return { ok: true, msg: "Modelo excluído." };
}

module.exports = { CATEGORIAS_PADRAO, CATEGORIA_FALLBACK, listar, obter, criar, atualizar, excluir };
