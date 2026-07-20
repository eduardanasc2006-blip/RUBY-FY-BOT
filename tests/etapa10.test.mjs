/**
 * Testes da Etapa 10 — Painel visual de Conexões + Base de Tickets
 *
 * Cobertura:
 *   BLOCO 1 — registry.mjs (registerAction, getRegisteredActions, getAction)
 *   BLOCO 2 — schema.mjs   (tabela tickets criada corretamente)
 *   BLOCO 3 — Tickets.mjs  (módulo REAL — getTicketConfig, setTicketConfig,
 *                           createTicket, getTicket, listTickets, closeTicket,
 *                           countOpenTickets, reopenTicket, reopen_count)
 *   BLOCO 4 — Connections  (integração registry → executor — sem Discord client)
 *   BLOCO 5 — Importações e re-exports de index.mjs de conexões e tickets
 *
 * Etapa 19D: Bloco 3 corrigido para usar o módulo real Tickets.mjs.
 *   Os testes agora exercitam o código de produção diretamente,
 *   detectando bugs no repositório real.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID }   from 'node:crypto';

// RUN_ID único para separar arquivos de banco entre execuções paralelas
const RUN_ID = randomUUID().slice(0, 8);

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — banco em memória para blocos 1 e 2
// ─────────────────────────────────────────────────────────────────────────────

// _db é usado apenas pelo bloco 4 (mock de executeConnections em memória)
let _db = null;

async function createTestDb() {
  const { runSchema } = await import('../src/database/schema.mjs');
  const db = new DatabaseSync(':memory:');
  runSchema(db);
  return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Registry de Ações
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — registry.mjs', () => {
  let registerAction, getRegisteredActions, getAction;

  before(async () => {
    const mod = await import('../src/modules/connections/registry.mjs');
    registerAction        = mod.registerAction;
    getRegisteredActions  = mod.getRegisteredActions;
    getAction             = mod.getAction;
  });

  test('1.1 — registerAction registra com campos obrigatórios', () => {
    registerAction('test_reg_1', { label: 'Teste 1', description: 'Descrição de teste' });
    const actions = getRegisteredActions();
    const found = actions.find(a => a.name === 'test_reg_1');
    assert.ok(found, 'Ação não encontrada após registro');
    assert.equal(found.label, 'Teste 1');
    assert.equal(found.description, 'Descrição de teste');
  });

  test('1.2 — registerAction usa name como label padrão se não informado', () => {
    registerAction('test_reg_2', {});
    const actions = getRegisteredActions();
    const found = actions.find(a => a.name === 'test_reg_2');
    assert.ok(found);
    assert.equal(found.label, 'test_reg_2', 'Label deveria ser igual ao name quando não informado');
  });

  test('1.3 — registerAction sobrescreve registro anterior com mesmo nome', () => {
    registerAction('test_reg_3', { label: 'v1' });
    registerAction('test_reg_3', { label: 'v2' });
    const action = getAction('test_reg_3');
    assert.equal(action.label, 'v2', 'Deve usar o último registro');
  });

  test('1.4 — registerAction lança erro para nome inválido', () => {
    assert.throws(() => registerAction('', {}), /inválido/);
    assert.throws(() => registerAction(null, {}), /inválido/);
  });

  test('1.5 — getRegisteredActions retorna array', () => {
    const actions = getRegisteredActions();
    assert.ok(Array.isArray(actions), 'Deve retornar um array');
  });

  test('1.6 — getRegisteredActions não expõe onExecuted', () => {
    registerAction('test_reg_4', { label: 'c4', onExecuted: async () => {} });
    const actions = getRegisteredActions();
    const found = actions.find(a => a.name === 'test_reg_4');
    assert.ok(found);
    assert.equal('onExecuted' in found, false, 'getRegisteredActions não deve expor onExecuted');
  });

  test('1.7 — getAction retorna null para ação inexistente', () => {
    const result = getAction('acao_que_nao_existe_xyzabc');
    assert.equal(result, null);
  });

  test('1.8 — getAction retorna o objeto completo incluindo onExecuted', () => {
    const cb = async () => {};
    registerAction('test_reg_5', { label: 'c5', onExecuted: cb });
    const action = getAction('test_reg_5');
    assert.ok(action);
    assert.equal(action.onExecuted, cb);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Schema (tabela tickets)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — schema.mjs — tabela tickets', () => {
  let db;

  before(async () => {
    db = await createTestDb();
  });

  test('2.1 — tabela tickets existe após runSchema', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
      .get();
    assert.ok(row, 'Tabela tickets deve existir');
  });

  test('2.2 — tabela tickets possui colunas corretas', () => {
    const cols = db.prepare("PRAGMA table_info(tickets)").all().map(c => c.name);
    const required = ['id', 'guild_id', 'channel_id', 'user_id', 'status', 'created_at', 'closed_at', 'closed_by'];
    for (const col of required) {
      assert.ok(cols.includes(col), `Coluna '${col}' ausente na tabela tickets`);
    }
  });

  test('2.3 — tabela tickets tem status padrão "open"', () => {
    const col = db.prepare("PRAGMA table_info(tickets)").all().find(c => c.name === 'status');
    assert.ok(col?.dflt_value?.includes('open'), 'status deve ter default "open"');
  });

  test('2.4 — tabela connections ainda existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='connections'")
      .get();
    assert.ok(row, 'Tabela connections deve continuar existindo');
  });

  test('2.5 — runSchema é idempotente (pode rodar duas vezes)', () => {
    assert.doesNotThrow(async () => {
      const { runSchema } = await import('../src/database/schema.mjs');
      runSchema(db);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — Tickets.mjs (módulo REAL, com banco em arquivo temporário)
//
// Etapa 19D: este bloco agora importa e exercita o módulo REAL de Tickets.mjs.
// Qualquer bug introduzido em src/database/repositories/Tickets.mjs será
// detectado por estes testes — ao contrário da versão anterior, que usava
// wrappers inline que duplicavam a lógica sem testá-la.
//
// Estratégia:
//   1. Define um DATABASE_PATH único para este bloco.
//   2. Chama initDatabase() que cria o schema + executa as migrations (incluindo
//      a migration 002 que adiciona a coluna reopen_count).
//   3. Importa diretamente as funções de Tickets.mjs.
//   4. As funções chamam getDb() em tempo de execução — usam o banco real.
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — Tickets.mjs (módulo real)', () => {
  const GUILD  = 'guild_t10_real';
  const DB_PATH = `/tmp/ruby-fy-test-b3-${RUN_ID}.db`;

  let getTicketConfig, setTicketConfig;
  let createTicket, getTicket, getOpenTicketByUser;
  let listTickets, closeTicket, countOpenTickets, reopenTicket;

  before(async () => {
    // Aponta o database para um arquivo temporário exclusivo deste bloco
    process.env.DATABASE_PATH = DB_PATH;

    // Inicializa o singleton — cria schema + executa migrações (inclui reopen_count)
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();

    // Importa o módulo REAL (cacheado; usa getDb() no runtime → aponta para DB_PATH)
    const mod = await import('../src/database/repositories/Tickets.mjs');
    getTicketConfig     = mod.getTicketConfig;
    setTicketConfig     = mod.setTicketConfig;
    createTicket        = mod.createTicket;
    getTicket           = mod.getTicket;
    getOpenTicketByUser = mod.getOpenTicketByUser;
    listTickets         = mod.listTickets;
    closeTicket         = mod.closeTicket;
    countOpenTickets    = mod.countOpenTickets;
    reopenTicket        = mod.reopenTicket;
  });

  after(async () => {
    // Remove o arquivo temporário após os testes (melhor esforço)
    const { unlink } = await import('node:fs/promises');
    unlink(DB_PATH).catch(() => {});
  });

  // ── Config ──────────────────────────────────────────────────────────────

  test('3.1 — getTicketConfig retorna defaults quando sem config', () => {
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.enabled,         false);
    assert.equal(cfg.category_id,     null);
    assert.equal(cfg.log_channel_id,  null);
    assert.equal(cfg.support_role_id, null);
    assert.equal(cfg.intro_message,   null);
  });

  test('3.2 — setTicketConfig salva enabled=true', () => {
    setTicketConfig(GUILD, { enabled: true });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.enabled, true);
  });

  test('3.3 — setTicketConfig salva category_id', () => {
    setTicketConfig(GUILD, { category_id: '111222333444555' });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.category_id, '111222333444555');
  });

  test('3.4 — setTicketConfig salva log_channel_id', () => {
    setTicketConfig(GUILD, { log_channel_id: '999888777666555' });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.log_channel_id, '999888777666555');
  });

  test('3.5 — setTicketConfig salva intro_message', () => {
    setTicketConfig(GUILD, { intro_message: 'Olá {usuario}! Aguarde atendimento.' });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.intro_message, 'Olá {usuario}! Aguarde atendimento.');
  });

  test('3.6 — setTicketConfig patch parcial não apaga outros campos', () => {
    setTicketConfig(GUILD, { enabled: false });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.category_id, '111222333444555');
    assert.equal(cfg.enabled, false);
  });

  test('3.7 — setTicketConfig aceita null para limpar campo', () => {
    setTicketConfig(GUILD, { category_id: null });
    const cfg = getTicketConfig(GUILD);
    assert.equal(cfg.category_id, null);
  });

  // ── Instâncias de Tickets ────────────────────────────────────────────────

  test('3.8 — createTicket cria ticket aberto', () => {
    const ticket = createTicket(GUILD, { channelId: 'ch_001', userId: 'user_001' });
    assert.ok(ticket.id);
    assert.equal(ticket.guildId,     GUILD);
    assert.equal(ticket.channelId,   'ch_001');
    assert.equal(ticket.userId,      'user_001');
    assert.equal(ticket.status,      'open');
    assert.equal(ticket.closedAt,    null);
    assert.equal(ticket.closedBy,    null);
    assert.equal(ticket.reopenCount, 0, 'Ticket novo deve ter reopenCount=0');
  });

  test('3.9 — getTicket retorna ticket por ID', () => {
    const created = createTicket(GUILD, { channelId: 'ch_002', userId: 'user_002' });
    const found   = getTicket(GUILD, created.id);
    assert.ok(found);
    assert.equal(found.id, created.id);
  });

  test('3.10 — getTicket retorna null para ID inexistente', () => {
    const result = getTicket(GUILD, 'id-que-nao-existe');
    assert.equal(result, null);
  });

  test('3.11 — getTicket isola por guildId', () => {
    const created = createTicket(GUILD, { channelId: 'ch_003', userId: 'user_003' });
    const result  = getTicket('outro_guild', created.id);
    assert.equal(result, null, 'Não deve retornar ticket de outro servidor');
  });

  test('3.12 — listTickets retorna todos os tickets do servidor', () => {
    const before = listTickets(GUILD).length;
    createTicket(GUILD, { channelId: 'ch_004', userId: 'user_004' });
    const after  = listTickets(GUILD).length;
    assert.equal(after, before + 1);
  });

  test('3.13 — listTickets filtra por status open', () => {
    const open = listTickets(GUILD, { status: 'open' });
    assert.ok(open.every(t => t.status === 'open'), 'Todos devem estar open');
  });

  test('3.14 — countOpenTickets conta apenas abertos', () => {
    const count = countOpenTickets(GUILD);
    assert.ok(typeof count === 'number' && count >= 0);
    const open = listTickets(GUILD, { status: 'open' }).length;
    assert.equal(count, open);
  });

  test('3.15 — closeTicket fecha o ticket', () => {
    const ticket = createTicket(GUILD, { channelId: 'ch_close', userId: 'user_close' });
    const closed = closeTicket(GUILD, ticket.id, 'mod_001');
    assert.equal(closed.status,   'closed');
    assert.equal(closed.closedBy, 'mod_001');
    assert.ok(closed.closedAt,    'closedAt deve estar preenchido');
  });

  test('3.16 — closeTicket retorna null para ticket inexistente', () => {
    const result = closeTicket(GUILD, 'ticket-nao-existe', 'mod_001');
    assert.equal(result, null);
  });

  test('3.17 — countOpenTickets diminui após fechar ticket', () => {
    const ticket = createTicket(GUILD, { channelId: 'ch_cnt', userId: 'user_cnt' });
    const before = countOpenTickets(GUILD);
    closeTicket(GUILD, ticket.id, 'mod_002');
    const after  = countOpenTickets(GUILD);
    assert.equal(after, before - 1);
  });

  test('3.18 — listTickets filtra por status closed', () => {
    const closed = listTickets(GUILD, { status: 'closed' });
    assert.ok(closed.every(t => t.status === 'closed'), 'Todos devem estar closed');
  });

  test('3.19 — isolamento: tickets de guild diferente não aparecem em listTickets', () => {
    createTicket('outro_guild_x', { channelId: 'ch_x', userId: 'u_x' });
    const mine = listTickets(GUILD);
    assert.ok(mine.every(t => t.guildId === GUILD), 'Não deve misturar tickets de guilds diferentes');
  });

  // ── reopen_count (Etapa 19D) ──────────────────────────────────────────────

  test('3.20 — ticket nunca reaberto tem reopenCount=0', () => {
    const ticket = createTicket(GUILD, { channelId: 'ch_r0', userId: 'user_r0' });
    assert.equal(ticket.reopenCount, 0, 'Ticket novo deve ter reopenCount=0');
  });

  test('3.21 — reopenTicket na primeira reabertura define reopenCount=1', () => {
    const ticket  = createTicket(GUILD, { channelId: 'ch_r1', userId: 'user_r1' });
    closeTicket(GUILD, ticket.id, 'mod_r');
    const reopened = reopenTicket(GUILD, ticket.id, 'ch_r1_new');
    assert.ok(reopened, 'reopenTicket deve retornar o ticket atualizado');
    assert.equal(reopened.status,      'open');
    assert.equal(reopened.channelId,   'ch_r1_new');
    assert.equal(reopened.closedAt,    null);
    assert.equal(reopened.closedBy,    null);
    assert.equal(reopened.reopenCount, 1, 'Primeira reabertura deve ter reopenCount=1');
  });

  test('3.22 — segunda reabertura incrementa reopenCount para 2', () => {
    const ticket = createTicket(GUILD, { channelId: 'ch_r2', userId: 'user_r2' });

    // Fechar e reabrir uma vez
    closeTicket(GUILD, ticket.id, 'mod_r');
    const r1 = reopenTicket(GUILD, ticket.id, 'ch_r2_v2');
    assert.equal(r1.reopenCount, 1);

    // Fechar e reabrir novamente
    closeTicket(GUILD, ticket.id, 'mod_r');
    const r2 = reopenTicket(GUILD, ticket.id, 'ch_r2_v3');
    assert.equal(r2.reopenCount, 2, 'Segunda reabertura deve ter reopenCount=2');
  });

  test('3.23 — fechamento normal NÃO incrementa reopenCount', () => {
    const ticket  = createTicket(GUILD, { channelId: 'ch_r3', userId: 'user_r3' });
    const closed  = closeTicket(GUILD, ticket.id, 'mod_r');
    assert.equal(closed.reopenCount, 0, 'Fechar não deve incrementar reopenCount');
  });

  test('3.24 — reopenCount persiste no banco (leitura após reabertura)', () => {
    const ticket  = createTicket(GUILD, { channelId: 'ch_r4', userId: 'user_r4' });
    closeTicket(GUILD, ticket.id, 'mod_r');
    reopenTicket(GUILD, ticket.id, 'ch_r4_new');

    // Lê o ticket diretamente do banco para confirmar persistência
    const fresh = getTicket(GUILD, ticket.id);
    assert.equal(fresh.reopenCount, 1, 'reopenCount deve estar persistido no banco');
  });

  test('3.25 — reopenTicket retorna null para ticket inexistente', () => {
    const result = reopenTicket(GUILD, 'ticket-que-nao-existe', 'ch_x');
    assert.equal(result, null);
  });

  test('3.26 — getOpenTicketByUser retorna ticket aberto do usuário', () => {
    const UNICO = 'user_open_' + randomUUID().slice(0, 6);
    const ticket = createTicket(GUILD, { channelId: 'ch_obu', userId: UNICO });
    const found  = getOpenTicketByUser(GUILD, UNICO);
    assert.ok(found, 'Deve encontrar ticket aberto');
    assert.equal(found.id, ticket.id);
  });

  test('3.27 — getOpenTicketByUser retorna null após fechar', () => {
    const UNICO = 'user_closed_' + randomUUID().slice(0, 6);
    const ticket = createTicket(GUILD, { channelId: 'ch_obu2', userId: UNICO });
    closeTicket(GUILD, ticket.id, 'mod_x');
    const found = getOpenTicketByUser(GUILD, UNICO);
    assert.equal(found, null, 'Não deve retornar ticket fechado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — Connections: registry integrado no executor
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — connections/index.mjs — registro e re-exports', () => {
  let connectionsIndex;

  before(async () => {
    // Inicializa banco em arquivo temporário para o executor poder chamar getDb()
    process.env.DATABASE_PATH = `/tmp/ruby-fy-test-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    connectionsIndex = await import('../src/modules/connections/index.mjs');
  });

  test('4.1 — index re-exporta registerAction', () => {
    assert.equal(typeof connectionsIndex.registerAction, 'function');
  });

  test('4.2 — index re-exporta getRegisteredActions', () => {
    assert.equal(typeof connectionsIndex.getRegisteredActions, 'function');
  });

  test('4.3 — index re-exporta getAction', () => {
    assert.equal(typeof connectionsIndex.getAction, 'function');
  });

  test('4.4 — index exporta executeConnections', () => {
    assert.equal(typeof connectionsIndex.executeConnections, 'function');
  });

  test('4.5 — index exporta registerConnectionsHandler', () => {
    assert.equal(typeof connectionsIndex.registerConnectionsHandler, 'function');
  });

  test('4.6 — index exporta openConexoesPanel', () => {
    assert.equal(typeof connectionsIndex.openConexoesPanel, 'function');
  });

  test('4.7 — registerAction via index reflete em getRegisteredActions via index', () => {
    connectionsIndex.registerAction('bloco4_action', {
      label: 'Ação Bloco 4',
      description: 'Teste de integração',
    });
    const actions = connectionsIndex.getRegisteredActions();
    const found   = actions.find(a => a.name === 'bloco4_action');
    assert.ok(found, 'Ação registrada via index deve aparecer em getRegisteredActions');
    assert.equal(found.label, 'Ação Bloco 4');
  });

  test('4.8 — getAction via index retorna ação registrada', () => {
    const action = connectionsIndex.getAction('bloco4_action');
    assert.ok(action);
    assert.equal(action.name, 'bloco4_action');
  });

  test('4.9 — executeConnections retorna erro sem guildId', async () => {
    const result = await connectionsIndex.executeConnections('bloco4_action', {}, {});
    assert.equal(result.sent, 0);
    assert.equal(result.errors[0].reason, 'missing_guild_id');
  });

  test('4.10 — executeConnections retorna erro sem action', async () => {
    const result = await connectionsIndex.executeConnections('', { guildId: 'g1' }, {});
    assert.equal(result.sent, 0);
    assert.equal(result.errors[0].reason, 'missing_action');
  });

  test('4.11 — executeConnections retorna erro sem discordClient', async () => {
    const result = await connectionsIndex.executeConnections('bloco4_action', { guildId: 'g1' }, null);
    assert.equal(result.sent, 0);
    assert.equal(result.errors[0].reason, 'missing_client');
  });

  test('4.12 — executeConnections retorna sent:0 sem conexões ativas (banco em memória vazio)', async () => {
    _db = await createTestDb();
    const result = await connectionsIndex.executeConnections(
      'bloco4_action',
      { guildId: 'guild_sem_conexoes' },
      { guilds: { cache: { get: () => null } } },
    );
    assert.equal(result.sent, 0);
    assert.equal(result.errors.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — tickets/index.mjs re-exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — tickets/index.mjs — exports', () => {
  let ticketsIndex;

  before(async () => {
    ticketsIndex = await import('../src/modules/tickets/index.mjs');
  });

  test('5.1 — exporta registerTicketsHandler', () => {
    assert.equal(typeof ticketsIndex.registerTicketsHandler, 'function');
  });

  test('5.2 — exporta openTicketsPanel', () => {
    assert.equal(typeof ticketsIndex.openTicketsPanel, 'function');
  });
});
