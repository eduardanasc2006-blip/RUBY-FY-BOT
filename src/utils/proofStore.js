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
  if (!dados[guildId]) return;
  delete dados[guildId];
  salvar();
}

// Rascunhos de proof em memória (imagens anexadas no /proof aguardando o modal).
// key: `${guildId}:${userId}`  value: { urls: [], canalPadrao: string|null }
// O guildId entra na chave para o mesmo admin poder usar o /proof em servidores
// diferentes sem misturar os rascunhos.
const rascunhos = new Map();

function chaveRascunho(guildId, userId) {
  return `${guildId || 'dm'}:${userId}`;
}

function salvarRascunho(guildId, userId, rascunho) {
  const chave = chaveRascunho(guildId, userId);
  rascunhos.set(chave, rascunho);
  // Expira em 10min para não acumular se o admin abandonar o modal.
  // .unref() para não segurar o processo do bot (nem testes) aberto esperando o timer.
  const timer = setTimeout(() => {
    if (rascunhos.get(chave) === rascunho) rascunhos.delete(chave);
  }, 10 * 60 * 1000);
  timer.unref?.();
}

function obterRascunho(guildId, userId) {
  return rascunhos.get(chaveRascunho(guildId, userId)) || null;
}

function limparRascunho(guildId, userId) {
  rascunhos.delete(chaveRascunho(guildId, userId));
}

module.exports = { obter, definir, desativar, salvarRascunho, obterRascunho, limparRascunho };