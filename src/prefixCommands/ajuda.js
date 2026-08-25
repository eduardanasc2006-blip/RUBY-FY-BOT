const { EmbedBuilder } = require('discord.js');

function buildDescricao(naDM) {
  const partes = [
    '💜 **RUBY FY BOT — AJUDA**',
    '',
    '*Conversões rápidas de Robux, valores em reais e Game Pass.*',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '🎮 **CONVERSÃO**',
    '',
    '**!robux <qtd>**',
    '*Descubra quanto custa determinada quantidade de Robux.*',
    'Exemplo: !robux 500 → R$ 19,00',
    '',
    '**!reais <valor>**',
    '*Descubra quantos Robux você consegue com determinado valor.*',
    'Exemplo: !reais 10 → 263 Robux',
    '',
    '**!gamepass <robux>**',
    '*Saiba quanto cobrar no Game Pass para receber a quantidade desejada.*',
    'Exemplo: !gamepass 1000 → 1.429 Robux',
    '',
    '**!taxa**',
    '*Consulte as taxas atuais de conversão.*',
    '',
  ];

  if (!naDM) {
    partes.push(
      '━━━━━━━━━━━━━━━━━━',
      '',
      '📊 **PAINEL**',
      '',
      '**!tabela**',
      '*Abre ou atualiza o painel de conversão com botões.*',
      '',
      '*As conversões feitas pelo painel aparecem somente para quem utilizou.*',
      '',
      '━━━━━━━━━━━━━━━━━━',
      '',
      '⚙️ **ADMINISTRAÇÃO**',
      '',
      '🔒 *Somente administradores autorizados.*',
      '',
      '**!settaxa 100 <valor>**',
      '*Altera a taxa de 100 a 999 Robux.*',
      'Exemplo: !settaxa 100 3,50',
      '',
      '**!settaxa 1000 <valor>**',
      '*Altera a taxa para 1.000 Robux ou mais.*',
      'Exemplo: !settaxa 1000 34,99',
      '',
      '**!configtaxa**',
      '*Abre o painel visual para configurar as taxas.*',
      '',
      '**!permitir <id>**',
      '*Autoriza um usuário a usar o bot por DM.*',
      '',
      '**!removerdm <id>**',
      '*Remove a autorização de DM de um usuário.*',
      '',
      '**!dmlista**',
      '*Lista os usuários autorizados na DM.*',
      ''
    );
  }

  partes.push(
    '━━━━━━━━━━━━━━━━━━',
    '',
    '✨ **SLASH COMMANDS**',
    '',
    '*Os comandos também estão disponíveis no formato Slash.*',
    '',
    naDM
      ? '**/robux** • **/reais** • **/gamepass** • **/taxa** • **/ajuda**'
      : '**/robux** • **/reais** • **/gamepass** • **/taxa** • **/tabela** • **/ajuda**',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '💡 **AJUDA**',
    '',
    '*Use **!ajuda**, **!help** ou **!menu** para abrir este menu novamente.*'
  );

  return partes.join('\n');
}

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'menu'],
  description: 'Mostra o menu de ajuda com todos os comandos do bot',
  usage: '!ajuda',
  buildDescricao,

  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setDescription(buildDescricao(!message.guild));

    return message.reply({ embeds: [embed] });
  },
};
