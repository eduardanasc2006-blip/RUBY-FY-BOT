const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const estoque = require('./estoque');
const { formatBRL } = require('./robuxConverter');

const COR = 0xa8c6fa;

function row(...btns) {
  return new ActionRowBuilder().addComponents(...btns);
}
const btn = (id, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
};

// ----- VISÃO PÚBLICA (!estoque / painel fixo) ----------

function publicoCategorias() {
  const cats = estoque.categorias();
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
    return btn(`estfixo:cat:${c.id}`, `${c.nome} (${total})`, ButtonStyle.Primary);
  });
  return { embeds: [embed], components: linhas.length ? [row(...linhas)] : [] };
}

function publicoProdutos(catId) {
  const cat = estoque.categoria(catId);
  if (!cat) return publicoCategorias();

  const linhas = cat.produtos.map((p) => {
    const s = estoque.status(p);
    const qtd =
      p.controlarQtd && p.quantidade > 1 ? `\n📦 ${p.quantidade} unidades` : '';
    return `${s.emoji} **${p.nome}**\n💵 ${formatBRL(p.valor)}\n${s.texto}${qtd}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`📦 ${cat.nome}`)
    .setDescription(linhas.length ? linhas.join('\n\n') : 'Nenhum produto nesta categoria.');

  return {
    embeds: [embed],
    components: [row(btn('estfixo:voltar', '⬅️ Voltar às categorias', ButtonStyle.Secondary))],
  };
}

// ---------- VISÃO ADMIN (!configestoque) ----------

function adminMenu() {
  const cats = estoque.categorias();
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
        btn('estadm:lista', '📋 Ver estoque', ButtonStyle.Secondary)
      ),
      row(
        btn('estadm:qtd', '🔢 Quantidade', ButtonStyle.Secondary),
        btn('estadm:toggle', '👁️ Ativar/Desativar', ButtonStyle.Secondary),
        btn('estadm:remover', '🗑️ Remover', ButtonStyle.Danger)
      ),
    ],
  };
}

// Lista de categorias para escolher (usada em vários fluxos admin)
function adminEscolherCategoria(acao) {
  const cats = estoque.categorias();
  if (!cats.length) {
    return {
      content: '📦 Nenhuma categoria cadastrada. Crie uma primeiro com **➕ Categoria**.',
      embeds: [],
      components: [row(btn('estadm:menu', '⬅️ Voltar'))],
    };
  }
  const embed = new EmbedBuilder().setColor(COR).setTitle('⚙️ Escolha a categoria');
  const linhas = cats.slice(0, 5).map((c) =>
    btn(`estadm:${acao}:${c.id}`, c.nome, ButtonStyle.Primary)
  );
  return {
    embeds: [embed],
    components: [row(...linhas), row(btn('estadm:menu', '⬅️ Voltar'))],
  };
}

// Lista de produtos de uma categoria (para editar/remover/qtd/toggle)
function adminEscolherProduto(acao, catId) {
  const cat = estoque.categoria(catId);
  if (!cat) return adminMenu();
  if (!cat.produtos.length) {
    return {
      content: `📦 A categoria **${cat.nome}** não tem produtos.`,
      embeds: [],
      components: [row(btn('estadm:menu', '⬅️ Voltar'))],
    };
  }
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`⚙️ ${cat.nome} — escolha o produto`);
  const linhas = cat.produtos.slice(0, 5).map((p) =>
    btn(`estadm:${acao}:${catId}:${p.id}`, p.nome, ButtonStyle.Primary)
  );
  return {
    embeds: [embed],
    components: [row(...linhas), row(btn('estadm:menu', '⬅️ Voltar'))],
  };
}

// Visão admin completa (com tudo, mesmo inativos)
function adminLista() {
  const cats = estoque.categorias();
  const blocos = cats.map((c) => {
    const prods = c.produtos
      .map((p) => {
        const s = estoque.status(p);
        const qtd = p.controlarQtd ? ` • 📦 ${p.quantidade}` : '';
        return `${s.emoji} **${p.nome}** — ${formatBRL(p.valor)}${qtd}`;
      })
      .join('\n');
    return `**${c.nome}**\n${prods || '_vazia_'}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📋 Estoque completo (admin)')
    .setDescription(blocos.length ? blocos.join('\n\n') : 'Nenhum produto cadastrado.');

  return {
    embeds: [embed],
    components: [row(btn('estadm:menu', '⬅️ Voltar'))],
  };
}

module.exports = {
  publicoCategorias,
  publicoProdutos,
  adminMenu,
  adminEscolherCategoria,
  adminEscolherProduto,
  adminLista,
};
