/**
 * Testes da Etapa 16 — Automações Visuais
 *
 * Cobertura:
 *   BLOCO 1  — TRIGGERS_MAP (5 testes)
 *   BLOCO 2  — evaluateCondition (8 testes)
 *   BLOCO 3  — ACTION_TYPES e CONDITION_TYPES (5 testes)
 *   BLOCO 4  — buildAutomationEmbed (8 testes)
 *   BLOCO 5  — buildAutomationListEmbed (5 testes)
 *   BLOCO 6  — Schema: tabela automations (5 testes)
 *   BLOCO 7  — Schema: tabela automation_logs (3 testes)
 *   BLOCO 8  — Automations repository CRUD (12 testes)
 *   BLOCO 9  — Automation logs (5 testes)
 *   BLOCO 10 — evaluateConditions (array) (5 testes)
 *   BLOCO 11 — CustomIds ≤ 100 chars (5 testes)
 *   BLOCO 12 — automations/index.mjs exports (6 testes)
 *
 * Total: 72 testes
 *
 * Padrão de isolamento (idêntico aos testes etapa10–15):
 *   - Módulos que NÃO importam discord.js são importados via top-level await.
 *   - Módulos que importam discord.js são carregados dentro de before().
 *   - DATABASE_PATH é definido ANTES de qualquer import do client.mjs.
 *
 * Uso: node --test tests/etapa16.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// ── DATABASE_PATH deve ser definido antes de qualquer import do client ────────
const DB_PATH = `/tmp/etapa16-${Date.now()}.db`;
process.env.DATABASE_PATH = DB_PATH;

// ── Imports top-level: apenas módulos que NÃO importam discord.js ─────────────
const { initDatabase, getDb } = await import('../src/database/client.mjs');
const { runMigrations }       = await import('../src/database/migrations.mjs');

// Inicializa banco para os blocos DB
initDatabase();
runMigrations();

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — TRIGGERS_MAP
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — TRIGGERS_MAP', () => {
  let TRIGGERS_MAP, getTrigger, getTriggers;

  before(async () => {
    const mod  = await import('../src/modules/automations/flow.mjs');
    TRIGGERS_MAP = mod.TRIGGERS_MAP;
    getTrigger   = mod.getTrigger;
    getTriggers  = mod.getTriggers;
  });

  it('1.1 — TRIGGERS_MAP é um objeto', () => {
    assert.equal(typeof TRIGGERS_MAP, 'object');
    assert.ok(TRIGGERS_MAP !== null);
  });

  it('1.2 — ticket_opened está definido com label', () => {
    assert.ok(TRIGGERS_MAP.ticket_opened, 'ticket_opened deve existir');
    assert.ok(TRIGGERS_MAP.ticket_opened.label, 'deve ter label');
  });

  it('1.3 — order_paid está definido com label', () => {
    assert.ok(TRIGGERS_MAP.order_paid, 'order_paid deve existir');
    assert.ok(TRIGGERS_MAP.order_paid.label, 'deve ter label');
  });

  it('1.4 — client_registered está definido com label', () => {
    assert.ok(TRIGGERS_MAP.client_registered, 'client_registered deve existir');
    assert.ok(TRIGGERS_MAP.client_registered.label, 'deve ter label');
  });

  it('1.5 — proof_created está definido com label', () => {
    assert.ok(TRIGGERS_MAP.proof_created, 'proof_created deve existir');
    assert.ok(TRIGGERS_MAP.proof_created.label, 'deve ter label');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — evaluateCondition
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — evaluateCondition', () => {
  let evaluateCondition;

  before(async () => {
    const mod        = await import('../src/modules/automations/flow.mjs');
    evaluateCondition = mod.evaluateCondition;
  });

  it('2.1 — condição desconhecida retorna true', () => {
    const result = evaluateCondition({ type: 'unknown_xyz' }, {});
    assert.equal(result, true);
  });

  it('2.2 — has_role: membro com cargo retorna true', () => {
    const member = { roles: { cache: { has: (id) => id === 'role123' } } };
    const result = evaluateCondition({ type: 'has_role', roleId: 'role123' }, { member });
    assert.equal(result, true);
  });

  it('2.3 — has_role: membro sem cargo retorna false', () => {
    const member = { roles: { cache: { has: () => false } } };
    const result = evaluateCondition({ type: 'has_role', roleId: 'role999' }, { member });
    assert.equal(result, false);
  });

  it('2.4 — has_role: sem membro no contexto retorna false', () => {
    const result = evaluateCondition({ type: 'has_role', roleId: 'role123' }, {});
    assert.equal(result, false);
  });

  it('2.5 — in_channel: canal correto retorna true', () => {
    const result = evaluateCondition({ type: 'in_channel', channelId: 'chan1' }, { channelId: 'chan1' });
    assert.equal(result, true);
  });

  it('2.6 — in_channel: canal diferente retorna false', () => {
    const result = evaluateCondition({ type: 'in_channel', channelId: 'chan1' }, { channelId: 'chan2' });
    assert.equal(result, false);
  });

  it('2.7 — order_status: status correto retorna true', () => {
    const result = evaluateCondition({ type: 'order_status', status: 'paid' }, { orderStatus: 'paid' });
    assert.equal(result, true);
  });

  it('2.8 — order_status: status diferente retorna false', () => {
    const result = evaluateCondition({ type: 'order_status', status: 'paid' }, { orderStatus: 'pending' });
    assert.equal(result, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — ACTION_TYPES e CONDITION_TYPES
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — ACTION_TYPES e CONDITION_TYPES', () => {
  let ACTION_TYPES, CONDITION_TYPES, getActionType, getConditionType;

  before(async () => {
    const mod      = await import('../src/modules/automations/flow.mjs');
    ACTION_TYPES    = mod.ACTION_TYPES;
    CONDITION_TYPES = mod.CONDITION_TYPES;
    getActionType   = mod.getActionType;
    getConditionType = mod.getConditionType;
  });

  it('3.1 — ACTION_TYPES tem send_embed com label', () => {
    assert.ok(ACTION_TYPES.send_embed, 'send_embed deve existir');
    assert.ok(ACTION_TYPES.send_embed.label, 'deve ter label');
  });

  it('3.2 — ACTION_TYPES tem add_role e remove_role', () => {
    assert.ok(ACTION_TYPES.add_role,    'add_role deve existir');
    assert.ok(ACTION_TYPES.remove_role, 'remove_role deve existir');
  });

  it('3.3 — ACTION_TYPES tem log com label', () => {
    assert.ok(ACTION_TYPES.log, 'log deve existir');
    assert.ok(ACTION_TYPES.log.label, 'deve ter label');
  });

  it('3.4 — CONDITION_TYPES tem has_role e in_channel', () => {
    assert.ok(CONDITION_TYPES.has_role,    'has_role deve existir');
    assert.ok(CONDITION_TYPES.in_channel,  'in_channel deve existir');
  });

  it('3.5 — CONDITION_TYPES tem order_status com label', () => {
    assert.ok(CONDITION_TYPES.order_status, 'order_status deve existir');
    assert.ok(CONDITION_TYPES.order_status.label, 'deve ter label');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — buildAutomationEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — buildAutomationEmbed', () => {
  let buildAutomationEmbed;

  before(async () => {
    const mod       = await import('../src/modules/automations/flow.mjs');
    buildAutomationEmbed = mod.buildAutomationEmbed;
  });

  const makeAuto = (overrides = {}) => ({
    name:       'Minha Automação',
    trigger:    'ticket_opened',
    conditions: [],
    actions:    [],
    enabled:    true,
    ...overrides,
  });

  it('4.1 — retorna objeto com .data', () => {
    const embed = buildAutomationEmbed(makeAuto());
    assert.ok(embed?.data, 'deve ter .data');
  });

  it('4.2 — título contém o nome da automação', () => {
    const embed = buildAutomationEmbed(makeAuto({ name: 'TestAuto' }));
    assert.ok(embed.data.title?.includes('TestAuto'), `título deve incluir "TestAuto", got: ${embed.data.title}`);
  });

  it('4.3 — tem campo de gatilho', () => {
    const embed = buildAutomationEmbed(makeAuto({ trigger: 'ticket_opened' }));
    const fields = embed.data.fields ?? [];
    const gatilho = fields.find(f => f.name === 'Gatilho');
    assert.ok(gatilho, 'deve ter campo Gatilho');
    assert.ok(gatilho.value.length > 0, 'Gatilho deve ter valor');
  });

  it('4.4 — automação ativa tem cor verde', () => {
    const embed = buildAutomationEmbed(makeAuto({ enabled: true }));
    assert.equal(embed.data.color, 0x57F287);
  });

  it('4.5 — automação inativa tem cor vermelha', () => {
    const embed = buildAutomationEmbed(makeAuto({ enabled: false }));
    assert.equal(embed.data.color, 0xED4245);
  });

  it('4.6 — campo Condições mostra a contagem correta', () => {
    const embed = buildAutomationEmbed(makeAuto({
      conditions: [{ type: 'has_role', roleId: 'r1' }, { type: 'in_channel', channelId: 'c1' }],
    }));
    const fields = embed.data.fields ?? [];
    const conds  = fields.find(f => f.name === 'Condições');
    assert.ok(conds, 'deve ter campo Condições');
    assert.equal(conds.value, '2');
  });

  it('4.7 — campo Ações mostra a contagem correta', () => {
    const embed = buildAutomationEmbed(makeAuto({
      actions: [{ type: 'log' }, { type: 'add_role', roleId: 'r1' }],
    }));
    const fields = embed.data.fields ?? [];
    const acts   = fields.find(f => f.name === 'Ações');
    assert.ok(acts, 'deve ter campo Ações');
    assert.equal(acts.value, '2');
  });

  it('4.8 — aceita conditions e actions vazios sem erro', () => {
    assert.doesNotThrow(() => buildAutomationEmbed(makeAuto({ conditions: [], actions: [] })));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — buildAutomationListEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — buildAutomationListEmbed', () => {
  let buildAutomationListEmbed;

  before(async () => {
    const mod             = await import('../src/modules/automations/flow.mjs');
    buildAutomationListEmbed = mod.buildAutomationListEmbed;
  });

  it('5.1 — lista vazia retorna embed sem erro', () => {
    const embed = buildAutomationListEmbed([]);
    assert.ok(embed?.data, 'deve retornar embed com .data');
  });

  it('5.2 — título é "Automações Visuais"', () => {
    const embed = buildAutomationListEmbed([]);
    assert.ok(embed.data.title?.includes('Automações Visuais'), `got: ${embed.data.title}`);
  });

  it('5.3 — lista com itens inclui os nomes', () => {
    const automations = [
      { name: 'Auto A', trigger: 'ticket_opened', enabled: true  },
      { name: 'Auto B', trigger: 'order_paid',    enabled: false },
    ];
    const embed = buildAutomationListEmbed(automations);
    const field = embed.data.fields?.find(f => f.name === 'Lista');
    assert.ok(field, 'deve ter campo Lista');
    assert.ok(field.value.includes('Auto A'), 'deve incluir "Auto A"');
    assert.ok(field.value.includes('Auto B'), 'deve incluir "Auto B"');
  });

  it('5.4 — descrição menciona a contagem de automações', () => {
    const automations = [
      { name: 'A1', trigger: 'ticket_opened', enabled: true },
    ];
    const embed = buildAutomationListEmbed(automations);
    assert.ok(embed.data.description?.includes('1'), 'descrição deve mencionar contagem');
  });

  it('5.5 — status de cada automação aparece na lista', () => {
    const automations = [
      { name: 'Ativa',    trigger: 'ticket_opened', enabled: true  },
      { name: 'Inativa',  trigger: 'order_paid',    enabled: false },
    ];
    const embed = buildAutomationListEmbed(automations);
    const field = embed.data.fields?.find(f => f.name === 'Lista');
    assert.ok(field?.value.includes('✅'), 'ativa deve ter ✅');
    assert.ok(field?.value.includes('❌'), 'inativa deve ter ❌');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Schema: tabela automations
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — Schema: tabela automations', () => {
  const GUILD6 = `guild-schema6-${randomUUID()}`;

  before(() => {
    // Garante que o guild existe para satisfazer a FK
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(GUILD6);
  });

  it('6.1 — tabela automations existe no banco após migrations', () => {
    const db  = getDb();
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='automations'"
    ).get();
    assert.ok(row, 'tabela automations deve existir');
  });

  it('6.2 — INSERT na tabela automations funciona', () => {
    const db = getDb();
    const id = randomUUID();
    assert.doesNotThrow(() => {
      db.prepare(
        `INSERT INTO automations (id, guild_id, name, trigger_type) VALUES (?, ?, ?, ?)`
      ).run(id, GUILD6, 'Test Auto', 'ticket_opened');
    });
  });

  it('6.3 — enabled padrão é 1', () => {
    const db  = getDb();
    const id  = randomUUID();
    db.prepare(
      `INSERT INTO automations (id, guild_id, name, trigger_type) VALUES (?, ?, ?, ?)`
    ).run(id, GUILD6, 'Default Enabled', 'ticket_opened');
    const row = db.prepare('SELECT enabled FROM automations WHERE id = ?').get(id);
    assert.equal(row?.enabled, 1);
  });

  it('6.4 — conditions e actions têm valor padrão []', () => {
    const db  = getDb();
    const id  = randomUUID();
    db.prepare(
      `INSERT INTO automations (id, guild_id, name, trigger_type) VALUES (?, ?, ?, ?)`
    ).run(id, GUILD6, 'Default Arrays', 'order_paid');
    const row = db.prepare('SELECT conditions, actions FROM automations WHERE id = ?').get(id);
    assert.equal(row?.conditions, '[]');
    assert.equal(row?.actions,    '[]');
  });

  it('6.5 — created_at é preenchido automaticamente', () => {
    const db  = getDb();
    const id  = randomUUID();
    db.prepare(
      `INSERT INTO automations (id, guild_id, name, trigger_type) VALUES (?, ?, ?, ?)`
    ).run(id, GUILD6, 'Timestamp Test', 'proof_created');
    const row = db.prepare('SELECT created_at FROM automations WHERE id = ?').get(id);
    assert.ok(row?.created_at > 0, 'created_at deve ser positivo');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — Schema: tabela automation_logs
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — Schema: tabela automation_logs', () => {
  it('7.1 — tabela automation_logs existe no banco', () => {
    const db  = getDb();
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='automation_logs'"
    ).get();
    assert.ok(row, 'tabela automation_logs deve existir');
  });

  it('7.2 — INSERT na tabela automation_logs funciona', () => {
    const db = getDb();
    assert.doesNotThrow(() => {
      db.prepare(
        `INSERT INTO automation_logs (automation_id, guild_id, trigger_type, result) VALUES (?, ?, ?, ?)`
      ).run(randomUUID(), 'guild_test', 'ticket_opened', 'success');
    });
  });

  it('7.3 — executed_at é preenchido automaticamente', () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO automation_logs (automation_id, guild_id, trigger_type, result) VALUES (?, ?, ?, ?)`
    ).run(randomUUID(), 'guild_test', 'order_paid', 'success');
    const row = db.prepare(
      'SELECT executed_at FROM automation_logs ORDER BY id DESC LIMIT 1'
    ).get();
    assert.ok(row?.executed_at > 0, 'executed_at deve ser positivo');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — Automations repository CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — Automations repository CRUD', () => {
  let createAutomation, getAutomation, listAutomations, listEnabledAutomations,
      updateAutomation, enableAutomation, disableAutomation, deleteAutomation;

  const GUILD = `guild-crud-${randomUUID()}`;

  before(async () => {
    const mod = await import('../src/database/repositories/Automations.mjs');
    ({ createAutomation, getAutomation, listAutomations, listEnabledAutomations,
       updateAutomation, enableAutomation, disableAutomation, deleteAutomation } = mod);

    // Garante que o guild existe (FK)
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(GUILD);
  });

  it('8.1 — createAutomation retorna objeto com id', () => {
    const auto = createAutomation(GUILD, { name: 'Auto 1', trigger: 'ticket_opened' });
    assert.ok(auto?.id, 'deve ter id');
    assert.equal(auto.name, 'Auto 1');
    assert.equal(auto.trigger, 'ticket_opened');
  });

  it('8.2 — getAutomation retorna a automação criada', () => {
    const created = createAutomation(GUILD, { name: 'Auto Get', trigger: 'order_paid' });
    const fetched = getAutomation(GUILD, created.id);
    assert.equal(fetched?.id, created.id);
    assert.equal(fetched?.name, 'Auto Get');
  });

  it('8.3 — getAutomation com guildId errado retorna null', () => {
    const created = createAutomation(GUILD, { name: 'Auto Isolado', trigger: 'order_paid' });
    const result  = getAutomation('outro-guild', created.id);
    assert.equal(result, null);
  });

  it('8.4 — listAutomations retorna array', () => {
    const list = listAutomations(GUILD);
    assert.ok(Array.isArray(list), 'deve retornar array');
    assert.ok(list.length >= 1, 'deve ter pelo menos 1 item');
  });

  it('8.5 — listAutomations filtrada por trigger', () => {
    const GUILD2 = `guild-filter-${randomUUID()}`;
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(GUILD2);
    createAutomation(GUILD2, { name: 'TK1', trigger: 'ticket_opened' });
    createAutomation(GUILD2, { name: 'OP1', trigger: 'order_paid'    });
    const only = listAutomations(GUILD2, { trigger: 'ticket_opened' });
    assert.ok(only.every(a => a.trigger === 'ticket_opened'), 'todos devem ser ticket_opened');
  });

  it('8.6 — listEnabledAutomations só retorna automações ativas', () => {
    const GUILD3 = `guild-enabled-${randomUUID()}`;
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(GUILD3);
    const a1 = createAutomation(GUILD3, { name: 'Ativa',    trigger: 'ticket_opened' });
    const a2 = createAutomation(GUILD3, { name: 'Inativa',  trigger: 'ticket_opened' });
    disableAutomation(GUILD3, a2.id);
    const enabled = listEnabledAutomations(GUILD3, 'ticket_opened');
    assert.ok(enabled.some(a => a.id === a1.id), 'automação ativa deve aparecer');
    assert.ok(!enabled.some(a => a.id === a2.id), 'automação inativa não deve aparecer');
  });

  it('8.7 — updateAutomation altera o nome', () => {
    const created = createAutomation(GUILD, { name: 'Antigo', trigger: 'ticket_opened' });
    const updated = updateAutomation(GUILD, created.id, { name: 'Novo' });
    assert.equal(updated?.name, 'Novo');
  });

  it('8.8 — updateAutomation altera conditions e actions', () => {
    const created = createAutomation(GUILD, { name: 'Update Cond', trigger: 'ticket_opened' });
    const updated = updateAutomation(GUILD, created.id, {
      conditions: [{ type: 'has_role', roleId: 'r1' }],
      actions:    [{ type: 'log' }],
    });
    assert.equal(updated?.conditions.length, 1);
    assert.equal(updated?.actions.length, 1);
    assert.equal(updated?.conditions[0].type, 'has_role');
  });

  it('8.9 — enableAutomation ativa automação desabilitada', () => {
    const created = createAutomation(GUILD, { name: 'Para Ativar', trigger: 'order_paid' });
    disableAutomation(GUILD, created.id);
    const ok = enableAutomation(GUILD, created.id);
    assert.equal(ok, true);
    const fetched = getAutomation(GUILD, created.id);
    assert.equal(fetched?.enabled, true);
  });

  it('8.10 — disableAutomation desabilita automação', () => {
    const created = createAutomation(GUILD, { name: 'Para Desativar', trigger: 'order_paid' });
    const ok      = disableAutomation(GUILD, created.id);
    assert.equal(ok, true);
    const fetched = getAutomation(GUILD, created.id);
    assert.equal(fetched?.enabled, false);
  });

  it('8.11 — deleteAutomation remove a automação', () => {
    const created = createAutomation(GUILD, { name: 'Para Deletar', trigger: 'ticket_opened' });
    const ok      = deleteAutomation(GUILD, created.id);
    assert.equal(ok, true);
    const fetched = getAutomation(GUILD, created.id);
    assert.equal(fetched, null);
  });

  it('8.12 — deleteAutomation com guildId errado retorna false', () => {
    const created = createAutomation(GUILD, { name: 'Não Deletar', trigger: 'ticket_opened' });
    const ok      = deleteAutomation('outro-guild', created.id);
    assert.equal(ok, false);
    // A automação ainda deve existir
    const fetched = getAutomation(GUILD, created.id);
    assert.ok(fetched, 'automação ainda deve existir após tentativa inválida');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — Automation logs
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — Automation logs', () => {
  let createAutomation, logAutomationExecution, getAutomationLogs, countAutomationLogs;

  const GUILDL = `guild-logs-${randomUUID()}`;
  let autoId;

  before(async () => {
    const mod = await import('../src/database/repositories/Automations.mjs');
    ({ createAutomation, logAutomationExecution, getAutomationLogs, countAutomationLogs } = mod);

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(GUILDL);
    const auto = createAutomation(GUILDL, { name: 'LogTest', trigger: 'ticket_opened' });
    autoId = auto.id;
  });

  it('9.1 — logAutomationExecution insere log sem erro', () => {
    assert.doesNotThrow(() => {
      logAutomationExecution(GUILDL, autoId, 'ticket_opened', 'success', null);
    });
  });

  it('9.2 — getAutomationLogs retorna logs do guild', () => {
    const logs = getAutomationLogs(GUILDL);
    assert.ok(Array.isArray(logs), 'deve retornar array');
    assert.ok(logs.length >= 1, 'deve ter pelo menos 1 log');
  });

  it('9.3 — getAutomationLogs filtrado por result', () => {
    logAutomationExecution(GUILDL, autoId, 'ticket_opened', 'skipped', 'condition_failed');
    const skipped = getAutomationLogs(GUILDL, { result: 'skipped' });
    assert.ok(skipped.every(l => l.result === 'skipped'), 'todos devem ser skipped');
  });

  it('9.4 — getAutomationLogs filtrado por automationId', () => {
    const logs = getAutomationLogs(GUILDL, { automationId: autoId });
    assert.ok(logs.every(l => l.automation_id === autoId), 'todos devem ter o automationId correto');
  });

  it('9.5 — countAutomationLogs conta logs do guild', () => {
    const count = countAutomationLogs(GUILDL);
    assert.ok(typeof count === 'number', 'deve retornar número');
    assert.ok(count >= 2, 'deve ter pelo menos 2 logs');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — evaluateConditions (array)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — evaluateConditions (array)', () => {
  let evaluateConditions;

  before(async () => {
    const mod        = await import('../src/modules/automations/flow.mjs');
    evaluateConditions = mod.evaluateConditions;
  });

  it('10.1 — array vazio retorna true', () => {
    assert.equal(evaluateConditions([], {}), true);
  });

  it('10.2 — todas as condições passam retorna true', () => {
    const member = { roles: { cache: { has: (id) => id === 'r1' } } };
    const conds  = [
      { type: 'has_role',   roleId:    'r1'  },
      { type: 'in_channel', channelId: 'c1'  },
    ];
    const result = evaluateConditions(conds, { member, channelId: 'c1' });
    assert.equal(result, true);
  });

  it('10.3 — uma condição falha retorna false', () => {
    const member = { roles: { cache: { has: () => false } } };
    const conds  = [
      { type: 'has_role',   roleId: 'r_inexistente' },
      { type: 'in_channel', channelId: 'c1' },
    ];
    const result = evaluateConditions(conds, { member, channelId: 'c1' });
    assert.equal(result, false);
  });

  it('10.4 — null retorna true (gracioso)', () => {
    assert.equal(evaluateConditions(null, {}), true);
  });

  it('10.5 — condições são avaliadas em AND (short-circuit)', () => {
    // Segunda condição falha; resultado final deve ser false
    const member = { roles: { cache: { has: (id) => id === 'r1' } } };
    const conds  = [
      { type: 'has_role',    roleId: 'r1' },
      { type: 'order_status', status: 'paid' },  // context não tem orderStatus
    ];
    const result = evaluateConditions(conds, { member });
    assert.equal(result, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — CustomIds ≤ 100 chars
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — CustomIds ≤ 100 chars', () => {
  const UUID = randomUUID(); // 36 chars

  it('11.1 — atm:panel:UUID tem no máximo 100 chars', () => {
    const id = `atm:panel:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars: "${id}"`);
  });

  it('11.2 — atm:trigger_set:UUID tem no máximo 100 chars', () => {
    const id = `atm:trigger_set:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars: "${id}"`);
  });

  it('11.3 — atm:save:UUID tem no máximo 100 chars', () => {
    const id = `atm:save:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars: "${id}"`);
  });

  it('11.4 — atm:toggle:UUID tem no máximo 100 chars', () => {
    const id = `atm:toggle:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars: "${id}"`);
  });

  it('11.5 — atm:delete_ok:UUID tem no máximo 100 chars', () => {
    const id = `atm:delete_ok:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars: "${id}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — automations/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — automations/index.mjs exports', () => {
  let mod;

  before(async () => {
    mod = await import('../src/modules/automations/index.mjs');
  });

  it('12.1 — fireAutomationTrigger é uma função', () => {
    assert.equal(typeof mod.fireAutomationTrigger, 'function');
  });

  it('12.2 — registerAutomationsHandler é uma função', () => {
    assert.equal(typeof mod.registerAutomationsHandler, 'function');
  });

  it('12.3 — openAutomationsPanel é uma função', () => {
    assert.equal(typeof mod.openAutomationsPanel, 'function');
  });

  it('12.4 — TRIGGERS_MAP é exportado como objeto', () => {
    assert.equal(typeof mod.TRIGGERS_MAP, 'object');
    assert.ok(mod.TRIGGERS_MAP !== null);
  });

  it('12.5 — ACTION_TYPES é exportado como objeto', () => {
    assert.equal(typeof mod.ACTION_TYPES, 'object');
    assert.ok(mod.ACTION_TYPES !== null);
  });

  it('12.6 — CONDITION_TYPES é exportado como objeto', () => {
    assert.equal(typeof mod.CONDITION_TYPES, 'object');
    assert.ok(mod.CONDITION_TYPES !== null);
  });
});
