const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'metas.json');

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

function conf(guildId) {
  if (!dados[guildId]) dados[guildId] = { cargos: [], metas: {}, perfil: {} };
  return dados[guildId];
}

function addCargo(guildId, cargo) {
  const c = conf(guildId);
  c.cargos.push(cargo);
  salvar();
  return cargo;
}

function listarCargos(guildId) {
  const c = conf(guildId);
  return c.cargos;
}

function removerCargo(guildId, cargoId) {

  const c = conf(guildId);
  c.cargos = c.cargos.filter((x) => x.id !== cargoId);
  salvar();
}

function definirMeta(guildId, chave, valor) {

  const c = conf(guildId);
  c.metas[chave] = valor;
  salvar();
}

function obterMeta(guildId, chave) {

  const c = conf(guildId);
  return c.metas[chave];
}


// ----- Metas estruturadas (CRUD separado por guild) -----

function listaMetas(guildId) {
  const c = conf(guildId);
  if (!Array.isArray(c.metaslista)) c.metaslista = [];
  return c.metaslista;
}

function meta(guildId, metaId) {
  return listaMetas(guildId).find((m) => m.id === metaId) || null;
}

function novoIdMeta(guildId) {
  const existentes = listaMetas(guildId);
  let n = existentes.length + 1;
  while (existentes.some((m) => m.id === String(n))) n++;
  return String(n);
}

function addMeta(guildId, { cargoId, cargoNome, tipo, meta }) {
  const metaObj = {
    id: novoIdMeta(guildId),
    cargoId,
    cargoNome,
    tipo: tipo === 'valor' ? 'valor' : 'vendas',
    meta: Number(meta) || 0,
    criadoEm: Date.now(),
  };
  listaMetas(guildId).push(metaObj);
  salvar();
  return metaObj;
}

function atualizarMeta(guildId, metaId, mudancas) {
  const m = meta(guildId, metaId);
  if (!m) return null;
  if ('cargoId' in mudancas) m.cargoId = mudancas.cargoId;
  if ('cargoNome' in mudancas) m.cargoNome = mudancas.cargoNome;
  if ('tipo' in mudancas) m.tipo = mudancas.tipo === 'valor' ? 'valor' : 'vendas';
  if ('meta' in mudancas) m.meta = Number(mudancas.meta) || 0;
  salvar();
  return m;
}

function removerMeta(guildId, metaId) {
  const lista = listaMetas(guildId);
  const i = lista.findIndex((m) => m.id === metaId);
  if (i === -1) return false;
  lista.splice(i, 1);
  salvar();
  return true;
}

module.exports = { addCargo, listarCargos, removerCargo, definirMeta, obterMeta, listaMetas, meta, addMeta, atualizarMeta, removerMeta };
