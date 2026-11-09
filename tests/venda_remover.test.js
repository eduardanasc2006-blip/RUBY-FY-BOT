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
const { buildClientesPainel } = require('../src/utils/clientesPanel');

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
    assert.ok(/Remover lançamento/i.test(ultimoUpdate.embeds[0].data.title || ''), 'pede confirmação');
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

  // ===== remoção PARCIAL (só 1 venda de um lançamento com várias) =====
  limpar();
  // "2 vendas de 1,90" -> valor total 3,80, quantidade 2.
  const multi = comprasStore.registrarVendaManual(GUILD, CLIENTE, 3.8, { quantidade: 2, registradoPor: OPERADOR });
  check('lançamento com várias vendas guarda valor total e quantidade', () => {
    assert.strictEqual(multi.valor, 3.8, 'valor total');
    assert.strictEqual(multi.quantidade, 2, 'quantidade');
  });

  const confMulti = confirmarRemocaoLancamento(GUILD, CLIENTE, multi.id);
  check('confirmação de lançamento com várias vendas oferece remover só 1 ou tudo', () => {
    const ids = confMulti.components[0].components.map((c) => c.data.custom_id);
    assert.ok(ids.some((i) => i.startsWith('venda:confum:')), 'tem botão remover 1 venda');
    assert.ok(ids.some((i) => i.startsWith('venda:confrem:')), 'tem botão remover tudo');
  });

  await emitir('button', `venda:confum:${CLIENTE}:${multi.id}`);
  check('remover 1 venda corrige o gasto e mantém o lançamento', () => {
    const d = comprasStore.dadosDoCliente(GUILD, CLIENTE);
    assert.strictEqual(d.vendas, 1, 'caiu de 2 para 1 venda');
    assert.strictEqual(d.gasto, 1.9, 'gasto caiu para 1,90');
    const l = comprasStore.listarLancamentos(GUILD, CLIENTE)[0];
    assert.ok(l, 'lançamento continua existindo');
    assert.strictEqual(l.quantidade, 1, 'sobrou 1 venda');
    assert.strictEqual(l.valor, 1.9, 'valor restante 1,90');
  });
  check('aviso informa quanto restou no lançamento', () => {
    assert.ok(/restam/i.test(ultimoUpdate.embeds[0].data.description || ''), 'menciona o restante');
  });

  // Remover a última venda restante apaga o lançamento inteiro.
  await emitir('button', `venda:confum:${CLIENTE}:${multi.id}`);
  check('remover a última venda restante apaga o lançamento', () => {
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto, 0, 'gasto zerado');
    assert.strictEqual(comprasStore.listarLancamentos(GUILD, CLIENTE).length, 0, 'lançamento removido');
  });

  // ===== painel admin de clientes =====
  limpar();
  comprasStore.registrarVendaManual(GUILD, CLIENTE, 50, { registradoPor: OPERADOR });
  comprasStore.registrarVendaManual(GUILD, OUTRO, 120, { quantidade: 3, registradoPor: OPERADOR });
  const listaClientes = comprasStore.listarClientes(GUILD);
  check('listarClientes devolve os clientes com compras, do maior gasto ao menor', () => {
    assert.strictEqual(listaClientes.length, 2, 'dois clientes');
    assert.strictEqual(listaClientes[0].clienteId, OUTRO, 'quem mais gastou vem primeiro');
    assert.strictEqual(listaClientes[0].gasto, 120, 'gasto do primeiro');
    assert.strictEqual(listaClientes[1].clienteId, CLIENTE, 'segundo');
  });
  check('listarClientes ignora quem nunca comprou', () => {
    comprasStore.cliente(GUILD, '970000000000000009'); // cria registro zerado
    const lista = comprasStore.listarClientes(GUILD);
    assert.ok(!lista.some((c) => c.clienteId === '970000000000000009'), 'zerado fora da lista');
  });

  const painelClientes = buildClientesPainel(GUILD, 0);
  check('painel de clientes mostra os números no embed', () => {
    const desc = painelClientes.embeds[0].data.description || '';
    assert.ok(desc.includes(`<@${OUTRO}>`), 'lista o cliente que gastou mais');
    const campos = painelClientes.embeds[0].data.fields.map((f) => f.value).join(' ');
    assert.ok(/170,00/.test(campos), 'mostra o total gasto (50 + 120)');
    assert.ok(/4/.test(campos), 'mostra o total de vendas (1 + 3)');
  });

  await emitir('button', `clientes:pag:0`, { user: membroAdmin });
  check('paginação do painel de clientes responde (update)', () => {
    assert.ok(ultimoUpdate, 'chamou update');
    assert.ok(ultimoUpdate.embeds?.length, 'tem embed');
  });
  await emitir('button', `clientes:pag:0`, { user: membroComum });
  check('usuário comum não abre o painel de clientes', () => {
    assert.ok(/🔒/.test(ultimaResposta?.content || ''), 'bloqueado');
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
