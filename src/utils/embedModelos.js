const fs = require("node:fs");
const path2 = require("node:path");
const crypto = require("node:crypto");

const FILE = path2.join(__dirname, "..", "..", "data", "modelos_embed.json");

function normalizarNomeCat(valor) {
  return String(valor || "" ).trim().toLowerCase().replace(/[^a-z0-9_\- ]/g, "" ).slice(0, 24);
}

function novoId(chave) {
  const base = String(Date.now()) + ":" + String(Math.random()) + ":" + chave;
  return crypto.createHash("sha1").update(base).digest("hex").slice(0, 10);
}

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvar(todo) {
  fs.mkdirSync(path2.dirname(FILE), { recursive: true });
   fs.writeFileSync(FILE, JSON.stringify(todo, null, 2));
}

function baseGuild(todo, guildId) {
  if (!todo[guildId]) {
     todo[guildId] = { categorias: {}, modelos: {} };
   }
   let g = todo[guildId];

   if (!g.categorias || !g.modelos) {
     const categorias = { };
     const modelos = { };
     Object.keys(g).forEach(function (k) {
       const m = g[k];
       if (m && m.id) {
         modelos[m.id] = m;
       }
     });
     g = { categorias, modelos };
     todo[guildId] = g;
   }
   return g;
}

function normalizarOrfas(g, todo) {
  let mudou = false;
   Object.keys(g.modelos || {}).forEach(function (id) {
     const m = g.modelos[id];
     if (m.categoria && !(g.categorias || {})[m.categoria]) {
       m.categoria = null;
       mudou = true;
     }
   });
   if (mudou) {
     salvar(todo);
   }
}

function listarCategorias(guildId) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   normalizarOrfas(g, todo);
   const lista = Object.values(g.categorias || {});
   lista.sort(function (a, b) {
     return String(a.nome || "" ).localeCompare(String(b.nome || "" ));
   });
   return lista;
}

function obterCategoria(guildId, catId) {
  if (!catId) {
    return null;
  }
   const todo = carregar();
   const g = baseGuild(todo, guildId);
   return (g.categorias || {})[catId] || null;
}

function criarCategoria(guildId, nome) {
  return criarCategoriaNo(guildId, nome);
}

function criarCategoriaNo(guildId, nome, todoAtual) {
  const nomeN = normalizarNomeCat(nome);
  if (!guildId || !nomeN) {
    return { ok: false, msg: "Informe um nome para a categoria." };
  }
  const todo = todoAtual || carregar();
  const g = baseGuild(todo, guildId);
   let jaExiste = false;
   Object.values(g.categorias || {}).forEach(function (c) {
     if (c.nome === nomeN) {
       jaExiste = true;
     }
   });
   if (jaExiste) {
     return { ok: false, msg: "Já existe uma categoria com esse nome." };
   }
   const id = novoId("cat");
   g.categorias[id] = { id: id, nome: nomeN, criadoEm: Date.now() };
   salvar(todo);
   const categoria = (g.categorias || {})[id];
   return { ok: true, id: id, categoria: categoria };
}

function editarCategoria(guildId, catId, nome) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   const c = (g.categorias || {})[catId];
   if (!c) {
     return { ok: false, msg: "Categoria não encontrada." };
   }
   const nomeN = normalizarNomeCat(nome);
   if (!nomeN) {
     return { ok: false, msg: "Informe um nome para a categoria." };
   }
   let jaExiste = false;
   Object.values(g.categorias || {}).forEach(function (outra) {
     if (outra.id !== catId && outra.nome === nomeN) {
       jaExiste = true;
     }
   });
   if (jaExiste) {
     return { ok: false, msg: "Já existe uma categoria com esse nome." };
   }
   c.nome = nomeN;
   salvar(todo);
   return { ok: true, categoria: c };
}

function excluirCategoria(guildId, catId) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   if (!(g.categorias || {})[catId]) {
     return { ok: false, msg: "Categoria não encontrada." };
   }
   delete g.categorias[catId];
   Object.values(g.modelos || {}).forEach(function (m) {
     if (m.categoria === catId) {
       m.categoria = null;
     }
   });
   salvar(todo);
   return { ok: true, msg: "Categoria excluída. Modelos movidos para 'Sem categoria'." };
}

function resolverCategoria(guildId, valor, g, todo) {
  if (!valor) {
    return null;
  }
   const v = normalizarNomeCat(valor);
   if (!v) {
     return null;
   }
   let id = null;
   Object.values(g.categorias || {}).forEach(function (c) {
     if (c.nome === v) {
       id = c.id;
     }
   });
   if (id) {
     return id;
   }
   const res = criarCategoriaNo(guildId, v, todo);
   if (res.ok) {
     return res.id;
   }
   return null;
}

function listar(guildId, catId) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   normalizarOrfas(g, todo);
   const lista = Object.values(g.modelos || {});
   let filtrados = [];
   Object.values(lista).forEach(function (m) {
     if (catId) {
       if (m.categoria === catId) {
         filtrados.push(m);
       }
     } else {
       if (!m.categoria) {
         filtrados.push(m);
       }
     }
   });
   filtrados.sort(function (a, b) {
     return String(a.nome || "" ).localeCompare(String(b.nome || "" ));
   });
   return filtrados;
}

function listarTodos(guildId) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   normalizarOrfas(g, todo);
   const lista = Object.values(g.modelos || {});
   lista.sort(function (a, b) {
     return String(a.nome || "" ).localeCompare(String(b.nome || "" ));
   });
   return lista;
}

function obter(guildId, modeloId) {
  if (!guildId || !modeloId) {
    return null;
  }
   const todo = carregar();
   const g = baseGuild(todo, guildId);
   return (g.modelos || {})[modeloId] || null;
}

function criar(guildId, dados) {
  const nome = String(dados.nome || "" ).trim();
   if (!guildId || !nome) {
     return { ok: false, msg: "Informe um nome para o modelo." };
   }
   const todo = carregar();
   const g = baseGuild(todo, guildId);
   const id = novoId("modelo");
   const categoria = resolverCategoria(guildId, dados.categoria, g, todo);
   const descricao = String(dados.descricao || "" ).trim();
   const modelo = {
     id: id,
     nome: nome.slice(0, 80),
     categoria, categoria,
     descricao: descricao.slice(0, 1024) || null,
     dados: dados.dados ? JSON.parse(JSON.stringify(dados.dados)) : null,
     criadoEm: Date.now(),
   };
   g.modelos[id] = modelo;
   salvar(todo);
   return { ok: true, modelo: modelo };
}

function atualizar(guildId, modeloId, dados) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   const m = (g.modelos || {})[modeloId];
   if (!m) {
     return { ok: false, msg: "Modelo não encontrado." };
   }
   if (dados.nome && String(dados.nome).trim()) {
     m.nome = String(dados.nome || "" ).trim().slice(0, 80);
   }
   if (dados.categoria !== undefined) {
     m.categoria = resolverCategoria(guildId, dados.categoria, g, todo);
   }
   if (dados.descricao !== undefined) {
     m.descricao = String(dados.descricao || "" ).trim().slice(0,  1024) || null;
   }
   if (dados.dados) {
     m.dados = JSON.parse(JSON.stringify(dados.dados));
   }
   salvar(todo);
   return { ok: true, modelo: m };
}

function excluir(guildId, modeloId) {
  const todo = carregar();
   const g = baseGuild(todo, guildId);
   if (!(g.modelos || {})[modeloId]) {
     return { ok: false, msg: "Modelo não encontrado." };
   }
   delete g.modelos[modeloId];
   salvar(todo);
   return { ok: true, msg: "Modelo excluído." };
}

module.exports = { listarCategorias, obterCategoria, criarCategoria, editarCategoria, excluirCategoria, listar, listarTodos, obter, criar, atualizar, excluir };