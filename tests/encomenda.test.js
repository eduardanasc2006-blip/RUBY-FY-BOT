// Melhorias do carrinho (aumentar/diminuir/remover) e fluxo de encomendas.
// Exercita os handlers reais de src/index.js (listener `enc:` + `comp:`),
// com o login do discord.js bloqueado, como em tests/comprar_publico.test.js.

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || 'fake-token';
process.env.ADMIN_IDS = '';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Client, MessageFlags, Collection } = require('discord.js');

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
const comprasStore = require('../src/utils/comprasStore');
const logComprasStore = require('../src/utils/logComprasStore');
const encomendaStore = require('../src/utils/encomendaStore');
const estoque = require('../src/utils/estoque');
const { setCargo } = require('../src/utils/permissions');

const CARGO_VENDAS = 'cargo-vendas';

const GUILD = 'g-encomenda';
const OUTRA_GUILD = 'g-encomenda-b';
const CLIENTE = '910000000000000001';
const OUTRO = '910000000000000002';
const ATENDENTE = '910000000000000003';
const CANAL = '710000000000000001';
const MSG_PAINEL = '610000000000000001';
const MSG_ENC = '610000000000000002';

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
const logsEnviados = [];
const canalLogs = {
  id: '710000000000000009',
  isTextBased: () => true,
  isSendable: () => true,
  send: async (payload) => { logsEnviados.push(payload); return { id: 'log-1' }; },
};
client.channels = {
  ...client.channels,
  fetch: async (id) => (String(id) === canalLogs.id ? canalLogs : null),
};

function membroCom(cargos, admin = false) {
  return {
    id: 'm',
    guild: { id: GUILD },
    permissions: { has: () => admin },
    roles: { cache: new Collection((cargos || []).map((r) => [r, { id: r }])) },
  };
}
const membroCliente = membroCom([]);
const membroAtendente = membroCom([CARGO_VENDAS]);
const membroAdmin = membroCom([], true);

let ultimaResposta = null;
let ultimoUpdate = null;
let ultimoEditReply = null;
let deferiu = false;
let mostrarModal = null;

function fakeInteraction({ tipo = 'button', customId, user, values, messageId = MSG_PAINEL, fields = {} }) {
  const resposta = {
    content: null, embeds: [], components: [], flags: null, fetchReply: false,
    id: messageId, channelId: CANAL, guildId: GUILD,
  };
  const it = {
    customId,
    user: { id: user.id, globalName: 'Cliente', username: 'cliente' },
    member: user.member,
    guild: { id: GUILD, members: { cache: new Map() } },
    guildId: GUILD,
    channelId: CANAL,
    channel: { id: CANAL },
    client,
    message: { id: messageId },
    values,
    fields: { getTextInputValue: (k) => fields[k] },
    isButton: () => tipo === 'button',
    isStringSelectMenu: () => tipo === 'select',
    isModalSubmit: () => tipo === 'modal',
    isAnySelectMenu: () => tipo === 'select',
    isRoleSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,
    isRepliable: () => true,
    deferred: false,
    replied: false,
    async reply(payload) {
      this.replied = true;
      ultimaResposta = payload;
      Object.assign(resposta, payload, { id: messageId });
      return Object.assign(resposta, payload);
    },
    async update(payload) {
      ultimoUpdate = payload;
      return resposta;
    },
    async editReply(payload) {
      ultimoEditReply = payload;
      return resposta;
    },
    async followUp(payload) {
      ultimaResposta = payload;
      return resposta;
    },
    async deferReply() { deferiu = true; this.deferred = true; },
    async showModal(modal) { mostrarModal = modal; return { id: 'modal-1' }; },
  };
  return it;
}

async function emitir(tipo, customId, extras = {}) {
  ultimaResposta = null;
  ultimoUpdate = null;
  deferiu = false;
  mostrarModal = null;
  const it = fakeInteraction({ tipo, customId, ...extras });
  await client.emit('interactionCreate', it);
  return it;
}

const userCliente = { id: CLIENTE, member: membroCliente };
const userOutro = { id: OUTRO, member: membroCom([]) };
const userAtendente = { id: ATENDENTE, member: membroAtendente };
const userAdmin = { id: ATENDENTE, member: membroAdmin };

function limpar() {
  carrinhoStore.limpar(GUILD, CLIENTE);
  pedidoStore.removerDaGuild(GUILD);
  pedidoStore.removerDaGuild(OUTRA_GUILD);
  pedidoComprasLimpar();
  logComprasStore.desativar(GUILD);
  encomendaStore.removerDaGuild(GUILD);
  encomendaStore.removerDaGuild(OUTRA_GUILD);
  for (const g of [GUILD, OUTRA_GUILD]) {
    try { fs.rmSync(path.join(__dirname, '..', 'data', 'estoque', `${g}.json`), { force: true }); } catch {}
  }
}
function pedidoComprasLimpar() {
  try { require('../src/utils/pedidoComprasStore').limpar(GUILD); } catch {}
}

// ----- estoque de apoio -----
function semearEstoque(guildId = GUILD) {
  estoque.addCategoria(guildId, 'Doces');
  const cat = estoque.categorias(guildId)[0];
  estoque.addProduto(guildId, cat.id, { nome: 'Cookieblade', valor: 3, controlarQtd: true, quantidade: 3 });
  estoque.addProduto(guildId, cat.id, { nome: 'Saw', valor: 3, controlarQtd: true, quantidade: 10 });
  return { catId: cat.id };
}

(async () => {
  // A equipe autorizada e quem tem cargo no grupo `vendas` (mesmo mecanismo do
  // /comprar): setCargo escreve em data/permissoes.json, como o /permissoes faz.
  const permFile = path.join(__dirname, '..', 'data', 'permissoes.json');
  let permBackup = null;
  try { permBackup = fs.readFileSync(permFile, 'utf8'); } catch {}
  setCargo(GUILD, 'vendas', CARGO_VENDAS, true);

  limpar();
  const { catId } = semearEstoque();
  const CAT = catId;
  const PROD = 'cookieblade';
  const PROD2 = 'saw';

  // ===================== CARRINHO =====================

  carrinhoStore.limpar(GUILD, CLIENTE);
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: CAT, prodId: PROD, nome: 'Cookieblade', quantidade: 1, valorUnitario: 3 });

  check('CARRINHO 1: adicionar item e total recalculado', () => {
    const itens = carrinhoStore.listar(GUILD, CLIENTE);
    assert.strictEqual(itens.length, 1, 'um item');
    assert.strictEqual(itens[0].quantidade, 1, 'quantidade 1');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 3, 'total 3');
  });

  check('CARRINHO 2: aumentar quantidade (+1) e total atualiza', () => {
    const r = carrinhoStore.alterarQuantidade(GUILD, CLIENTE, CAT, PROD, 1);
    assert.ok(r.ok, 'alterou');
    assert.strictEqual(r.item.quantidade, 2, 'agora 2');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 6, 'total 6');
  });

  check('CARRINHO 3: diminuir quantidade (-1) e total atualiza', () => {
    const r = carrinhoStore.alterarQuantidade(GUILD, CLIENTE, CAT, PROD, -1);
    assert.ok(r.ok, 'alterou');
    assert.strictEqual(r.item.quantidade, 1, 'voltou para 1');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 3, 'total 3');
  });

  check('CARRINHO 4: nao permite diminuir abaixo de 1 (nunca 0)', () => {
    const r = carrinhoStore.alterarQuantidade(GUILD, CLIENTE, CAT, PROD, -1);
    assert.strictEqual(r.ok, false, 'bloqueou');
    assert.strictEqual(r.motivo, 'minimo', 'motivo minimo');
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE)[0].quantidade, 1, 'segue 1');
  });

  check('CARRINHO 5: remover produto inteiro usa remover()', () => {
    carrinhoStore.remover(GUILD, CLIENTE, CAT, PROD);
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).length, 0, 'carrinho vazio');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 0, 'total 0');
  });

  check('CARRINHO 6: alterar quantidade de item ausente nao cria item', () => {
    const r = carrinhoStore.alterarQuantidade(GUILD, CLIENTE, CAT, PROD, 1);
    assert.strictEqual(r.ok, false, 'nao alterou');
    assert.strictEqual(r.motivo, 'ausente', 'motivo ausente');
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).length, 0, 'nada criado');
  });

  // ----- fluxo real pelos handlers -----
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: CAT, prodId: PROD, nome: 'Cookieblade', quantidade: 1, valorUnitario: 3 });
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: CAT, prodId: PROD2, nome: 'Saw', quantidade: 1, valorUnitario: 3 });
  carrinhoStore.setRef(GUILD, CLIENTE, CANAL, MSG_PAINEL);

  await emitir('select', 'comp:iteditar', { user: userCliente, values: [`${CAT}:${PROD}`] });
  check('CARRINHO 7: select abre a tela de acoes do item', () => {
    assert.ok(ultimoUpdate, 'editou');
    const ids = (ultimoUpdate.components || []).flatMap((r) => r.components.map((c) => c.data.custom_id));
    assert.ok(ids.includes(`comp:qmais:${CAT}:${PROD}`), 'botao aumentar');
    assert.ok(ids.includes(`comp:qmenos:${CAT}:${PROD}`), 'botao diminuir');
    assert.ok(ids.includes(`comp:qrem:${CAT}:${PROD}`), 'botao remover');
    assert.ok((ultimoUpdate.components || []).length <= 5, 'respeita 5 ActionRows');
  });

  await emitir('button', `comp:qmais:${CAT}:${PROD}`, { user: userCliente, messageId: MSG_PAINEL });
  check('CARRINHO 8: botao aumentar (+1) pelo handler', () => {
    const item = carrinhoStore.listar(GUILD, CLIENTE).find((i) => i.prodId === PROD);
    assert.strictEqual(item.quantidade, 2, 'foi para 2');
  });

  await emitir('button', `comp:qmenos:${CAT}:${PROD}`, { user: userCliente, messageId: MSG_PAINEL });
  check('CARRINHO 9: botao diminuir (-1) pelo handler', () => {
    const item = carrinhoStore.listar(GUILD, CLIENTE).find((i) => i.prodId === PROD);
    assert.strictEqual(item.quantidade, 1, 'voltou para 1');
  });

  await emitir('button', `comp:qmenos:${CAT}:${PROD}`, { user: userCliente, messageId: MSG_PAINEL });
  check('CARRINHO 10: diminuir no minimo avisa sem zerar', () => {
    const item = carrinhoStore.listar(GUILD, CLIENTE).find((i) => i.prodId === PROD);
    assert.strictEqual(item.quantidade, 1, 'segue 1');
    const texto = JSON.stringify(ultimoUpdate || {});
    assert.ok(/mínima é 1|Remover produto/.test(texto), 'avisa o cliente');
  });

  // ----- estoque: nao permitir passar do disponivel -----
  // Cookieblade tem 3. Coloca 3 no carrinho e tenta +1.
  carrinhoStore.limpar(GUILD, CLIENTE);
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: CAT, prodId: PROD, nome: 'Cookieblade', quantidade: 3, valorUnitario: 3 });
  await emitir('button', `comp:qmais:${CAT}:${PROD}`, { user: userCliente, messageId: MSG_PAINEL });
  check('CARRINHO 11: nao aumenta acima do estoque disponivel', () => {
    const item = carrinhoStore.listar(GUILD, CLIENTE).find((i) => i.prodId === PROD);
    assert.strictEqual(item.quantidade, 3, 'segue 3 (estoque 3)');
    const texto = JSON.stringify(ultimoUpdate || {});
    assert.ok(/Estoque insuficiente/.test(texto), 'avisa estoque insuficiente');
  });

  check('CARRINHO 12: alterar quantidade NAO reserva estoque', () => {
    assert.strictEqual(pedidoStore.reservado(GUILD, CAT, PROD), 0, 'nada reservado');
    assert.strictEqual(estoque.produto(GUILD, CAT, PROD).quantidade, 3, 'estoque intacto');
  });

  // ----- dono do carrinho -----
  await emitir('button', `comp:qmais:${CAT}:${PROD}`, { user: userOutro, messageId: MSG_PAINEL });
  check('CARRINHO 13: outro usuario nao altera o carrinho', () => {
    assert.ok(/pertence a outro usuário/.test(ultimaResposta?.content || ''), 'bloqueado');
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).find((i) => i.prodId === PROD).quantidade, 3, 'intacto');
  });

  await emitir('select', 'comp:iteditar', { user: userOutro, values: [`${CAT}:${PROD}`], messageId: MSG_PAINEL });
  check('CARRINHO 14: outro usuario nao abre a tela de acoes do carrinho alheio', () => {
    assert.ok(/pertence a outro usuário/.test(ultimaResposta?.content || ''), 'bloqueado');
  });

  check('CARRINHO 15: carrinho isolado por guildId', () => {
    assert.strictEqual(carrinhoStore.listar(OUTRA_GUILD, CLIENTE).length, 0, 'outra guild vazia');
  });

  // ===================== ENCOMENDA =====================

  encomendaStore.removerDaGuild(GUILD);

  check('ENC 1: calculo 50/50 em centavos (13,50 -> 6,75 + 6,75)', () => {
    const c = encomendaStore.calcularEntrada(13.5);
    assert.strictEqual(c.total, 13.5, 'total');
    assert.strictEqual(c.entrada, 6.75, 'entrada');
    assert.strictEqual(c.restante, 6.75, 'restante');
  });

  check('ENC 2: centavos somam sempre o total (sem erro de float)', () => {
    for (const v of [9.99, 3.33, 10.15, 0.01, 0.03, 77.77]) {
      const c = encomendaStore.calcularEntrada(v);
      assert.strictEqual(
        Math.round((c.entrada + c.restante) * 100),
        Math.round(v * 100),
        `entrada+restante != total em ${v}`
      );
    }
  });

  let encId = null;
  check('ENC 3: criar encomenda gera id, 50/50 e status aguardando', () => {
    const enc = encomendaStore.criar(GUILD, {
      clienteId: CLIENTE, clienteTag: 'Cliente', catId: CAT, prodId: PROD,
      itemNome: 'Cookieblade', quantidade: 1, valorUnitario: 13.5,
    });
    encId = enc.id;
    assert.ok(enc.id, 'tem id');
    assert.strictEqual(enc.valor, 13.5, 'valor');
    assert.strictEqual(enc.entrada, 6.75, 'entrada');
    assert.strictEqual(enc.restante, 6.75, 'restante');
    assert.strictEqual(enc.status, 'aguardando', 'status inicial');
    assert.ok(enc.prazoEm > enc.criadoEm, 'prazo definido');
  });

  check('ENC 4: encomenda NAO reserva nem baixa estoque', () => {
    assert.strictEqual(pedidoStore.reservado(GUILD, CAT, PROD), 0, 'nada reservado');
    assert.strictEqual(estoque.produto(GUILD, CAT, PROD).quantidade, 3, 'estoque intacto');
  });

  check('ENC 5: encomenda NAO entra como venda normal', () => {
    const gastoAntes = comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto;
    assert.strictEqual(gastoAntes, 0, 'nenhuma venda registrada');
  });

  check('ENC 6: IDs sao sequenciais e isolados por guild', () => {
    const outra = encomendaStore.criar(OUTRA_GUILD, {
      clienteId: OUTRO, catId: CAT, prodId: PROD, itemNome: 'X', quantidade: 1, valorUnitario: 5,
    });
    assert.strictEqual(outra.id, '1', 'primeira da outra guild e #1');
    assert.strictEqual(encomendaStore.lista(GUILD).length, 1, 'guild original com 1');
    encomendaStore.removerDaGuild(OUTRA_GUILD);
  });

  const clienteBloqueado = [];
  check('ENC 7: cliente nao pode executar NENHUMA acao de equipe', () => {
    // Cobre as 4 acoes de equipe (iniciar/recebido/entregar/cancelar) para um
    // cliente sem permissao, em encomendas com o status exigido por cada uma.
    const casos = [
      { acao: 'iniciar', status: 'aguardando' },
      { acao: 'recebido', status: 'em_andamento' },
      { acao: 'entregar', status: 'item_recebido' },
      { acao: 'cancelar', status: 'aguardando' },
    ];
    for (const c of casos) {
      const e = encomendaStore.criar(GUILD, {
        clienteId: CLIENTE, catId: CAT, prodId: PROD2, itemNome: 'Saw', quantidade: 1, valorUnitario: 3,
      });
      encomendaStore.atualizar(GUILD, e.id, { status: c.status });
      clienteBloqueado.push({ id: e.id, acao: c.acao, status: c.status });
    }
  });

  // Executa os bloqueios de cliente (precisa de await, fora do check sincrono).
  for (const caso of clienteBloqueado) {
    await emitir('button', `enc:${caso.acao}:${caso.id}`, { user: userCliente, messageId: MSG_ENC });
    const alvo = `${caso.acao} (status ${caso.status})`;
    check(`ENC 7b: cliente bloqueado em ${alvo}`, () => {
      assert.ok(/equipe autorizada/.test(ultimaResposta?.content || ''), `bloqueado em ${alvo}`);
      assert.strictEqual(
        encomendaStore.obter(GUILD, caso.id).status,
        caso.status,
        `status intacto em ${alvo}`
      );
    });
  }

  // ----- via handler: acoes da equipe -----
  encomendaStore.registrarMensagem(GUILD, encId, CANAL, MSG_ENC);

  await emitir('button', `enc:iniciar:${encId}`, { user: userCliente, messageId: MSG_ENC });
  check('ENC 8: cliente NAO inicia a encomenda', () => {
    assert.ok(/equipe autorizada/.test(ultimaResposta?.content || ''), 'bloqueado por permissao');
    assert.strictEqual(encomendaStore.obter(GUILD, encId).status, 'aguardando', 'segue aguardando');
  });

  await emitir('button', `enc:iniciar:${encId}`, { user: userAtendente, messageId: MSG_ENC });
  check('ENC 9: atendente inicia -> em_andamento (sem marcar pagamento)', () => {
    const enc = encomendaStore.obter(GUILD, encId);
    assert.strictEqual(enc.status, 'em_andamento', 'em andamento');
    assert.strictEqual(enc.iniciadoPor, ATENDENTE, 'registrou quem iniciou');
    assert.ok(enc.iniciadoEm, 'registrou data');
    // Iniciar e apenas operacional: NAO significa entrada paga.
    assert.strictEqual(enc.pagamento.entradaPagaEm, null, 'entrada segue NAO paga');
  });

  await emitir('button', `enc:recebido:${encId}`, { user: userAtendente, messageId: MSG_ENC });
  check('ENC 10: atendente marca item recebido -> item_recebido', () => {
    const enc = encomendaStore.obter(GUILD, encId);
    assert.strictEqual(enc.status, 'item_recebido', 'item recebido');
    assert.strictEqual(enc.recebidoPor, ATENDENTE, 'registrou quem recebeu');
  });

  await emitir('button', `enc:entregar:${encId}`, { user: userAtendente, messageId: MSG_ENC });
  check('ENC 11: atendente entrega -> entregue (sem marcar pagamento)', () => {
    const enc = encomendaStore.obter(GUILD, encId);
    assert.strictEqual(enc.status, 'entregue', 'entregue');
    assert.strictEqual(enc.entreguePor, ATENDENTE, 'registrou quem entregou');
    // Entregar e apenas operacional: NAO significa restante pago.
    assert.strictEqual(enc.pagamento.restantePagoEm, null, 'restante segue NAO pago');
  });

  check('ENC 11b: nenhum passo do fluxo marca pagamento automaticamente', () => {
    const enc = encomendaStore.obter(GUILD, encId);
    assert.strictEqual(enc.pagamento.entradaPagaEm, null, 'entrada nao paga');
    assert.strictEqual(enc.pagamento.restantePagoEm, null, 'restante nao pago');
    // Os valores contratuais de 50/50 continuam guardados.
    assert.strictEqual(enc.valor, 13.5, 'total guardado');
    assert.strictEqual(enc.entrada, 6.75, 'entrada 50% guardada');
    assert.strictEqual(enc.restante, 6.75, 'restante 50% guardado');
  });

  await emitir('button', `enc:entregar:${encId}`, { user: userAtendente, messageId: MSG_ENC });
  check('ENC 12: entregar de novo e bloqueado (nao duplica)', () => {
    assert.ok(/não corresponde ao estado atual/.test(ultimaResposta?.content || ''), 'bloqueado');
  });

  check('ENC 13: encomenda entregue NAO vira venda automaticamente', () => {
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto, 0, 'gasto intacto');
    assert.strictEqual(estoque.produto(GUILD, CAT, PROD).quantidade, 3, 'estoque intacto');
  });

  // ----- transicoes invalidas -----
  const enc2 = encomendaStore.criar(GUILD, {
    clienteId: CLIENTE, catId: CAT, prodId: PROD2, itemNome: 'Saw', quantidade: 1, valorUnitario: 3,
  });
  encomendaStore.registrarMensagem(GUILD, enc2.id, CANAL, '610000000000000003');

  await emitir('button', `enc:recebido:${enc2.id}`, { user: userAtendente, messageId: '610000000000000003' });
  check('ENC 14: nao pula etapa (receber sem iniciar)', () => {
    assert.ok(/não corresponde ao estado atual/.test(ultimaResposta?.content || ''), 'bloqueado');
    assert.strictEqual(encomendaStore.obter(GUILD, enc2.id).status, 'aguardando', 'segue aguardando');
  });

  check('ENC 15: nao permite avancar depois de cancelada', () => {
    encomendaStore.cancelar(GUILD, enc2.id, ATENDENTE);
    const r = encomendaStore.avancar(GUILD, enc2.id, ATENDENTE);
    assert.strictEqual(r.ok, false, 'bloqueado');
    assert.strictEqual(r.motivo, 'final', 'motivo final');
  });

  // ----- cancelamento via handler -----
  const enc3 = encomendaStore.criar(GUILD, {
    clienteId: CLIENTE, catId: CAT, prodId: PROD2, itemNome: 'Saw', quantidade: 2, valorUnitario: 3,
  });
  encomendaStore.registrarMensagem(GUILD, enc3.id, CANAL, '610000000000000004');

  await emitir('button', `enc:cancelar:${enc3.id}`, { user: userCliente, messageId: '610000000000000004' });
  check('ENC 16: cliente nao cancela encomenda', () => {
    assert.ok(/equipe autorizada/.test(ultimaResposta?.content || ''), 'bloqueado');
    assert.strictEqual(encomendaStore.obter(GUILD, enc3.id).status, 'aguardando', 'segue aguardando');
  });

  await emitir('button', `enc:cancelar:${enc3.id}`, { user: userAtendente, messageId: '610000000000000004' });
  check('ENC 17: cancelar pede confirmacao antes', () => {
    assert.ok(ultimoUpdate, 'editou com confirmacao');
    const ids = (ultimoUpdate.components || []).flatMap((r) => r.components.map((c) => c.data.custom_id));
    assert.ok(ids.includes(`enc:confcanc:${enc3.id}`), 'botao sim');
    assert.ok(ids.includes(`enc:voltcanc:${enc3.id}`), 'botao nao');
    assert.strictEqual(encomendaStore.obter(GUILD, enc3.id).status, 'aguardando', 'ainda nao cancelou');
  });

  await emitir('button', `enc:voltcanc:${enc3.id}`, { user: userAtendente, messageId: '610000000000000004' });
  check('ENC 18: voltar nao cancela', () => {
    assert.strictEqual(encomendaStore.obter(GUILD, enc3.id).status, 'aguardando', 'segue aguardando');
  });

  await emitir('button', `enc:confcanc:${enc3.id}`, { user: userAtendente, messageId: '610000000000000004' });
  check('ENC 19: confirmar cancela e registra quem cancelou', () => {
    const enc = encomendaStore.obter(GUILD, enc3.id);
    assert.strictEqual(enc.status, 'cancelada', 'cancelada');
    assert.strictEqual(enc.canceladoPor, ATENDENTE, 'registrou autor');
    assert.ok(enc.canceladoEm, 'registrou data');
  });

  await emitir('button', `enc:confcanc:${enc3.id}`, { user: userAtendente, messageId: '610000000000000004' });
  check('ENC 20: cancelar de novo e bloqueado (nao duplica)', () => {
    assert.ok(/já foi cancelada/.test(ultimaResposta?.content || ''), 'bloqueado');
  });

  // ----- dono do painel de criacao -----
  const donoOk = encomendaStore.registrarPainel(GUILD, MSG_PAINEL, CLIENTE);
  check('ENC 21: posse do painel nao pode ser roubada por outro usuario', () => {
    assert.strictEqual(donoOk, CLIENTE, 'dono mantido');
    const tentativa = encomendaStore.registrarPainel(GUILD, MSG_PAINEL, OUTRO);
    assert.strictEqual(tentativa, CLIENTE, 'nao rouba');
    assert.strictEqual(encomendaStore.donoDoPainel(GUILD, MSG_PAINEL), CLIENTE, 'dono segue');
  });

  await emitir('button', `enc:cat:${CAT}`, { user: userOutro, messageId: MSG_PAINEL });
  check('ENC 22: outro usuario nao navega no painel alheio', () => {
    assert.ok(/pertence a outro usuário/.test(ultimaResposta?.content || ''), 'bloqueado');
  });

  await emitir('button', `enc:cat:${CAT}`, { user: userCliente, messageId: MSG_PAINEL });
  check('ENC 23: dono navega normalmente', () => {
    assert.ok(ultimoUpdate, 'editou');
    const titulo = ultimoUpdate.embeds?.[0]?.data?.title || '';
    assert.ok(/Passo 2/.test(titulo), 'abriu os produtos');
  });

  check('ENC 24: encomenda inexistente nao quebra', () => {
    assert.strictEqual(encomendaStore.obter(GUILD, '99999'), null, 'retorna null');
  });

  check('ENC 25: encomenda isolada por guildId', () => {
    assert.strictEqual(encomendaStore.obter(OUTRA_GUILD, encId), null, 'nao vaza entre guilds');
    assert.strictEqual(encomendaStore.lista(OUTRA_GUILD).length, 0, 'outra guild sem encomendas');
  });

  // ----- logs -----
  check('ENC 26: logs de encomenda sao distintos dos logs de /comprar', () => {
    const { logDaEncomenda } = require('../src/utils/encomendaPanel');
    const enc = encomendaStore.obter(GUILD, encId);
    for (const [acao, titulo] of [
      ['criada', 'ENCOMENDA CRIADA'], ['iniciada', 'ENCOMENDA INICIADA'],
      ['recebida', 'ITEM RECEBIDO'], ['entregue', 'ENCOMENDA ENTREGUE'],
      ['cancelada', 'ENCOMENDA CANCELADA'],
    ]) {
      const l = logDaEncomenda(enc, { acao, por: ATENDENTE });
      assert.ok(l.titulo.includes(titulo), `${acao}: titulo ${titulo}`);
      assert.ok(l.titulo.includes('ENCOMENDA') || l.titulo.includes('ITEM'), `${acao}: identificado`);
      const embeds = logComprasStore.montarEmbeds(l);
      assert.strictEqual(embeds.length, 1, `${acao}: uma embed`);
      const d = embeds[0].data.description || '';
      assert.ok(d.includes(`#${enc.id}`), `${acao}: id`);
      assert.ok(d.includes('🧾 **Encomenda:**'), `${acao}: rotulo encomenda`);
      assert.ok(d.includes('💳 **Entrada:**'), `${acao}: entrada`);
      assert.ok(d.includes('💵 **Restante:**'), `${acao}: restante`);
      assert.ok(!/PEDIDO/.test(l.titulo), `${acao}: nao confunde com log de /comprar`);
    }
  });

  check('ENC 27: logs de encomenda sao enviados ao canal configurado', () => {
    logComprasStore.definir(GUILD, canalLogs.id);
    const enc = encomendaStore.obter(GUILD, encId);
    const { logDaEncomenda } = require('../src/utils/encomendaPanel');
    return logComprasStore.enviar(client, GUILD, logDaEncomenda(enc, { acao: 'criada' })).then((ok) => {
      assert.ok(ok, 'enviou');
      const ultimo = logsEnviados[logsEnviados.length - 1];
      assert.ok(ultimo.embeds[0].data.title.includes('ENCOMENDA CRIADA'), 'titulo no canal');
    });
  });

  // ----- fluxo completo: etapas operacionais nao registram pagamento -----
  check('ENC 29: fluxo completo mantem pagamento neutro em cada etapa', () => {
    const G = GUILD + '-fluxo';
    encomendaStore.removerDaGuild(G);
    const e = encomendaStore.criar(G, {
      clienteId: CLIENTE, catId: CAT, prodId: PROD, itemNome: 'Cookieblade', quantidade: 1, valorUnitario: 13.5,
    });
    // Apos criar: ainda nada pago.
    assert.strictEqual(e.status, 'aguardando', '1. aguardando inicio');
    assert.strictEqual(e.pagamento.entradaPagaEm, null, '1. entrada nao paga');
    assert.strictEqual(e.pagamento.restantePagoEm, null, '1. restante nao pago');

    // Etapa operacional: iniciar (a equipe ja conferiu a entrada no comprovante,
    // mas quem marca o pagamento seria uma acao explicita — que nao existe).
    encomendaStore.avancar(G, e.id, ATENDENTE);
    let a = encomendaStore.obter(G, e.id);
    assert.strictEqual(a.status, 'em_andamento', '2. em andamento');
    assert.strictEqual(a.pagamento.entradaPagaEm, null, '2. iniciar NAO marca entrada paga');
    assert.strictEqual(a.pagamento.restantePagoEm, null, '2. restante segue nao pago');

    encomendaStore.avancar(G, e.id, ATENDENTE);
    a = encomendaStore.obter(G, e.id);
    assert.strictEqual(a.status, 'item_recebido', '3. item recebido');
    assert.strictEqual(a.pagamento.entradaPagaEm, null, '3. entrada segue nao paga');
    assert.strictEqual(a.pagamento.restantePagoEm, null, '3. restante segue nao pago');

    encomendaStore.avancar(G, e.id, ATENDENTE);
    a = encomendaStore.obter(G, e.id);
    assert.strictEqual(a.status, 'entregue', '4. entregue');
    assert.strictEqual(a.pagamento.entradaPagaEm, null, '4. entregar NAO marca entrada paga');
    assert.strictEqual(a.pagamento.restantePagoEm, null, '4. entregar NAO marca restante pago');
    // Os valores contratuais 50/50 continuam guardados do inicio ao fim.
    assert.strictEqual(a.valor, 13.5, 'valor guardado');
    assert.strictEqual(a.entrada, 6.75, 'entrada 50% guardada');
    assert.strictEqual(a.restante, 6.75, 'restante 50% guardada');
    encomendaStore.removerDaGuild(G);
  });

  check('ENC 31: textos nao afirmam politica de reembolso nem pagamento no inicio', () => {
    const { resumoEncomenda, confirmacaoCancelamentoEncomenda } = require('../src/utils/encomendaPanel');
    // Resumo: entrada deve ser paga ANTES do inicio (e conferida manualmente).
    const resumo = resumoEncomenda(GUILD, { catId: CAT, prodId: PROD, quantidade: 1, clienteId: CLIENTE });
    const r = resumo.embeds[0].data.description || '';
    assert.ok(!/paga ao iniciar/i.test(r), 'nao diz que a entrada e paga ao iniciar');
    assert.ok(/antes do início/i.test(r), 'diz que a entrada e paga antes do inicio');
    assert.ok(/confere o comprovante/i.test(r), 'diz que a equipe confere manualmente');

    // Cancelamento: nenhuma afirmacao sobre reembolso.
    for (const st of ['aguardando', 'em_andamento', 'item_recebido']) {
      const m = confirmacaoCancelamentoEncomenda({ guildId: GUILD, id: '1', status: st });
      const d = m.embeds[0].data.description || '';
      assert.ok(!/reembols/i.test(d), `${st}: nao afirma politica de reembolso`);
      assert.ok(/Tem certeza/.test(d), `${st}: pede confirmacao`);
    }
  });

  check('ENC 30: painel/embed da encomenda nao afirma pagamento', () => {
    const { mensagemEncomenda } = require('../src/utils/encomendaPanel');
    const e = encomendaStore.obter(GUILD, encId);
    const m = mensagemEncomenda(GUILD, e);
    const texto = JSON.stringify(m.embeds[0].data) + JSON.stringify(m.components.map((r) => r.toJSON()));
    assert.ok(!/pago|paga|pagamento/i.test(texto), 'nao afirma pagamento/pago no painel');
    // Mas mostra os valores contratuais.
    assert.ok(/Entrada/i.test(texto), 'mostra entrada');
    assert.ok(/Restante/i.test(texto), 'mostra restante');
  });

  check('ENC 28: log mostra o status DO EVENTO, nao o status atual', () => {
    const { logDaEncomenda } = require('../src/utils/encomendaPanel');
    // Encomenda ja entregue: o log de criacao NAO pode dizer "entregue".
    const enc = {
      id: '77', clienteId: CLIENTE, itemNome: 'X', quantidade: 1,
      valor: 10, entrada: 5, restante: 5,
      status: 'entregue', criadoEm: Date.now(), entregueEm: Date.now(), entreguePor: ATENDENTE,
    };
    const l = logDaEncomenda(enc, { acao: 'criada' });
    const d = logComprasStore.montarEmbeds(l)[0].data.description || '';
    assert.ok(d.includes('🟣 Aguardando início'), 'log criada mostra aguardando');
    const l2 = logDaEncomenda(enc, { acao: 'entregue', por: ATENDENTE });
    const d2 = logComprasStore.montarEmbeds(l2)[0].data.description || '';
    assert.ok(d2.includes('🟢 Encomenda entregue'), 'log entregue mostra entregue');
  });

  // ----- limpeza -----
  limpar();
  fs.rmSync(path.join(__dirname, '..', 'data', 'encomendas.json'), { force: true });
  // Restaura as permissoes como estavam antes do teste (nao vazar config).
  try {
    if (permBackup === null) fs.rmSync(permFile, { force: true });
    else fs.writeFileSync(permFile, permBackup);
  } catch {}

  const falhas = RESULTADOS.filter((r) => !r.ok);
  console.log(`\n===== RESULTADO: ${RESULTADOS.length - falhas.length}/${RESULTADOS.length} checks OK =====`);
  if (falhas.length) {
    falhas.forEach((f) => console.log('FALHA: ' + f.nome + ' -> ' + f.erro));
    process.exit(1);
  }
  console.log('testes carrinho + encomenda OK');
})();