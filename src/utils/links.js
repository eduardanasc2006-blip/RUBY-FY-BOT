// Normalização de URL para botões de link.
// Só aceita http/https e devolve a URL normalizada (com protocolo) ou null.
// NÃO tenta "consertar" outros esquemas: antes, "mailto:x@y.com" virava
// "https://mailto:x@y.com" e "ftp://s" virava "https://ftp://s" — botões
// quebrados no Discord.
function normalizarUrl(bruto) {
  const texto = String(bruto || '').trim();
  if (!texto) return null;
  // Sem esquema (ex: "discord.gg/abc") -> assume https.
  const candidato = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(candidato);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname || !url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

module.exports = { normalizarUrl };
