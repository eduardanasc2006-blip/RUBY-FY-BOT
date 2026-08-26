const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xbeb6ff;
const ORDEM = ['inicio', 'conversor', 'estoque', 'painel', 'admin'];

const PAGINAS = {
  inicio: () => ({
    titulo: '☁️  RUBY FY BOT  ☁️',
    descricao: [
      '*Conversor de Robux + Estoque de produtos*',
      '',
      '**Escolha uma categoria abaixo:**',
      '',
      '🎮 **Conversor**',
      '*Calcular Robux ↔ Reais, Game Pass e taxas*',
      '',
      '📦 **Estoque**',
      '*Ver produtos, preços e disponibilidade*',
      '',
      '📊 **Painéis**',
      '*Painéis fixos de conversão e estoque*',
      '',
      '⚙️ **Administração**',
      '*Comandos para administradores*',
      '',
      '✨ *Use as setas para navegar ou clique numa categoria*',
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
    titulo: '☁️ Estoque de Produtos',
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
      '**!tabela** ou **/tabela**',
      '*Publica o painel de conversão com botões no canal.*',
      '',
      '**!painelestoque** ou **/painelestoque**',
      '*Publica o painel fixo de estoque (atualiza sozinho).*',
      '',
      '**!painelcategoria <id>** ou **/painelcategoria**',
      '*Fixa os produtos de uma categoria (ex: !painelcategoria mm2).*',
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
      '**!configtaxa** ou **/configtaxa**',
      '*Painel visual para mudar as taxas.*',
      '',
      '**!configestoque** ou **/configestoque**',
      '*Gerencia o estoque: produtos, quantidades, vender (−1).*',
      '',
      '**!embed** ou **/embed**',
      '*Cria uma embed personalizada no canal.*',
      '',
      '**!backup** ou **/backup**',
      '*Backup das taxas e estoque na sua DM.*',
      '',
      '**!canalavisos** ou **/canalavisos**',
      '*Canal de avisos quando um produto esgota.*',
      '',
      '**!limpar <1-100>** ou **/limpar**',
      '*Apaga mensagens do canal. Ex: !limpar 20*',
      '',
      '**/rolegive**',
      '*Dá um cargo a um membro (escolhe cargo e usuário pelo menu).*',
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
    .setFooter({ text: '☁️ RUBY FY • !ajuda !help !menu ☁️' });

  const idx = ORDEM.indexOf(pag);
  const anterior = ORDEM[(idx - 1 + ORDEM.length) % ORDEM.length];
  const proximo = ORDEM[(idx + 1) % ORDEM.length];

  // custom_id unicos por pagina para nunca duplicar com os botoes de categoria
  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ajuda:nav:prev:${anterior}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ajuda:nav:home:inicio').setEmoji('🏠').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ajuda:nav:next:${proximo}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary)
  );

  const cats = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ajuda:cat:conversor').setLabel('🎮 Conversor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ajuda:cat:estoque').setLabel('📦 Estoque').setStyle(ButtonStyle.Primary)
  );
  if (isAdmin) {
    cats.addComponents(
      new ButtonBuilder().setCustomId('ajuda:cat:painel').setLabel('📊 Painel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ajuda:cat:admin').setLabel('⚙️ Admin').setStyle(ButtonStyle.Danger)
    );
  }

  return { embeds: [embed], components: [cats, nav] };
}

module.exports = { buildAjuda };
