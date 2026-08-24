const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Mostra o menu com todos os comandos do bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle('📜 Menu de Comandos')
      .setDescription(
        'Use os comandos com o prefixo `!` ou com `/`:\n\n' +
          [
            '`!robux <quantidade>` — Converte Robux para Reais (R$)',
            '`!reais <valor>` — Converte Reais (R$) para Robux',
            '`!gamepass <robux>` — Quanto colocar no Game Pass para receber X Robux',
            '`!taxa` — Mostra as taxas atuais de conversão',
            '`!comandos` — Mostra este menu',
          ].join('\n')
      )
      .setFooter({ text: 'RUBY-FY • Conversor de Robux' });

    return interaction.reply({ embeds: [embed] });
  },
};
