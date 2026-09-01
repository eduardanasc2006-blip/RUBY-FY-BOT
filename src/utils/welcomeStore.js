const fs = require(`node:fs`);
const path = require(`node:path`);

// ---- Configuração de boas-vindas por servidor ----
// Arquivo: data/welcome.json  Estrutura: { [guildId]: { ativo, canalId, tipo, mensagem, embed } }
// `tipo`: `mensagem` | `embed`. `embed` é o estado próprio do editor de boas-vindas
// (NÃO reusa o shape do editor de embed comum — campos todos opcionais).

const FILE = path.join(__dirname, `..`, `..`, `data`, `welcome.json`);

const TIPOS_VALIDOS = [`mensagem`, `embed`];

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(FILE, `utf8`));
  } catch {
    return {};
  }
}

function salvar(dados) {
  fs.mkdirSync(path.dirname(FILE, { recursive: true }));
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

// Migra uma config antiga salva pelo editor de embed comum (shape embedPainel)
function migrarAntiga(antiga) {
  if (!antiga || typeof antiga !== `object`) return null;
  if (typeof antiga.tipo === `string` && TIPOS_VALIDOS.includes(antiga.tipo)) return antiga;

  const embedAntigo = antiga.embed;
  const temEmbed = !!embedAntigo && (embedAntigo.titulo || embedAntigo.descricao || embedAntigo.autor || embedAntigo.rodape || embedAntigo.imagem || embedAntigo.thumbnail || (Array.isArray(embedAntigo.fields) && embedAntigo.fields.length));
  const mensagemAntiga = typeof antiga.mensagem === `string` ? antiga.mensagem : (typeof antiga.content === `string` ? antiga.content : ``);

  return {
    ativo: antiga.ativo !== false,
    canalId: antiga.canalId || null,
    tipo: temEmbed ? `embed` : (mensagemAntiga ? `mensagem` : `embed`),
    mensagem: mensagemAntiga,
    embed: {
      titulo: embedAntigo?.titulo || null,
      descricao: embedAntigo?.descricao || null,
      cor: embedAntigo?.cor || null,
      imagem: embedAntigo?.imagem || null,
      thumbnail: embedAntigo?.thumbnail || null,
      rodape: embedAntigo?.rodape || null,
      timestamp: false,
      fields: Array.isArray(embedAntigo?.fields) ? embedAntigo.fields.filter((f) => f && f.name && f.value).map((f) => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline })).slice(0, 25) : [],
    },
  };
}

function obter(guildId) {
  if (!guildId) return null;
  const conf = migrarAntiga(carregar()[guildId]);
  if (!conf) return null;
  return conf;
}

// Persiste uma config:) mantém a migração para idempotência).
function salvar(guildId, conf) {
  if (!guildId) return;
  const dados = carregar();
  dados[guildId] = migrarAntiga({ ...conf });
  salvar(dados);
}

function remover(guildId) {
  const dados = carregar();
  delete dados[guildId];
  salvar(dados);
}

function padrao(canalId = null) {
  return {
    ativo: false,
    canalId: canalId || null,
    tipo: `mensagem`,
    mensagem: `☁️ Seja bem-vinda, <@user>!\nVocê acaba de entrar no <@server>.\nAgora somos <member_count> membros! 💜`,
    embed: { titulo: null, descricao: null, cor: null, imagem: null, thumbnail: null, rodape: null, timestamp: false, fields: [] },
  };
}

module.exports = { obter, salvar, remover, padrao, TIPOS_VALIDOS };