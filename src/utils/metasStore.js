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

module.exports = { addCargo, listarCargos, removerCargo, definirMeta, obterMeta };