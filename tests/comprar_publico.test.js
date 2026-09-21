// Fluxo PUBLICO do /comprar dentro do ticket: carrinho, pedido, pagamento,
// cancelamento, permissoes, logs e configuracao (/setcomprar).
//
// Exercita os handlers reais de src/index.js (emitindo interactionCreate) com
// um client discord.js com login bloqueado, como em tests/smoke_handlers.js.

process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || 'fake-token';
process.env.ADMIN_IDS = '';

const assert = require('node:assert');
const { Client, MessageFlags } = require('discord.js');

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
const pedidoComprasStore = require('../src/utils/pedidoComprasStore');
const logComprasStore = require('../src/utils/logComprasStore');
const estoque = require('../src/utils/estoque');
const { montarCarrinho, escolherCategoria, escolherProduto, escolherQuantidade, finalizarCarrinho, mensagemPedido, itensDoPedido } = require('../src/utils/comprarPanel');
const { formatBRL } = require('../src/utils/robuxConverter');

const GUILD = 'g-comprar-publico';
const CLIENTE = '900000000000000001';
const OUTRO = '900000000000000002';
const ATENDENTE = '900000000000000003';
const CANAL = '700000000000000001';
const MSG_CARRINHO = '600000000000000001';
const MSG_PAINEL_NOVO = '600000000000000002';

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
  id: '700000000000000009',
  isTextBased: () => true,
  isSendable: () => true,
  send: async (payload) => { logsEnviados.push(payload); return { id: 'log-1' }; },
};

const mensagens = new Map();
const canal = {
  id: CANAL,
  name: 'ticket-0001',
  isTextBased: () => true,
  isSendable: () => true,
  messages: {
    fetch: async (id) => {
      if (!mensagens.has(id)) throw new Error('Unknown Message');
      return mensagens.get(id);
    },
  },
  send: async (payload) => {
    const msg = { id: 'msg-nova', payload, edit: async () => {}, delete: async () => {} };
    mensagens.set(msg.id, msg);
    return msg;
  },
};
canal.client = client;

const colecaoCanais = {
  get: (id) => (id === canal.id ? canal : id === canalLogs.id ? canalLogs : null),
  filter: () => colecaoCanais,
  sort: () => colecaoCanais,
  first: () => [canal],
  map: () => [],
  size: 1,
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
const membroOutro = fazerMembro(OUTRO);
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
membroOutro.guild = guild;
membroAtendente.guild = guild;
canal.guild = guild;

// Mensagem publica do painel (autor = bot), ligada ao carrinho do cliente.
const botId = '1509146932478476389';
const mensagemPainel = {
  id: MSG_CARRINHO,
  author: { id: botId, bot: true },
  channel: canal,
  edit: async (payload) => { mensagemPainel.ultimoEdit = payload; },
  delete: async () => {},
};
mensagens.set(MSG_CARRINHO, mensagemPainel);

let ultimaResposta = null;
let ultimoUpdate = null;
let ultimoEditReply = null;
let deferiu = false;

function fazerInteracao(tipo, customId, { user = membroCliente, messageId = MSG_CARRINHO, valores = [], campos = {}, message = true } = {}) {
  const interacao = {
    customId,
    user: user.user,
    member: user,
    guild,
    guildId: GUILD,
    channel: canal,
    channelId: CANAL,
    message: message ? { ...mensagens.get(messageId), author: { id: botId, bot: true } } : null,
    values: valores,
    fields: { getTextInputValue: (campo) => campos[campo] || '' },
    isButton: () => tipo === 'button',
    isModalSubmit: () => tipo === 'modal',
    isAnySelectMenu: () => tipo === 'select',
    isStringSelectMenu: () => tipo === 'select',
    isRoleSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChatInputCommand: () => false,
    isRepliable: () => true,
    client,
    deferred: false,
    replied: false,
    update: async (payload) => { ultimoUpdate = payload; },
    reply: async (payload) => { ultimaResposta = payload; return payload; },
    followUp: async (payload) => { ultimaResposta = payload; },
    deferUpdate: async () => { deferiu = true; },
    editReply: async (payload) => { ultimoEditReply = payload; return payload; },
    showModal: async (modal) => { interacao.modalAberto = modal; },
  };
  return interacao;
}

async function emitir(tipo, customId, opts) {
  ultimaResposta = null;
  ultimoUpdate = null;
  ultimoEditReply = null;
  deferiu = false;
  const interacao = fazerInteracao(tipo, customId, opts);
  client.emit('interactionCreate', interacao);
  // Os handlers sao async e alguns logs sao fire-and-forget: espera drenar.
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 5));
  return interacao;
}

function cadastrar(catNome, catId, prodNome, valor, qtd) {
  if (!estoque.categoria(GUILD, catId)) estoque.addCategoria(GUILD, catNome);
  const prodId = prodNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  if (!estoque.produto(GUILD, catId, prodId)) {
    estoque.addProduto(GUILD, catId, { nome: prodNome, valor, controlarQtd: qtd !== null, quantidade: qtd || 0 });
  } else {
    estoque.setQuantidade(GUILD, catId, prodId, qtd || 0);
  }
  return prodId;
}

(async () => {
  // ----- setup -----
  carrinhoStore.limpar(GUILD, CLIENTE);
  pedidoStore.removerDaGuild(GUILD);
  pedidoComprasStore.limpar(GUILD);
  cadastrar('Doces', 'doces', 'Cookieblade', 3, 50);
  cadastrar('Espadas', 'espadas', 'Ghostblade', 3, 50);
  cadastrar('Espadas', 'espadas', 'Icewing', 5, 50);
  logComprasStore.definir(GUILD, canalLogs.id);
  logsEnviados.length = 0;

  // ===== TESTE 1: /comprar abre o painel publico =====
  {
    const cmdComprar = client.commands.get('comprar');
    const interacao = {
      guild,
      guildId: GUILD,
      channelId: CANAL,
      user: { id: CLIENTE },
      member: membroCliente,
      reply: async (payload) => { ultimaResposta = payload; return { id: MSG_PAINEL_NOVO }; },
    };
    await cmdComprar.execute(interacao);
    check('TESTE 1: /comprar responde com o painel de categorias (publico)', () => {
      assert.ok(ultimaResposta && Array.isArray(ultimaResposta.embeds), 'painel com embed');
      assert.ok(!(ultimaResposta.flags & MessageFlags.Ephemeral), 'sem resposta ephemeral');
      const botoes = JSON.stringify(ultimaResposta.components.map((r) => r.toJSON()));
      assert.ok(botoes.includes('comp:cat:doces'), 'botao de categoria doces');
    });
    check('TESTE 1b: /comprar registra a posse da mensagem do painel', () => {
      const r = carrinhoStore.ref(GUILD, CLIENTE);
      assert.strictEqual(r.msgId, MSG_PAINEL_NOVO, 'posse registrada para o cliente');
      assert.strictEqual(carrinhoStore.donoDoPainel(GUILD, MSG_PAINEL_NOVO), CLIENTE, 'dono do painel e o cliente');
    });
    // Restaura a referencia usada pelos demais testes.
    carrinhoStore.setRef(GUILD, CLIENTE, CANAL, MSG_CARRINHO);
  }

  // ===== TESTE 2: categoria -> produto -> 1x entra no carrinho (sem pedido) =====
  await emitir('button', 'comp:cat:doces', { user: membroCliente });
  check('TESTE 2a: escolher categoria abre os produtos no ticket (update publico)', () => {
    assert.ok(ultimoUpdate, 'editou a mensagem existente');
    assert.ok(!(ultimoUpdate.flags & MessageFlags.Ephemeral), 'sem ephemeral');
  });

  await emitir('button', 'comp:prod:doces:cookieblade', { user: membroCliente });
  check('TESTE 2b: escolher produto abre a tela de quantidade', () => {
    const botoes = JSON.stringify(ultimoUpdate.components.map((r) => r.toJSON()));
    assert.ok(botoes.includes('comp:qtd:doces:cookieblade:1'), 'botao 1x disponivel');
  });

  await emitir('button', 'comp:qtd:doces:cookieblade:1', { user: membroCliente });
  check('TESTE 2c: 1x adiciona ao carrinho e NAO cria pedido', () => {
    assert.ok(!(ultimoUpdate.flags & MessageFlags.Ephemeral), 'carrinho publico no ticket');
    const desc = ultimoUpdate.embeds[0].data.description || '';
    assert.ok(desc.includes('Cookieblade'), 'Cookieblade no carrinho');
    assert.ok(desc.includes('× 1'), 'quantidade 1x');
    assert.strictEqual(pedidoStore.lista(GUILD).length, 0, 'nenhum pedido criado ainda');
    assert.strictEqual(estoque.produto(GUILD, 'doces', 'cookieblade').quantidade, 50, 'estoque intacto');
  });

  // ===== TESTE 3: segundo produto no mesmo carrinho =====
  await emitir('button', 'comp:qtd:espadas:ghostblade:2', { user: membroCliente });
  check('TESTE 3: segundo produto entra no MESMO carrinho', () => {
    const itens = carrinhoStore.listar(GUILD, CLIENTE);
    assert.strictEqual(itens.length, 2, '2 itens');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 9, 'total 1*3 + 2*3 = 9');
    const desc = ultimoUpdate.embeds[0].data.description || '';
    assert.ok(desc.includes('Cookieblade') && desc.includes('Ghostblade'), 'os dois no carrinho');
    assert.ok(desc.includes(formatBRL(9)), 'total exibido');
  });

  // ===== TESTE 4: remover apenas um produto pelo select =====
  await emitir('select', 'comp:removeritem', { user: membroCliente, valores: ['doces:cookieblade'] });
  check('TESTE 4: select remove somente o item escolhido', () => {
    const itens = carrinhoStore.listar(GUILD, CLIENTE);
    assert.strictEqual(itens.length, 1, 'sobrou 1 item');
    assert.strictEqual(itens[0].nome, 'Ghostblade', 'Ghostblade permanece');
    assert.ok(!(ultimoUpdate.flags & MessageFlags.Ephemeral), 'carrinho atualizado publicamente');
  });

  // ===== TESTE 5: adicionar novamente =====
  await emitir('button', 'comp:qtd:espadas:icewing:1', { user: membroCliente });
  check('TESTE 5: adicionar novamente volta a ter 2 itens', () => {
    const itens = carrinhoStore.listar(GUILD, CLIENTE);
    assert.strictEqual(itens.length, 2, '2 itens');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 11, 'total 6 + 5 = 11');
  });

  // ===== TESTE 6: limpar carrinho =====
  await emitir('button', 'comp:limpar', { user: membroCliente });
  check('TESTE 6: limpar carrinho zera os itens', () => {
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).length, 0, 'carrinho vazio');
    assert.strictEqual(carrinhoStore.total(GUILD, CLIENTE), 0, 'total zerado');
  });

  // ===== TESTE 8: outro usuario nao pode alterar o carrinho =====
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: 'doces', prodId: 'cookieblade', nome: 'Cookieblade', quantidade: 1, valorUnitario: 3 });
  carrinhoStore.setRef(GUILD, CLIENTE, CANAL, MSG_CARRINHO);
  await emitir('button', 'comp:qtd:espadas:ghostblade:1', { user: membroOutro });
  check('TESTE 8: outro usuario e bloqueado ao tentar alterar o carrinho', () => {
    assert.ok(ultimaResposta && /pertence a outro usuário/.test(ultimaResposta.content || ''), 'aviso de posse');
    assert.strictEqual(carrinhoStore.listar(GUILD, OUTRO).length, 0, 'carrinho do outro segue vazio');
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).length, 1, 'carrinho do dono intacto');
  });

  // ===== TESTE 8b: intruso NAO assume o painel publico de outro =====
  check('TESTE 8b: setRef nao deixa outro usuario roubar o painel', () => {
    carrinhoStore.setRef(GUILD, OUTRO, CANAL, MSG_CARRINHO);
    assert.strictEqual(carrinhoStore.donoDoPainel(GUILD, MSG_CARRINHO), CLIENTE, 'dono continua o cliente');
    assert.strictEqual(carrinhoStore.ref(GUILD, OUTRO).msgId, null, 'intruso nao herda a referencia');
  });

  // ===== TESTE 8c: intruso nao navega nem enxerga o carrinho alheio =====
  await emitir('button', 'comp:carrinho', { user: membroOutro });
  check('TESTE 8c: intruso nao abre o carrinho do dono', () => {
    assert.ok(ultimaResposta && /pertence a outro usuário/.test(ultimaResposta.content || ''), 'bloqueado');
    assert.strictEqual(ultimoUpdate, null, 'painel do dono nao foi alterado');
  });
  await emitir('button', 'comp:cat:espadas', { user: membroOutro });
  check('TESTE 8d: intruso nao navega no painel do dono', () => {
    assert.ok(ultimaResposta && /pertence a outro usuário/.test(ultimaResposta.content || ''), 'bloqueado');
    assert.strictEqual(ultimoUpdate, null, 'painel do dono nao foi alterado');
  });
  // Painel sem dono registrado (mensagem desconhecida) nao e de ninguem.
  await emitir('button', 'comp:limpar', { user: membroCliente, messageId: 'msg-orfa' });
  check('TESTE 8e: painel sem dono registrado e bloqueado', () => {
    assert.ok(ultimaResposta && /identificar o dono/.test(ultimaResposta.content || ''), 'aviso de painel orfao');
  });

  // ===== TESTE 7: finalizar gera pedido PUBLICO no ticket =====
  await emitir('button', 'comp:finalizar', { user: membroCliente });
  check('TESTE 7: finalizar mostra o pedido publicamente no ticket', () => {
    assert.ok(ultimoUpdate, 'respondeu no ticket');
    assert.ok(!(ultimoUpdate.flags & MessageFlags.Ephemeral), 'pedido NAO e ephemeral');
    const embed = ultimoUpdate.embeds[0].data;
    assert.ok(/PEDIDO #\d+/.test(embed.title || ''), 'titulo com numero do pedido');
    assert.ok((embed.description || '').includes('Cookieblade'), 'produto listado');
    assert.ok((embed.description || '').includes('Aguardando pagamento'), 'status aguardando pagamento');
    const campos = JSON.stringify(embed.fields || []);
    assert.ok(campos.includes('Pagamento'), 'instrucoes de pagamento no pedido');
    const botoes = JSON.stringify(ultimoUpdate.components.map((r) => r.toJSON()));
    assert.ok(botoes.includes('comp:confirmar:'), 'botao confirmar pagamento');
    assert.ok(botoes.includes('comp:cancelar:'), 'botao cancelar pedido');
    assert.strictEqual(carrinhoStore.listar(GUILD, CLIENTE).length, 0, 'carrinho limpo');
  });

  const pedido = pedidoStore.lista(GUILD)[0];
  check('TESTE 7b: pedido criado agrupado, pendente e com reserva de estoque', () => {
    assert.ok(pedido, 'pedido existe');
    assert.strictEqual(pedido.status, 'pendente', 'status pendente');
    assert.strictEqual(pedido.valor, 3, 'valor do pedido');
    assert.strictEqual(pedidoStore.reservado(GUILD, 'doces', 'cookieblade'), 1, 'reserva contabilizada');
    assert.strictEqual(pedidoStore.disponivel(GUILD, estoque.produto(GUILD, 'doces', 'cookieblade'), 'doces', 'cookieblade'), 49, 'disponivel 49');
    assert.strictEqual(estoque.produto(GUILD, 'doces', 'cookieblade').quantidade, 50, 'estoque fisico ainda intacto');
  });

  check('TESTE 7c: log de "pedido criado" foi registrado', () => {
    const log = logsEnviados.find((l) => /pedido criado/i.test(l.embeds?.[0]?.data?.title || ''));
    assert.ok(log, 'log de pedido criado enviado');
    const d = log.embeds[0].data.description || '';
    assert.ok(d.includes('**Pedido:**'), 'rotulo do pedido');
    assert.ok(d.includes(`\`${CLIENTE}\``), 'ID do cliente em crases');
    assert.ok(d.includes('Aguardando pagamento'), 'status aguardando pagamento');
  });

  // ===== TESTE 9: cliente nao pode confirmar o proprio pagamento =====
  await emitir('button', `comp:confirmar:${pedido.id}`, { user: membroCliente });
  check('TESTE 9: cliente sem permissao nao confirma pagamento', () => {
    assert.ok(/Somente administradores|equipe autorizada/.test(ultimaResposta.content || ''), 'bloqueio por permissao');
    assert.strictEqual(pedidoStore.obter(GUILD, pedido.id).status, 'pendente', 'pedido segue pendente');
    assert.strictEqual(estoque.produto(GUILD, 'doces', 'cookieblade').quantidade, 50, 'estoque nao baixado');
  });

  // ===== TESTE 10: atendente autorizado confirma o pagamento =====
  const gastoAntes = comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto;
  await emitir('button', `comp:confirmar:${pedido.id}`, { user: membroAtendente });
  check('TESTE 10: atendente confirma -> pago, estoque baixado e venda registrada', () => {
    assert.ok(deferiu, 'deferiu antes do trabalho de rede');
    const p = pedidoStore.obter(GUILD, pedido.id);
    assert.strictEqual(p.status, 'confirmado', 'pedido pago');
    assert.strictEqual(p.confirmadoPor, ATENDENTE, 'registrou quem confirmou');
    assert.ok(p.confirmadoEm, 'registrou data/hora');
    assert.strictEqual(estoque.produto(GUILD, 'doces', 'cookieblade').quantidade, 49, 'estoque baixado');
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto, gastoAntes + 3, 'venda registrada');
    assert.ok(ultimoEditReply, 'mensagem do pedido atualizada');
    const embed = ultimoEditReply.embeds[0].data;
    assert.ok((embed.description || '').includes('Pago'), 'status Pago');
    assert.strictEqual((ultimoEditReply.components || []).length, 0, 'sem botoes apos confirmar');
  });

  check('TESTE 10b: log de "Pedido pago" com o atendente', () => {
    const log = logsEnviados.find((l) => /pedido pago/i.test(l.embeds?.[0]?.data?.title || ''));
    assert.ok(log, 'log enviado');
    const d = log.embeds[0].data.description || '';
    assert.ok(d.includes(ATENDENTE), 'registrou quem confirmou');
    assert.ok(d.includes('**Status:** Pago'), 'status pago');
    assert.ok(d.includes('**Confirmado por:**'), 'rotulo de confirmacao');
    assert.ok(d.includes('**Data:**'), 'registrou data');
  });

  // ===== TESTE 11: confirmar duas vezes nao duplica =====
  const qtdAposConfirmar = estoque.produto(GUILD, 'doces', 'cookieblade').quantidade;
  const gastoAposConfirmar = comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto;
  await emitir('button', `comp:confirmar:${pedido.id}`, { user: membroAtendente });
  check('TESTE 11: confirmar novamente e bloqueado e nao duplica venda/baixa', () => {
    assert.ok(/já foi processado/.test(ultimaResposta.content || ''), 'aviso de ja processado');
    assert.strictEqual(estoque.produto(GUILD, 'doces', 'cookieblade').quantidade, qtdAposConfirmar, 'estoque inalterado');
    assert.strictEqual(comprasStore.dadosDoCliente(GUILD, CLIENTE).gasto, gastoAposConfirmar, 'nenhuma venda extra');
  });

  // ===== TESTE 12: cancelar pedido com confirmacao =====
  carrinhoStore.adicionar(GUILD, CLIENTE, { catId: 'espadas', prodId: 'ghostblade', nome: 'Ghostblade', quantidade: 2, valorUnitario: 3 });
  const pedido2 = finalizarCarrinho(GUILD, CLIENTE, 'cliente-teste');
  const reservadoAntes = pedidoStore.reservado(GUILD, 'espadas', 'ghostblade');

  await emitir('button', `comp:cancelar:${pedido2.id}`, { user: membroAtendente });
  check('TESTE 12a: cancelar pede confirmacao (nao cancela direto)', () => {
    const botoes = JSON.stringify(ultimoUpdate.components.map((r) => r.toJSON()));
    assert.ok(botoes.includes(`comp:confcanc:${pedido2.id}`), 'botao Sim, cancelar');
    assert.ok(botoes.includes(`comp:voltcanc:${pedido2.id}`), 'botao Nao');
    assert.strictEqual(pedidoStore.obter(GUILD, pedido2.id).status, 'pendente', 'ainda pendente');
    assert.ok(/liberar a reserva do estoque/.test(ultimoUpdate.embeds[0].data.description || ''), 'avisa sobre a reserva');
  });

  await emitir('button', `comp:voltcanc:${pedido2.id}`, { user: membroAtendente });
  check('TESTE 12b: "Nao" volta ao pedido sem cancelar', () => {
    assert.strictEqual(pedidoStore.obter(GUILD, pedido2.id).status, 'pendente', 'pedido segue pendente');
  });

  await emitir('button', `comp:confcanc:${pedido2.id}`, { user: membroAtendente });
  check('TESTE 12c: confirmar cancela, libera a reserva e registra quem cancelou', () => {
    const p = pedidoStore.obter(GUILD, pedido2.id);
    assert.strictEqual(p.status, 'cancelado', 'cancelado');
    assert.strictEqual(p.canceladoPor, ATENDENTE, 'registrou quem cancelou');
    assert.ok(p.canceladoEm, 'registrou data/hora');
    assert.strictEqual(pedidoStore.reservado(GUILD, 'espadas', 'ghostblade'), reservadoAntes - 2, 'reserva liberada');
    const log = logsEnviados.find((l) => /pedido cancelado/i.test(l.embeds?.[0]?.data?.title || ''));
    assert.ok(log, 'log de cancelamento');
    const d = log.embeds[0].data.description || '';
    assert.ok(d.includes('**Status:** Cancelado'), 'status cancelado');
    assert.ok(d.includes('**Cancelado por:**'), 'rotulo de cancelamento');
    assert.ok(d.includes(ATENDENTE), 'registrou quem cancelou');
    assert.ok(d.includes('**Data:**'), 'registrou data');
  });

  // ===== TESTE 13: cancelar duas vezes =====
  await emitir('button', `comp:confcanc:${pedido2.id}`, { user: membroAtendente });
  check('TESTE 13: cancelar novamente e bloqueado', () => {
    assert.ok(/já foi processado/.test(ultimaResposta.content || ''), 'aviso de ja processado');
    assert.strictEqual(pedidoStore.obter(GUILD, pedido2.id).status, 'cancelado', 'segue cancelado');
  });

  // ===== TESTE 15: mensagem padrao quando nao ha configuracao =====
  check('TESTE 15: sem configuracao usa a mensagem padrao', () => {
    const texto = pedidoComprasStore.mensagem(GUILD, { total: 9, canalId: CANAL });
    assert.strictEqual(texto, pedidoComprasStore.MENSAGEM_PADRAO, 'mensagem padrao');
    assert.ok(texto.includes('!pix'), 'orienta usar !pix');
  });

  // ===== TESTE 14: /setcomprar com {pix}, {total} e {canal} =====
  {
    const cmd = client.commands.get('setcomprar');
    const opcoes = new Map([
      ['mensagem', '💳 Envie {total} via PIX para {pix} e mande o comprovante em {canal}.'],
      ['pix', '12345678900'],
      ['restaurar', null],
    ]);
    let resposta = null;
    const interacao = {
      guild,
      guildId: GUILD,
      channelId: CANAL,
      user: { id: ATENDENTE },
      member: membroAtendente,
      options: { getString: (n) => opcoes.get(n) ?? null },
      reply: async (payload) => { resposta = payload; return payload; },
    };
    await cmd.execute(interacao);
    check('TESTE 14a: /setcomprar salva a mensagem e a chave PIX por servidor', () => {
      assert.ok(/salva neste servidor/.test(resposta.content || ''), 'confirmou a gravacao');
      const conf = pedidoComprasStore.obter(GUILD);
      assert.strictEqual(conf.pix, '12345678900', 'pix salvo');
      assert.strictEqual(pedidoComprasStore.obterPix('outro-servidor'), null, 'isolado por guildId');
    });
    check('TESTE 14b: variaveis {total}, {pix} e {canal} sao aplicadas', () => {
      const texto = pedidoComprasStore.mensagem(GUILD, { total: 9, canalId: CANAL });
      const pixEsperado = formatBRL(9).replace(/\u00a0/g, ' ');
    assert.strictEqual(texto.replace(/\u00a0/g, ' '), `💳 Envie ${pixEsperado} via PIX para 12345678900 e mande o comprovante em <#${CANAL}>.`, texto);
    });
    check('TESTE 14c: pedido no ticket usa a mensagem configurada', () => {
      carrinhoStore.adicionar(GUILD, CLIENTE, { catId: 'espadas', prodId: 'icewing', nome: 'Icewing', quantidade: 1, valorUnitario: 5 });
      const p3 = finalizarCarrinho(GUILD, CLIENTE, 'cliente-teste');
      const conteudo = mensagemPedido(GUILD, p3, CANAL);
      const camposTexto = (conteudo.embeds[0].data.fields || [])
        .map((f) => `${f.name} ${f.value}`).join('\n').replace(/\u00a0/g, ' ');
      assert.ok(camposTexto.includes(formatBRL(5).replace(/\u00a0/g, ' ')), '{total} do pedido');
      assert.ok(camposTexto.includes(`<#${CANAL}>`), '{canal} do ticket');
      assert.ok(camposTexto.includes('12345678900'), '{pix} configurado');
    });

    // restaurar
    const opcoesRestaurar = new Map([['mensagem', null], ['pix', null], ['restaurar', 'sim']]);
    await cmd.execute({
      guild, guildId: GUILD, channelId: CANAL,
      user: { id: ATENDENTE }, member: membroAtendente,
      options: { getString: (n) => opcoesRestaurar.get(n) ?? null },
      reply: async () => {},
    });
    check('TESTE 14d: /setcomprar restaurar volta para o padrao', () => {
      assert.strictEqual(pedidoComprasStore.obterMensagem(GUILD), pedidoComprasStore.MENSAGEM_PADRAO, 'padrao restaurado');
    });
  }

  // ===== TESTE 16: muitos produtos sem estourar componentes =====
  check('TESTE 16: carrinho com varios produtos respeita o limite de 5 ActionRows', () => {
    const muitos = 'g-comprar-muitos';
    const user = 'u-muitos';
    carrinhoStore.limpar(muitos, user);
    for (let i = 0; i < 30; i++) {
      carrinhoStore.adicionar(muitos, user, { catId: 'c', prodId: `p${i}`, nome: `Produto ${i}`, quantidade: 1, valorUnitario: 1 });
    }
    const tela = montarCarrinho(muitos, user);
    assert.ok(tela.components.length <= 5, `linhas=${tela.components.length} (max 5)`);
    tela.components.forEach((linha, idx) => {
      assert.ok(linha.components.length <= 5, `linha ${idx} com no maximo 5 componentes`);
    });
    const json = tela.components.map((r) => r.toJSON());
    assert.ok(json.every((r) => r.type === 1), 'todos os elementos sao ActionRow (type 1)');
    const select = json[0].components[0];
    assert.strictEqual(select.type, 3, 'primeira linha traz o select de remover');
    assert.strictEqual(select.options.length, 25, 'select limitado a 25 opcoes (limite do Discord)');
    const labels = JSON.stringify(json[1].components.map((b) => b.label));
    assert.ok(labels.includes('Finalizar') && labels.includes('Limpar') && labels.includes('Escolher mais'), 'acoes presentes');
    carrinhoStore.limpar(muitos, user);
  });

  // ===== Compatibilidade com pedidos antigos (sem itens[]) =====
  check('COMPAT: pedido antigo (item unico) ainda e lido corretamente', () => {
    const antigo = { id: '99', itemNome: 'Testando', quantidade: 2, valor: 6, catId: 'c', prodId: 'p', status: 'pendente', clienteId: CLIENTE };
    const itens = itensDoPedido(antigo);
    assert.strictEqual(itens.length, 1, 'um item');
    assert.strictEqual(itens[0].nome, 'Testando', 'nome preservado');
    assert.strictEqual(itens[0].valorUnitario, 3, 'valor unitario derivado');
  });

  // ----- regressao: botao "Voltar aos produtos" no produto esgotado -----
  // Antes usava comp:prod:cat:prod, que reabre a tela de quantidade do MESMO
  // produto (loop). Tem de voltar para a LISTA de produtos (comp:cat).
  check('TESTE 17: produto esgotado oferece volta para a lista de produtos', () => {
    const G = GUILD + '-esgotado';
    estoque.addCategoria(G, 'Blades');
    const cat = estoque.categorias(G)[0];
    estoque.addProduto(G, cat.id, { nome: 'Sumida', valor: 5, controlarQtd: true, quantidade: 0 });
    const prod = estoque.categorias(G)[0].produtos[0];
    const tela = escolherQuantidade(G, cat.id, prod.id);
    const ids = tela.components.flatMap((r) => r.components.map((c) => c.data.custom_id));
    assert.ok(ids.includes(`comp:cat:${cat.id}`), 'tem botao voltar para a categoria');
    assert.ok(!ids.includes(`comp:prod:${cat.id}:${prod.id}`), 'nao volta para o proprio produto (loop)');
    // O destino comp:cat realmente abre a lista de produtos:
    const lista = escolherProduto(G, cat.id, 'u1');
    assert.ok(lista.embeds[0].data.title.includes('Passo 2'), 'comp:cat abre a lista de produtos');
    require('node:fs').rmSync(require('node:path').join(__dirname, '..', 'data', 'estoque', `${G}.json`), { force: true });
  });

  // ----- regressao: {pix} do /setcomprar aparecia vazio -----
  // Definir so a chave PIX (sem 'mensagem:') tinha de refletir no pedido.
  check('TESTE 18: definir so o pix ja mostra a chave na mensagem', () => {
    const G = GUILD + '-pix';
    pedidoComprasStore.limpar(G);
    pedidoComprasStore.definirPix(G, 'chave@teste.com');
    const msg = pedidoComprasStore.mensagem(G, { total: 9, canalId: CANAL });
    assert.ok(msg.includes('chave@teste.com'), 'chave PIX visivel sem mensagem personalizada');
    assert.ok(!msg.includes('{pix}'), 'variavel {pix} substituida');
    pedidoComprasStore.limpar(G);
  });

  check('TESTE 18b: {pix} sem chave nao quebra a frase', () => {
    const G = GUILD + '-pix2';
    pedidoComprasStore.limpar(G);
    pedidoComprasStore.definirMensagem(G, 'Pague {total} via PIX para {pix} e mande em {canal}');
    const msg = pedidoComprasStore.mensagem(G, { total: 9, canalId: CANAL });
    assert.ok(!/para\s+(?:e|no|em|\n|$)/i.test(msg), 'sem "para" orfao: ' + msg);
    assert.ok(msg.includes('`!pix`'), 'aponta o caminho para pegar a chave');
    assert.ok(msg.includes('R$ 9,00'), 'total aplicado');
    pedidoComprasStore.limpar(G);
  });

  // ----- regressao: log em UMA embed -----
  check('TESTE 19: log de pedido vai em uma unica embed no formato novo', () => {
    const { logDoPedido } = require('../src/utils/comprarPanel');
    const pedido = {
      id: '99', clienteId: CLIENTE, clienteTag: 'c#1', valor: 9, criadoEm: Date.now(),
      itens: [
        { nome: 'Cookieblade', quantidade: 1, valorUnitario: 6 },
        { nome: 'Ghostblade', quantidade: 2, valorUnitario: 1.5 },
      ],
    };
    const titulos = { criado: /pedido criado/i, confirmado: /pedido pago/i, cancelado: /pedido cancelado/i };
    // formatBRL usa espaco nao-quebravel (NBSP) depois do "R$": normaliza antes de comparar.
    const norm = (s) => (s || '').replace(/\u00a0/g, ' ');
    for (const acao of ['criado', 'confirmado', 'cancelado']) {
      const p = { ...pedido };
      if (acao === 'confirmado') { p.confirmadoPor = ATENDENTE; p.confirmadoEm = Date.now(); }
      if (acao === 'cancelado') { p.canceladoPor = ATENDENTE; p.canceladoEm = Date.now(); }
      const l = logDoPedido(p, { acao, por: ATENDENTE });
      const embeds = logComprasStore.montarEmbeds(l);
      assert.strictEqual(embeds.length, 1, `${acao}: uma embed`);
      const d = norm(embeds[0].data.description);
      assert.ok(titulos[acao].test(embeds[0].data.title), `${acao}: titulo`);
      assert.ok(d.includes(`#${pedido.id}`), `${acao}: id do pedido`);
      assert.ok(d.includes(`<@${CLIENTE}>`), `${acao}: menciona o cliente`);
      assert.ok(d.includes(`\`${CLIENTE}\``), `${acao}: ID em crases`);
      assert.ok(d.includes('📦 **Itens:**'), `${acao}: itens`);
      assert.ok(d.includes('Cookieblade × 1 — R$ 6,00'), `${acao}: item 1 detalhado`);
      assert.ok(d.includes('Ghostblade × 2 — R$ 3,00'), `${acao}: item 2 detalhado`);
      assert.ok(d.includes('💰 **Total:** **R$ 9,00**'), `${acao}: total em negrito`);
      assert.ok(d.includes('🕐 **Data:**'), `${acao}: data`);
      // Linha em branco SO entre o bloco cliente/ID e os itens (indice 3).
      const linhas = d.split('\n');
      assert.strictEqual(linhas[3].trim(), '', `${acao}: linha em branco depois do ID`);
      const vazias = linhas.map((l, i) => (l.trim() === '' ? i : -1)).filter((i) => i !== -1);
      assert.deepStrictEqual(vazias, [3], `${acao}: so a linha 3 em branco`);
      if (acao === 'criado') {
        assert.ok(d.includes('🟡 **Status:** Aguardando pagamento'), 'status pendente');
      } else {
        assert.ok(d.includes(acao === 'confirmado' ? '🟢 **Status:** Pago' : '🔴 **Status:** Cancelado'), `${acao}: status`);
        assert.ok(d.includes(acao === 'confirmado' ? '👮 **Confirmado por:**' : '👮 **Cancelado por:**'), `${acao}: autor`);
      }
    }
  });

  // ----- limpeza -----
  carrinhoStore.limpar(GUILD, CLIENTE);
  pedidoStore.removerDaGuild(GUILD);
  pedidoComprasStore.limpar(GUILD);
  logComprasStore.desativar(GUILD);
  try { require('node:fs').rmSync(require('node:path').join(__dirname, '..', 'data', 'estoque', `${GUILD}.json`), { force: true }); } catch {}

  const falhas = RESULTADOS.filter((r) => !r.ok);
  console.log(`\n===== RESULTADO: ${RESULTADOS.length - falhas.length}/${RESULTADOS.length} checks OK =====`);
  if (falhas.length) {
    falhas.forEach((f) => console.log('FALHA: ' + f.nome + ' -> ' + f.erro));
    process.exit(1);
  }
  console.log('testes fluxo publico /comprar OK');
})();
