const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const estoque = require('./estoque');
const { formatBRL } = require('./robuxConverter');

const COR = 0xbeb6ff;

function row(...btns) {
  return new ActionRowBuilder().addComponents(...btns);
}
const btn = (id, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
};

// ----- VISÃO PÚBLICA (!estoque / painel fixo) ----------

function emojiDa(c) {
  return c.emoji || '📦';
}

function publicoCategorias(guildId) {
  const cats = estoque.categorias(guildId);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('☁️ Estoque — RUBY FY')
    .setDescription(
      cats.length
        ? '**Selecione uma categoria abaixo para visualizar os produtos disponíveis.**'
        : '*Nenhum produto cadastrado no momento.*'
    )
    .setFooter({ text: '☁️ RUBY FY • Atualizado em tempo real' });

  const linhas = cats.slice(0, 5).map((c) => {
    const total = c.produtos.filter((p) => p.ativo).length;
    return btn(`estfixo:cat:${c.id}`, `${emojiDa(c)} ${c.nome} (${total})`, ButtonStyle.Primary);
  });
  return { embeds: [embed], components: linhas.length ? [row(...linhas)] : [] };
}

function publicoProdutos(guildId, catId) {
  const cats = estoque.categorias(guildId);
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return publicoCategorias(guildId);

  const linhas = cat.produtos.map((p) => {
    const s = estoque.status(p);
    const qtd =
      p.controlarQtd && p.quantidade > 1 ? `\n📦 ${p.quantidade} unidades` : '';
    const desc = p.descricao ? `\n_${p.descricao}_` : '';
    return `${s.emoji} **${p.nome}**\n💵 ${formatBRL(p.valor)}\n${s.texto}${qtd}${desc}`;
  });

  const idx = cats.findIndex((c) => c.id === catId);
  const nav = [];
  if (idx > 0) nav.push(btn(`estfixo:prev:${cats[idx - 1].id}`, `◀️ ${emojiDa(cats[idx - 1])} ${cats[idx - 1].nome}`, ButtonStyle.Secondary));
  nav.push(btn('estfixo:voltar', '⬅️ Categorias', ButtonStyle.Primary));
  if (idx >= 0 && idx < cats.length - 1) nav.push(btn(`estfixo:next:${cats[idx + 1].id}`, `${emojiDa(cats[idx + 1])} ${cats[idx + 1].nome} ▶️`, ButtonStyle.Secondary));

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${emojiDa(cat)} ${cat.nome}`)
    .setDescription(
      `${cat.descricao ? `*${cat.descricao}*\n\n` : ''}${linhas.length ? linhas.join('\n\n') : 'Nenhum produto nesta categoria.'}`
    );

  // Mostra a imagem do produto quando a categoria tem um único produto com imagem
  if (cat.produtos.length === 1 && cat.produtos[0].imagem) {
    embed.setImage(cat.produtos[0].imagem);
  }

  return {
    embeds: [embed],
    components: [row(...nav)],
  };
}

// ---------- VISÃO ADMIN (!configestoque) ----------

function adminMenu(guildId) {
  const cats = estoque.categorias(guildId);
  const totalProdutos = cats.reduce((acc, c) => acc + c.produtos.length, 0);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('⚙️ Configuração de Estoque')
    .setDescription(
      `Categorias: **${cats.length}** • Produtos: **${totalProdutos}**\n\nEscolha uma ação:`
    );

  return {
    embeds: [embed],
    components: [
      row(
        btn('estadm:addcat', '➕ Categoria', ButtonStyle.Primary),
        btn('estadm:addprod', '📦 Produto', ButtonStyle.Primary),
        btn('estadm:lista', '📋 Ver estoque', ButtonStyle.Secondary),
        btn('estadm:gercat', '🏷️ Gerenciar categorias', ButtonStyle.Secondary)
      ),
      row(
        btn('estadm:qtd', '🔢 Quantidade', ButtonStyle.Secondary),
        btn('estadm:vender', '➖ Vender (−1)', ButtonStyle.Primary),
        btn('estadm:toggle', '👁️ Ativar/Desativar', ButtonStyle.Secondary),
        btn('estadm:remover', '🗑️ Remover produto', ButtonStyle.Danger),
        btn('estadm:prodinfo', '📝 Info do produto', ButtonStyle.Secondary)
      ),
      row(
        btn('estadm:nome', '✏️ Editar nome', ButtonStyle.Secondary),
        btn('estadm:rencat', '✏️ Renomear categoria', ButtonStyle.Secondary),
        btn('estadm:remcat', '🗑️ Remover categoria', ButtonStyle.Danger)
      ),
    ],
  };
}

const POR_PAGINA_GERCAT = 9;

function adminGerenciarCategorias(guildId, pag =  0) {
  const cats = estoque.categorias(guildId);
  if (!cats.length) {
    return { content: '📦 Nenhuma categoria cadastrada. Crie uma primeiro com **➕ Categoria**.', embeds: [], components: [row(btn('estadm:menu', '⬅️ Voltar'))] };
  }
  const totalPaginas = Math.max(1, Math.ceil(cats.length / POR_PAGINA_GERCAT));
  const paginaAtual = numeroPagina(pag, totalPaginas);
  const visiveis = cats.slice(paginaAtual * POR_PAGINA_GERCAT, (paginaAtual +  1) * POR_PAGINA_GERCAT);

  const blocos = visiveis.map((c) => {
    const desc = c.descricao ? ` — _${c.descricao}_` : '';
    return `${emojiDa(c)} **${c.nome}** (${c.produtos.length} itens)${desc}`;
  });
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(cats.length > POR_PAGINA_GERCAT ? `🏷️ Gerenciar Categorias (${paginaAtual +  1}/${totalPaginas})` : '🏷️ Gerenciar Categorias')
    .setDescription(`Use os botões para editar. As setas mudam a ordem (aparecem no menu público.\n\n${blocos.join('\n')}`);

  const linhas = [];
  for (let i =  0; i < visiveis.length; i++) {
    if (i % 3 ===  0) linhas.push(new ActionRowBuilder());
    linhas[linhas.length -  1].addComponents(
      new ButtonBuilder().setCustomId(`estadm:gercat2:${visiveis[i].id}`).setLabel(`${visiveis[i].nome.slice(0,  25)}`).setStyle(ButtonStyle.Primary)
    );
  }
  if (linhas.length) linhas[linhas.length -  1].addComponents(btn('estadm:menu', '⬅️ Voltar', ButtonStyle.Secondary));
  else linhas.push(row(btn('estadm:menu', '⬅️ Voltar')));

  const navComps = [];
  if (paginaAtual >  0) navComps.push(btn(`estadm:gercatpag:${paginaAtual -  1}`, '◀️ Anterior', ButtonStyle.Primary));
  if (paginaAtual < totalPaginas -  1) navComps.push(btn(`estadm:gercatpag:${paginaAtual +  1}`, 'Próxima ▶️', ButtonStyle.Primary));
  if (navComps.length) linhas.push(row(...navComps));

  return { embeds: [embed], components: linhas };
}

function numeroPagina(pag, total) {
  if (typeof pag !== 'number' || !Number.isFinite(pag)) return 0;
  if (total <=  1) return  0;
  return Math.min(Math.max(0, Math.floor(pag)), total -  1);
}

// Tela de uma categoria específica (editar emoji/descrição/reordenar/renomear/remover)
function adminGerCatDetalhe(guildId, catId) {
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return { content: '❌ Categoria não encontrada.', embeds: [], components: [] };
  const i = estoque.categorias(guildId).findIndex((c) => c.id === catId);
  const total = estoque.categorias(guildId).length;

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${emojiDa(cat)} ${cat.nome}`)
    .setDescription(
      `**Posição:** ${i + 1} de ${total}\n` +
      `**Emoji:** ${emojiDa(cat)}\n` +
      `**Descrição:** ${cat.descricao ? `_${cat.descricao}_` : '*nenhuma*'}\n\n` +
      `Escolha uma ação para a categoria:`
    );

  return {
    embeds: [embed],
    components: [
      row(
        btn(`estadm:catemoji:${cat.id}`, '😀 Emoji', ButtonStyle.Secondary),
        btn(`estadm:catdesc:${cat.id}`, '📝 Descrição', ButtonStyle.Secondary),
        btn(`estadm:rencat:${cat.id}`, '✏️ Renomear', ButtonStyle.Secondary)
      ),
      row(
        btn(`estadm:catsubir:${cat.id}`, '⬆️ Subir', ButtonStyle.Primary),
        btn(`estadm:catdescer:${cat.id}`, '⬇️ Descer', ButtonStyle.Primary),
        btn(`estadm:remcat:${cat.id}`, '🗑️ Remover', ButtonStyle.Danger)
      ),
      row(btn('estadm:gercat', '⬅️ Voltar', ButtonStyle.Secondary)),
    ],
  };
}

// Lista de categorias para escolher (usada em vários fluxos admin), paginada
function paginaNav(idPrefix, atual, total, params) {
  const nav = [];
  if (atual > 0) nav.push(btn(`estadm:${idPrefix}:${params}${atual - 1}`, '◀️ Anterior', ButtonStyle.Primary));
  nav.push(btn('estadm:menu', '⬅️ Voltar', ButtonStyle.Secondary));
  if (atual < total - 1) nav.push(btn(`estadm:${idPrefix}:${params}${atual + 1}`, 'Próxima ▶️', ButtonStyle.Primary));
  return nav;
}

// Distribui botões em linhas de até 5
function linhasDeBotoes(botoes, ultimaFila = true) {
  const linhas = [];
  for (let i = 0; i < botoes.length; i += 5) {
    linhas.push(row(...botoes.slice(i, i + 5)));
  }
  return linhas;
}

function adminEscolherCategoria(guildId, acao, pag = 0) {
  const cats = estoque.categorias(guildId);
  if (!cats.length) {
    return {
      content: '📦 Nenhuma categoria cadastrada. Crie uma primeiro com **➕ Categoria**.',
      embeds: [],
      components: [row(btn('estadm:menu', '⬅️ Voltar'))],
    };
  }
  const totalPaginas = Math.max(1, Math.ceil(cats.length / 5));
  const paginaAtual = numeroPagina(pag, totalPaginas);
  const visiveis = cats.slice(paginaAtual * 5, paginaAtual * 5 + 5);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(cats.length > 5 ? `⚙️ Escolha a categoria (${paginaAtual + 1}/${totalPaginas})` : '⚙️ Escolha a categoria');
  const componentes = linhasDeBotoes(
    visiveis.map((c) => btn(`estadm:${acao}:${c.id}`, `${emojiDa(c)} ${c.nome}`, ButtonStyle.Primary))
  );
  const nav = paginaNav('catpag', paginaAtual, totalPaginas, `${acao}:`);
  if (nav.length) componentes.push(row(...nav));
  return { embeds: [embed], components: componentes };
}

// Lista de produtos de uma categoria (para editar/remover/qtd/toggle/vender), paginada
function adminEscolherProduto(guildId, acao, catId, pag = 0) {
  const cat = estoque.categoria(guildId, catId);
  if (!cat) return adminMenu(guildId);
  if (!cat.produtos.length) {
    return {
      content: `📦 A categoria **${cat.nome}** não tem produtos.`,
      embeds: [],
      components: [row(btn('estadm:menu', '⬅️ Voltar'))],
    };
  }
  const totalPaginas = Math.max(1, Math.ceil(cat.produtos.length / 5));
  const paginaAtual = numeroPagina(pag, totalPaginas);
  const visiveis = cat.produtos.slice(paginaAtual * 5, paginaAtual * 5 + 5);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(
      cat.produtos.length > 5
        ? `⚙️ ${cat.nome} — escolha o produto (${paginaAtual + 1}/${totalPaginas})`
        : `⚙️ ${cat.nome} — escolha o produto`
    );
  const componentes = linhasDeBotoes(
    visiveis.map((p) => btn(`estadm:${acao}:${catId}:${p.id}`, p.nome, ButtonStyle.Primary))
  );
  const nav = paginaNav('prodpag', paginaAtual, totalPaginas, `${acao}:${catId}:`);
  if (nav.length) componentes.push(row(...nav));
  return { embeds: [embed], components: componentes };
}

// Detalhes de um produto (editar descrição/imagem/valor)
function adminProdDetalhe(guildId, catId, prodId) {
  const cat = estoque.categoria(guildId, catId);
  const p = estoque.produto(guildId, catId, prodId);
  if (!cat || !p) {
    return { content: '❌ Produto não encontrado.', embeds: [], components: [row(btn('estadm:menu', '⬅️ Voltar'))] };
  }
  const s = estoque.status(p);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`📦 ${p.nome}`)
    .setDescription(
      `**Categoria:** ${emojiDa(cat)} ${cat.nome}\n` +
      `**Preço:** ${formatBRL(p.valor)}\n` +
      `**Status:** ${s.emoji} ${s.texto}\n` +
      `**Quantidade:** ${p.controlarQtd ? (p.quantidade ?? 0) : 'sem controle'}\n` +
      `**Descrição:** ${p.descricao ? `_${p.descricao}_` : '*nenhuma*'}\n` +
      `**Imagem:** ${p.imagem ? '[link](' + p.imagem + ')' : '*nenhuma*'}`
    );
  if (p.imagem) embed.setImage(p.imagem);

  return {
    embeds: [embed],
    components: [
      row(
        btn(`estadm:proddtl-desc:${catId}:${p.id}`, '📝 Descrição', ButtonStyle.Secondary),
        btn(`estadm:proddtl-img:${catId}:${p.id}`, '🖼️ Imagem', ButtonStyle.Secondary),
        btn(`estadm:proddtl-valor:${catId}:${p.id}`, '💵 Preço', ButtonStyle.Secondary)
      ),
      row(btn('estadm:menu', '⬅️ Voltar ao menu', ButtonStyle.Secondary)),
    ],
  };
}

// Visão admin completa (com tudo, mesmo inativos)
function adminLista(guildId) {
  const cats = estoque.categorias(guildId);
  const blocos = cats.map((c) => {
    const prods = c.produtos
      .map((p) => {
        const s = estoque.status(p);
        const qtd = p.controlarQtd ? ` • 📦 ${p.quantidade}` : '';
        const desc = p.descricao ? `\n_${p.descricao}_` : '';
        return `${s.emoji} **${p.nome}** — ${formatBRL(p.valor)}${qtd}${desc}`;
      })
      .join('\n');
    return `${emojiDa(c)} **${c.nome}**${c.descricao ? ` — _${c.descricao}_` : ''}\n${prods || '_vazia_'}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📋 Estoque completo (admin)')
    .setDescription(blocos.length ? blocos.join('\n\n').slice(0, 4096) : 'Nenhum produto cadastrado.');

  return {
    embeds: [embed],
    components: [row(btn('estadm:menu', '⬅️ Voltar'))],
  };
}

module.exports = {
  publicoCategorias,
  publicoProdutos,
  adminMenu,
  adminGerenciarCategorias,
  adminGerCatDetalhe,
  adminProdDetalhe,
  adminEscolherCategoria,
  adminEscolherProduto,
  adminLista,
};
