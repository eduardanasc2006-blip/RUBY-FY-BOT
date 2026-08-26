const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xbeb6ff;
// Páginas sempre visíveis + admin (só aparecem para admin)
const ORDEM = ['inicio', 'conversor', 'estoque', 'comandos', 'painel', 'admin'];
const ORDEM_VISIVEL = ['inicio', 'conversor', 'estoque', 'comandos', 'painel'];

// Lista central de comandos (prefixo e slash) para o menu de ajuda
const COMANDOS = [
  { grupo: '🏠 Ajuda', cmd: 'ajuda', pre: '!ajuda', slash: '/ajuda', desc: 'Abre este menu de ajuda.', admin: false },
  { grupo: '🏠 Ajuda', cmd: 'help', pre: '!help', slash: null, desc: 'Alias do menu de ajuda.', admin: false },
  { grupo: '🏠 Ajuda', cmd: 'menu', pre: '!menu', slash: null, desc: 'Alias do menu de ajuda.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'robux', pre: '!robux 500', slash: '/robux', desc: 'Converte Robux em reais.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'reais', pre: '!reais 10', slash: '/reais', desc: 'Converte reais em Robux.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'gamepass', pre: '!gamepass 1000', slash: '/gamepass', desc: 'Calcula o valor do Game Pass.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'taxa', pre: '!taxa', slash: '/taxa', desc: 'Mostra as taxas atuais.', admin: false },
  { grupo: '📦 Estoque', cmd: 'estoque', pre: '!estoque', slash: '/estoque', desc: 'Mostra produtos e preços.', admin: false },
  { grupo: '📦 Estoque', cmd: 'estoque', pre: '!estoque <nome>', slash: null, desc: 'Busca um produto específico.', admin: false },
  { grupo: '📊 Painéis', cmd: 'tabela', pre: '!tabela', slash: '/tabela', desc: 'Publica o painel de conversão.', admin: false },
  { grupo: '📊 Painéis', cmd: 'painelestoque', pre: '!painelestoque', slash: '/painelestoque', desc: 'Fixa o painel de estoque.', admin: false },
  { grupo: '📊 Painéis', cmd: 'painelcategoria', pre: '!painelcategoria <id>', slash: '/painelcategoria', desc: 'Fixa produtos de uma categoria.', admin: false },
  { grupo: '🛠️ Administração', cmd: 'configtaxa', pre: '!configtaxa', slash: '/configtaxa', desc: 'Painel visual das taxas.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'settaxa', pre: '!settaxa 100 3,50', slash: null, desc: 'Altera a taxa de uma faixa.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'configestoque', pre: '!configestoque', slash: '/configestoque', desc: 'Gerencia produtos e quantidades.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'embed', pre: '!embed', slash: '/embed', desc: 'Cria uma embed no canal.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'backup', pre: '!backup', slash: '/backup', desc: 'Backup de taxas e estoque na DM.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'canalavisos', pre: '!canalavisos', slash: '/canalavisos', desc: 'Canal de avisos de estoque.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'limpar', pre: '!limpar 20', slash: '/limpar', desc: 'Apaga mensagens do canal.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'rolegive', pre: null, slash: '/rolegive', desc: 'Dá um cargo a um membro.', admin: true },
  { grupo: '✨ Comandos personalizados', cmd: 'criarcomando', pre: null, slash: '/criarcomando', desc: 'Cria um comando personalizado.', admin: true },
  { grupo: '✨ Comandos personalizados', cmd: 'gerenciarcomandos', pre: null, slash: '/gerenciarcomandos', desc: 'Lista, edita ou exclui personalizados.', admin: true },
];

// Comandos personalizados criados pelo dono (adicionados dinamicamente)
const customCom = require('./customCommands');

const PAGINAS = {
  inicio: () => ({
    titulo: '☁️  RUBY FY BOT  ☁️',
    descricao: [
      '*Conversor de Robux + Estoque de produtos*',
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
      '✨ **Todos os comandos**',
      '*Veja a lista completa com / e !*',
      '',
      '⚙️ **Administração**',
      '*Comandos para administradores*',
      '',
      '✨ *Clique numa categoria ou use as setas*',
    ].join('\n'),
  }),

  conversor: () => ({
    titulo: '🎮 Conversor de Robux',
    descricao: [
      '**!robux <quantidade>**  •  **/robux**',
      '*Descubra quanto custa X Robux em reais.*',
      'Exemplo: !robux 500 → R$ 19,00',
      '',
      '**!reais <valor>**  •  **/reais**',
      '*Descubra quantos Robux você consegue com X reais.*',
      'Exemplo: !reais 10 → 263 Robux',
      '',
      '**!gamepass <robux>**  •  **/gamepass**',
      '*Quanto cobrar no Game Pass para receber X Robux.*',
      'Exemplo: !gamepass 1000 → crie por 1.429 Robux',
      '',
      '**!taxa**  •  **/taxa**',
      '*Veja as taxas atuais de conversão.*',
    ].join('\n'),
  }),

  estoque: () => ({
    titulo: '📦 Estoque de Produtos',
    descricao: [
      '**!estoque**  •  **/estoque**',
      '*Mostra os produtos por categoria (MM2, FTF etc).*',
      'Clique na categoria para ver itens, preços e disponibilidade.',
      '',
      '**!estoque <nome>**',
      '*Busca um produto específico.*',
      'Exemplo: !estoque icewing',
      '',
      '*Produtos gerenciados pela administração.*',
    ].join('\n'),
  }),

  comandos: () => {
    // Página com TODOS os comandos (slash e prefixo), grupo por grupo
    const porGrupo = {};
    for (const c of COMANDOS) {
      if (c.admin && !isAdminAtual) continue;
      (porGrupo[c.grupo] = porGrupo[c.grupo] || []).push(c);
    }
    const linhas = [];
    for (const grupo of Object.keys(porGrupo)) {
      linhas.push(`**${grupo}**`, '');
      for (const c of porGrupo[grupo]) {
        const usoS = c.slash ? `**${c.slash}**` : null;
        const usoP = c.pre ? `**${c.pre}**` : null;
        linhas.push([usoS, usoP].filter(Boolean).join('  '));
        linhas.push(`> ${c.desc}`);
        linhas.push('');
      }
    }
    return { titulo: '✨ Todos os Comandos', descricao: linhas.join('\n') };
  },

  personalizados: () => {
    const lista = Object.values(customCom.listar());
    const linhas = [];
    if (lista.length === 0) {
      linhas.push('Nenhum comando personalizado criado ainda.'.repeat(1));
      linhas.push('');
      linhas.push('Use **/criarcomando** para criar o seu comando.');
      linhas.push('');
      linhas.push('Com /criarcomando você define nome, descrição, mensagem e conteúdos copiáveis.');
      linhas.push('Com /gerenciarcomandos você lista ou exclui os já criados.');
    } else {
      for (const c of lista) {
        const extras = c.copiaveis && c.copiaveis.length ? `  •  📋 ${c.copiaveis.length} copiável(is)` : '';
        linhas.push(`**/${c.nome}**${extras}`);
        if (c.descricao) linhas.push(`> ${c.descricao}`);
        linhas.push('');
      }
    }
    return { titulo: '🧩 Comandos Personalizados', descricao: linhas.join('\n') };
  },

  painel: () => ({
    titulo: '📊 Painéis Fixos',
    descricao: [
      '**!tabela**  •  **/tabela**',
      '*Publica o painel de conversão com botões no canal.*',
      '',
      '**!painelestoque**  •  **/painelestoque**',
      '*Publica o painel fixo de estoque (atualiza sozinho).*',
      '',
      '**!painelcategoria <id>**  •  **/painelcategoria**',
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
      '**!configtaxa**  •  **/configtaxa**',
      '*Painel visual para mudar as taxas.*',
      '',
      '**!configestoque**  •  **/configestoque**',
      '*Gerencia o estoque: produtos, quantidades, vender (−1).*',
      '',
      '**!embed**  •  **/embed**',
      '*Cria uma embed personalizada no canal.*',
      '',
      '**!backup**  •  **/backup**',
      '*Backup das taxas e estoque na sua DM.*',
      '',
      '**!canalavisos**  •  **/canalavisos**',
      '*Canal de avisos quando um produto esgota.*',
      '',
      '**!limpar <1-100>**  •  **/limpar**',
      '*Apaga mensagens do canal. Ex: !limpar 20*',
      '',
      '**/rolegive**',
      '*Dá um cargo a um membro (escolhe cargo e usuário pelo menu).*',
      '',
      '**/criarcomando**  •  **/gerenciarcomandos**',
      '*Cria e gerencia comandos personalizados.*',
    ].join('\n'),
  }),
};

// Flag usada na página "comandos" para esconder comandos de administração
let isAdminAtual = false;

function buildAjuda(pagina = 'inicio', isAdmin = false) {
  let pag = PAGINAS[pagina] ? pagina : 'inicio';
  if ((pag === 'admin' || pag === 'painel' || pag === 'personalizados') && !isAdmin) pag = 'inicio';

  // Flag usada pela página "comandos" para ocultar itens de administração
  isAdminAtual = !!isAdmin;

  const dados = PAGINAS[pag]();
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(dados.titulo)
    .setDescription(dados.descricao)
    .setFooter({ text: '☁️ RUBY FY • criador: Finix.Yin • !ajuda !help !menu ☁️' });

  // Navegação respeitando a visibilidade da página para o usuário
  const listaIds = isAdmin ? ORDEM : ORDEM_VISIVEL;
  // Página "personalizados" não está na lista: navega como se fosse "comandos"
  const navId = pag === 'personalizados' ? 'comandos' : pag;
  const idx = listaIds.indexOf(navId);
  const anterior = listaIds[(idx - 1 + listaIds.length) % listaIds.length];
  const proximo = listaIds[(idx + 1) % listaIds.length];

  // Custom ids únicos por página para nunca duplicar com os botões de categoria
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
      new ButtonBuilder().setCustomId('ajuda:cat:personalizados').setLabel('🧩 Comandos').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ajuda:cat:painel').setLabel('📊 Painel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ajuda:cat:admin').setLabel('⚙️ Admin').setStyle(ButtonStyle.Danger)
    );
  }

  return { embeds: [embed], components: [cats, nav] };
}

module.exports = { buildAjuda };
