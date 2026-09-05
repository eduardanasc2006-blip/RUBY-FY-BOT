// Busca a primeira auto-resposta cuja palavra-chave aparece no texto.
// Comparacao case-insensitive. Retorna o registro { palavra, resposta } ou null.
function acharResposta(lista, texto) {
  if (!lista || !lista.length || !texto) return null;
  const t = texto.toLowerCase();
  for (const item of lista) {
    const p = (item.palavra || '' ).toLowerCase().trim();
    if (p && t.includes(p)) return item;
  }
  return null;
}

module.exports = { acharResposta };