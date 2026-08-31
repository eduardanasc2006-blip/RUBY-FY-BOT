const { calcular } = require('../utils/calculadora');

module.exports = {
  name: 'calc',
  description: 'Calculadora: faça cálculos simples (+, -, *, /, %, parênteses).',
  usage: '!calc 150 * 2 +  50',

  async execute(message, args) {
    const expr = args.join(' ');
    if (!expr) {
      return message.reply('🧮 **Uso:** `!calc <expressão>`\nExemplo: `!calc 150 *  2 +  50`');
    }

    const res = calcular(expr);
    return message.reply(res.erro
      ? `➜ **Erro:** ${res.erro}`
      : `➜ **Resultado:** \`${expr}\` = **${res.valor}**`);
  },
};
