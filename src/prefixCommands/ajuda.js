const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'menu'],
  description: 'Mostra o menu de ajuda com todos os comandos do bot',
  usage: '!ajuda',

  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle('📜 RUBY FY BOT — Central de Ajuda')
      .setDescription('Use os comandos com o prefixo `!` ou como Slash Command `/`.')
      .addFields(
        {
          name: '💎 CONVERSÃO',
          value: [
            '`!robux <qtd>` — Converte Robux para Reais. Ex: `!robux 500` → R$ 19,00',
            '`!reais <valor>` — Converte Reais para Robux. Ex: `!reais 10` → 263 Robux',
            '`!gamepass <robux>` — Quanto colocar no Game Pass para receber X Robux (Roblox desconta 30%). Ex: `!gamepass 1000` → 1.429',
            '`!taxa` — Mostra as taxas atuais de conversão',
          ].join('\n'),
        },
        {
          name: '💜 PAINEL DE CONVERSÃO',
          value: [
            '`!tabela` — Publica o painel com botões de conversão no canal (qualquer pessoa pode usar; as respostas são privadas). Executar de novo atualiza o painel existente',
          ].join('\n'),
        },
        {
          name: '📖 AJUDA',
          value: ['`!ajuda` — Mostra este menu (aliases: `!help`, `!menu`)'].join('\n'),
        },
        {
          name: '🔒 ADMINISTRAÇÃO',
          value: [
            '`!settaxa 100 <valor>` — Altera a taxa da faixa 100–999 Robux. Ex: `!settaxa 100 3,50`',
            '`!settaxa 1000 <valor>` — Altera a taxa da faixa 1.000+ Robux. Ex: `!settaxa 1000 34,99`',
            '*(somente administradores; fica salvo após reiniciar e o painel do `!tabela` atualiza automaticamente)*',
          ].join('\n'),
        },
        {
          name: '⚡ Slash Commands',
          value: ['`/robux`', '`/reais`', '`/gamepass`', '`/taxa`', '`/tabela`', '`/ajuda`'].join('  •  '),
        }
      )
      .setFooter({ text: 'RUBY FY • Conversor de Robux' });

    return message.reply({ embeds: [embed] });
  },
};
