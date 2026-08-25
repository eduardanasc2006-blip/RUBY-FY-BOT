const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'dm_allowed.json');

// IDs fixos do .env (dono + autorizados permanentes)
const IDS_FIXOS = new Set(
  [process.env.OWNER_ID || '', ...(process.env.DM_ALLOWED_IDS || '').split(',')]
    .map((s) => s.trim())
    .filter(Boolean)
);

// IDs adicionados por comando (persistem em data/dm_allowed.json)
let idsExtras = new Set();
try {
  idsExtras = new Set(JSON.parse(fs.readFileSync(FILE, 'utf8')));
} catch {
  // Sem autorizados salvos ainda.
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify([...idsExtras], null, 2));
}

module.exports = {
  podeUsarNaDM: (userId) => IDS_FIXOS.has(userId) || idsExtras.has(userId),
  isDono: (userId) => IDS_FIXOS.has(userId),
  listar: () => [...IDS_FIXOS, ...idsExtras],
  adicionar: (userId) => {
    if (IDS_FIXOS.has(userId) || idsExtras.has(userId)) return false;
    idsExtras.add(userId);
    salvar();
    return true;
  },
  remover: (userId) => {
    if (IDS_FIXOS.has(userId)) return false; // dono/fixo nunca é removido por comando
    if (!idsExtras.has(userId)) return false;
    idsExtras.delete(userId);
    salvar();
    return true;
  },
};
