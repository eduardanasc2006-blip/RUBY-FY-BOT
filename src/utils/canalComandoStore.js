const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'canal_comandos.json');

// dados[guildId][comando] = { canais: [channelId, ...] | null (null = todos os canais),
//                             mensagem: string|null (mensagem customizada) }
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

function conf(guildId) {
  if (!guildId) return {};
  if (!dados[guildId]) dados[guildId] = {};
  return dados[guildId];
}

// Mensagem global de bloqueio (usada quando o comando não tem mensagem própria).
function mensagemGlobal(guildId) {
  const c = conf(guildId);
  return c._mensagem_global || null;
}

function definirMensagemGlobal(guildId, mensagem) {
  const c = conf(guildId);
  c._mensagem_global = mensagem && String(mensagem).trim() ? String(mensagem).trim() : null;
  salvar();
}

// Canais permitidos para um comando em um servidor.
// Retorna null = pode em qualquer canal (sem restrição).
function canaisParaComando(guildId, comando) {
  const c = conf(guildId);
  const item = c[comando];
  if (!item) return null;
  return item.canais; // [] = nenhum canal permitido (restrito), array = canais
}

// Mensagem customizada para bloqueio (específica do comando ou global, ou null para a padrão).
function mensagemParaComando(guildId, comando) {
  const c = conf(guildId);
  const item = c[comando];
  return (item && item.mensagem) || mensagemGlobal(guildId);
}

function definir(guildId, comando, canais) {
  const c = conf(guildId);
  // null = todos os canais; array = apenas estes (pode ser [])
  c[comando] = { ...(c[comando] || {}), canais };
  salvar();
}

function definirMensagem(guildId, comando, mensagem) {
  const c = conf(guildId);
  if (!c[comando]) c[comando] = {};
  c[comando].mensagem = mensagem && String(mensagem).trim() ? String(mensagem).trim() : null;
  salvar();
}

// Remove a configuração de um comando (volta a permitir em qualquer canal).
function remover(guildId, comando) {
  const c = conf(guildId);
  delete c[comando];
  salvar();
}

function listarComandosConfigurados(guildId) {
  const c = conf(guildId);
  return Object.keys(c);
}

// Zera todos os dados (usado em testes).
function resetar() {
  dados = {};
  try { fs.unlinkSync(FILE); } catch {}
}

module.exports = {
  canaisParaComando,
  mensagemParaComando,
  mensagemGlobal,
  definirMensagemGlobal,
  definir,
  definirMensagem,
  remover,
  listarComandosConfigurados,
  resetar,
};