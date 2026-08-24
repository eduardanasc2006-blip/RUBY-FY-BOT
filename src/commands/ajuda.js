const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra o menu de ajuda com todos os comandos do bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle('📜 RUBY FY BOT — Central de Ajuda')
      .setDescription('Use os comandos com o prefixo `!` ou como Slash Command `/`.')
      .addFields(
        {
          name: '💎 CONVERSÃO',
          value: [
            '`!robux <qtd>` — Converte Robux para Reais',
            '`!reais <valor>` — Converte Reais para Robux',
            '`!gamepass <robux>` — Calcula quanto colocar no Game Pass para receber X Robux',
            '`!taxa` — Mostra as taxas atuais',
          ].join('\n'),
        },
        {
          name: '📖 AJUDA',
          value: ['`!ajuda`', '`!help`', '`!menu`'].join('\n'),
        },
        {
          name: '⚡ Slash Commands',
          value: ['`/robux`', '`/reais`', '`/gamepass`', '`/taxa`', '`/ajuda`'].join('  •  '),
        }
      )
      .setFooter({ text: 'RUBY FY • Conversor de Robux' });

    return interaction.reply({ embeds: [embed] });
  },
};
