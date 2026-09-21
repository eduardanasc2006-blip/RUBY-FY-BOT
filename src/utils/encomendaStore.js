const fs = require('node:fs');
const path = require('node:path');

// Encomendas (fluxo separado do /comprar): pedidos de produtos que nao estao
// disponiveis no estoque imediato. NAO reserva nem baixa estoque e nao entra
// como venda normal antes da entrega.
// Arquivo: data/encomendas.json
// Estrutura: { [guildId]: { lista: [encomenda, ...], paineis: { msgId: donoId } } }

const FILE = path.join(__dirname, '..', '..', 'data', 'encomendas.json');

// Status internos -> rotulo exibido (mesma sequencia aguardando -> entregue).
const STATUS = {
  aguardando: { emoji: '🟣', texto: 'Aguardando início' },
  em_andamento: { emoji: '🟠', texto: 'Encomenda em andamento' },
  item_recebido: { emoji: '🔵', texto: 'Item recebido' },
  entregue: { emoji: '🟢', texto: 'Encomenda entregue' },
  cancelada: { emoji: '🔴', texto: 'Encomenda cancelada' },
};

// Transicoes permitidas entre estados (cancelada/entregue sao finais).
const PROXIMO = {
  aguardando: 'em_andamento',
  em_andamento: 'item_recebido',
  item_recebido: 'entregue',
};

const PRAZO_HORAS = 72;

let dados = {};
try {
  dados = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  dados = {};
}

function salvar() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(dados, null, 2));
}

function base(guildId) {
  if (!guildId) return { lista: [], paineis: {} };
  const b = dados[guildId];
  // Compatibilidade: aceita o formato antigo (array solto) e migra na leitura.
  if (Array.isArray(b)) {
    dados[guildId] = { lista: b, paineis: {} };
  } else if (!b || typeof b !== 'object') {
    dados[guildId] = { lista: [], paineis: {} };
  }
  if (!Array.isArray(dados[guildId].lista)) dados[guildId].lista = [];
  if (!dados[guildId].paineis || typeof dados[guildId].paineis !== 'object') dados[guildId].paineis = {};
  return dados[guildId];
}

function lista(guildId) {
  return base(guildId).lista;
}

// Posse do painel publico do /encomenda (quem iniciou o fluxo), para que so
// esse cliente navegue/confirme o proprio painel. Mesma ideia do carrinhoStore.
function registrarPainel(guildId, msgId, donoId) {
  if (!guildId || !msgId) return null;
  const b = base(guildId);
  if (b.paineis[msgId] && b.paineis[msgId] !== donoId) return b.paineis[msgId];
  b.paineis[msgId] = donoId;
  salvar();
  return donoId;
}

function donoDoPainel(guildId, msgId) {
  if (!guildId || !msgId) return null;
  return base(guildId).paineis[msgId] || null;
}

// ID sequencial por guild, reaproveitando numeros livres (como pedidoStore).
function novoId(guildId) {
  const existentes = lista(guildId);
  let n = existentes.length + 1;
  while (existentes.some((e) => e.id === String(n))) n++;
  return String(n);
}

// Valores em centavos para evitar erro de ponto flutuante: 13,50 -> 1350.
function emCentavos(valor) {
  return Math.round(Number(valor || 0) * 100);
}

function deCentavos(centavos) {
  return Math.round(centavos) / 100;
}

// 50% de entrada, 50% restante (o restante absorve o arredondamento).
function calcularEntrada(valor) {
  const total = emCentavos(valor);
  const entrada = Math.floor(total / 2);
  return { total: deCentavos(total), entrada: deCentavos(entrada), restante: deCentavos(total - entrada) };
}

function criar(guildId, { clienteId, clienteTag, catId, prodId, itemNome, quantidade, valorUnitario, canalId = null, msgId = null }) {
  const qtd = Math.max(1, Math.floor(quantidade || 1));
  const unit = Number(valorUnitario || 0);
  const { total, entrada, restante } = calcularEntrada(unit * qtd);
  const agora = Date.now();
  const enc = {
    id: novoId(guildId),
    clienteId,
    clienteTag: clienteTag || null,
    canalId,
    msgId,
    catId,
    prodId,
    itemNome,
    quantidade: qtd,
    valorUnitario: unit,
    valor: total,
    entrada,
    restante,
    pagamento: { entradaPagaEm: null, restantePagoEm: null },
    status: 'aguardando',
    criadoEm: agora,
    prazoEm: agora + PRAZO_HORAS * 60 * 60 * 1000,
    iniciadoEm: null,
    iniciadoPor: null,
    recebidoEm: null,
    recebidoPor: null,
    entregueEm: null,
    entreguePor: null,
    canceladoEm: null,
    canceladoPor: null,
  };
  lista(guildId).push(enc);
  salvar();
  return enc;
}

function obter(guildId, encomendaId) {
  if (!encomendaId) return null;
  return lista(guildId).find((e) => e.id === String(encomendaId)) || null;
}

function atualizar(guildId, encomendaId, mudancas) {
  const e = obter(guildId, encomendaId);
  if (!e) return null;
  Object.assign(e, mudancas);
  salvar();
  return e;
}

// Guarda a referencia da mensagem publica no ticket (para editar em vez de
// spammar). Mesmo padrao da mensagem do pedido em compras.
function registrarMensagem(guildId, encomendaId, canalId, msgId) {
  return atualizar(guildId, encomendaId, { canalId, msgId });
}

// Descobre a encomenda dona de uma mensagem publica, para bloquear quem nao e
// o cliente criador (reusa a ideia do carrinhoStore.donoDoPainel).
function donaDaMensagem(guildId, msgId) {
  if (!guildId || !msgId) return null;
  return lista(guildId).find((e) => e.msgId === msgId) || null;
}

// Avanca um passo do ciclo de vida, validando a transicao e registrando quem fez.
// SOMENTE operacional: iniciar/entregar NAO marcam pagamento. A entrada (50%) e
// o restante (50%) so podem ser dados como pagos por uma acao explicita de
// pagamento, que ainda nao existe — os campos ficam neutros/false.
// Retorna { ok, encomenda, motivo }.
function avancar(guildId, encomendaId, userId) {
  const e = obter(guildId, encomendaId);
  if (!e) return { ok: false, motivo: 'ausente', encomenda: null };
  const proximo = PROXIMO[e.status];
  if (!proximo) return { ok: false, motivo: 'final', encomenda: e };
  const agora = Date.now();
  const marcas = {
    em_andamento: { iniciadoEm: agora, iniciadoPor: userId },
    item_recebido: { recebidoEm: agora, recebidoPor: userId },
    entregue: { entregueEm: agora, entreguePor: userId },
  };
  const marcasDoPasso = marcas[proximo];
  for (const [chave, valor] of Object.entries(marcasDoPasso)) {
    e[chave] = valor;
  }
  e.status = proximo;
  salvar();
  return { ok: true, motivo: null, encomenda: e };
}

function cancelar(guildId, encomendaId, userId) {
  const e = obter(guildId, encomendaId);
  if (!e) return { ok: false, motivo: 'ausente', encomenda: null };
  if (e.status === 'cancelada') return { ok: false, motivo: 'ja_cancelada', encomenda: e };
  if (e.status === 'entregue') return { ok: false, motivo: 'ja_entregue', encomenda: e };
  e.status = 'cancelada';
  e.canceladoEm = Date.now();
  e.canceladoPor = userId;
  salvar();
  return { ok: true, motivo: null, encomenda: e };
}

function doCliente(guildId, clienteId) {
  return lista(guildId).filter((e) => e.clienteId && String(e.clienteId) === String(clienteId));
}

function removerDaGuild(guildId) {
  if (!dados[guildId]) return;
  delete dados[guildId];
  salvar();
}

module.exports = {
  STATUS,
  PROXIMO,
  PRAZO_HORAS,
  emCentavos,
  deCentavos,
  calcularEntrada,
  novoId,
  lista,
  criar,
  obter,
  atualizar,
  registrarPainel,
  donoDoPainel,
  registrarMensagem,
  donaDaMensagem,
  avancar,
  cancelar,
  doCliente,
  removerDaGuild,
  _arquivo: FILE,
};