const fs = require('node:fs');
const path = require('node:path');

// ---- Mensagens de boas-vindas por servidor ----
// Arquivo: data/welcome.json  Estrutura: { [guildId]: { canalId, embed } }
// `embed` usa o mesmo formato de estado do editor de embed (embedPainel).

const FILE = path.join(__dirname, '..', '..', 'data', 'welcome.json');

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function salvar(dados) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function obter(guildId) {
  if (!guildId) return null;
  const conf = carregar()[guildId];
  if (!conf) return null;
  if (!conf.canalId) return null;
  return conf;
}

function salvar(guildId, { canalId, embed }) {
  const dados = carregar();
  dados[guildId] = { canalId, embed: embed ? JSON.parse(JSON.stringify(embed)) : null };
  salvar(dados);
}

function remover(guildId) {
  const dados = carregar();
  delete dados[guildId];
  salvar(dados);
}

module.exports = { obter, salvar, remover };