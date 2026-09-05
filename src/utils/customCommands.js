const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '..', 'data', 'comandos_custom');

// Arquivo antigo (formato global, anterior a escopagem por servidor). Comandos
// escritos ali antes do fix nao pertencem a nenhum servidor especifico. Fica so
// como lastro de compatibilidade (nao e lido pelos comandos novos).
const FILE_ANTIGO = path.join(__dirname, '..', '..', 'data', 'comandos_custom.json');

function arquivoDoGuild(guildId) {
  return path.join(DIR, `${guildId}.json`);
}

function carregar(guildId) {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivoDoGuild(guildId), 'utf8'));
    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

function salvar(guildId, comandos) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(arquivoDoGuild(guildId), JSON.stringify(comandos, null, 2));
}

// Comandos personalizados so existem dentro de um servidor (guildId. Em DM
// (ou guildId invalido) nao ha comandos: bug antigo deixava um arquivo global
// valer para todos os servidores alguna vez.

function chaveValida(guildId) {
  return typeof guildId === 'string' && guildId.length > 0;
}

const custom = {
  listar: (guildId) => {
    if (!chaveValida(guildId)) return {};
    return carregar(guildId);
  },
  obter: (guildId, nome) => {
    if (!chaveValida(guildId)) return null;
    const comandos = carregar(guildId);
    return comandos[nome.toLowerCase()] || null;
  },
  existe: (guildId, nome) => {
    if (!chaveValida(guildId)) return false;
    const comandos = carregar(guildId);
    return !!comandos[nome.toLowerCase()];
  },

  criar(guildId, nome, dados) {
    const key = nome.toLowerCase().trim();
    if (!chaveValida(guildId)) return null;
    const comandos = carregar(guildId);
    if (comandos[key]) return null;
    comandos[key] = {
      nome,
      descricao: dados.descricao || '',
      mensagem: dados.mensagem || '',
      embed: (dados.embed || null) && {
        titulo: (dados.embed?.titulo || '').trim() || null,
        descricao: (dados.embed?.descricao || '' ).trim() || null,
        cor: (dados.embed?.cor || '' ).trim() || null,
        imagem: (dados.embed?.imagem || '' ).trim() || null,
        fields: Array.isArray(dados.embed?.fields) ? dados.embed.fields : [],
      },
      ephemeral: !!dados.ephemeral,
      // itens: [{ nome, tipo: 'copiavel'|'link', valor }]
      copiaveis: (dados.copiaveis || []).map((c) => ({
        nome: c.nome,
        tipo: c.tipo === 'link' ? 'link' : 'copiavel',
        valor: c.valor,
      })),
    };
    salvar(guildId, comandos);
    return comandos[key];
  },

  editar(guildId, nome, dados) {
    const key = nome.toLowerCase().trim();
    if (!chaveValida(guildId)) return null;
    const comandos = carregar(guildId);
    if (!comandos[key]) return null;
    comandos[key] = { ...comandos[key], ...dados, nome: comandos[key].nome };
    salvar(guildId, comandos);
    return comandos[key];
  },

  excluir(guildId, nome) {
    const key = nome.toLowerCase().trim();
    if (!chaveValida(guildId)) return null;
    const comandos = carregar(guildId);
    if (!comandos[key]) return false;
    delete comandos[key];
    salvar(guildId, comandos);
    return true;
  },
};

module.exports = custom;
