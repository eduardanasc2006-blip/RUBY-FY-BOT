const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'estoque');
const LEGADO = path.join(__dirname, '..', '..', 'data', 'estoque.json');
const LEGADO_OLD = path.join(__dirname, '..', '..', 'data', 'estoque.legado.json');

function arquivoDoGuild(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function migrarLegadoPara(guildId) {
  if (!fs.existsSync(LEGADO) || fs.existsSync(LEGADO_OLD)) return false;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.renameSync(LEGADO, LEGADO_OLD);
  fs.copyFileSync(LEGADO_OLD, arquivoDoGuild(guildId));
  return true;
}

const cache = {};

function carregar(guildId) {
  if (!guildId) return { categorias: [] };
  if (cache[guildId]) return cache[guildId];
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(arquivoDoGuild(guildId))) {

    if (migrarLegadoPara(guildId)) {

    } else {
      fs.writeFileSync(arquivoDoGuild(guildId), JSON.stringify({ categorias: [] }, null, 2));
    }
  }
  const dados = JSON.parse(fs.readFileSync(arquivoDoGuild(guildId), 'utf8'));
  cache[guildId] = dados;
  return dados;
}

function salvar(guildId) {
  const dados = carregar(guildId);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(arquivoDoGuild(guildId), JSON.stringify(dados, null, 2));
}

// Gera um id simples a partir do nome (para customId de botões)
const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);

const estoque = {
  // ----- categorias -----
  categorias: (guildId) => carregar(guildId).categorias,
  categoria: (guildId, id) => carregar(guildId).categorias.find((c) => c.id === id),
  addCategoria(guildId, nome) {
    const dados = carregar(guildId);
    const id = slug(nome);
    if (dados.categorias.some((c) => c.id === id)) return null;
    const cat = { id, nome, produtos: [] };
    dados.categorias.push(cat);
    salvar(guildId);
    return cat;

  },

  // ----- produtos -----
  produto(guildId, catId, prodId) {
    const cat = estoque.categoria(guildId, catId);
    return cat ? cat.produtos.find((p) => p.id === prodId) : null;
  },
  addProduto(guildId, catId, { nome, valor, controlarQtd, quantidade, descricao, imagem }) {
    const cat = estoque.categoria(guildId, catId);
    if (!cat) return null;
    const id = slug(nome);
    if (cat.produtos.some((p) => p.id === id)) return null;
    const prod = {
      id,
      nome,
      valor,
      controlarQtd: !!controlarQtd,
      quantidade: controlarQtd ? Math.max(0, Math.floor(quantidade || 0)) : null,
      descricao: descricao || null,
      imagem: imagem || null,
      ativo: true,
    };
    cat.produtos.push(prod);
    salvar(guildId);
    return prod;

  },
  setQuantidade(guildId, catId, prodId, qtd) {
    const p = estoque.produto(guildId, catId, prodId);
    if (!p || !p.controlarQtd) return null;
    p.quantidade = Math.max(0, Math.floor(qtd));
    salvar(guildId);
    return p;

  },
  setValor(guildId, catId, prodId, valor) {
    const p = estoque.produto(guildId, catId, prodId);
    if (!p) return null;
    p.valor = valor;
    salvar(guildId);
    return p;

  },
  setNome(guildId, catId, prodId, nome) {
    const p = estoque.produto(guildId, catId, prodId);
    if (!p) return null;
    p.nome = nome;
    salvar(guildId);
    return p;

  },
  setDescricaoProduto(guildId, catId, prodId, descricao) {
    if (!p) return null;
    p.descricao = descricao || null;
    salvar(guildId);
    return p;
  },
  setImagemProduto(guildId, catId, prodId, imagem) {
    const p = estoque.produto(guildId, catId, prodId);
    if (!p) return null;
    p.imagem = imagem || null;
    salvar(guildId);
    return p;

  },
  toggleAtivo(guildId, catId, prodId) {

    const p = estoque.produto(guildId, catId, prodId);
    if (!p) return null;
    p.ativo = !p.ativo;
    salvar(guildId);
    return p;
  },
  removeProduto(guildId, catId, prodId) {

    const cat = estoque.categoria(guildId, catId);
    if (!cat) return false;
    const i = cat.produtos.findIndex((p) => p.id === prodId);
    if (i === -1) return false;
    cat.produtos.splice(i, 1);
    salvar(guildId);
    return true;
  },
  removeCategoria(guildId, catId) {

    const dados = carregar(guildId);
    const i = dados.categorias.findIndex((c) => c.id === catId);
    if (i === -1) return false;
    dados.categorias.splice(i, 1);
    salvar(guildId);
    return true;
  },
  renomearCategoria(guildId, catId, novoNome) {

    const cat = estoque.categoria(guildId, catId);
    if (!cat) return null;
    cat.nome = novoNome;
    salvar(guildId);
    return cat;

  },
  setEmojiCategoria(guildId, catId, emoji) {

    const cat = estoque.categoria(guildId, catId);
    if (!cat) return null;
    cat.emoji = emoji || null;
    salvar(guildId);
    return cat;

  },
  setDescricaoCategoria(guildId, catId, descricao) {
    const cat = estoque.categoria(guildId, catId);
    if (!cat) return null;
    cat.descricao = descricao || null;
    salvar(guildId);
    return cat;



  },
  // Move a categoria uma posição: delta = -1 (sobe) ou +1 (desce）
  moverCategoria(guildId, catId, delta) {


    const dados = carregar(guildId);
    const i = dados.categorias.findIndex((c) => c.id === catId);
    if (i === -1) return false;
    const j = i + delta;
    if (j < 0 || j >= dados.categorias.length) return false;
    const [cat] = dados.categorias.splice(i, 1);
    dados.categorias.splice(j, 0, cat);
    salvar(guildId);
    return true;
  },

  // ----- status de exibição -----
  status(p) {
    if (!p.ativo) return { emoji: '🔴', texto: 'Indisponível' };
    if (!p.controlarQtd) return { emoji: '🟢', texto: 'Disponível' };
    if (p.quantidade > 1) return { emoji: '🟢', texto: 'Disponível' };
    if (p.quantidade === 1) return { emoji: '🟢', texto: 'Última unidade' };
    return { emoji: '🔴', texto: 'Indisponível' };
  },
};

module.exports = estoque;