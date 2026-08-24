const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra o menu de ajuda com todos os comandos do bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('RUBY FY  •  Central de Ajuda')
      .setDescription('Todos os comandos funcionam com o prefixo `!` e como Slash Command `/`.')
      .addFields(
        {
          name: 'Conversão',
          value: [
            '`!robux <qtd>` — Robux para Reais. Ex: `!robux 500` → R$ 19,00',
            '`!reais <valor>` — Reais para Robux. Ex: `!reais 10` → 263 Robux',
            '`!gamepass <robux>` — Quanto cobrar no Game Pass para receber X Robux. Ex: `!gamepass 1000` → 1.429',
            '`!taxa` — Mostra as taxas atuais',
          ].join('\n'),
        },
        {
          name: 'Painel de conversão',
          value: 'O painel com botões fica fixo no canal e qualquer pessoa pode usar — as respostas aparecem só para quem clicou.',
        },
        {
          name: 'Ajuda',
          value: '`!ajuda` — Mostra este menu (também `!help` e `!menu`)',
        },
        {
          name: 'Administração',
          value: [
            '`!settaxa 100 <valor>` — Nova taxa da faixa 100–999. Ex: `!settaxa 100 3,50`',
            '`!settaxa 1000 <valor>` — Nova taxa da faixa 1.000+. Ex: `!settaxa 1000 34,99`',
            '`!configtaxa` — Painel visual para configurar as taxas com botões',
            '`!tabela` — Publica ou atualiza o painel de conversão no canal',
            '*(restrito a administradores; as taxas ficam salvas e a tabela pública atualiza sozinha)*',
          ].join('\n'),
        },
        {
          name: 'Slash Commands',
          value: ['`/robux`', '`/reais`', '`/gamepass`', '`/taxa`', '`/tabela`', '`/ajuda`'].join('  •  '),
        }
      )
      .setFooter({ text: 'RUBY FY • Conversor de Robux' });

    return interaction.reply({ embeds: [embed] });
  },
};
