const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'menu'],
  description: 'Mostra o menu de ajuda com todos os comandos do bot',
  usage: '!ajuda',

  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('RUBY FY • Central de Ajuda')
      .setDescription(
        [
          'Converta Robux para Reais direto no chat ou pelo painel de botões. Todas as respostas do painel aparecem somente para você.',
          '',
          '**Comandos para converter:**',
          '**!robux <qtd>**: converte Robux para Reais. Ex: `!robux 500` → R$ 19,00',
          '**!reais <valor>**: converte Reais para Robux. Ex: `!reais 10` → 263 Robux',
          '**!gamepass <robux>**: calcula quanto cobrar no Game Pass para você receber X Robux. Ex: `!gamepass 1000` → 1.429',
          '**!taxa**: mostra as taxas atuais de conversão.',
          '',
          'Todos os comandos também funcionam como Slash: **/robux**, **/reais**, **/gamepass**, **/taxa**, **/tabela**, **/ajuda**',
          '',
          '**Administração** *(somente admins)*:',
          '**!tabela**: publica ou atualiza o painel de conversão com botões no canal.',
          '**!settaxa 100 <valor>**: nova taxa da faixa 100–999. Ex: `!settaxa 100 3,50`',
          '**!settaxa 1000 <valor>**: nova taxa da faixa 1.000+. Ex: `!settaxa 1000 34,99`',
          '**!configtaxa**: abre o painel visual de configuração de taxas com botões.',
          '',
          'Digite **!ajuda** para ver este menu novamente. Aliases: **!help** e **!menu**',
        ].join('\n')
      )
      .setFooter({ text: 'RUBY FY • Conversor de Robux' });

    return message.reply({ embeds: [embed] });
  },
};
