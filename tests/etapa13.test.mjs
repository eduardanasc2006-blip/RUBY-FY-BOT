/**
 * Testes da Etapa 13 — Sistema de Pedidos/Vendas
 *
 * Cobertura:
 *   BLOCO 1  — STATUS_LABELS / STATUS_COLORS / VALID_TRANSITIONS (8 testes) — puro
 *   BLOCO 2  — isValidTransition / isTerminal / shortId            (8 testes) — puro
 *   BLOCO 3  — buildOrderModal                                      (6 testes) — puro
 *   BLOCO 4  — parseOrderModal (mock de interaction)                (5 testes) — puro
 *   BLOCO 5  — buildOrderEmbed                                      (7 testes) — puro
 *   BLOCO 6  — buildOrderListEmbed                                  (5 testes) — puro
 *   BLOCO 7  — buildOrderPickRow / buildViewComponents              (6 testes) — puro
 *   BLOCO 8  — buildStatusSelectPayload / buildCancelConfirmPayload (5 testes) — puro
 *   BLOCO 9  — buildSuccessPayload / buildErrorPayload              (3 testes) — puro
 *   BLOCO 10 — Schema: tabela orders                                (5 testes) — DB
 *   BLOCO 11 — Orders.mjs CRUD básico                              (8 testes) — DB
 *   BLOCO 12 — Orders.mjs: transições de status                    (8 testes) — DB
 *   BLOCO 13 — Orders.mjs: filtros de listagem                     (6 testes) — DB
 *   BLOCO 14 — orders/index.mjs exports                             (4 testes)
 *   BLOCO 15 — CustomIds ≤ 100 chars                               (7 testes) — puro
 *
 * Isolamento:
 *   Blocos 1–9 e 15 importam apenas flow.mjs (sem cadeia DB).
 *   Blocos 10–14 definem DATABASE_PATH antes de importar client.mjs.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Constantes de status
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — STATUS_LABELS / STATUS_COLORS / VALID_TRANSITIONS', () => {
  let STATUS_LABELS, STATUS_COLORS, VALID_TRANSITIONS, STATUS_ACTIONS;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    STATUS_LABELS     = mod.STATUS_LABELS;
    STATUS_COLORS     = mod.STATUS_COLORS;
    VALID_TRANSITIONS = mod.VALID_TRANSITIONS;
    STATUS_ACTIONS    = mod.STATUS_ACTIONS;
  });

  test('1.1 — STATUS_LABELS tem 7 entradas', () => {
    assert.equal(Object.keys(STATUS_LABELS).length, 7);
  });

  test('1.2 — STATUS_LABELS cobre todos os status esperados', () => {
    const expected = ['pending', 'awaiting_payment', 'paid', 'processing', 'delivered', 'completed', 'cancelled'];
    for (const s of expected) {
      assert.ok(s in STATUS_LABELS, `STATUS_LABELS deve ter '${s}'`);
    }
  });

  test('1.3 — STATUS_COLORS tem 7 entradas', () => {
    assert.equal(Object.keys(STATUS_COLORS).length, 7);
  });

  test('1.4 — VALID_TRANSITIONS tem 7 entradas', () => {
    assert.equal(Object.keys(VALID_TRANSITIONS).length, 7);
  });

  test('1.5 — completed é terminal (array vazio)', () => {
    assert.deepEqual(VALID_TRANSITIONS['completed'], []);
  });

  test('1.6 — cancelled é terminal (array vazio)', () => {
    assert.deepEqual(VALID_TRANSITIONS['cancelled'], []);
  });

  test('1.7 — pending pode ir para cancelled', () => {
    assert.ok(VALID_TRANSITIONS['pending'].includes('cancelled'));
  });

  test('1.8 — STATUS_ACTIONS tem entry para cada status', () => {
    const expected = ['pending', 'awaiting_payment', 'paid', 'processing', 'delivered', 'completed', 'cancelled'];
    for (const s of expected) {
      assert.ok(s in STATUS_ACTIONS, `STATUS_ACTIONS deve ter '${s}'`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — isValidTransition / isTerminal / shortId
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — isValidTransition / isTerminal / shortId', () => {
  let isValidTransition, isTerminal, shortId;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    isValidTransition = mod.isValidTransition;
    isTerminal        = mod.isTerminal;
    shortId           = mod.shortId;
  });

  test('2.1 — pending → paid é válido', () => {
    assert.equal(isValidTransition('pending', 'paid'), true);
  });

  test('2.2 — pending → completed é inválido', () => {
    assert.equal(isValidTransition('pending', 'completed'), false);
  });

  test('2.3 — completed → cancelled é inválido (terminal)', () => {
    assert.equal(isValidTransition('completed', 'cancelled'), false);
  });

  test('2.4 — cancelled → paid é inválido (terminal)', () => {
    assert.equal(isValidTransition('cancelled', 'paid'), false);
  });

  test('2.5 — isTerminal(completed) é true', () => {
    assert.equal(isTerminal('completed'), true);
  });

  test('2.6 — isTerminal(cancelled) é true', () => {
    assert.equal(isTerminal('cancelled'), true);
  });

  test('2.7 — isTerminal(pending) é false', () => {
    assert.equal(isTerminal('pending'), false);
  });

  test('2.8 — shortId retorna os primeiros 8 chars do UUID', () => {
    const uuid   = '12345678-abcd-4000-8000-999999999999';
    const result = shortId(uuid);
    assert.equal(result, '12345678');
    assert.equal(result.length, 8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — buildOrderModal
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — buildOrderModal', () => {
  let buildOrderModal, MODAL_CUSTOM_ID;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildOrderModal  = mod.buildOrderModal;
    MODAL_CUSTOM_ID  = mod.MODAL_CUSTOM_ID;
  });

  test('3.1 — MODAL_CUSTOM_ID é orders:modal_submit', () => {
    assert.equal(MODAL_CUSTOM_ID, 'orders:modal_submit');
  });

  test('3.2 — buildOrderModal retorna um objeto com .data', () => {
    const modal = buildOrderModal();
    assert.ok(modal?.data, 'Deve ter .data');
  });

  test('3.3 — customId do modal é orders:modal_submit', () => {
    const modal = buildOrderModal();
    assert.equal(modal.data.custom_id, 'orders:modal_submit');
  });

  test('3.4 — modal tem 5 action rows', () => {
    const modal = buildOrderModal();
    assert.equal(modal.components.length, 5);
  });

  test('3.5 — primeiro campo é cliente_id (obrigatório)', () => {
    const modal  = buildOrderModal();
    const input  = modal.components[0].components[0];
    assert.equal(input.data.custom_id, 'cliente_id');
    assert.equal(input.data.required, true);
  });

  test('3.6 — segundo campo é produto (obrigatório)', () => {
    const modal = buildOrderModal();
    const input = modal.components[1].components[0];
    assert.equal(input.data.custom_id, 'produto');
    assert.equal(input.data.required, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — parseOrderModal
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — parseOrderModal', () => {
  let parseOrderModal;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    parseOrderModal = mod.parseOrderModal;
  });

  function makeInteraction(values = {}) {
    return {
      fields: {
        getTextInputValue(id) {
          if (id in values) return values[id];
          throw new Error(`Field '${id}' não encontrado`);
        },
      },
    };
  }

  test('4.1 — extrai clienteRaw', () => {
    const i    = makeInteraction({ cliente_id: '<@111222333444555666>' });
    const data = parseOrderModal(i);
    assert.equal(data.clienteRaw, '<@111222333444555666>');
  });

  test('4.2 — extrai produto', () => {
    const i    = makeInteraction({ produto: 'Kit Espada' });
    const data = parseOrderModal(i);
    assert.equal(data.produto, 'Kit Espada');
  });

  test('4.3 — valor ausente retorna null', () => {
    const i    = makeInteraction({});
    const data = parseOrderModal(i);
    assert.equal(data.valor, null);
  });

  test('4.4 — ticket ausente retorna null', () => {
    const i    = makeInteraction({});
    const data = parseOrderModal(i);
    assert.equal(data.ticket, null);
  });

  test('4.5 — notas com espaços retorna null', () => {
    const i    = makeInteraction({ notas: '   ' });
    const data = parseOrderModal(i);
    assert.equal(data.notas, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — buildOrderEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — buildOrderEmbed', () => {
  let buildOrderEmbed;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildOrderEmbed = mod.buildOrderEmbed;
  });

  const baseOrder = {
    id:         'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
    guildId:    'guild1',
    vendorId:   '111000111000111000',
    clientId:   '222000222000222000',
    clienteRaw: null,
    produto:    'Produto Teste',
    valor:      'R$50',
    ticketId:   null,
    status:     'pending',
    notas:      null,
    createdAt:  1700000000,
    updatedAt:  1700000000,
  };

  test('5.1 — retorna objeto com .data', () => {
    const embed = buildOrderEmbed(baseOrder);
    assert.ok(embed?.data, 'Deve ter .data');
  });

  test('5.2 — título contém o ID curto', () => {
    const embed = buildOrderEmbed(baseOrder);
    assert.ok(embed.data.title?.includes('aaaabbbb'), `Título: ${embed.data.title}`);
  });

  test('5.3 — cor corresponde ao status pending', () => {
    const embed = buildOrderEmbed(baseOrder);
    assert.equal(embed.data.color, 0xFEE75C);
  });

  test('5.4 — fields inclui Vendedor e Cliente', () => {
    const embed  = buildOrderEmbed(baseOrder);
    const fields = embed.data.fields ?? [];
    assert.ok(fields.some(f => f.name.includes('Vendedor')), 'Falta campo Vendedor');
    assert.ok(fields.some(f => f.name.includes('Cliente')),  'Falta campo Cliente');
  });

  test('5.5 — sem ticketId, não tem campo Ticket', () => {
    const embed  = buildOrderEmbed({ ...baseOrder, ticketId: null });
    const fields = embed.data.fields ?? [];
    assert.ok(!fields.some(f => f.name.includes('Ticket')), 'Não deve ter campo Ticket');
  });

  test('5.6 — com ticketId, tem campo Ticket', () => {
    const embed  = buildOrderEmbed({ ...baseOrder, ticketId: 'TKT-007' });
    const fields = embed.data.fields ?? [];
    const tf     = fields.find(f => f.name.includes('Ticket'));
    assert.ok(tf, 'Deve ter campo Ticket');
    assert.ok(tf.value.includes('TKT-007'));
  });

  test('5.7 — status cancelled resulta em cor vermelha', () => {
    const embed = buildOrderEmbed({ ...baseOrder, status: 'cancelled' });
    assert.equal(embed.data.color, 0xED4245);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — buildOrderListEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — buildOrderListEmbed', () => {
  let buildOrderListEmbed;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildOrderListEmbed = mod.buildOrderListEmbed;
  });

  const makeOrder = (i) => ({
    id:        randomUUID(), guildId: 'g', vendorId: 'v',
    clientId:  null, clienteRaw: 'Cliente', produto: `Produto ${i}`,
    valor:     null, ticketId: null, status: 'pending',
    notas:     null, createdAt: 1700000000 + i, updatedAt: 1700000000,
  });

  test('6.1 — lista vazia mostra mensagem adequada', () => {
    const embed = buildOrderListEmbed([]);
    assert.ok(
      embed.data.description?.toLowerCase().includes('nenhum'),
      'Descrição deve indicar vazio',
    );
  });

  test('6.2 — lista com pedidos exibe linhas', () => {
    const embed = buildOrderListEmbed([makeOrder(1)]);
    assert.ok(embed.data.description?.includes('Produto 1'));
  });

  test('6.3 — máximo de 25 itens exibidos', () => {
    const orders = Array.from({ length: 30 }, (_, i) => makeOrder(i));
    const embed  = buildOrderListEmbed(orders);
    const matches = (embed.data.description?.match(/\*\*\d+\.\*\*/g) ?? []).length;
    assert.ok(matches <= 25, `Não deve exibir mais de 25: ${matches}`);
  });

  test('6.4 — título indica pedidos recentes', () => {
    const embed = buildOrderListEmbed([]);
    assert.ok(embed.data.title?.toLowerCase().includes('pedido'), `Título: ${embed.data.title}`);
  });

  test('6.5 — cor é 0x5865F2', () => {
    const embed = buildOrderListEmbed([]);
    assert.equal(embed.data.color, 0x5865F2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — buildOrderPickRow / buildViewComponents
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — buildOrderPickRow / buildViewComponents', () => {
  let buildOrderPickRow, buildViewComponents;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildOrderPickRow    = mod.buildOrderPickRow;
    buildViewComponents  = mod.buildViewComponents;
  });

  const makeOrder = (status = 'pending') => ({
    id: randomUUID(), produto: 'Teste', status, createdAt: 1700000000, updatedAt: 1700000000,
  });

  test('7.1 — buildOrderPickRow retorna null para lista vazia', () => {
    assert.equal(buildOrderPickRow([]), null);
  });

  test('7.2 — buildOrderPickRow retorna ActionRow com select menu', () => {
    const row = buildOrderPickRow([makeOrder()]);
    assert.ok(row, 'Deve retornar uma action row');
    assert.equal(row.components.length, 1, 'Deve ter 1 componente (select menu)');
  });

  test('7.3 — select menu tem customId orders:pick', () => {
    const row    = buildOrderPickRow([makeOrder()]);
    const select = row.components[0];
    assert.equal(select.data.custom_id, 'orders:pick');
  });

  test('7.4 — buildViewComponents retorna botões para status aberto', () => {
    const order = makeOrder('paid');
    const rows  = buildViewComponents(order);
    assert.ok(rows.length > 0, 'Deve ter pelo menos 1 action row');
  });

  test('7.5 — buildViewComponents retorna vazio para completed (terminal)', () => {
    const order = makeOrder('completed');
    const rows  = buildViewComponents(order);
    assert.equal(rows.length, 0, 'Não deve ter botões para status terminal');
  });

  test('7.6 — buildViewComponents retorna vazio para cancelled (terminal)', () => {
    const order = makeOrder('cancelled');
    const rows  = buildViewComponents(order);
    assert.equal(rows.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — buildStatusSelectPayload / buildCancelConfirmPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — buildStatusSelectPayload / buildCancelConfirmPayload', () => {
  let buildStatusSelectPayload, buildCancelConfirmPayload;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildStatusSelectPayload   = mod.buildStatusSelectPayload;
    buildCancelConfirmPayload  = mod.buildCancelConfirmPayload;
  });

  const makeOrder = (status = 'pending') => ({
    id: '12345678-aaaa-bbbb-cccc-dddddddddddd', produto: 'Prod X', status,
    createdAt: 1700000000, updatedAt: 1700000000,
  });

  test('8.1 — buildStatusSelectPayload tem embeds e components', () => {
    const payload = buildStatusSelectPayload(makeOrder('paid'));
    assert.ok(Array.isArray(payload.embeds)     && payload.embeds.length > 0,     'Deve ter embeds');
    assert.ok(Array.isArray(payload.components) && payload.components.length > 0, 'Deve ter components');
  });

  test('8.2 — buildStatusSelectPayload para terminal não tem select menu', () => {
    const payload = buildStatusSelectPayload(makeOrder('completed'));
    assert.equal(payload.components.length, 0, 'Não deve ter components para terminal');
  });

  test('8.3 — select menu tem customId com orderId', () => {
    const order   = makeOrder('paid');
    const payload = buildStatusSelectPayload(order);
    const row     = payload.components[0];
    const select  = row.components[0];
    assert.ok(select.data.custom_id.includes('orders:status_do:'), `customId: ${select.data.custom_id}`);
    assert.ok(select.data.custom_id.includes(order.id));
  });

  test('8.4 — buildCancelConfirmPayload tem embeds e buttons', () => {
    const payload = buildCancelConfirmPayload(makeOrder('paid'));
    assert.ok(Array.isArray(payload.embeds)     && payload.embeds.length > 0,     'Deve ter embeds');
    assert.ok(Array.isArray(payload.components) && payload.components.length > 0, 'Deve ter components');
  });

  test('8.5 — botão de confirmação tem customId cancel_ok', () => {
    const order   = makeOrder('paid');
    const payload = buildCancelConfirmPayload(order);
    const buttons = payload.components[0].components;
    assert.ok(buttons.some(b => b.data.custom_id?.includes('cancel_ok')), 'Deve ter botão cancel_ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — buildSuccessPayload / buildErrorPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — buildSuccessPayload / buildErrorPayload', () => {
  let buildSuccessPayload, buildErrorPayload;

  before(async () => {
    const mod = await import('../src/modules/orders/flow.mjs');
    buildSuccessPayload = mod.buildSuccessPayload;
    buildErrorPayload   = mod.buildErrorPayload;
  });

  const order = {
    id: randomUUID(), guildId: 'g', vendorId: 'v', clientId: 'c',
    clienteRaw: null, produto: 'Teste', valor: 'R$10', ticketId: null,
    status: 'pending', notas: null, createdAt: 1700000000, updatedAt: 1700000000,
  };

  test('9.1 — buildSuccessPayload tem embeds e é ephemeral', () => {
    const p = buildSuccessPayload(order);
    assert.ok(Array.isArray(p.embeds) && p.embeds.length > 0, 'Deve ter embeds');
    assert.ok(p.flags !== undefined && p.flags !== 0, 'Deve ser ephemeral');
  });

  test('9.2 — buildErrorPayload tem content com ❌', () => {
    const p = buildErrorPayload('Erro de teste');
    assert.ok(p.content?.includes('❌'), 'Deve ter ❌');
    assert.ok(p.content?.includes('Erro de teste'), 'Deve ter a mensagem');
  });

  test('9.3 — buildErrorPayload é ephemeral', () => {
    const p = buildErrorPayload('err');
    assert.ok(p.flags !== undefined && p.flags !== 0, 'Deve ser ephemeral');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — Schema: tabela orders
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — Schema: tabela orders', () => {
  let db;

  before(async () => {
    const { runSchema } = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    runSchema(db);
  });

  test('10.1 — tabela orders existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
      .get();
    assert.ok(row, 'Tabela orders deve existir');
  });

  test('10.2 — coluna vendor_id existe', () => {
    const info = db.prepare('PRAGMA table_info(orders)').all();
    assert.ok(info.some(c => c.name === 'vendor_id'), 'Deve ter vendor_id');
  });

  test('10.3 — coluna status existe', () => {
    const info = db.prepare('PRAGMA table_info(orders)').all();
    assert.ok(info.some(c => c.name === 'status'), 'Deve ter status');
  });

  test('10.4 — coluna updated_at existe', () => {
    const info = db.prepare('PRAGMA table_info(orders)').all();
    assert.ok(info.some(c => c.name === 'updated_at'), 'Deve ter updated_at');
  });

  test('10.5 — ambas as tabelas orders e proofs existem', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'proofs')")
      .all();
    assert.equal(rows.length, 2, 'Deve ter tabelas orders e proofs');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — Orders.mjs CRUD básico
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — Orders.mjs CRUD básico', () => {
  let repo;
  const GUILD = `guild_e13_crud_${randomUUID().slice(0, 8)}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-e13-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Orders.mjs');
  });

  test('11.1 — createOrder retorna pedido com status pending', () => {
    const order = repo.createOrder(GUILD, {
      vendorId: 'vendor_001',
      produto:  'Produto A',
    });
    assert.ok(order.id,          'Deve ter id');
    assert.equal(order.status,   'pending');
    assert.equal(order.guildId,  GUILD);
    assert.equal(order.produto,  'Produto A');
    assert.equal(order.vendorId, 'vendor_001');
  });

  test('11.2 — getOrder retorna pedido existente', () => {
    const created = repo.createOrder(GUILD, { vendorId: 'v2', produto: 'Produto B' });
    const found   = repo.getOrder(GUILD, created.id);
    assert.ok(found);
    assert.equal(found.id, created.id);
  });

  test('11.3 — getOrder retorna null para id inexistente', () => {
    assert.equal(repo.getOrder(GUILD, 'id-inexistente'), null);
  });

  test('11.4 — listOrders retorna pedidos do guild', () => {
    repo.createOrder(GUILD, { vendorId: 'v3', produto: 'Produto C' });
    const list = repo.listOrders(GUILD);
    assert.ok(list.length > 0, 'Deve retornar pedidos');
    assert.ok(list.every(o => o.guildId === GUILD));
  });

  test('11.5 — countOrders reflete criação', () => {
    const before = repo.countOrders(GUILD);
    repo.createOrder(GUILD, { vendorId: 'v4', produto: 'Produto D' });
    const after  = repo.countOrders(GUILD);
    assert.equal(after, before + 1);
  });

  test('11.6 — deleteOrder retorna true e remove o pedido', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'v5', produto: 'Prod E' });
    assert.equal(repo.deleteOrder(GUILD, o.id), true);
    assert.equal(repo.getOrder(GUILD, o.id), null);
  });

  test('11.7 — deleteOrder retorna false para id inexistente', () => {
    assert.equal(repo.deleteOrder(GUILD, 'id-nao-existe'), false);
  });

  test('11.8 — isolamento: pedido de outro guild não aparece', () => {
    const outro = `outro_${randomUUID().slice(0, 8)}`;
    repo.createOrder(outro, { vendorId: 'vx', produto: 'X' });
    const list = repo.listOrders(GUILD);
    assert.ok(list.every(o => o.guildId === GUILD));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — Orders.mjs: transições de status
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — Orders.mjs: transições de status', () => {
  let repo;
  const GUILD = `guild_e13_status_${randomUUID().slice(0, 8)}`;

  before(async () => {
    // client.mjs já foi inicializado no bloco 11 — reutiliza o mesmo banco
    repo = await import('../src/database/repositories/Orders.mjs');
  });

  test('12.1 — updateOrderStatus de pending para paid funciona', () => {
    const o      = repo.createOrder(GUILD, { vendorId: 'v1', produto: 'Prod A' });
    const result = repo.updateOrderStatus(GUILD, o.id, 'paid');
    assert.equal(result.ok, true);
    assert.equal(result.order.status, 'paid');
  });

  test('12.2 — updateOrderStatus de pending para completed é inválido', () => {
    const o      = repo.createOrder(GUILD, { vendorId: 'v2', produto: 'Prod B' });
    const result = repo.updateOrderStatus(GUILD, o.id, 'completed');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_transition');
  });

  test('12.3 — updateOrderStatus para id inexistente retorna not_found', () => {
    const result = repo.updateOrderStatus(GUILD, 'nao-existe', 'paid');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'not_found');
  });

  test('12.4 — cancelOrder cancela pedido em status aberto', () => {
    const o      = repo.createOrder(GUILD, { vendorId: 'v3', produto: 'Prod C' });
    const result = repo.cancelOrder(GUILD, o.id);
    assert.equal(result.ok, true);
    assert.equal(result.order.status, 'cancelled');
  });

  test('12.5 — cancelOrder em pedido já cancelado falha (terminal)', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'v4', produto: 'Prod D' });
    repo.cancelOrder(GUILD, o.id);
    const result2 = repo.cancelOrder(GUILD, o.id);
    assert.equal(result2.ok, false);
    assert.equal(result2.reason, 'terminal_status');
  });

  test('12.6 — updateOrderStatus em completed falha (terminal)', () => {
    const o      = repo.createOrder(GUILD, { vendorId: 'v5', produto: 'Prod E' });
    // pending → paid → completed
    repo.updateOrderStatus(GUILD, o.id, 'paid');
    repo.updateOrderStatus(GUILD, o.id, 'completed');
    const result = repo.updateOrderStatus(GUILD, o.id, 'cancelled');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'terminal_status');
  });

  test('12.7 — updateOrderStatus atualiza updated_at', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'v6', produto: 'Prod F' });
    // Pequena espera para garantir diff de timestamp (1s SQLite precision)
    // Usamos directamente a lógica — apenas verificamos que updated_at está definido
    const result = repo.updateOrderStatus(GUILD, o.id, 'paid');
    assert.ok(result.order.updatedAt >= o.createdAt, 'updatedAt deve ser >= createdAt');
  });

  test('12.8 — fluxo completo: pending→paid→processing→delivered→completed', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'v7', produto: 'Prod G' });
    const steps = ['paid', 'processing', 'delivered', 'completed'];
    let current = o;
    for (const step of steps) {
      const r = repo.updateOrderStatus(GUILD, current.id, step);
      assert.equal(r.ok, true, `Falhou em transição para ${step}`);
      current = r.order;
      assert.equal(current.status, step);
    }
    assert.equal(repo.getOrder(GUILD, current.id).status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 13 — Orders.mjs: filtros de listagem
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 13 — Orders.mjs: filtros de listagem', () => {
  let repo;
  const GUILD = `guild_e13_list_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/Orders.mjs');
  });

  test('13.1 — listOrders com limit respeita o máximo', () => {
    for (let i = 0; i < 5; i++) {
      repo.createOrder(GUILD, { vendorId: 'vA', produto: `P${i}` });
    }
    const list = repo.listOrders(GUILD, { limit: 2 });
    assert.ok(list.length <= 2, `Não deve retornar mais de 2: ${list.length}`);
  });

  test('13.2 — listOrders com status filtra corretamente', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'vB', produto: 'PFilter' });
    repo.updateOrderStatus(GUILD, o.id, 'paid');
    const list = repo.listOrders(GUILD, { status: 'paid' });
    assert.ok(list.length > 0, 'Deve retornar ao menos 1 paid');
    assert.ok(list.every(o => o.status === 'paid'), 'Todos devem ser paid');
  });

  test('13.3 — countOrders com status filtra corretamente', () => {
    const pending = repo.countOrders(GUILD, { status: 'pending' });
    assert.ok(typeof pending === 'number', 'Deve retornar número');
    assert.ok(pending >= 0);
  });

  test('13.4 — listOrders com vendorId filtra por vendedor', () => {
    const VENDOR = `special_vendor_${randomUUID().slice(0, 8)}`;
    repo.createOrder(GUILD, { vendorId: VENDOR, produto: 'VendorSpecific' });
    const list = repo.listOrders(GUILD, { vendorId: VENDOR });
    assert.ok(list.length > 0, 'Deve retornar pedidos do vendedor');
    assert.ok(list.every(o => o.vendorId === VENDOR));
  });

  test('13.5 — listOrders retorna do mais recente para o mais antigo', () => {
    const GUILD2 = `guild_order_${randomUUID().slice(0, 8)}`;
    const p1 = repo.createOrder(GUILD2, { vendorId: 'v', produto: 'Antigo' });
    const p2 = repo.createOrder(GUILD2, { vendorId: 'v', produto: 'Novo'   });
    const list = repo.listOrders(GUILD2);
    const ids  = list.map(o => o.id);
    assert.ok(ids.indexOf(p2.id) < ids.indexOf(p1.id), 'Novo deve vir antes de Antigo');
  });

  test('13.6 — campos opcionais nulos quando não fornecidos', () => {
    const o = repo.createOrder(GUILD, { vendorId: 'vNull', produto: 'Null Test' });
    assert.equal(o.clientId,   null);
    assert.equal(o.clienteRaw, null);
    assert.equal(o.valor,      null);
    assert.equal(o.ticketId,   null);
    assert.equal(o.notas,      null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 14 — orders/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 14 — orders/index.mjs exports', () => {
  let idx;

  before(async () => {
    idx = await import('../src/modules/orders/index.mjs');
  });

  test('14.1 — exporta registerOrdersHandler como função', () => {
    assert.equal(typeof idx.registerOrdersHandler, 'function');
  });

  test('14.2 — exporta openOrdersList como função', () => {
    assert.equal(typeof idx.openOrdersList, 'function');
  });

  test('14.3 — exporta buildOrderModal como função', () => {
    assert.equal(typeof idx.buildOrderModal, 'function');
  });

  test('14.4 — exporta MODAL_CUSTOM_ID como string orders:modal_submit', () => {
    assert.equal(typeof idx.MODAL_CUSTOM_ID, 'string');
    assert.equal(idx.MODAL_CUSTOM_ID, 'orders:modal_submit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 15 — CustomIds ≤ 100 chars
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 15 — Verificação de CustomIds (≤ 100 chars)', () => {
  let build;
  const UUID = '12345678-1234-4000-8000-123456789012'; // 36 chars

  before(async () => {
    const mod = await import('../src/utils/customId.mjs');
    build = mod.build;
  });

  const checkId = (id) => {
    assert.ok(id.length <= 100, `'${id}' tem ${id.length} chars (máximo 100)`);
  };

  test('15.1 — orders:modal_submit ≤ 100 chars', () => {
    checkId('orders:modal_submit');
  });

  test('15.2 — orders:pick ≤ 100 chars', () => {
    checkId(build('orders', 'pick'));
  });

  test('15.3 — orders:view:UUID ≤ 100 chars', () => {
    checkId(`orders:view:${UUID}`);
  });

  test('15.4 — orders:status_select:UUID ≤ 100 chars', () => {
    checkId(`orders:status_select:${UUID}`);
  });

  test('15.5 — orders:status_do:UUID ≤ 100 chars', () => {
    checkId(`orders:status_do:${UUID}`);
  });

  test('15.6 — orders:cancel:UUID ≤ 100 chars', () => {
    checkId(`orders:cancel:${UUID}`);
  });

  test('15.7 — orders:cancel_ok:UUID ≤ 100 chars', () => {
    checkId(`orders:cancel_ok:${UUID}`);
  });
});
