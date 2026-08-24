// 💎 Taxas de conversão do RUBY-FY
// Valores padrão abaixo. Alterações feitas pelo comando !settaxa ficam
// salvas em data/rates.json e têm prioridade sobre estes valores,
// mesmo depois de reiniciar o bot.

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const RATES_FILE = path.join(DATA_DIR, 'rates.json');

const defaults = {
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

let overrides = {};
try {
  overrides = JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
} catch {
  // Sem overrides salvos ainda — usa apenas os padrões.
}

const rates = { ...defaults, ...overrides };

// Altera uma taxa em memória e grava em data/rates.json (persiste no restart)
rates.setOverride = function (key, value) {
  if (!(key in defaults)) throw new Error(`Taxa desconhecida: ${key}`);
  rates[key] = value;
  overrides = { ...overrides, [key]: value };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RATES_FILE, JSON.stringify(overrides, null, 2));
};

module.exports = rates;
