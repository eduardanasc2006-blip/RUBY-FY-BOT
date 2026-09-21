const fs = require('node:fs');
const path = require('node:path');
const customCommands = require('./customCommands');

// Configuracao do fluxo de compra por servidor (comando /setcomprar):
//   mensagem -> texto exibido no pedido do ticket (aceita {total}, {canal}, {pix})
//   pix      -> chave PIX usada para trocar {pix} (opcional)
// Arquivo: data/pedido_compras.json  Estrutura: { [guildId]: { mensagem, pix } }

const FILE = path.join(__dirname, '..', '..', 'data', 'pedido_compras.json');

const MENSAGEM_PADRAO = 'Use `!pix` para realizar o pagamento e envie o comprovante neste ticket.';
const LIMITE_MENSAGEM = 1024;

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

function obter(guildId) {
  const c = conf(guildId);
  return { mensagem: c.mensagem || null, pix: c.pix || null };
}

// Texto configurado (ou o padrao quando o servidor nao personalizou).
function obterMensagem(guildId) {
  return obter(guildId).mensagem || MENSAGEM_PADRAO;
}

function obterPix(guildId) {
  return obter(guildId).pix || null;
}

function definirMensagem(guildId, mensagem) {
  if (!guildId) return null;
  const texto = String(mensagem || '').trim();
  if (!texto) return null;
  conf(guildId).mensagem = texto.slice(0, LIMITE_MENSAGEM);
  salvar();
  return conf(guildId).mensagem;
}

function definirPix(guildId, pix) {
  if (!guildId) return null;
  const texto = String(pix || '').trim();
  conf(guildId).pix = texto ? texto.slice(0, 200) : null;
  salvar();
  return conf(guildId).pix;
}

function limpar(guildId) {
  if (!guildId) return;
  delete dados[guildId];
  salvar();
}

// Chave PIX do servidor. O bot nao tem um sistema de PIX proprio: a chave pode
// ser informada no /setcomprar (aqui) ou extraida do comando personalizado
// `pix` ja existente (data/comandos_custom/<guildId>.json), sem duplicar config.
function chavePixEfetiva(guildId) {
  const propria = obterPix(guildId);
  if (propria) return propria;
  try {
    const custom = customCommands.obter(guildId, 'pix');
    if (custom && custom.resposta) {
      const texto = String(custom.resposta).replace(/\s+/g, ' ').trim();
      const match = texto.match(
        /(?:chave\s*pix|pix)\s*[:\-–]\s*\**\s*([0-9]{11}|[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}|[^\s*`]+@[^\s*`]+|[0-9a-f]{8}-[0-9a-f-]{27,})/i
      );
      if (match) return match[1].replace(/[`*]/g, '').trim();
    }
  } catch {
    // comando personalizado ausente/ilegivel: segue sem {pix}
  }
  return null;
}

// Aplica as variaveis na mensagem de pagamento.
function aplicarVariaveis(texto, { total, canalId, pix } = {}) {
  const totalFmt = typeof total === 'number'
    ? `R$ ${total.toFixed(2).replace('.', ',')}`
    : (total || '');
  let saida = String(texto || '')
    .replaceAll('{total}', totalFmt)
    .replaceAll('{canal}', canalId ? `<#${canalId}>` : 'este ticket')
    .replaceAll('{pix}', pix || '');
  // {pix} sem chave configurada deixa a linha quebrada/feia: remove sobras.
  saida = saida.replace(/[ \t]*(?:para|via)\s+(?=\n|$)/gi, '').replace(/[ \t]{2,}/g, ' ');
  return saida.trim() || MENSAGEM_PADRAO;
}

// Mensagem final de pagamento de um pedido.
function mensagem(guildId, { total, canalId } = {}) {
  return aplicarVariaveis(obterMensagem(guildId), {
    total,
    canalId,
    pix: chavePixEfetiva(guildId),
  });
}

module.exports = {
  MENSAGEM_PADRAO,
  obter,
  obterMensagem,
  obterPix,
  definirMensagem,
  definirPix,
  limpar,
  chavePixEfetiva,
  aplicarVariaveis,
  mensagem,
  _arquivo: FILE,
};