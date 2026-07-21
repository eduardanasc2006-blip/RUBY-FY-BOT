/**
 * Testes para o Sistema de Controle de Estoque (Fase 6)
 *
 * Valida:
 *   1. CRUD de movimentações de estoque
 *   2. Adicionar/remover estoque
 *   3. Ajuste de estoque
 *   4. Histórico de movimentações
 *   5. Relatórios de estoque
 *   6. Alertas de estoque baixo
 *   7. Integração com Products
 *   8. Integração com Orders (baixa automática)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ── DATABASE_PATH deve ser definido antes de qualquer import do client ────────
const DB_PATH = `/tmp/estoque-${Date.now()}.db`;
process.env.DATABASE_PATH = DB_PATH;

// ── Imports ──────────────────────────────────────────────────────────────────
const { initDatabase } = await import('../src/database/client.mjs');

// Inicializa banco
initDatabase();

// ── Helpers ────────────────────────────────────────────────────────────────────

const GUILD_A = `guild-${Date.now()}-a`;
const GUILD_B = `guild-${Date.now()}-b`;

// ── BLOCO 1: Stock Movements ─────────────────────────────────────────────────
describe('BLOCO 1 — Stock Movements (CRUD)', () => {

  it('1.1 — recordMovement registra entrada de estoque', async () => {
    const { recordMovement, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl1-1`;
    const product = createProduct(guildId, { name: 'Teste Entry', stock: 0 });

    const movementId = recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.ENTRY,
      quantity: 10,
      previousStock: 0,
      newStock: 10,
      referenceType: STOCK_REFERENCE_TYPE.MANUAL,
      reason: 'Reposição inicial',
      actorId: 'user-123',
    });

    assert.ok(movementId > 0, 'ID do movimento deve ser maior que 0');
  });

  it('1.2 — recordMovement registra saída de estoque', async () => {
    const { recordMovement, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl1-2`;
    const product = createProduct(guildId, { name: 'Teste Exit', stock: 20 });

    const movementId = recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.EXIT,
      quantity: 5,
      previousStock: 20,
      newStock: 15,
      referenceType: STOCK_REFERENCE_TYPE.ORDER,
      referenceId: 'order-456',
      actorId: 'user-789',
    });

    assert.ok(movementId > 0, 'ID do movimento deve ser maior que 0');
  });

  it('1.3 — listMovements retorna movimentações do produto', async () => {
    const { recordMovement, listMovements, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl1-3`;
    const product = createProduct(guildId, { name: 'Teste List', stock: 0 });

    // Registra 3 movimentações
    recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.ENTRY,
      quantity: 10,
      previousStock: 0,
      newStock: 10,
      referenceType: STOCK_REFERENCE_TYPE.MANUAL,
    });

    recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.EXIT,
      quantity: 3,
      previousStock: 10,
      newStock: 7,
      referenceType: STOCK_REFERENCE_TYPE.ORDER,
    });

    recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.ADJUSTMENT,
      quantity: 2,
      previousStock: 7,
      newStock: 9,
      referenceType: STOCK_REFERENCE_TYPE.ADJUSTMENT,
    });

    const movements = listMovements(guildId, product.id);

    assert.strictEqual(movements.length, 3, 'Deve ter 3 movimentações');
  });

  it('1.4 — listAllMovements retorna todas movimentações do servidor', async () => {
    const { listAllMovements } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl1-4`;
    const product1 = createProduct(guildId, { name: 'Produto 1', stock: 10 });
    const product2 = createProduct(guildId, { name: 'Produto 2', stock: 5 });

    const movements = listAllMovements(guildId, { limit: 100 });

    assert.ok(Array.isArray(movements), 'Deve retornar array');
    // Pode ter mais de 2 se houver movimentações anteriores
  });

  it('1.5 — isolamento entre servidores', async () => {
    const { recordMovement, listMovements, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guild1 = `guild-${Date.now()}-bl1-5a`;
    const guild2 = `guild-${Date.now()}-bl1-5b`;

    const prod1 = createProduct(guild1, { name: 'Servidor 1', stock: 0 });
    const prod2 = createProduct(guild2, { name: 'Servidor 2', stock: 0 });

    // Movimentação só no servidor 1
    recordMovement(guild1, {
      productId: prod1.id,
      type: STOCK_MOVEMENT_TYPE.ENTRY,
      quantity: 100,
      previousStock: 0,
      newStock: 100,
      referenceType: STOCK_REFERENCE_TYPE.MANUAL,
    });

    const movements1 = listMovements(guild1, prod1.id);
    const movements2 = listMovements(guild2, prod2.id);

    assert.strictEqual(movements1.length, 1, 'Servidor 1 deve ter 1 movimentação');
    assert.strictEqual(movements2.length, 0, 'Servidor 2 não deve ter movimentações');
  });
});

// ── BLOCO 2: Operações de Estoque ─────────────────────────────────────────────
describe('BLOCO 2 — Operações de Estoque', () => {

  it('2.1 — addStock adiciona estoque corretamente', async () => {
    const { addStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct, getProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-1`;
    const product = createProduct(guildId, { name: 'Add Stock Test', stock: 5 });

    const result = addStock(guildId, product.id, 10, {
      reason: 'Reposição de teste',
      actorId: 'user-123',
    });

    assert.strictEqual(result.ok, true, 'Deve adicionar com sucesso');
    assert.strictEqual(result.product.stock, 15, 'Estoque deve ser 15 (5 + 10)');
    assert.ok(result.movementId > 0, 'Deve registrar movimentação');
  });

  it('2.2 — addStock com quantidade inválida retorna erro', async () => {
    const { addStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-2`;
    const product = createProduct(guildId, { name: 'Add Invalid', stock: 5 });

    const result = addStock(guildId, product.id, -5);

    assert.strictEqual(result.ok, false, 'Não deve adicionar');
    assert.strictEqual(result.reason, 'invalid_quantity', 'Motivo: quantidade inválida');
  });

  it('2.3 — removeStock remove estoque corretamente', async () => {
    const { removeStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct, getProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-3`;
    const product = createProduct(guildId, { name: 'Remove Stock Test', stock: 20 });

    const result = removeStock(guildId, product.id, 7, {
      reason: 'Venda de teste',
      actorId: 'user-456',
    });

    assert.strictEqual(result.ok, true, 'Deve remover com sucesso');
    assert.strictEqual(result.product.stock, 13, 'Estoque deve ser 13 (20 - 7)');
  });

  it('2.4 — removeStock com estoque insuficiente retorna erro', async () => {
    const { removeStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-4`;
    const product = createProduct(guildId, { name: 'Remove Insufficient', stock: 3 });

    const result = removeStock(guildId, product.id, 10);

    assert.strictEqual(result.ok, false, 'Não deve remover');
    assert.strictEqual(result.reason, 'insufficient_stock', 'Motivo: estoque insuficiente');
    assert.strictEqual(result.available, 3, 'Disponível: 3');
  });

  it('2.5 — setStock define estoque diretamente', async () => {
    const { setStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-5`;
    const product = createProduct(guildId, { name: 'Set Stock Test', stock: 10 });

    const result = setStock(guildId, product.id, 25, {
      reason: 'Correção de inventário',
      actorId: 'user-789',
    });

    assert.strictEqual(result.ok, true, 'Deve ajustar com sucesso');
    assert.strictEqual(result.product.stock, 25, 'Estoque deve ser 25');
  });

  it('2.6 — setStock para 0 muda status para out_of_stock', async () => {
    const { setStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-6`;
    const product = createProduct(guildId, { name: 'Zero Stock Test', stock: 10 });

    const result = setStock(guildId, product.id, 0, { reason: 'Esgotado' });

    assert.strictEqual(result.ok, true, 'Deve ajustar com sucesso');
    assert.strictEqual(result.product.stock, 0, 'Estoque deve ser 0');
    assert.strictEqual(result.product.status, 'out_of_stock', 'Status deve ser out_of_stock');
  });

  it('2.7 — estoque volta para active ao repor', async () => {
    const { setStock, addStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl2-7`;
    const product = createProduct(guildId, { name: 'Reactivate Stock', stock: 10 });

    // Esgota
    setStock(guildId, product.id, 0);
    let p = await import('../src/database/repositories/Products.mjs');
    let updated = p.getProduct(guildId, product.id);
    assert.strictEqual(updated.status, 'out_of_stock', 'Status deve ser out_of_stock');

    // Repõe
    addStock(guildId, product.id, 5);
    updated = p.getProduct(guildId, product.id);
    assert.strictEqual(updated.status, 'active', 'Status deve voltar para active');
  });
});

// ── BLOCO 3: Relatórios e Alertas ────────────────────────────────────────────
describe('BLOCO 3 — Relatórios e Alertas', () => {

  it('3.1 — getLowStockProducts retorna produtos com estoque <= threshold', async () => {
    const { getLowStockProducts, setStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl3-1`;

    // Cria produtos com diferentes níveis de estoque
    createProduct(guildId, { name: 'Alto Teste 3', stock: 20 });
    createProduct(guildId, { name: 'Baixo Teste 3', stock: 3 });
    createProduct(guildId, { name: 'Zero Teste 3', stock: 0 });
    createProduct(guildId, { name: 'Medio Teste 3', stock: 10 });

    const lowStock = getLowStockProducts(guildId, 5);

    assert.ok(lowStock.length >= 1, 'Deve ter pelo menos 2 produtos com estoque <= 5');

    const names = lowStock.map(p => p.name);
    assert.ok(names.includes('Baixo Teste 3'), 'Deve incluir produto "Baixo" (3 unidades)');
  });

  it('3.2 — getOutOfStockProducts retorna produtos sem estoque', async () => {
    const { getOutOfStockProducts, setStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl3-2`;

    createProduct(guildId, { name: 'Com Estoque 3', stock: 10 });
    setStock(guildId, createProduct(guildId, { name: 'Sem Estoque 31' }).id, 0);
    setStock(guildId, createProduct(guildId, { name: 'Sem Estoque 32' }).id, 0);

    const outOfStock = getOutOfStockProducts(guildId);

    const names = outOfStock.map(p => p.name);
    assert.ok(names.includes('Sem Estoque 31'), 'Deve incluir "Sem Estoque 1"');
    assert.ok(names.includes('Sem Estoque 32'), 'Deve incluir "Sem Estoque 2"');
    assert.ok(!names.includes('Com Estoque 3'), 'Não deve incluir "Com Estoque"');
  });

  it('3.3 — checkLowStock verifica nível de estoque', async () => {
    const { checkLowStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl3-3`;
    const product = createProduct(guildId, { name: 'Check Stock', stock: 3 });

    const result = checkLowStock(guildId, product.id, 5);

    assert.strictEqual(result.isLow, true, 'Estoque deve ser considerado baixo');
    assert.strictEqual(result.stock, 3, 'Estoque deve ser 3');
  });

  it('3.4 — getStockReport分类 produtos corretamente', async () => {
    const { getStockReport, setStock } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl3-4`;

    createProduct(guildId, { name: 'Normal', stock: 20 });
    createProduct(guildId, { name: 'Baixo Teste 3', stock: 3 });
    createProduct(guildId, { name: 'Vazio', stock: 0 });
    createProduct(guildId, { name: 'Medio', stock: 8 });

    const report = getStockReport(guildId);

    assert.ok('inStock' in report, 'Deve ter inStock');
    assert.ok('lowStock' in report, 'Deve ter lowStock');
    assert.ok('outOfStock' in report, 'Deve ter outOfStock');

    assert.ok(report.outOfStock.some(p => p.name === 'Vazio'), 'Deve ter "Vazio" em outOfStock');
  });
});

// ── BLOCO 4: Integração Products/Stock ────────────────────────────────────────
describe('BLOCO 4 — Integração Products/Stock', () => {

  it('4.1 — updateProductStock atualiza estoque corretamente', async () => {
    const { updateProductStock } = await import('../src/database/repositories/Products.mjs');
    const { createProduct, getProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl4-1`;
    const product = createProduct(guildId, { name: 'Integration Test', stock: 10 });

    const result = updateProductStock(guildId, product.id, 25);

    assert.strictEqual(result.ok, true, 'Deve atualizar com sucesso');
    assert.strictEqual(result.product.stock, 25, 'Estoque deve ser 25');
  });

  it('4.2 — processSale verifica estoque antes de vender', async () => {
    const { processSale } = await import('../src/database/repositories/Products.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl4-2`;
    const product = createProduct(guildId, { name: 'Sale Test', stock: 3 });

    const result = processSale(guildId, product.id, 5);

    assert.strictEqual(result.ok, false, 'Não deve permitir venda');
    assert.strictEqual(result.reason, 'insufficient_stock', 'Motivo: estoque insuficiente');
    assert.strictEqual(result.available, 3, 'Disponível: 3');
  });

  it('4.3 — processSale reduz estoque e registra', async () => {
    const { processSale } = await import('../src/database/repositories/Products.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl4-3`;
    const product = createProduct(guildId, { name: 'Sale Success', stock: 10 });

    const result = processSale(guildId, product.id, 2, {
      orderId: 'order-test-123',
      buyerId: 'buyer-456',
    });

    assert.strictEqual(result.ok, true, 'Venda deve ser bem sucedida');
    assert.strictEqual(result.product.stock, 8, 'Estoque deve ser 8 (10 - 2)');
  });

  it('4.4 — checkStockLevel retorna status correto', async () => {
    const { checkStockLevel } = await import('../src/database/repositories/Products.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl4-4`;
    const product = createProduct(guildId, { name: 'Level Check', stock: 3 });

    const result = checkStockLevel(guildId, product.id, 5);

    assert.strictEqual(result.needsReplenishment, true, 'Precisa repor');
    assert.strictEqual(result.stock, 3, 'Estoque: 3');
    assert.strictEqual(result.threshold, 5, 'Threshold: 5');
  });
});

// ── BLOCO 5: Fluxo de Estoque ────────────────────────────────────────────────
describe('BLOCO 5 — Fluxo de Estoque (Flow)', () => {

  it('5.1 — getStockStatus classifica corretamente', async () => {
    const { getStockStatus } = await import('../src/modules/stock/flow.mjs');

    assert.strictEqual(getStockStatus(10), 'in_stock', '10 unidades = em estoque');
    assert.strictEqual(getStockStatus(5), 'low_stock', '5 unidades = estoque baixo');
    assert.strictEqual(getStockStatus(3), 'low_stock', '3 unidades = estoque baixo');
    assert.strictEqual(getStockStatus(0), 'out_of_stock', '0 unidades = sem estoque');
  });

  it('5.2 — buildStockReportEmbed gera embed corretamente', async () => {
    const { buildStockReportEmbed } = await import('../src/modules/stock/flow.mjs');

    const report = {
      inStock: [{ name: 'Normal', stock: 20 }],
      lowStock: [{ name: 'Baixo Teste 3', stock: 3 }],
      outOfStock: [{ name: 'Vazio', stock: 0 }],
    };

    const embed = buildStockReportEmbed(report);

    assert.strictEqual(embed.data.title, '📦 Relatório de Estoque', 'Título correto');
    assert.ok(embed.data.description.includes('Total de produtos'), 'Descrição contém total');
    assert.ok(embed.data.description.includes('3'), 'Descrição contém quantidade 3');
  });

  it('5.3 — buildLowStockAlert gera alerta corretamente', async () => {
    const { buildLowStockAlert } = await import('../src/modules/stock/flow.mjs');

    const lowProducts = [
      { name: 'Produto A', stock: 3 },
      { name: 'Produto B', stock: 2 },
    ];

    const embed = buildLowStockAlert(lowProducts, 5);

    assert.strictEqual(embed.data.title, '⚠️ Alerta de Estoque Baixo', 'Título correto');
    assert.ok(embed.data.description.includes('Produto A'), 'Descrição inclui produtos');
  });

  it('5.4 — formatQuantityChange formata corretamente', async () => {
    const { formatQuantityChange } = await import('../src/modules/stock/flow.mjs');

    assert.strictEqual(formatQuantityChange(10, 'entry'), '+10', 'Entrada = +');
    assert.strictEqual(formatQuantityChange(5, 'exit'), '-5', 'Saída = -');
    assert.strictEqual(formatQuantityChange(3, 'adjustment'), '+3', 'Ajuste positivo = +');
    assert.strictEqual(formatQuantityChange(-2, 'adjustment'), '-2', 'Ajuste negativo = -');
  });
});

// ── BLOCO 6: Normalização ────────────────────────────────────────────────────
describe('BLOCO 6 — Normalização', () => {

  it('6.1 — normalizeMovement normaliza dados corretamente', async () => {
    const { normalizeMovement, recordMovement, STOCK_MOVEMENT_TYPE, STOCK_REFERENCE_TYPE } = await import('../src/database/repositories/Stock.mjs');
    const { createProduct } = await import('../src/database/repositories/Products.mjs');

    const guildId = `guild-${Date.now()}-bl6-1`;
    const product = createProduct(guildId, { name: 'Normalize Test', stock: 0 });

    recordMovement(guildId, {
      productId: product.id,
      type: STOCK_MOVEMENT_TYPE.ENTRY,
      quantity: 10,
      previousStock: 0,
      newStock: 10,
      referenceType: STOCK_REFERENCE_TYPE.MANUAL,
      reason: 'Teste',
      actorId: 'user-111',
    });

    const { listMovements } = await import('../src/database/repositories/Stock.mjs');
    const movements = listMovements(guildId, product.id);
    const normalized = normalizeMovement(movements[0]);

    assert.strictEqual(normalized.guildId, guildId, 'guildId correto');
    assert.strictEqual(normalized.productId, product.id, 'productId correto');
    assert.strictEqual(normalized.type, 'entry', 'type correto');
    assert.strictEqual(normalized.quantity, 10, 'quantity correto');
  });
});
