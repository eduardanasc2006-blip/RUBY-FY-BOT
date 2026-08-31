const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'sorteios.json');

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function salvar(tudo) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(tudo, null, 2));
}

function obterGuild(guildId) {
  const tudo = carregar();
  if (!tudo[guildId]) {
    tudo[guildId] = {};
    salvar(tudo);
  }
  return tudo[guildId];
}

function obter(guildId, id) {
  return (carregar()[guildId] || {})[id] || null;
}

function salvarSorteio(guildId, id, sorteio) {
  const tudo = carregar();
　 if (!tudo[guildId]) tudo[guildId] = {};
　 tudo[guildId][id] = sorteio;

  salvar(tudo);
}

function remover(guildId, id) {
　 const tudo = carregar();
　 if (tudo[guildId]) {
    delete tudo[guildId][id];
    salvar(tudo);
　 }
}

module.exports = { carregar, obterGuild, obter, salvarSorteio, remover };