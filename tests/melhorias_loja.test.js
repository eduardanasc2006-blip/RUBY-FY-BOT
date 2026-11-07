// Regressão das melhorias da loja (MM2):
//  1. Baixa de estoque ATÔMICA na confirmação do /comprar — antes a baixa era
//     item por item e, se um item posterior estivesse sem estoque, os anteriores
//     já tinham sido baixados (vazamento de estoque) mesmo sem confirmar o pedido.
//  2. O painel público de estoque mostra a quantidade DISPONÍVEL (desconta as
//     reservas de pedidos pendentes), e não o total bruto.
//  3. !cliente existe (paridade com /cliente).
//
// Exercita os handlers reais de src/index.js (emitindo interactionCreate).

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || 'fake-token';
process.env.ADMIN_IDS = '';

const assert = require('node:assert');
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

const carrinhoStore = require('../src/utils/carrinhoStore');
const pedidoStore = require('../src/utils/pedidoStore');
const estoque = require('../src/utils/estoque');
const avisos = require('../src/utils/avisos');
const { publicoProdutos } = require('../src/utils/estoquePanel');

const GUILD = 'g-melhorias-loja';
const CLIENTE = '950000000000000001';
const ATENDENTE = '950000000000000003';
const CANAL = '750000000000000001';
const MSG_PAINEL = '650000000000000001';
const CANAL_AVISOS = '750000000000000009';

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

// ----- fakes -----
const avisosEnviados = [];
const canalAvisos = {
  id: CANAL_AVISOS,
  isTextBased: () => true,
  isSendable: () => true,
  send: async (payload) => { avisosEnviados.push(payload); return { id: 'aviso-1' }; },
};

const mensagens = new Map();
const canal = {
  id: CANAL,
  name: 'ticket-0001',
  isTextBased: () => true,
  isSendable: () => true,
  messages: { fetch: async (id) => { if (!mensagens.has(id)) throw new Error('Unknown Message'); return mensagens.get(id); } },
  send: async (payload) => { const m = { id: 'msg-nova', payload, edit: async () => {}, delete: async () => {} }; mensagens.set(m.id, m); return m; },
};
canal.client = client;

const colecaoCanais = {
  get: (id) => (id === canal.id ? canal : id === canalAvisos.id ? canalAvisos : null),
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canal],
  map: () => [],
  size: 2,
  forEach: () => {},
};
client.channels = { ...client.channels, fetch: async (id) => colecaoCanais.get(id) };

const membrosCache = new Map();
function fazerMembro(id, { admin = false } = {}) {
  const m = {
    id,
    user: { id, bot: false, username: `user-${id.slice(-1)}` },
    permissions: { has: () => admin, missing: () => [] },
    roles: { cache: new Map(), add: async () => {} },
    guild: null,
  };
  membrosCache.set(id, m);
  return m;
}
const membroCliente = fazerMembro(CLIENTE);
const membroAtendente = fazerMembro(ATENDENTE, { admin: true });

const guild = {
  id: GUILD,
  name: 'F.Y SERVER',
  channels: { cache: colecaoCanais },
  members: {
    me: { id: '1509146932478476389', permissions: { has: () => true } },
    cache: membrosCache,
    fetch: async (id) => membrosCache.get(id) || null,
  },
  roles: { cache: new Map(), fetch: async () => null },
};
membroCliente.guild = guild;
membroAtendente.guild = guild;
canal.guild = guild;

const botId = '1509146932478476389';
mensagens.set(MSG_PAINEL, {
  id: MSG_PAINEL,
  author: { id: botId, bot: true },
  channel: canal,
  edit: async () => {},
  delete: async () => {},
});

let ultimaResposta = null;
let ultimoEditReply = null;
let ultimoFollowUp = null;

function fazerInteracao(tipo, customId, { user = membroCliente, guildId = GUILD } = {}) {
  const interacao = {
    customId,
    user: user.user,
    member: user,
    guild,
    guildId,
    channel: canal,
    channelId: CANAL,
    message: { ...mensagens.get(MSG_PAINEL), author: { id: botId, bot: true } },
    values: [],
    fields: { getTextInputValue: () => '' },
    isButton: () => tipo === 'button',
    isModalSubmit: () => false,
    isAnySelectMenu: () => false,
    isStringSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChatInputCommand: () => false,
    isRepliable: () => true,
    client,
    deferred: false,
    replied: false,
    update: async () => {},
    reply: async (payload) => { ultimaResposta = payload; return payload; },
    followUp: async (payload) => { ultimoFollowUp = payload; return payload; },
    deferUpdate: async () => {},
    editReply: async (payload) => { ultimoEditReply = payload; return payload; },
    showModal: async () => {},
  };
  return interacao;
}

async function emitir(tipo, customId, opts) {
  ultimaResposta = null;
  ultimoEditReply = null;
  ultimoFollowUp = null;
  client.emit('interactionCreate', fazerInteracao(tipo, customId, opts));
  for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 5));
}

function cadastrar(catId, catNome, prodNome, valor, qtd) {
  if (!estoque.categoria(GUILD, catId)) estoque.addCategoria(GUILD, catNome);
  const prodId = prodNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  if (!estoque.produto(GUILD, catId, prodId)) {
    estoque.addProduto(GUILD, catId, { nome: prodNome, valor, controlarQtd: true, quantidade: qtd });
  } else {
    estoque.setQuantidade(GUILD, catId, prodId, qtd);
  }
  return prodId;
}

(async () => {
  carrinhoStore.limpar(GUILD, CLIENTE);
  pedidoStore.removerDaGuild(GUILD);
  cadastrar('blades', 'Blades', 'Ghostblade', 3, 5);
  cadastrar('blades', 'Blades', 'Icewing', 5, 5);

  // ===== 1. Baixa de estoque ATÔMICA =====
  // Carrinho: Ghostblade x2 + Icewing x2, ambos com estoque suficiente.
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: 'blades', prodId: 'ghostblade', nome: 'Ghostblade', quantidade: 2, valorUnitario: 3 });
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: 'blades', prodId: 'icewing', nome: 'Icewing', quantidade: 2, valorUnitario: 5 });
  const pedido = require('../src/utils/comprarPanel').finalizarCarrinho(GUILD, CLIENTE, 'cliente-teste');
  check('setup: pedido criado com os 2 itens', () => {
    assert.ok(pedido, 'pedido criado');
    assert.strictEqual(require('../src/utils/comprarPanel').itensDoPedido(pedido).length, 2, 'pedido tem 2 itens');
    assert.strictEqual(estoque.produto(GUILD, 'blades', 'ghostblade').quantidade, 5, 'Ghostblade intacto antes de confirmar');
  });

  // Agora o Icewing fica sem estoque (corrida entre finalizar e confirmar).
  estoque.setQuantidade(GUILD, 'blades', 'icewing', 1);
  await emitir('button', `comp:confirmar:${pedido.id}`, { user: membroAtendente });
  check('1. sem estoque em UM item nao baixa os demais (baixa atomica)', () => {
    assert.strictEqual(estoque.produto(GUILD, 'blades', 'ghostblade').quantidade, 5, 'Ghostblade NAO foi baixado');
    assert.strictEqual(estoque.produto(GUILD, 'blades', 'icewing').quantidade, 1, 'Icewing intacto');
    assert.strictEqual(pedidoStore.obter(GUILD, pedido.id).status, 'pendente', 'pedido segue pendente');
    assert.ok(/Estoque insuficiente/.test((ultimoEditReply && ultimoEditReply.content) || ''), 'avisou o atendente');
  });

  // Repõe o estoque e confirma de novo: agora baixa os dois e avisa o esgotado.
  estoque.setQuantidade(GUILD, 'blades', 'icewing', 2);
  avisos.definir(GUILD, CANAL_AVISOS);
  avisosEnviados.length = 0;
  await emitir('button', `comp:confirmar:${pedido.id}`, { user: membroAtendente });
  check('1b. com estoque, confirma e baixa todos os itens', () => {
    assert.strictEqual(pedidoStore.obter(GUILD, pedido.id).status, 'confirmado', 'pedido confirmado');
    assert.strictEqual(estoque.produto(GUILD, 'blades', 'ghostblade').quantidade, 3, 'Ghostblade baixado 5->3');
    assert.strictEqual(estoque.produto(GUILD, 'blades', 'icewing').quantidade, 0, 'Icewing baixado 2->0');
  });
  check('1c. avisa o canal de avisos quando um produto esgota na confirmacao', () => {
    const texto = avisosEnviados.map((p) => (typeof p === 'string' ? p : p.content || '')).join(' ');
    assert.ok(/Icewing/.test(texto) && /esgotou/.test(texto), `aviso de esgotado enviado (recebido: ${texto || 'nada'})`);
  });

  // ===== 2. Painel público mostra o DISPONÍVEL (desconta reservas) =====
  const G2 = GUILD + '-disp';
  if (!estoque.categoria(G2, 'cats')) estoque.addCategoria(G2, 'Cats');
  estoque.addProduto(G2, 'cats', { nome: 'Godly', valor: 10, controlarQtd: true, quantidade: 3 });
  const prod = estoque.categorias(G2)[0].produtos[0];
  check('2a. sem reservas, o painel mostra o estoque cheio', () => {
    const tela = publicoProdutos(G2, 'cats', 0);
    const desc = tela.embeds[0].data.description || '';
    assert.ok(/3 unidades/.test(desc), `mostra 3 unidades (desc: ${desc})`);
  });

  // Um pedido pendente reserva as 3 unidades.
  pedidoStore.criar(G2, { clienteId: CLIENTE, itens: [{ catId: 'cats', prodId: prod.id, nome: 'Godly', quantidade: 3, valorUnitario: 10 }], itemNome: 'Godly x3', quantidade: 3, valor: 30 });
  check('2b. com tudo reservado, o painel mostra Indisponível (nao "Disponível")', () => {
    const tela = publicoProdutos(G2, 'cats', 0);
    const desc = tela.embeds[0].data.description || '';
    assert.ok(/Indisponível/.test(desc), `mostra Indisponível (desc: ${desc})`);
    assert.ok(!/Disponível/.test(desc.replace('Indisponível', '')), 'nao mostra Disponível enganoso');
  });
  pedidoStore.removerDaGuild(G2);

  // ===== 3. !cliente (paridade com /cliente) =====
  const comprasStore = require('../src/utils/comprasStore');
  comprasStore.registrarVenda(GUILD, CLIENTE, 250, ['💎 Cliente VIP']);
  const cmdCliente = client.prefixCommands.get('cliente');
  check('3a. !cliente existe como prefixo', () => {
    assert.ok(cmdCliente, 'prefixCommand cliente registrado');
    assert.strictEqual(typeof cmdCliente.execute, 'function', 'tem execute');
  });
  check('3b. !cliente responde com o perfil do cliente', async () => {
    let resposta = null;
    const msg = {
      guild, guildId: GUILD, author: { id: CLIENTE },
      mentions: { users: { first: () => null } },
      reply: async (payload) => { resposta = payload; return payload; },
    };
    await cmdCliente.execute(msg, []);
    assert.ok(resposta && resposta.embeds && resposta.embeds.length === 1, 'respondeu com 1 embed');
    const desc = resposta.embeds[0].toJSON().description;
    assert.ok(desc.includes('Cliente VIP'), 'lista o cargo conquistado');
  });

  // ===== 4. Aviso de itens que saíram do carrinho ao finalizar =====
  const G4 = GUILD + '-aviso';
  if (!estoque.categoria(G4, 'blades')) estoque.addCategoria(G4, 'Blades');
  estoque.addProduto(G4, 'blades', { nome: 'Laser', valor: 4, controlarQtd: true, quantidade: 5 });
  estoque.addProduto(G4, 'blades', { nome: 'Chroma', valor: 8, controlarQtd: true, quantidade: 5 });
  const laser = estoque.categorias(G4)[0].produtos.find((p) => p.nome === 'Laser');
  const chroma = estoque.categorias(G4)[0].produtos.find((p) => p.nome === 'Chroma');
  carrinhoStore.limpar(G4, CLIENTE);
  carrinhoStore.adicionar(G4, CLIENTE, { catId: 'blades', prodId: laser.id, nome: 'Laser', quantidade: 1, valorUnitario: 4 });
  carrinhoStore.adicionar(G4, CLIENTE, { catId: 'blades', prodId: chroma.id, nome: 'Chroma', quantidade: 1, valorUnitario: 8 });
  // O Chroma esgota antes de finalizar: sai do pedido.
  estoque.setQuantidade(G4, 'blades', chroma.id, 0);
  carrinhoStore.setRef(G4, CLIENTE, CANAL, MSG_PAINEL);
  // Faz a interacao enxergar a guild G4 (mesmos fakes, so troca o id).
  const guildAntiga = guild.id;
  guild.id = G4;
  await emitir('button', 'comp:finalizar', { user: membroCliente, guildId: G4 });
  guild.id = guildAntiga;
  check('4. cliente e avisado dos itens que sairam do carrinho (falta de estoque)', () => {
    assert.ok(ultimoFollowUp, 'enviou um followUp');
    assert.ok(/Chroma/.test(ultimoFollowUp.content || ''), `cita o item removido (recebido: ${ultimoFollowUp && ultimoFollowUp.content})`);
    assert.ok(!/Laser/.test(ultimoFollowUp.content || ''), 'nao cita o item que entrou no pedido');
  });
  carrinhoStore.limpar(G4, CLIENTE);
  pedidoStore.removerDaGuild(G4);

  // ----- limpeza -----
  carrinhoStore.limpar(GUILD, CLIENTE);
  pedidoStore.removerDaGuild(GUILD);
  const fs = require('node:fs');
  const path = require('node:path');
  try { fs.rmSync(path.join(__dirname, '..', 'data', 'estoque'), { recursive: true, force: true }); } catch {}
  try { fs.rmSync(path.join(__dirname, '..', 'data', 'compras.json'), { force: true }); } catch {}
  try { fs.rmSync(path.join(__dirname, '..', 'data', 'pedidos.json'), { force: true }); } catch {}
  try { fs.rmSync(path.join(__dirname, '..', 'data', 'canal_avisos.json'), { force: true }); } catch {}

  const falhas = RESULTADOS.filter((r) => !r.ok);
  console.log(`\n===== RESULTADO: ${RESULTADOS.length - falhas.length}/${RESULTADOS.length} checks OK =====`);
  if (falhas.length) {
    falhas.forEach((f) => console.log('FALHA: ' + f.nome + ' -> ' + f.erro));
    process.exit(1);
  }
  console.log('testes de melhorias da loja OK');
  process.exit(0);
})();
