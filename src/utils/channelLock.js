const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'lock_estados.json');

function carregar() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

function salvar(dados) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

// Captura a configuracao atual de SendMessages do @everyone no canal,
// para poder restaurar depois (respeitando permissoes personalizadas existentes).
// Retorna null se nao houver sobrescrita relevante (herda o padrao do servidor).
function capturarEstado(canal) {
  const everyoneId = canal.guild?.roles?.everyone?.id;
  const overwrite = everyoneId ? canal.permissionOverwrites.cache.get(everyoneId) : null;
  if (!overwrite) return null;
  const allow = overwrite.allow?.has('SendMessages') ? true : null;
  const deny = overwrite.deny?.has('SendMessages') ? true : null;
  if (!allow && !deny) return null;
  return { allow, deny };
}

function guardarEstado(channelId, estado) {
  const dados = carregar();
  if (estado) dados[channelId] = estado;
  else delete dados[channelId];
  salvar(dados);
}

function estadoSalvo(channelId) {
  return carregar()[channelId] || null;
}

module.exports = { capturarEstado, guardarEstado, estadoSalvo };