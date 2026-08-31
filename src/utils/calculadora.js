function calcular(expr) {
  const limpa = String(expr)
    .replace(/,/g, '.')
    .replace(/x/gi, '*')
    .replace(/÷/g, '/');
  // Permite apenas numeros, operadores basicos, parens, espacos e ponto decimal.

  if (!/^[\d\s+\-*/().%]+$/.test(limpa)) {
    return { erro: 'Use apenas números e operadores: **+ - * / % ( )**.' };
  }
  if (limpa.includes('(') !== limpa.includes(')')) {
    return { erro: 'Parênteses desbalanceados.' };
  }
  try {
    const resultado = Function('"use strict";return (' + limpa + ')')();
    if (typeof resultado !== 'number' || !Number.isFinite(resultado)) {
      return { erro: 'Não foi possível calcular essa expressão.' };
    }
    return { valor: Number(resultado.toFixed(4)) };
  } catch {
    return { erro: 'Não foi possível calcular essa expressão.' };
  }
}

module.exports = { calcular };
