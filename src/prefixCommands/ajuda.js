const { EmbedBuilder } = require('discord.js');

function buildDescricao(naDM) {
  const partes = [
    '💜 **RUBY FY BOT — CENTRAL DE AJUDA**',
    '',
    '*Conversor de Robux + estoque de produtos, tudo em um lugar só.*',
    '',
  ];

  // ----- CONVERSÃO -----
  partes.push(
    '━━━━━━━━━━━━━━━━━━',
    '',
    '🎮 **CONVERTER ROBUX**',
    '',
    '*Use para calcular valores rapidamente:*',
    '',
    '**!robux <quantidade>**',
    'Quanto custa X Robux em reais.',
    'Exemplo: !robux 500 → R$ 19,00',
    '',
    '**!reais <valor>**',
    'Quantos Robux você consegue com X reais.',
    'Exemplo: !reais 10 → 263 Robux',
    '',
    '**!gamepass <robux>**',
    'Quanto cobrar no Game Pass para você receber X Robux.',
    'Exemplo: !gamepass 1000 → crie por 1.429 Robux',
    '',
    '**!taxa**',
    'Veja as taxas atuais de conversão.',
    ''
  );

  // ----- ESTOQUE -----
  partes.push(
    '━━━━━━━━━━━━━━━━━━',
    '',
    '📦 **VER PRODUTOS**',
    '',
    '**!estoque**',
    'Mostra os produtos organizados por categoria (MM2, FTF etc).',
    'Clique na categoria para ver os itens, preços e disponibilidade.',
    ''
  );

  // ----- ADMIN (só no servidor) -----
  if (!naDM) {
    partes.push(
      '━━━━━━━━━━━━━━━━━━',
      '',
      '⚙️ **ADMINISTRAÇÃO** *(só administradores)*',
      '',
      '**!tabela**',
      'Publica ou atualiza o painel de conversão com botões no canal.',
      '',
      '**!settaxa 100 <valor>**',
      'Muda a taxa de 100 a 999 Robux. Ex: !settaxa 100 3,50',
      '',
      '**!settaxa 1000 <valor>**',
      'Muda a taxa de 1.000 Robux ou mais. Ex: !settaxa 1000 34,99',
      '',
      '**!configtaxa**',
      'Painel visual para mudar as taxas com botões.',
      '',
      '**!configestoque**',
      'Painel para gerenciar o estoque: criar categorias, adicionar/editar/remover produtos, alterar quantidades.',
      '',
      '**!painelestoque**',
      'Publica o painel fixo de estoque no canal (atualiza sozinho quando algo muda).',
      '',
      '**!limpar <quantidade>**',
      'Apaga mensagens do canal. Ex: !limpar 20',
      ''
    );
  }

  // ----- SLASH + AJUDA -----
  partes.push(
    '━━━━━━━━━━━━━━━━━━',
    '',
    '✨ **TAMBÉM FUNCIONA COM SLASH**',
    '',
    naDM
      ? '**/robux** • **/reais** • **/gamepass** • **/taxa** • **/estoque** • **/ajuda**'
      : '**/robux** • **/reais** • **/gamepass** • **/taxa** • **/estoque** • **/tabela** • **/ajuda**',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '💡 **Precisa de ajuda de novo?**',
    'Use **!ajuda**, **!help** ou **!menu**.',
    '',
    '*Dúvidas ou problemas? Chame um administrador.*'
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
      .setDescription(buildDescricao(!message.guild))
      .setFooter({ text: 'RUBY FY • Conversor de Robux e Estoque' });

    return message.reply({ embeds: [embed] });
  },
};
