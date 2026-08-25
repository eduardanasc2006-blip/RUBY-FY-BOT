const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0x7c3aed;
const ORDEM = ['inicio', 'conversor', 'estoque', 'painel', 'admin'];

const PAGINAS = {
  inicio: () => ({
    titulo: '💜 RUBY FY BOT — Central de Ajuda',
    descricao: [
      'Conversor de Robux + estoque de produtos, tudo em um lugar.',
      '',
      '**Escolha uma categoria:**',
      '',
      '🎮 **Conversor** — calcular Robux ↔ Reais, Game Pass e taxas',
      '📦 **Estoque** — ver produtos e preços',
      '📊 **Painel** — painéis fixos de conversão e estoque',
      '⚙️ **Administração** — comandos para admins',
      '',
      'Use as **setas** para navegar ou clique numa **categoria**.',
    ].join('\n'),
  }),

  conversor: () => ({
    titulo: '🎮 Conversor de Robux',
    descricao: [
      '**!robux <quantidade>**',
      '*Descubra quanto custa X Robux em reais.*',
      'Exemplo: !robux 500 → R$ 19,00',
      '',
      '**!reais <valor>**',
      '*Descubra quantos Robux você consegue com X reais.*',
      'Exemplo: !reais 10 → 263 Robux',
      '',
      '**!gamepass <robux>**',
      '*Quanto cobrar no Game Pass para receber X Robux.*',
      'Exemplo: !gamepass 1000 → crie por 1.429 Robux',
      '',
      '**!taxa**',
      '*Veja as taxas atuais de conversão.*',
      '',
      '✨ Slash: **/robux** • **/reais** • **/gamepass** • **/taxa**',
    ].join('\n'),
  }),

  estoque: () => ({
    titulo: '📦 Estoque de Produtos',
    descricao: [
      '**!estoque**',
      '*Mostra os produtos por categoria (MM2, FTF etc).*',
      'Clique na categoria para ver itens, preços e disponibilidade.',
      '',
      '*Produtos gerenciados pela administração.*',
      '',
      '✨ Slash: **/estoque**',
    ].join('\n'),
  }),

  painel: () => ({
    titulo: '📊 Painéis Fixos',
    descricao: [
      '**!tabela** *(admin)*',
      '*Publica o painel de conversão com botões no canal.*',
      '',
      '**!painelestoque** *(admin)*',
      '*Publica o painel fixo de estoque (atualiza sozinho).*',
      '',
      '**!painelcategoria <categoria>** *(admin)*',
      '*Fixa no canal os produtos de UMA categoria (ex: !painelcategoria mm2).*',
      '',
      '*Os painéis atualizam automaticamente quando algo muda.*',
    ].join('\n'),
  }),

  admin: () => ({
    titulo: '⚙️ Administração',
    descricao: [
      '🔒 *Somente administradores autorizados.*',
      '',
      '**!settaxa 100 <valor>**',
      '*Taxa de 100 a 999 Robux. Ex: !settaxa 100 3,50*',
      '',
      '**!settaxa 1000 <valor>**',
      '*Taxa de 1.000+ Robux. Ex: !settaxa 1000 34,99*',
      '',
      '**!configtaxa**',
      '*Painel visual para mudar as taxas.*',
      '',
      '**!configestoque**',
      '*Gerencia categorias, produtos e quantidades.*',
      '',
      '**!limpar <1-100>**',
      '*Apaga mensagens do canal. Ex: !limpar 20*',
    ].join('\n'),
  }),
};

function buildAjuda(pagina = 'inicio', isAdmin = false) {
  let pag = PAGINAS[pagina] ? pagina : 'inicio';
  if ((pag === 'admin' || pag === 'painel') && !isAdmin) pag = 'inicio';

  const dados = PAGINAS[pag]();
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(dados.titulo)
    .setDescription(dados.descricao)
    .setFooter({ text: 'RUBY FY • Use os botões para navegar' });

  const idx = ORDEM.indexOf(pag);
  const anterior = ORDEM[(idx - 1 + ORDEM.length) % ORDEM.length];
  const proximo = ORDEM[(idx + 1) % ORDEM.length];

  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ajuda:${anterior}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ajuda:inicio').setEmoji('🏠').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ajuda:${proximo}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary)
  );

  const cats = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ajuda:conversor').setLabel('🎮 Conversor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ajuda:estoque').setLabel('📦 Estoque').setStyle(ButtonStyle.Primary)
  );
  if (isAdmin) {
    cats.addComponents(
      new ButtonBuilder().setCustomId('ajuda:painel').setLabel('📊 Painel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ajuda:admin').setLabel('⚙️ Admin').setStyle(ButtonStyle.Danger)
    );
  }

  return { embeds: [embed], components: [cats, nav] };
}

module.exports = { buildAjuda };
