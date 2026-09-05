const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '..', 'data', 'autorespostas');

function arquivoDoGuild(guildId) {
  return path.join(DIR, `${guildId}.json`);
}

function carregar(guildId) {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivoDoGuild(guildId), 'utf8'));
    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

function salvar(guildId, dados) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(arquivoDoGuild(guildId), JSON.stringify(dados, null, 2));
}

// Auto-respostas por servidor: cada guild tem suas palavras e seus canais.

// Lista de { palavra, resposta } ativas do servidor.

function listar(guildId) {
  if (!guildId) return [];
  const d = carregar(guildId);
  return Array.isArray(d.respostas) ? d.respostas : [];
}

// Canais onde as auto-respostas respondem (lista de IDs). Se vazio,
// responde em qualquer canal do servidor.

function canais(guildId) {
  if (!guildId) return [];
  const d = carregar(guildId);
  return Array.isArray(d.canais) ? d.canais : [];
}

function adicionar(guildId, palavra, resposta) {
  if (!guildId || !palavra) return { ok: false, msg: 'Dados inválidos.' };
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas)) d.respostas = [];
  const chave = palavra.toLowerCase().trim();
  if (!chave) return { ok: false, msg: 'Palavra inválida.' };
  if (d.respostas.some((r) => r.palavra.toLowerCase() === chave)) {
   return { ok: false, msg: `Já existe uma auto-resposta para "${palavra}".` };
  }
  d.respostas.push({ palavra, resposta });
  salvar(guildId, d);
  return { ok: true, msg: `Auto-resposta "${palavra}" criada.` };
}

function remover(guildId, palavra) {
  if (!guildId || !palavra) return { ok: false, msg: 'Dados inválidos.' };
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas)) return { ok: false, msg: 'Nenhuma auto-resposta para remover.' };
  const chave = palavra.toLowerCase().trim();
  const antes = d.respostas.length;
  d.respostas = d.respostas.filter((r) => r.palavra.toLowerCase() !== chave);
  if (d.respostas.length === antes) return { ok: false, msg: `Nenhuma auto-resposta "${palavra}".` };
  salvar(guildId, d);
  return { ok: true, msg: `Auto-resposta "${palavra}" removida.` };
}

function definirCanais(guildId, canaisIds) {
  if (!guildId) return { ok: false, msg: 'Servidor inválido.' };
  const d = carregar(guildId);
  d.canais = Array.isArray(canaisIds) ? canaisIds : [];
  salvar(guildId, d);
  return { ok: true, msg: canaisIds.length ? 'Canais atualizados.' : 'Agora responde em qualquer canal.' };
}

module.exports = { listar, canais, adicionar, remover, definirCanais };