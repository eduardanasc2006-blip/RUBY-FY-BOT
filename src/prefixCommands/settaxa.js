const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const rates = require('../config/rates');
const { robuxToReais, formatBRL, formatRobux } = require('../utils/robuxConverter');
const { refreshSavedPanel } = require('../utils/panelStore');

const FAIXAS = {
  100: { chave: 'TIER1_PRICE_PER_100', descricao: '100–999 Robux (por 100)' },
  1000: { chave: 'TIER2_PRICE_PER_1000', descricao: '1.000+ Robux (por 1.000)' },
};

function isAdmin(message) {
  if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const ids = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(message.author.id);
}

module.exports = {
  name: 'settaxa',
  description: 'Altera as taxas de conversão (restrito a administradores)',
  usage: '!settaxa <100|1000> <valor>',

  async execute(message, args) {
    if (!isAdmin(message)) {
      return message.reply('🔒 Somente administradores podem alterar as taxas.');
    }

    const [faixaArg, valorArg] = args;
    const faixa = FAIXAS[faixaArg];
    const valor = parseFloat(String(valorArg).replace(',', '.'));

    if (!faixa || isNaN(valor) || valor <= 0) {
      return message.reply(
        '❌ Use: `!settaxa <100|1000> <valor>` — exemplos: `!settaxa 100 3,50` ou `!settaxa 1000 34,99`'
      );
    }

    rates.setOverride(faixa.chave, valor);
    const painelAtualizado = await refreshSavedPanel(message.client);

    const exemploQtd = faixaArg === '100' ? 100 : 1000;
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Taxa atualizada')
      .addFields(
        { name: 'Faixa alterada', value: faixa.descricao },
        { name: 'Novo valor', value: `${formatBRL(valor)}` },
        {
          name: 'Exemplo',
          value: `${formatRobux(exemploQtd)} Robux → ${formatBRL(robuxToReais(exemploQtd))}`,
        }
      )
      .setFooter({
        text: painelAtualizado
          ? 'Painel/tabela atualizado automaticamente'
          : 'A taxa já vale para todos os comandos',
      });

    return message.reply({ embeds: [embed] });
  },
};
