// Regressão da remoção de lançamento manual de venda (!venda / /venda).
//
// Caso de uso: a equipe lançou uma venda a mais por engano (valor errado, venda
// duplicada) e precisa desfazer para o gasto do cliente não ficar incorreto.
//
// Exercita o handler real de src/index.js (customId `venda:`) e os helpers de
// src/utils/vendaPanel.js. Antes desta mudança a função comprasStore.removerLancamento
// existia mas NENHUM comando a usava (órfã).

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || 'fake-token';
process.env.ADMIN_IDS = '';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('discord.js');

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () {
  capturado = this;
  return 'local';
};
require('../src/index.js');
Client.prototype.login = loginOriginal;
if (!capturado) throw new Error('nao capturou o client');
const client = capturado;

const comprasStore = require('../src/utils/comprasStore');
const { painelRemoverLancamento, confirmarRemocaoLancamento } = require('../src/utils/vendaPanel');

const DATA = path.join(__dirname, '..', 'data');
const GUILD = 'g-venda-remover';
const CLIENTE = '960000000000000001';
const OUTRO = '960000000000000002';
const OPERADOR = '960000000000000003';
const CANAL = '760000000000000001';

const RESULTADOS = [];
function check(nome, fn) {
  try {
    fn();
    RESULTADOS.push({ nome, ok: true });
    console.log('[OK] ' + nome);
  } catch (e) {
    RESULTADOS.push({ nome, ok: false, erro: e?.message || String(e) });
    console.log('[FALHA] ' + nome + ' -> ' + (e?.message || e));
  }
}

function limpar() {
  const b = comprasStore.base(GUILD);
  b.pedidos = 0;
  b.gasto = 0;
  b.clientes = {};
  b.lancamentos = [];
}

// ----- fakes -----
const canal = { id: CANAL, isTextBased: () => true, isSendable: () => true, send: async () => ({ id: 'm' }) };
canal.client = client;

function fazerMembro(id, { admin = false } = {}) {
  return {
    id,
    user: { id, bot: false },
    permissions: { has: () => admin, missing: () => [] },
    roles: { cache: new Map(), add: async () => {} },
    guild: null,
  };
}
const membroAdmin = fazerMembro(OPERADOR, { admin: true });
const membroComum = fazerMembro(CLIENTE, { admin: false });

const guild = {
  id: GUILD,
  name: 'F.Y SERVER',
  channels: { cache: { get: () => canal } },
  members: { me: { id: '1', permissions: { has: () => true } }, cache: new Map(), fetch: async () => null },
  roles: { cache: new Map(), fetch: async () => null },
};
membroAdmin.guild = guild;
membroComum.guild = guild;
canal.guild = guild;

let ultimaResposta = null;
let ultimoUpdate = null;

function fazerInteracao(tipo, customId, { user = membroAdmin, values = [] } = {}) {
  return {
    customId,
    user: user.user,
    member: user,
    guild,
    guildId: GUILD,
    channel: canal,
    channelId: CANAL,
    message: { id: 'msg-1', author: { id: '1', bot: true } },
    values,
    isButton: () => tipo === 'button',
    isStringSelectMenu: () => tipo === 'select',
    isAnySelectMenu: () => tipo === 'select',
    isChannelSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isModalSubmit: () => false,
    isChatInputCommand: () => false,
    isRepliable: () => true,
    client,
    deferred: false,
    replied: false,
    update: async (payload) => { ultimoUpdate = payload; return payload; },
    reply: async (payload) => { ultimaResposta = payload; return payload; },
    followUp: async (payload) => { ultimaResposta = payload; return payload; },
    deferUpdate: async () => {},
    editReply: async (payload) => { ultimoUpdate = payload; return payload; },
    showModal: async () => {},
  };
}

async function emitir(tipo, customId, opts) {
  ultimaResposta = null;
  ultimoUpdate = null;
  client.emit('interactionCreate', fazerInteracao(tipo, customId, opts));
  for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 5));
}

(async () => {
  limpar();

  // ===== painel sem lançamentos =====
  const vazio = painelRemoverLancamento(GUILD, CLIENTE, 0);
  check('lista vazia: sem componentes e avisa que não há lançamento', () => {
    assert.strictEqual(vazio.components.length, 0, 'sem componentes');
    assert.ok(/Nenhum lançamento/i.test(vazio.embeds[0].data.description || ''), 'avisa que está vazio');
  });

  // ===== cria lançamentos =====
  comprasStore.registrarVendaManual(GUILD, CLIENTE, 25.5, { descricao: 'pix fora do ticket', registradoPor: OPERADOR });
  comprasStore.registrarVendaManual(GUILD, CLIENTE, 10, { quantidade: 3, registradoPor: OPERADOR });
  comprasStore.registrarVendaManual(GUILD, OUTRO, 99, { registradoPor: OPERADOR });

  check('lista mostra os lançamentos do cliente (e só dele)', () => {
    const p = painelRemoverLancamento(GUILD, CLIENTE, 0);
    const opcoes = p.components[0].components[0].options;
    assert.strictEqual(opcoes.length, 2, 'dois lançamentos do cliente');
    assert.strictEqual(comprasStore.listarLancamentos(GUILD, OUTRO).length, 1, 'outro cliente intacto');
  });

  // ===== paginação / voltar =====
  await emitir('button', `venda:pag:${CLIENTE}:0`);
  check('botão de paginação atualiza o painel (update)', () => {
    assert.ok(ultimoUpdate, 'chamou update');
    assert.ok(ultimoUpdate.embeds?.length, 'tem embed');
  });

  await emitir('button', `venda:listar:${CLIENTE}:0`);
  check('botão voltar reabre a lista', () => {
    assert.ok(ultimoUpdate, 'chamou update');
    assert.ok(ultimoUpdate.components?.[0]?.components?.[0]?.options?.length >= 1, 'tem o select');
  });

  // ===== selecionar -> confirmação =====
  const alvo = comprasStore.listarLancamentos(GUILD, CLIENTE).find((l) => l.valor === 25.5);
  await emitir('select', `venda:remover:${CLIENTE}:0`, { values: [alvo.id] });
  check('selecionar um lançamento pede confirmação (não remove ainda)', () => {
    assert.ok(/Confirma remover/i.test(ultimoUpdate.embeds[0].data.description || ''), 'pede confirmação');
    assert.strictEqual(comprasStore.listarLancamentos(GUILD, CLIENTE).length, 2, 'nada removido ainda');
  });

  // ===== confirmar remoção =====
  await emitir('button', `venda:confrem:${CLIENTE}:${alvo.id}`);
  check('confirmar remove o lançamento e corrige o gasto', () => {
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.strictEqual(d.gasto, 10, 'gasto caiu de 35,5 para 10');
    assert.strictEqual(d.vendas, 3, 'vendas caíram de 4 para 3');
    assert.strictEqual(comprasStore.listarLancamentos(GUILD, CLIENTE).length, 1, 'sobrou 1 lançamento');
    assert.ok(/removido/i.test(ultimoUpdate.embeds[0].data.title || ''), 'confirma a remoção');
  });
  check('remover um lançamento não mexe no gasto de outro cliente', () => {
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, OUTRO).gasto, 99, 'outro cliente intacto');
  });

  // ===== confirmar lançamento inexistente (idempotência) =====
  await emitir('button', `venda:confrem:${CLIENTE}:9999`);
  check('confirmar um lançamento já removido não quebra e avisa', () => {
    assert.ok(ultimoUpdate, 'respondeu');
    assert.ok(/não encontrado|nao encontrado/i.test(JSON.stringify(ultimoUpdate)), 'avisa que não encontrou');
  });

  // ===== permissão: usuário comum não pode remover =====
  await emitir('button', `venda:listar:${CLIENTE}:0`, { user: membroComum });
  check('usuário sem permissão é bloqueado', () => {
    assert.ok(ultimaResposta, 'respondeu');
    assert.ok(/🔒/.test(ultimaResposta.content || ''), 'mensagem de bloqueio');
  });

  // ===== o próprio removerLancamento devolve o valor =====
  check('removerLancamento devolve o lançamento removido', () => {
    const restante = comprasStore.listarLancamentos(GUILD, CLIENTE)[0];
    const r = comprasStore.removerLancamento(GUILD, restante.id);
    assert.ok(r && r.id === restante.id, 'devolveu o lançamento');
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto, 0, 'gasto zerado');
  });

  // ----- limpeza -----
  limpar();
  try { fs.rmSync(path.join(DATA, 'estoque', `${GUILD}.json`), { force: true }); } catch {}

  const falhas = RESULTADOS.filter((r) => !r.ok);
  console.log(`\n===== RESULTADO: ${RESULTADOS.length - falhas.length}/${RESULTADOS.length} checks OK =====`);
  if (falhas.length) {
    falhas.forEach((f) => console.log('FALHA: ' + f.nome + ' -> ' + f.erro));
    process.exit(1);
  }
  console.log('testes de remoção de venda manual OK');
})();
