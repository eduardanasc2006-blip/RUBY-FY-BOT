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

module.exports = { base, somarPedido, addCargoMeta };
