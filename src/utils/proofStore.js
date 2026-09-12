const fs = require('node:fs');
const path = require('node:path');

// Canal de "proofs" (comprovantes) por guild.
// Arquivo: data/proofs.json  Estrutura: { [guildId]: { canalId } }

const FILE = path.join(__dirname, '..', '..', 'data', 'proofs.json');

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

function obter(guildId) {
  if (!guildId) return null;
  const ref = dados[guildId];
  return ref ? ref.canalId : null;
}

function definir(guildId, canalId) {
  if (!guildId) return;
  dados[guildId] = { canalId };
  salvar();
}

function desativar(guildId) {
  if (!guildId) return;
  dados[guildId] = { canalId: null };
  salvar();
}

module.exports = { obter, definir, desativar };