// Busca a primeira auto-resposta cuja palavra-chave aparece no texto.
// Comparacao case-insensitive. Retorna o registro { palavras, resposta } ou null.



function acharResposta(lista, texto) {
  if (!lista || !lista.length || !texto) return null;
  const t = texto.toLowerCase();
  for (const item of lista) {
    const palavras = Array.isArray(item.palavras)
      ? item.palavras
      : (item.palavra ? [item.palavra] : []);
    for (const p of palavras) {
      const pp = (p || '').toLowerCase().trim();
      if (pp && t.includes(pp)) return item;
    }
  }
  return null;
}

module.exports = { acharResposta };