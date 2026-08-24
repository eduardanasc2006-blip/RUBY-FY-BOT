// 💎 Taxas de conversão do RUBY-FY
// Para alterar as taxas do bot, mude apenas os valores abaixo.

module.exports = {
  // Robux mínimo aceito no comando /robux
  MIN_ROBUX: 100,

  // Faixa 1: de 100 até 999 Robux ↔ R$ 3,80 a cada 100 Robux
  TIER1_MAX_ROBUX: 999,
  TIER1_PRICE_PER_100: 3.8,

  // Faixa 2: a partir de 1.000 Robux ↔ R$ 37,99 a cada 1.000 Robux
  TIER2_PRICE_PER_1000: 37.99,

  // Taxa do Roblox no Game Pass (30% ↔ você recebe 70%)
  GAMEPASS_FEE: 0.3,
};
