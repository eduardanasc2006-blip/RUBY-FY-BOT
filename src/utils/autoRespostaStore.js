const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "..", "..", "data", "autorespostas");

function arquivoDoGuild(guildId) {
  return path.join(DIR, `${guildId}.json`);
}

function carregar(guildId) {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivoDoGuild(guildId), "utf8"));
    return dados && typeof dados === "object" ? dados : {};
  } catch {
    return {};
  }
}

function salvar(guildId, dados) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(arquivoDoGuild(guildId), JSON.stringify(dados, null, 2));
}

// Auto-respostas por servidor: cada guild tem suas palavras e seus canais.

function normalizarItem(item) {
  if (!item) return null;
  const palavraAtual = item.palavra ? String(item.palavra) : "";
  const palTrim = palavraAtual.trim();
  let palavras = Array.isArray(item.palavras) ? item.palavras.map((p) => String(p).trim()).filter(Boolean) : [];
  if (palTrim && !palavras.includes(palTrim)) palavras.unshift(palTrim);
  const unicas = [];
  for (const p of palavras) {
    const chave = p.toLowerCase();
    if (!unicas.some((u) => u.toLowerCase() === chave)) unicas.push(p);
  }
  item.palavras = unicas;
  item.palavra = item.palavras[0];
  return item;
}

// Lista de auto-respostas ativas do servidor. Cada item: { palavras, palavra, resposta, canais }.

function listar(guildId) {
  if (!guildId) return [];
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas) || !d.respostas.length) return [];
  return d.respostas.map(normalizarItem).filter(Boolean);
}

// Canais onde as auto-respostas respondem (lista de IDs. Se vazio,
// responde em qualquer canal do servidor.

function canais(guildId) {
  if (!guildId) return [];
  const d = carregar(guildId);
  return Array.isArray(d.canais) ? d.canais : [];
}

// Converte o argumento de palavras (string separada por virgula/linha OU array) em
// lista limpa de palavras únicas (minúsculas preservadas na forma original).

function normalizarPalavras(palavrasBruto) {
  const lista = Array.isArray(palavrasBruto)
    ? palavrasBruto
    : String(palavrasBruto || "").split(/[\n,;]+/);
  const limpas = lista
    .map((p) => String(p).trim())
    .filter((p) => p && p.length <= 32);
  return [...new Set(limpas)];
}

// Todas as palavras já usadas no servidor (para impedir duplicatas entre registros).

function palavrasEmUso(d, ignorarItem = null) {
  const usadas = new Set();
  for (const r of (d.respostas || [])) {
    if (r === ignorarItem) continue;
    const palavras = Array.isArray(r.palavras) ? r.palavras : (r.palavra ? [r.palavra] : []);
    for (const p of palavras) usadas.add(String(p).toLowerCase().trim());
  }
  return usadas;
}

function adicionar(guildId, palavrasBruto, resposta, canaisIds) {
  if (!guildId || !palavrasBruto) return { ok: false, msg: "Dados inválidos." };
  if (!resposta || !String(resposta).trim()) return { ok: false, msg: "Informe a resposta." };
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas)) d.respostas = [];
  const palavras = normalizarPalavras(palavrasBruto);
  if (!palavras.length) return { ok: false, msg: "Informe pelo menos uma palavra-chave." };
  const usadas = palavrasEmUso(d);
  const duplicada = palavras.find((p) => usadas.has(p.toLowerCase().trim()));
  if (duplicada) return { ok: false, msg: `Já existe uma auto-resposta para "${duplicada}".` };
  // Canais opcionais por resposta (vazio = usa canais globais ou todos)..
  const canais = Array.isArray(canaisIds) ? canaisIds.map((id) => String(id)) : [];
  d.respostas.push({ palavras, palavra: palavras[0], resposta, canais });
  salvar(guildId, d);
  const txt = palavras.length === 1 ? `"${palavras[0]}"` : `para "${palavras[0]}" (+${palavras.length - 1})`;
  return { ok: true, msg: `Auto-resposta ${txt} criada.` };
}

// Remove a auto-resposta inteira por UMA palavra-chave qualquer (primeira que casar).

function remover(guildId, palavra) {
  if (!guildId || !palavra) return { ok: false, msg: "Dados inválidos." };
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas) || !d.respostas.length) return { ok: false, msg: "Nenhuma auto-resposta para remover." };
  const chave = palavra.toLowerCase().trim();
  const antes = d.respostas.length;
  d.respostas = d.respostas.filter((r) => {
    const ps = Array.isArray(r.palavras) ? r.palavras : (r.palavra ? [r.palavra] : []);
    return !ps.some((p) => p.toLowerCase().trim() === chave);
  });
  if (d.respostas.length === antes) return { ok: false, msg: `Nenhuma auto-resposta "${palavra}".` };
  salvar(guildId, d);
  return { ok: true, msg: `Auto-resposta "${palavra}" removida.` };
}

// Edita a resposta (e pode trocar/substituir o conjunto de palavras-chave do item).
// Aceita `novasPalavras` como string (separada por virgula/linha) ou array..

function editar(guildId, palavraAntiga, novasPalavras, novaResposta) {
  if (!guildId || !palavraAntiga) return { ok: false, msg: "Dados inválidos." };
  const d = carregar(guildId);
  if (!Array.isArray(d.respostas) || !d.respostas.length) return { ok: false, msg: "Nenhuma auto-resposta para editar." };
  const chave = palavraAntiga.toLowerCase().trim();
  const item = d.respostas.find((r) => {
    const ps = Array.isArray(r.palavras) ? r.palavras : (r.palavra ? [r.palavra] : []);
    return ps.some((p) => p.toLowerCase().trim() === chave);
  });
  if (!item) return { ok: false, msg: `Nenhuma auto-resposta "${palavraAntiga}".` };
  const palavras = normalizarPalavras(novasPalavras);
  if (!palavras.length) return { ok: false, msg: "Informe pelo menos uma palavra-chave." };
  if (!novaResposta || !String(novaResposta).trim()) return { ok: false, msg: "Informe a resposta." };
  const usadas = palavrasEmUso(d, item);
  const duplicada = palavras.find((p) => usadas.has(p.toLowerCase().trim()));
  if (duplicada) return { ok: false, msg: `Já existe uma auto-resposta para "${duplicada}".` };
  item.palavras = palavras;
  item.palavra = palavras[0];
  item.resposta = novaResposta;
  salvar(guildId, d);
  return { ok: true, msg: `Auto-resposta atualizada (agora com ${palavras.length} palavra(s)).` };
}

// Adiciona UMA palavra-chave nova a uma auto-resposta existente..

function adicionarPalavra(guildId, palavraExistente, palavraNova) {
  if (!guildId || !palavraExistente || !palavraNova) return { ok: false, msg: "Dados inválidos." };
  const d = carregar(guildId);
  const chave = palavraExistente.toLowerCase().trim();
  const item = d.respostas.find((r) => {
    const ps = Array.isArray(r.palavras) ? r.palavras : (r.palavra ? [r.palavra] : []);
    return ps.some((p) => p.toLowerCase().trim() === chave);
  });
  if (!item) return { ok: false, msg: `Nenhuma auto-resposta "${palavraExistente}".` };
  const novas = normalizarPalavras(palavraNova);
  const usadas = palavrasEmUso(d, item);
  const palavrasItem = item.palavras.map((x) => x.toLowerCase());
  const jaExiste = novas.find((p) => palavrasItem.includes(p.toLowerCase()));
  const duplicada = novas.find((p) => usadas.has(p.toLowerCase()));
  if (duplicada) return { ok: false, msg: `Já existe outra auto-resposta para "${duplicada}".` };
  item.palavras.push(...novas);
  item.palavra = item.palavras[0];
  salvar(guildId, d);
  return { ok: true, msg: `✅ Palavra "${novas[0]}" adicionada (agora são ${item.palavras.length}).` };
}

// Remove UMA palavra-chave individual de uma auto-resposta (mantendo as demais..

function removerPalavra(guildId, palavraExistente, palavraRemover) {
  if (!guildId || !palavraExistente || !palavraRemover) return { ok: false, msg: "Dados inválidos." };
  const d = carregar(guildId);
  const chave = palavraExistente.toLowerCase().trim();
  const item = d.respostas.find((r) => {
    const ps = Array.isArray(r.palavras) ? r.palavras : (r.palavra ? [r.palavra] : []);
    return ps.some((p) => p.toLowerCase().trim() === chave);
  });
  if (!item) return { ok: false, msg: `Nenhuma auto-resposta "${palavraExistente}".` };
  if (!Array.isArray(item.palavras) || !item.palavras.length) return { ok: false, msg: "Esta auto-resposta não possui palavras-chave listadas." };
  const alvo = palavraRemover.toLowerCase().trim();
  const antes = item.palavras.length;
  item.palavras = item.palavras.filter((p) => p.toLowerCase().trim() !== alvo);
  if (item.palavras.length === antes) return { ok: false, msg: `A palavra "${palavraRemover}" não está nesta auto-resposta.` };
  if (!item.palavras.length) {
    // Ultima palavra: remove a auto-resposta inteira (evita registro sem gatilho)..
    d.respostas = d.respostas.filter((r) => r !== item);
    salvar(guildId, d);
    return { ok: true, msg: "A última palavra foi removida — a auto-resposta inteira foi apagada." };
  }
  item.palavra = item.palavras[0];
  salvar(guildId, d);
  return { ok: true, msg: `Palavra "${palavraRemover}" removida (restam ${item.palavras.length}).` };
}

function definirCanais(guildId, canaisIds) {
  if (!guildId) return { ok: false, msg: "Servidor inválido." };
  const d = carregar(guildId);
  d.canais = Array.isArray(canaisIds) ? canaisIds : [];
  salvar(guildId, d);
  return { ok: true, msg: canaisIds.length ? "Canais atualizados." : "Agora responde em qualquer canal." };
}

module.exports = { listar, canais, adicionar, remover, editar, adicionarPalavra, removerPalavra, definirCanais };
