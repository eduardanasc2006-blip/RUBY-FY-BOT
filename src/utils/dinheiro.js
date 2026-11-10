// Aritmética de dinheiro em reais, sempre em CENTAVOS inteiros por dentro.
// Somar floats direto acumula erro (0,10 + 0,20 = 0.30000000000000004;
// 0,30 x3 = 0.8999999999999999) e uma meta comparada com `>= 0,90` deixava de
// ser concedida. Arredondar a cada operação mantém o valor exato.

// Arredonda para 2 casas (centavos) e devolve número.
function arredondar(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function somar(a, b) {
  return arredondar(arredondar(a) + arredondar(b));
}

function subtrair(a, b) {
  return arredondar(arredondar(a) - arredondar(b));
}

// Compara dois valores de dinheiro já em centavos (evita o "faltou 0,0000001").
function maiorIgual(a, b) {
  return Math.round((Number(a) || 0) * 100) >= Math.round((Number(b) || 0) * 100);
}

module.exports = { arredondar, somar, subtrair, maiorIgual };
