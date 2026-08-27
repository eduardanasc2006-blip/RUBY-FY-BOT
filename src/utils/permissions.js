const fs = require('node:fs');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');

const FILE = path.join(__dirname, '..', '..', 'data', 'permissoes.json');

// Grupos de comandos que podem ser concedidos a cargos.
// Cada grupo lista os comandos/áreas que ele libera (para o painel).
const GRUPOS = [
  {
    id: 'estoque',
    nome: '📦 Estoque',
    descricao: 'Gerenciar produtos, categorias, quantidades e vender.',
    comandos: ['configestoque', 'painelestoque', 'painelcategoria', 'estoque'],
  },
  {
    id: 'taxas',
    nome: '💱 Taxas',
    descricao: 'Alterar taxas de conversão e o painel de conversão.',
    comandos: ['settaxa', 'configtaxa', 'tabela', 'taxa'],
  },
  {
    id: 'paineis',
    nome: '📊 Painéis',
    descricao: 'Publicar/atualizar os painéis fixos e criar categorias.',
    comandos: ['painel', 'tabela', 'painelestoque', 'painelcategoria'],
  },
  {
    id: 'embed',
    nome: '✨ Embed',
    descricao: 'Criar e publicar embeds e mensagens.',
    comandos: ['embed'],
  },
  {
    id: 'moderacao',
    nome: '🛡️ Moderação',
    descricao: 'Apagar mensagens e gerenciar canais.',
    comandos: ['limpar', 'canalavisos'],
  },
  {
    id: 'cargos',
    nome: '🎭 Cargos',
    descricao: 'Dar cargos a membros.',
    comandos: ['rolegive'],
  },
  {
    id: 'custom',
    nome: '🧩 Comandos personalizados',
    descricao: 'Criar, editar e excluir comandos personalizados.',
    comandos: ['criarcomando', 'gerenciarcomandos'],
  },
  {
    id: 'backup',
    nome: '☁️ Backup',
    descricao: 'Gerar e baixar backups das taxas e estoque.',
    comandos: ['backup'],
  },
];

let dados = { grupos: {} };
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  // Primeira execução: sem permissões customizadas.
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

// Um usuário é dono se estiver em ADMIN_IDS (env).
function eDono(userId) {
  const ids = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

// Cargos que têm acesso a um grupo (lista de IDs).
function cargosDoGrupo(grupoId) {
  if (!grupoId) return [];
  return dados.grupos[grupoId] || [];
}

// Concede/remove um cargo de um grupo. Retorna { ok, msg }.
function setCargo(grupoId, roleId, conceder) {
  const grupo = GRUPOS.find((g) => g.id === grupoId);
  if (!grupo) return { ok: false, msg: 'Grupo não encontrado.' };
  if (!dados.grupos[grupoId]) dados.grupos[grupoId] = [];
  const lista = dados.grupos[grupoId];
  const i = lista.indexOf(roleId);
  if (conceder) {
    if (i === -1) lista.push(roleId);
  } else {
    if (i !== -1) lista.splice(i, 1);
  }
  salvar();
  return { ok: true, msg: conceder ? 'concedido' : 'removido' };
}

// Verifica permissão: owner (ADMIN_IDS) ou Administrator sempre passam.
// Em DM (member null) e fora de servidor, apenas owner passa.
function pode(member, userId, grupoId) {
  if (!grupoId) return true;
  // Dono/configurado no .env sempre pode
  if (eDono(userId)) return true;
  if (!member) return false;

  // Administrador do servidor pode tudo
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;

  const cargos = cargosDoGrupo(grupoId);
  if (!cargos.length) return false;
  return member.roles?.cache?.some((r) => cargos.includes(r.id)) ?? false;
}

// Verifica por comando (mapeia comando → grupo).
function comandoPode(member, userId, nomeComando) {
  const grupo = GRUPOS.find((g) => g.comandos.includes(nomeComando));
  if (!grupo) return true; // comando sem grupo: sem restrição extra
  return pode(member, userId, grupo.id);
}

function mapearComandoParaGrupo(nomeComando) {
  const grupo = GRUPOS.find((g) => g.comandos.includes(nomeComando));
  return grupo ? grupo.id : null;
}

module.exports = {
  GRUPOS,
  eDono,
  pode,
  comandoPode,
  mapearComandoParaGrupo,
  cargosDoGrupo,
  setCargo,
};