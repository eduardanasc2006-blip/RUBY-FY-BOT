const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'estoque.json');

let dados = { categorias: [] };
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  // Estoque vazio na primeira execução.
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

// Gera um id simples a partir do nome (para customId de botões)
const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);

const estoque = {
  // ----- categorias -----
  categorias: () => dados.categorias,
  categoria: (id) => dados.categorias.find((c) => c.id === id),
  addCategoria(nome) {
    const id = slug(nome);
    if (dados.categorias.some((c) => c.id === id)) return null;
    const cat = { id, nome, produtos: [] };
    dados.categorias.push(cat);
    salvar();
    return cat;
  },

  // ----- produtos -----
  produto(catId, prodId) {
    const cat = estoque.categoria(catId);
    return cat ? cat.produtos.find((p) => p.id === prodId) : null;
  },
  addProduto(catId, { nome, valor, controlarQtd, quantidade }) {
    const cat = estoque.categoria(catId);
    if (!cat) return null;
    const id = slug(nome);
    if (cat.produtos.some((p) => p.id === id)) return null;
    const prod = {
      id,
      nome,
      valor,
      controlarQtd: !!controlarQtd,
      quantidade: controlarQtd ? Math.max(0, Math.floor(quantidade || 0)) : null,
      ativo: true,
    };
    cat.produtos.push(prod);
    salvar();
    return prod;
  },
  setQuantidade(catId, prodId, qtd) {
    const p = estoque.produto(catId, prodId);
    if (!p || !p.controlarQtd) return null;
    p.quantidade = Math.max(0, Math.floor(qtd));
    salvar();
    return p;
  },
  setValor(catId, prodId, valor) {
    const p = estoque.produto(catId, prodId);
    if (!p) return null;
    p.valor = valor;
    salvar();
    return p;
  },
  setNome(catId, prodId, nome) {
    const p = estoque.produto(catId, prodId);
    if (!p) return null;
    p.nome = nome;
    salvar();
    return p;
  },
  toggleAtivo(catId, prodId) {
    const p = estoque.produto(catId, prodId);
    if (!p) return null;
    p.ativo = !p.ativo;
    salvar();
    return p;
  },
  removeProduto(catId, prodId) {
    const cat = estoque.categoria(catId);
    if (!cat) return false;
    const i = cat.produtos.findIndex((p) => p.id === prodId);
    if (i === -1) return false;
    cat.produtos.splice(i, 1);
    salvar();
    return true;
  },
  removeCategoria(catId) {
    const i = dados.categorias.findIndex((c) => c.id === catId);
    if (i === -1) return false;
    dados.categorias.splice(i, 1);
    salvar();
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
