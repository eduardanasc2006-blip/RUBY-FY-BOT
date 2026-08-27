const rates = require('../config/rates');

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');

function formatBRL(valor) {
  return brl.format(valor);
}

function formatRobux(valor) {
  return numero.format(valor);
}

// Robux → R$ (arredondado para centavos)
function robuxToReais(robux) {
  if (robux <= rates.TIER1_MAX_ROBUX) {
    const centavos = Math.round((robux * Math.round(rates.TIER1_PRICE_PER_100 * 100)) / 100);
    return centavos / 100;
  }
  const centavos = Math.round((robux * Math.round(rates.TIER2_PRICE_PER_1000 * 100)) / 1000);
  return centavos / 100;
}

// R$ → Robux (inteiro; matemática em centavos para evitar erro de ponto flutuante)
function reaisToRobux(reais) {
  const centavos = Math.round(reais * 100);
  const limiteFaixa2 = Math.round(rates.TIER2_PRICE_PER_1000 * 100);

  if (centavos >= limiteFaixa2) {
    const preco1000 = Math.round(rates.TIER2_PRICE_PER_1000 * 100);
    return Math.floor((centavos * 1000) / preco1000);
  }

  const preco100 = Math.round(rates.TIER1_PRICE_PER_100 * 100);
  return Math.floor((centavos * 100) / preco100);
}

// Quanto colocar no Game Pass para receber X Robux (Roblox fica com 30%)
function gamepassPrice(robuxDesejados) {
  const recebidoPct = Math.round((1 - rates.GAMEPASS_FEE) * 100);
  return Math.ceil((robuxDesejados * 100) / recebidoPct);
}

module.exports = { robuxToReais, reaisToRobux, gamepassPrice, formatBRL, formatRobux };
