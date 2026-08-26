const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'comandos_custom.json');

let comandos = {};
try {
  comandos = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  // Sem comandos customizados ainda.
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(comandos, null, 2));
}

const custom = {
  listar: () => comandos,
  obter: (nome) => comandos[nome.toLowerCase()],
  existe: (nome) => !!comandos[nome.toLowerCase()],

  criar(nome, dados) {
    const key = nome.toLowerCase().trim();
    if (comandos[key]) return null;
    comandos[key] = {
      nome,
      descricao: dados.descricao || '',
      mensagem: dados.mensagem || '',
      embed: dados.embed || null, // { titulo, descricao, cor, imagem }
      ephemeral: !!dados.ephemeral,
      copiaveis: dados.copiaveis || [], // [{ nome, valor }]
    };
    salvar();
    return comandos[key];
  },

  editar(nome, dados) {
    const key = nome.toLowerCase().trim();
    if (!comandos[key]) return null;
    comandos[key] = { ...comandos[key], ...dados, nome: comandos[key].nome };
    salvar();
    return comandos[key];
  },

  excluir(nome) {
    const key = nome.toLowerCase().trim();
    if (!comandos[key]) return false;
    delete comandos[key];
    salvar();
    return true;
  },
};

module.exports = custom;
