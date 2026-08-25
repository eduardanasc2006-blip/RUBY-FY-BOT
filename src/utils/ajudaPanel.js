const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0x7c3aed;

// Ordem das páginas para as setas de navegação
const ORDEM = ['inicio', 'conversao', 'estoque', 'admin'];

const PAGINAS = {
  inicio: () => ({
    titulo: '💜 RUBY FY BOT — Central de Ajuda',
    descricao: [
      'Conversor de Robux + estoque de produtos, tudo em um lugar só.',
      '',
      '**Escolha uma categoria abaixo:**',
      '',
      '🎮 **Conversão** — calcular Robux ↔ Reais e Game Pass',
      '📦 **Estoque** — ver produtos e preços',
      '⚙️ **Administração** — comandos para administradores',
      '',
      'Use as **setas** para navegar ou clique numa **categoria**.',
    ].join('\n'),
  }),

  conversao: () => ({
    titulo: '🎮 Conversão de Robux',
    descricao: [
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
      '',
      '✨ Slash: **/robux** • **/reais** • **/gamepass** • **/taxa**',
    ].join('\n'),
  }),

  estoque: () => ({
    titulo: '📦 Estoque de Produtos',
    descricao: [
      '**!estoque**',
      'Mostra os produtos organizados por categoria (MM2, FTF etc).',
      'Clique na categoria para ver itens, preços e disponibilidade.',
      '',
      '*Os produtos são gerenciados pela administração.*',
      '',
      '✨ Slash: **/estoque**',
    ].join('\n'),
  }),

  admin: () => ({
    titulo: '⚙️ Administração',
    descricao: [
      '🔒 *Somente administradores autorizados.*',
      '',
      '**!tabela**',
      'Publica ou atualiza o painel de conversão com botões.',
      '',
      '**!settaxa 100 <valor>** — taxa de 100 a 999 Robux.',
      '**!settaxa 1000 <valor>** — taxa de 1.000+ Robux.',
      '**!configtaxa** — painel visual de taxas.',
      '',
      '**!configestoque** — gerencia produtos e categorias.',
      '**!painelestoque** — publica o painel fixo de estoque.',
      '',
      '**!limpar <1-100>** — apaga mensagens do canal.',
    ].join('\n'),
  }),
};

function buildAjuda(pagina = 'inicio', isAdmin = false) {
  const pag = PAGINAS[pagina] ? pagina : 'inicio';
  const dados = PAGINAS[pag]();

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(dados.titulo)
    .setDescription(dados.descricao)
    .setFooter({ text: 'RUBY FY • Use os botões para navegar' });

  // Linha de navegação: setas + início
  const idx = ORDEM.indexOf(pag);
  const anterior = ORDEM[(idx - 1 + ORDEM.length) % ORDEM.length];
  const proximo = ORDEM[(idx + 1) % ORDEM.length];

  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ajuda:${anterior}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ajuda:inicio').setEmoji('🏠').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ajuda:${proximo}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary)
  );

  // Linha de categorias (admin só aparece para admin)
  const cats = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ajuda:conversao').setLabel('🎮 Conversão').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ajuda:estoque').setLabel('📦 Estoque').setStyle(ButtonStyle.Primary)
  );
  if (isAdmin) {
    cats.addComponents(
      new ButtonBuilder().setCustomId('ajuda:admin').setLabel('⚙️ Admin').setStyle(ButtonStyle.Secondary)
    );
  }

  return { embeds: [embed], components: [cats, nav] };
}

module.exports = { buildAjuda };
