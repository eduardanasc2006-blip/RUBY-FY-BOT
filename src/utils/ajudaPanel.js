const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xbeb6ff;
// Páginas sempre visíveis + admin (só aparecem para admin)
const ORDEM = ['inicio', 'conversor', 'estoque', 'personalizados', 'painel', 'admin'];
const ORDEM_VISIVEL = ['inicio', 'conversor', 'estoque', 'personalizados', 'painel'];
// Categorias entre as quais se navega com as setas (a home fica de fora.)
const CATEGORIAS_PUBLICAS = ['conversor', 'estoque'];
const CATEGORIAS_ADMIN = ['personalizados', 'painel', 'admin'];

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
 { grupo: 'Ajuda', cmd: 'ajuda', desc: 'Abre este menu de ajuda.', admin: false },
 { grupo: 'Ajuda', cmd: 'help', desc: 'Alias do menu de ajuda.', admin: false },
 { grupo: 'Conversor', cmd: 'robux', desc: 'Converte Robux em reais.', admin: false },
 { grupo: 'Conversor', cmd: 'reais', desc: 'Converte reais em Robux.', admin: false },
 { grupo: 'Conversor', cmd: 'gamepass', desc: 'Calcula o valor do Game Pass.', admin: false },
 { grupo: 'Conversor', cmd: 'taxa', desc: 'Mostra as taxas atuais.', admin: false },
 { grupo: 'Estoque', cmd: 'estoque', desc: 'Mostra produtos e preços (ou busca: !estoque <nome>).', admin: false },
 { grupo: 'Painéis', cmd: 'painel', desc: 'Gerenciador central dos painéis fixos.', admin: true },
 { grupo: 'Painéis', cmd: 'tabela', desc: 'Publica o painel de conversão.', admin: false },
 { grupo: 'Painéis', cmd: 'painelestoque', desc: 'Fixa o painel de estoque.', admin: false },
 { grupo: 'Painéis', cmd: 'painelcategoria', desc: 'Sem arg: seletor visual de categoria. Com <id>: fixa a categoria.', admin: false },
 { grupo: 'Administração', cmd: 'configtaxa', desc: 'Painel visual das taxas.', admin: true },
 { grupo: 'Administração', cmd: 'settaxa', desc: 'Altera a taxa (ex: !settaxa 100 3,50).', admin: true },
 { grupo: 'Administração', cmd: 'configestoque', desc: 'Gerencia produtos e quantidades.', admin: true },
 { grupo: 'Administração', cmd: 'embed', desc: 'Cria uma embed no canal.', admin: true },
 { grupo: 'Administração', cmd: 'backup', desc: 'Backup de taxas e estoque na DM.', admin: true },
 { grupo: 'Administração', cmd: 'canalavisos', desc: 'Canal de avisos de estoque.', admin: true },
 { grupo: 'Administração', cmd: 'limpar', desc: 'Apaga mensagens do canal.', admin: true },
 { grupo: 'Administração', cmd: 'mensagem', desc: 'Publica uma mensagem simples em qualquer canal.', admin: true },
 { grupo: 'Administração', cmd: 'lock', desc: 'Bloqueia um canal para membros comuns.', admin: true },
 { grupo: 'Administração', cmd: 'unlock', desc: 'Desbloqueia um canal restaurando permissões.', admin: true },
 { grupo: 'Administração', cmd: 'rolegive', desc: 'Dá um cargo a um membro.', admin: true },
{ grupo: 'Administração', cmd: 'modelos', desc: 'Lista e usa modelos de embed salvos neste servidor.', admin: true },
{ grupo: 'Administração', cmd: 'setwelcome', desc: 'Personaliza a mensagem de boas-vindas do servidor.', admin: true },
{ grupo: 'Administração', cmd: 'testwelcome', desc: 'Envia a mensagem de boas-vindas neste canal para testar.', admin: true },
{ grupo: 'Ajuda', cmd: 'ping', desc: 'Testa a latência do bot.', admin: false },
{ grupo: 'Ajuda', cmd: 'info', desc: 'Mostra informações básicas do bot.', admin: false },
{ grupo: 'Ajuda', cmd: 'calc', desc: 'Calculadora: faça cálculos simples (+, -, *, /, %, parênteses).', admin: false },
{ grupo: 'Administração', cmd: 'sorteio', desc: 'Cria um sorteio com prêmio, duração (min/horas/dias), vencedores, canal e cargo opcionais.', admin: true },
 { grupo: 'Administração', cmd: 'permissoes', desc: 'Gerencia permissões por cargo.', admin: true },
 { grupo: 'Comandos personalizados', cmd: 'criarcomando', desc: 'Cria um comando personalizado.', admin: true },
 { grupo: 'Comandos personalizados', cmd: 'gerenciarcomandos', desc: 'Lista, edita ou exclui personalizados.', admin: true },
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
    titulo: '☁️ RUBY FY BOT — AJUDA',
    descricao: [
      '*Olá! Escolha abaixo o que você deseja consultar.*',
      '',
      '☁️ **CONVERSOR**',
      '*Ferramentas para calcular valores de Robux.*',
      '',
      '☁️ **ESTOQUE**',
      '*Veja os produtos disponíveis e seus valores.*',
      '',
      '☁️ **ADMINISTRAÇÃO**',
      '*Configurações disponíveis para administradores.*',
      '',
      '☁️ **AJUDA**',
      '*Utilidades e informações do bot.*',
      '',
      '➜ **!ping** — *Testa a latência do bot.*',
      '➜ **!info** — *Mostra informações do bot.*',
      '➜ **!calc <expressão>** — *Calculadora rápida.*',
      '',
      '━━━━━━━━━━━━━━━━━━',
    ].join('\n'),
  }),

  conversor: () => ({
    titulo: '☁️ CONVERSOR',
    descricao: [
      '*Escolha uma opção abaixo.*',
      '',
      '➜ **!robux <qtd>**',
      '*Descubra quanto custa determinada quantidade de Robux.*',
      '',
      '➜ **!reais <valor>**',
      '*Descubra quantos Robux correspondem a determinado valor.*',
      '',
      '➜ **!gamepass <robux>**',
      '*Descubra quanto cobrar no Game Pass para receber a quantidade desejada.*',
      '',
      '➜ **!taxa**',
      '*Consulte as taxas atuais.*',
    ].join('\n'),
  }),

  estoque: () => ({
    titulo: '☁️ ESTOQUE',
    descricao: [
      '*Consulte os produtos disponíveis e seus valores.*',
      '',
      '➜ **!estoque**',
      '*Abra o painel de estoque e escolha uma categoria.*',
    ].join('\n'),
  }),


  personalizados: () => {
    const lista = Object.values(customCom.listar());
    const linhas = [];
    if (lista.length === 0) {
      linhas.push('*Nenhum comando personalizado criado ainda.*', '');
      linhas.push('Use **/criarcomando** para criar o seu comando.', '');
      linhas.push('Com **/criarcomando** você define nome, descrição, mensagem, imagem (URL **ou anexo**) e conteúdos copiáveis.', '');
      linhas.push('Com **/gerenciarcomandos** você lista ou exclui os já criados.');
    } else {
      for (const c of lista) {
        const extras = c.copiaveis && c.copiaveis.length ? ` — 📋 ${c.copiaveis.length} copiável(is)` : '';
        linhas.push(`➜ **/${c.nome}**${extras}`);
        if (c.descricao) linhas.push(`> *${c.descricao}*`);
        linhas.push('');
      }
    }
    return { titulo: '☁️ COMANDOS PERSONALIZADOS', descricao: linhas.join('\n') };
  },

  painel: () => ({
    titulo: '☁️ PAINÉIS FIXOS',
    descricao: [
      '➜ **!painel** — *Gerenciador central: mostra e publica/atualiza os painéis fixos.*',
      '',
      '➜ **!tabela** — *Publica o painel de conversão com botões no canal.*',
      '',
      '➜ **!painelestoque** — *Publica o painel fixo de estoque (atualiza sozinho.*',
      '',
      '➜ **!painelcategoria <id>** — *Fixar a categoria: sem id abre o seletor; com <id> fixa direto.*',
      '',
      'Os painéis atualizam automaticamente quando algo muda.',
    ].join('\n'),
  }),

  admin: () => ({
    titulo: '☁️ ADMINISTRAÇÃO',
    descricao: [
      '🔒 *Área exclusiva para administradores autorizados.*',
      '',
      '➜ **!tabela**',
      '*Abre ou atualiza o painel de conversão.*',
      '',
      '➜ **!painel**',
      '*Gerenciador central dos painéis fixos.*',
      '',
      '➜ **!painelestoque**',
      '*Fixa o painel de estoque.*',
      '',
      '➜ **!painelcategoria <id>**',
      '*Fixar categoria: sem id abre seletor; com id fixa direto.*',
      '',
      '➜ **!settaxa 100 <valor>**',
      '*Altera a taxa de 100 a 999 Robux.*',
      '',
      '➜ **!settaxa 1000 <valor>**',
      '*Altera a taxa de 1.000 Robux ou mais.*',
      '',
      '➜ **!configtaxa**',
      '*Abre o painel visual de configuração das taxas.*',
      '',
      '➜ **!configestoque**',
      '*Gerencia categorias, produtos, valores e estoque.*',
      '',
      '➜ **!estoque <nome>**',
      '*Mostra produtos, preços e busca.*',
      '',
      '➜ **!embed**',
      '*Cria uma embed no canal.*',
      '',
      '➜ **!backup**',
      '*Backup das taxas e estoque na DM.*',
      '',
      '➜ **!canalavisos**',
      '*Canal de avisos quando um produto esgota.*',
      '',
      '➜ **!limpar <1-100>**',
      '*Apaga mensagens do canal.*',
      '',
      '➜ **!mensagem**',
      '*Publica uma mensagem simples em qualquer canal.*',
      '',
      '➜ **!lock**',
      '*Bloqueia um canal para membros comuns.*',
      '',
      '➜ **!unlock**',
      '*Desbloqueia um canal restaurando permissões.*',
      '',
      '➜ **!rolegive <@cargo> <@usuario>**',
      '*Dá um cargo a um membro.*',
      '',
      '➜ **!permissoes**',
      '*Gerencia permissões por cargo.*',
      '',
      '➜ **!modelos**',
      '*Lista e usa modelos de embed salvos neste servidor.*',
      '',
      '➜ **!setwelcome**',
      '*Personaliza a mensagem de boas-vindas do servidor.*',
      '',
      '➜ **!testwelcome**',
      '*Envia a mensagem de boas-vindas neste canal para testar.*',
      '',
      '➜ **!sorteio**',
      '*Cria um sorteio com prêmio, duração, vencedores e canal opcional.*',
      '',
      '➜ **/criarcomando**',
      '*Cria um comando personalizado — aceita imagem por URL **ou anexo**.*',
      '',
      '➜ **/gerenciarcomandos**',
      '*Lista, edita ou exclui personalizados.*',
    ].join('\n'),
  }),
};

function buildAjuda(pagina = 'inicio', isAdmin = false) {
  let pag = PAGINAS[pagina] ? pagina : 'inicio';
  if ((pag === 'admin' || pag === 'painel' || pag === 'personalizados') && !isAdmin) pag = 'inicio';

  const dados = PAGINAS[pag](isAdmin);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(dados.titulo)
    .setDescription(dados.descricao)
    .setFooter({ text: 'RUBY FY BOT — !ajuda' });

  const rows = [];

  if (pag === 'inicio') {
    const categorias = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ajuda:cat:conversor').setEmoji('🎮').setLabel('Conversor').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ajuda:cat:estoque').setEmoji('📦').setLabel('Estoque').setStyle(ButtonStyle.Primary),
    );
    rows.push(categorias);

    if (isAdmin) {
      const extras = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ajuda:cat:admin').setEmoji('⚙️').setLabel('Administração').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ajuda:cat:personalizados').setEmoji('📋').setLabel('Comandos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ajuda:cat:painel').setEmoji('🖼️').setLabel('Painel').setStyle(ButtonStyle.Secondary),
      );
      rows.push(extras);
    }
  } else {
    // Navegação entre categorias com setas: ◀️ Anterior | 🏠 Início | Próxima ▶️
    // Catálogo de navegação: admin anda por todas; público só pelas públicas.
    const cats = isAdmin ? [...CATEGORIAS_PUBLICAS, ...CATEGORIAS_ADMIN] : CATEGORIAS_PUBLICAS;
    const idx = cats.indexOf(pag);
    const prev = idx > 0 ? cats[idx - 1] : cats[cats.length - 1];
    const next = idx < cats.length - 1 ? cats[idx + 1] : cats[0];
    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ajuda:nav:prev:${prev}`).setEmoji('◀️').setLabel('Anterior').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ajuda:nav:home:inicio').setEmoji('🏠').setLabel('Início').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ajuda:nav:next:${next}`).setEmoji('▶️').setLabel('Próxima').setStyle(ButtonStyle.Primary),
    );
    rows.push(nav);
  }

  return { embeds: [embed], components: rows };
}

module.exports = { buildAjuda };
