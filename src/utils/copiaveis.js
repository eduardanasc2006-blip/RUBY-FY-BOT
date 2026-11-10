const { normalizarUrl } = require('./links');

// Lê o campo "copiaveis" do /criarcomando (e o modal de edição).
// Formato: itens separados por ";" e cada item em "nome:tipo:valor" ou "nome:valor".
//   tipo: "copiavel" (padrão) | "link"
// Ex: "PIX:copiavel:12345678900; Entrega:link:discord.gg/abc"
// Devolve { itens, linkInvalido, excedeu }.
function parseCopiaveis(bruto, max = 5) {
  let linkInvalido = null;
  const itens = String(bruto || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // URLs têm ":" (https://), então pega os 2 primeiros ":" e junta o resto.
      const idx1 = s.indexOf(':');
      const idx2 = s.indexOf(':', idx1 + 1);
      let nome;
      let tipo;
      let valor;
      if (idx1 === -1) {
        nome = 'Copiar';
        tipo = 'copiavel';
        valor = s;
      } else if (idx2 === -1) {
        nome = s.slice(0, idx1).trim();
        tipo = 'copiavel';
        valor = s.slice(idx1 + 1).trim();
      } else {
        nome = s.slice(0, idx1).trim();
        tipo = s.slice(idx1 + 1, idx2).trim().toLowerCase();
        valor = s.slice(idx2 + 1).trim();
      }
      if (!nome || !valor) return null;
      const tipoFinal = ['link', 'url'].includes(tipo) ? 'link' : 'copiavel';
      let valorFinal = valor;
      if (tipoFinal === 'link') {
        valorFinal = normalizarUrl(valor);
        if (!valorFinal) {
          if (!linkInvalido) linkInvalido = { nome };
          return null;
        }
      }
      return { nome, tipo: tipoFinal, valor: valorFinal };
    })
    .filter(Boolean);

  return { itens, linkInvalido, excedeu: itens.length > max };
}

// Monta a lista final de botões de um comando: o link dedicado (link_rotulo/link_url)
// vem primeiro, seguido dos copiáveis. Tudo no limite de 5 botões por linha.
function montarBotoes({ linkRotulo, linkUrl, copiaveis }, max = 5) {
  const botoes = [];
  if (linkUrl) {
    const url = normalizarUrl(linkUrl);
    if (url) botoes.push({ nome: String(linkRotulo || 'Abrir link').slice(0, 80), tipo: 'link', valor: url });
  }
  for (const c of copiaveis || []) botoes.push(c);
  return botoes.slice(0, max);
}

module.exports = { parseCopiaveis, montarBotoes };
