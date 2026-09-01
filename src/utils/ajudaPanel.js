const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xbeb6ff;
// Páginas sempre visíveis + admin (só aparecem para admin)
// Categorias entre as quais se navega com as setas (a home fica de fora.)
const CATEGORIAS_PUBLICAS = ['conversor', 'estoque'];
const CATEGORIAS_ADMIN = ['personalizados', 'painel', 'admin'];

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
      '*Painéis fixos **(!painel)** e estoque **(!estoque)** têm páginas próprias: use os botões de navegação.*',
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
      '*Cria um sorteio com prêmio, duração (min/horas/dias), vencedores, canal e cargo opcionais.*',
      '',
      '*Comandos personalizados **(/criarcomando** e **/gerenciarcomandos)** têm página própria.*',
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
