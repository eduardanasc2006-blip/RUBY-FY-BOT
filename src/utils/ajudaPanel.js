const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xbeb6ff;
// Páginas sempre visíveis + admin (só aparecem para admin)
const ORDEM = ['inicio', 'conversor', 'estoque', 'comandos', 'painel', 'admin'];
const ORDEM_VISIVEL = ['inicio', 'conversor', 'estoque', 'comandos', 'painel'];

// Lista central de comandos (prefixo e slash) para o menu de ajuda.
// É gerada dinamicamente a partir dos arquivos reais em src/commands e
// src/prefixCommands, então nunca fica desatualizada e sempre mostra o `!`
// e/ou o `/` que de fato existirem para cada comando.
const fs = require('node:fs');
const path = require('node:path');

function carregarComandos() {
  // Nomes vêm do nome dos arquivos (cada comando = um arquivo), evitando
  // require aqui para não gerar dependência circular com src/prefixCommands.
  const slashDir = path.join(__dirname, '..', 'commands');
  const prefixDir = path.join(__dirname, '..', 'prefixCommands');
  const slashPorNome = {};
  for (const f of fs.readdirSync(slashDir).filter((x) => x.endsWith('.js'))) {
    slashPorNome[path.basename(f, '.js')] = '/';
  }
  const prefixPorNome = {};
  for (const f of fs.readdirSync(prefixDir).filter((x) => x.endsWith('.js'))) {
    prefixPorNome[path.basename(f, '.js')] = '!';
  }
  // help e menu são aliases do comando de prefixo ajuda.
  const aliasPorNome = { help: '!', menu: '!' };
  return { slashPorNome, prefixPorNome, aliasPorNome };
}

const { slashPorNome, prefixPorNome, aliasPorNome } = carregarComandos();

const COMANDOS = [
  { grupo: '🏠 Ajuda', cmd: 'ajuda', desc: 'Abre este menu de ajuda.', admin: false },
  { grupo: '🏠 Ajuda', cmd: 'help', desc: 'Alias do menu de ajuda (!help / !menu).', admin: false },
  { grupo: '🎮 Conversor', cmd: 'robux', desc: 'Converte Robux em reais.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'reais', desc: 'Converte reais em Robux.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'gamepass', desc: 'Calcula o valor do Game Pass.', admin: false },
  { grupo: '🎮 Conversor', cmd: 'taxa', desc: 'Mostra as taxas atuais.', admin: false },
  { grupo: '📦 Estoque', cmd: 'estoque', desc: 'Mostra produtos e preços (ou busca: !estoque <nome>).', admin: false },
  { grupo: '📊 Painéis', cmd: 'painel', desc: 'Gerenciador central dos painéis fixos.', admin: true },
  { grupo: '📊 Painéis', cmd: 'tabela', desc: 'Publica o painel de conversão.', admin: false },
  { grupo: '📊 Painéis', cmd: 'painelestoque', desc: 'Fixa o painel de estoque.', admin: false },
  { grupo: '📊 Painéis', cmd: 'painelcategoria', desc: 'Sem arg: seletor visual de categoria. Com <id>: fixa a categoria.', admin: false },
  { grupo: '🛠️ Administração', cmd: 'configtaxa', desc: 'Painel visual das taxas.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'settaxa', desc: 'Altera a taxa (ex: !settaxa 100 3,50).', admin: true },
  { grupo: '🛠️ Administração', cmd: 'configestoque', desc: 'Gerencia produtos e quantidades.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'embed', desc: 'Cria uma embed no canal.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'backup', desc: 'Backup de taxas e estoque na DM.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'canalavisos', desc: 'Canal de avisos de estoque.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'limpar', desc: 'Apaga mensagens do canal.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'rolegive', desc: 'Dá um cargo a um membro.', admin: true },
  { grupo: '🛠️ Administração', cmd: 'permissoes', desc: 'Gerencia permissões por cargo (estoque, taxas, painéis etc).', admin: true },
  { grupo: '✨ Comandos personalizados', cmd: 'criarcomando', desc: 'Cria um comando personalizado.', admin: true },
  { grupo: '✨ Comandos personalizados', cmd: 'gerenciarcomandos', desc: 'Lista, edita ou exclui personalizados.', admin: true },
].map((c) => {
  const pre = prefixPorNome[c.cmd] ? '!' + c.cmd : null;
  const aliasPre = !pre && aliasPorNome[c.cmd] ? '!' + c.cmd : null;
  const slash = slashPorNome[c.cmd] ? '/' + c.cmd : null;
  return { ...c, pre: pre || aliasPre, slash };
});

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
      '**!estoque <nome>**  •  **/estoque produto: <nome>**',
      '*Busca um produto específico.*',
      'Exemplo: !estoque icewing  ou  /estoque produto: icewing',
      '',
      '*Produtos gerenciados pela administração.*',
    ].join('\n'),
  }),

comandos: () => {
      // Lista completa de comandos, agrupada por categoria. Cada linha mostra
      // apenas os prefixos (! e/ou /) que de fato existem para aquele comando.
      const grupos = [];
      let grupoAtual = null;
      for (const c of COMANDOS) {
        if (c.grupo !== grupoAtual) {
          grupoAtual = c.grupo;
          grupos.push({ titulo: c.grupo, itens: [] });
        }
        grupos[grupos.length - 1].itens.push(c);
      }

      const linhas = [];
      for (const g of grupos) {
        const itensVisiveis = g.itens.filter((c) => isAdminAtual || !c.admin);
        if (!itensVisiveis.length) continue;
        linhas.push(`**${g.titulo}**`);
        for (const c of itensVisiveis) {
          const usos = [];
          if (c.pre) usos.push(`!${c.cmd}`);
          if (c.slash) usos.push(`/${c.cmd}`);
          if (c.admin && !isAdminAtual) usos[usos.length - 1] = `${usos[usos.length - 1]} _(admin)_`;
          linhas.push(`> ${usos.join('  •  ')} — ${c.desc}`, '');
        }
      }

      const pers = Object.values(customCom.listar());
      if (pers.length) {
        linhas.push('**🧩 Seus comandos personalizados**', '');
        for (const c of pers) {
          linhas.push(`> **/${c.nome}**${c.descricao ? ` — ${c.descricao}` : ''}`, '');
        }
      }

      return { titulo: '📖 Lista Completa de Comandos', descricao: linhas.join('\n').slice(0, 4096) };
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
      '**!painel**  •  **/painel**',
      '*Gerenciador central: mostra e publica/atualiza os painéis fixos.*',
      '',
      '**!tabela**  •  **/tabela**',
      '*Publica o painel de conversão com botões no canal.*',
      '',
      '**!painelestoque**  •  **/painelestoque**',
      '*Publica o painel fixo de estoque (atualiza sozinho).*',
      '',
      '**!painelcategoria <id>**  •  **/painelcategoria**',
      '*Fixar a categoria: sem id abre o seletor; com <id> fixa direto.*',
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
      '**!rolegive <@cargo> <@usuario>**  •  **/rolegive**',
      '*Dá um cargo a um membro. Ex: !rolegive @VIP @usuario*',
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
