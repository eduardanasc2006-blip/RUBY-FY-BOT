/**
 * Testes da Etapa 15 — Hub, Migrações, Observabilidade, Permissões, Stats, Tickets Avançados.
 *
 * Cobertura:
 *   BLOCO 1  — Sistema de Migrações (15B)
 *   BLOCO 2  — Log de Eventos Estruturado (15C)
 *   BLOCO 3  — Repositório de Permissões (15E)
 *   BLOCO 4  — Estrutura do comando /stats (15F)
 *   BLOCO 5  — CustomIds do Painel (15A)
 *   BLOCO 6  — countTickets (15F suporte)
 *   BLOCO 7  — reopenTicket + normalize com reopen_count (15G)
 *   BLOCO 8  — markConnectionError / clearConnectionError (15D)
 *   BLOCO 9  — Exports de generateTranscript e sendTranscriptLog (15G)
 *
 * Padrão de isolamento (idêntico aos testes etapa10–14):
 *   - Módulos que NÃO importam discord.js são importados via top-level await.
 *   - Módulos que importam discord.js são carregados dentro de before() / it()
 *     para que erros de carregamento apareçam como falhas de teste, não de módulo.
 *   - DATABASE_PATH é definido ANTES de qualquer import do client.mjs.
 *
 * Uso: node --test tests/etapa15.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// ── DATABASE_PATH deve ser definido antes de qualquer import do client ────────
const DB_PATH = `/tmp/etapa15-${Date.now()}.db`;
process.env.DATABASE_PATH = DB_PATH;

// ── Imports top-level: apenas módulos que NÃO importam discord.js ─────────────

const { initDatabase, getDb } =
  await import('../src/database/client.mjs');

const { runMigrations, listExecutedMigrations, listAllMigrationNames } =
  await import('../src/database/migrations.mjs');

const { logEvent, logError } =
  await import('../src/utils/eventLog.mjs');

const {
  getModuleRoles, setModuleRoles, clearModuleRoles,
  getAllPermissions, hasModulePermission, buildDeniedMessage, SUPPORTED_MODULES,
} = await import('../src/database/repositories/Permissions.mjs');

const {
  createTicket, closeTicket, reopenTicket,
  getTicket, listTickets, countTickets, countOpenTickets,
} = await import('../src/database/repositories/Tickets.mjs');

const {
  createConnection, getConnection,
  markConnectionError, clearConnectionError,
} = await import('../src/database/repositories/Connections.mjs');

const { createTemplate } =
  await import('../src/database/repositories/Templates.mjs');

// Inicializa banco (executa runSchema + runMigrations internamente)
initDatabase();

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — Sistema de Migrações (15B)
// ════════════════════════════════════════════════════════════════════════════

describe('15B — Sistema de Migrações', () => {
  it('1.1 — tabela schema_migrations foi criada', () => {
    const db = getDb();
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
      .get();
    assert.ok(row, 'schema_migrations deve existir');
  });

  it('1.2 — todas as migrações foram executadas', () => {
    const executed = listExecutedMigrations();
    const all      = listAllMigrationNames();

    assert.equal(executed.length, all.length,
      'todos os nomes registrados devem ter entrada na tabela');

    for (const name of all) {
      const found = executed.find(e => e.name === name);
      assert.ok(found, `migração '${name}' deve estar na tabela`);
    }
  });

  it('1.3 — runMigrations é idempotente (segunda execução não falha nem duplica)', () => {
    assert.doesNotThrow(() => runMigrations());

    const executed = listExecutedMigrations();
    const all      = listAllMigrationNames();
    assert.equal(executed.length, all.length, 'não deve duplicar migrações');
  });

  it('1.4 — migração 000_baseline está registrada com executedAt válido', () => {
    const executed = listExecutedMigrations();
    const baseline = executed.find(e => e.name === '000_baseline');
    assert.ok(baseline, '000_baseline deve estar registrada');
    assert.ok(baseline.executedAt > 0, 'executedAt deve ser timestamp válido');
  });

  it('1.5 — migração 001 adicionou last_error e last_error_at na tabela connections', () => {
    const db = getDb();
    assert.doesNotThrow(() => {
      db.prepare('SELECT last_error, last_error_at FROM connections LIMIT 1').get();
    });
  });

  it('1.6 — migração 002 adicionou reopen_count na tabela tickets', () => {
    const db = getDb();
    assert.doesNotThrow(() => {
      db.prepare('SELECT reopen_count FROM tickets LIMIT 1').get();
    });
  });

  it('1.7 — listAllMigrationNames retorna array com ao menos 3 entradas', () => {
    const names = listAllMigrationNames();
    assert.ok(Array.isArray(names));
    assert.ok(names.length >= 3, `esperado ≥ 3, recebido: ${names.length}`);
  });

  it('1.8 — listExecutedMigrations retorna objetos com id, name e executedAt', () => {
    const executed = listExecutedMigrations();
    assert.ok(executed.length > 0);
    const first = executed[0];
    assert.ok(typeof first.id === 'number');
    assert.ok(typeof first.name === 'string');
    assert.ok(typeof first.executedAt === 'number');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — Log de Eventos Estruturado (15C)
// ════════════════════════════════════════════════════════════════════════════

describe('15C — Log de Eventos Estruturado', () => {
  it('2.1 — logEvent não lança para result=success', () => {
    assert.doesNotThrow(() =>
      logEvent({ module: 'orders', action: 'status_changed', result: 'success',
        guildId: '111', userId: '222', data: { from: 'pending', to: 'paid' } }));
  });

  it('2.2 — logEvent não lança para result=error', () => {
    assert.doesNotThrow(() =>
      logEvent({ module: 'tickets', action: 'create', result: 'error', error: 'sem permissão' }));
  });

  it('2.3 — logEvent não lança para result=skipped', () => {
    assert.doesNotThrow(() =>
      logEvent({ module: 'connections', action: 'execute', result: 'skipped' }));
  });

  it('2.4 — logEvent funciona com apenas module e action', () => {
    assert.doesNotThrow(() =>
      logEvent({ module: 'proofs', action: 'created' }));
  });

  it('2.5 — logError não lança com Error object', () => {
    assert.doesNotThrow(() =>
      logError('clients', 'update', new Error('teste'), { guildId: '123' }));
  });

  it('2.6 — logError aceita string como argumento de erro', () => {
    assert.doesNotThrow(() =>
      logError('orders', 'delete', 'mensagem de erro como string'));
  });

  it('2.7 — logEvent com data vazia não lança', () => {
    assert.doesNotThrow(() =>
      logEvent({ module: 'tickets', action: 'close', data: {} }));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 3 — Repositório de Permissões (15E)
// ════════════════════════════════════════════════════════════════════════════

describe('15E — Repositório de Permissões', () => {
  const GUILD = `guild-perms-${randomUUID().slice(0, 8)}`;

  it('3.1 — getModuleRoles retorna [] para módulo sem configuração', () => {
    assert.deepEqual(getModuleRoles(GUILD, 'pedidos'), []);
  });

  it('3.2 — setModuleRoles armazena roleIds corretamente', () => {
    setModuleRoles(GUILD, 'pedidos', ['111', '222']);
    assert.deepEqual(getModuleRoles(GUILD, 'pedidos'), ['111', '222']);
  });

  it('3.3 — setModuleRoles com lista vazia remove restrição', () => {
    setModuleRoles(GUILD, 'pedidos', []);
    assert.deepEqual(getModuleRoles(GUILD, 'pedidos'), []);
  });

  it('3.4 — clearModuleRoles limpa roles configurados', () => {
    setModuleRoles(GUILD, 'tickets', ['999']);
    clearModuleRoles(GUILD, 'tickets');
    assert.deepEqual(getModuleRoles(GUILD, 'tickets'), []);
  });

  it('3.5 — getAllPermissions retorna todos os módulos suportados', () => {
    const all = getAllPermissions(GUILD);
    for (const mod of SUPPORTED_MODULES) {
      assert.ok(mod in all, `módulo '${mod}' deve estar no retorno`);
      assert.ok(Array.isArray(all[mod]), `'${mod}' deve ser array`);
    }
  });

  it('3.6 — SUPPORTED_MODULES tem ao menos 9 módulos', () => {
    assert.ok(Array.isArray(SUPPORTED_MODULES));
    assert.ok(SUPPORTED_MODULES.length >= 9);
  });

  it('3.7 — hasModulePermission retorna true quando sem restrição configurada', () => {
    setModuleRoles(GUILD, 'clientes', []);
    const mockMember = {
      id: 'user-1',
      permissions: { has: () => false },
      roles: { cache: { has: () => false } },
    };
    assert.equal(hasModulePermission(mockMember, GUILD, 'clientes'), true);
  });

  it('3.8 — hasModulePermission retorna false quando user não tem cargo exigido', () => {
    setModuleRoles(GUILD, 'clientes', ['role-admin']);
    const mockMember = {
      id: 'user-2',
      permissions: { has: () => false },
      roles: { cache: { has: () => false } },
    };
    assert.equal(hasModulePermission(mockMember, GUILD, 'clientes'), false);
  });

  it('3.9 — hasModulePermission retorna true quando user tem cargo permitido', () => {
    setModuleRoles(GUILD, 'clientes', ['role-admin']);
    const mockMember = {
      id: 'user-3',
      permissions: { has: () => false },
      roles: { cache: { has: (id) => id === 'role-admin' } },
    };
    assert.equal(hasModulePermission(mockMember, GUILD, 'clientes'), true);
  });

  it('3.10 — hasModulePermission retorna true para Administrator independente de roles', () => {
    setModuleRoles(GUILD, 'clientes', ['role-admin']);
    const mockAdmin = {
      id: 'admin',
      permissions: { has: (p) => p === 'Administrator' },
      roles: { cache: { has: () => false } },
    };
    assert.equal(hasModulePermission(mockAdmin, GUILD, 'clientes'), true);
  });

  it('3.11 — hasModulePermission retorna false para member=null', () => {
    assert.equal(hasModulePermission(null, GUILD, 'pedidos'), false);
  });

  it('3.12 — buildDeniedMessage retorna string com nome do módulo', () => {
    const msg = buildDeniedMessage('pedidos');
    assert.ok(typeof msg === 'string');
    assert.ok(msg.includes('pedidos'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 4 — Estrutura do comando /stats (15F)
// (importação lazy dentro do before() para isolar discord.js)
// ════════════════════════════════════════════════════════════════════════════

describe('15F — Estrutura do comando /stats', () => {
  let statsCmd;
  before(async () => {
    const mod = await import('../src/commands/stats.mjs');
    statsCmd = mod.default;
  });

  it('4.1 — statsCmd tem data e execute', () => {
    assert.ok(statsCmd.data, 'deve ter .data');
    assert.equal(typeof statsCmd.execute, 'function');
  });

  it('4.2 — nome do comando é "stats"', () => {
    assert.equal(statsCmd.data.name, 'stats');
  });

  it('4.3 — description não está vazia', () => {
    assert.ok(statsCmd.data.description?.length > 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 5 — CustomIds e estrutura do Painel (15A)
// ════════════════════════════════════════════════════════════════════════════

describe('15A — CustomIds e estrutura do Painel', () => {
  const PAINEL_CUSTOM_IDS = [
    'painel:embed',
    'painel:modelos',
    'painel:conexoes',
    'painel:tickets',
    'painel:pedidos',
    'painel:clientes',
    'painel:proofs',
    'painel:stats',
    'painel:cancel',
  ];

  it('5.1 — todos os customIds cabem em 100 caracteres', () => {
    for (const id of PAINEL_CUSTOM_IDS) {
      assert.ok(id.length <= 100, `'${id}' excede 100 chars (${id.length})`);
    }
  });

  it('5.2 — todos os customIds usam namespace "painel:"', () => {
    for (const id of PAINEL_CUSTOM_IDS) {
      assert.ok(id.startsWith('painel:'), `'${id}' deve começar com "painel:"`);
    }
  });

  it('5.3 — há ao menos 9 customIds distintos', () => {
    assert.ok(new Set(PAINEL_CUSTOM_IDS).size >= 9);
  });

  it('5.4 — comando /painel tem nome "painel" e execute', async () => {
    const mod = await import('../src/commands/painel.mjs');
    assert.equal(mod.default.data.name, 'painel');
    assert.equal(typeof mod.default.execute, 'function');
  });

  it('5.5 — registerPainelHandler e openPainel são funções', async () => {
    const mod = await import('../src/modules/painel/index.mjs');
    assert.equal(typeof mod.registerPainelHandler, 'function');
    assert.equal(typeof mod.openPainel, 'function');
  });

  it('5.6 — registerPainelHandler pode ser (des)registrado sem lançar', async () => {
    const { unregister } = await import('../src/handlers/componentHandler.mjs');
    const { registerPainelHandler } = await import('../src/modules/painel/index.mjs');
    assert.doesNotThrow(() => {
      unregister('painel');
      registerPainelHandler();
      unregister('painel');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 6 — countTickets (suporte a stats)
// ════════════════════════════════════════════════════════════════════════════

describe('15F — countTickets no repositório de Tickets', () => {
  const GUILD = `guild-tk-cnt-${randomUUID().slice(0, 8)}`;

  it('6.1 — countTickets retorna 0 para guild sem tickets', () => {
    assert.equal(countTickets(GUILD), 0);
    assert.equal(countTickets(GUILD, { status: 'open' }), 0);
    assert.equal(countTickets(GUILD, { status: 'closed' }), 0);
  });

  it('6.2 — countTickets conta corretamente após criar tickets', () => {
    createTicket(GUILD, { channelId: 'ch-1', userId: 'u-1' });
    createTicket(GUILD, { channelId: 'ch-2', userId: 'u-2' });
    assert.equal(countTickets(GUILD), 2);
    assert.equal(countTickets(GUILD, { status: 'open' }), 2);
    assert.equal(countTickets(GUILD, { status: 'closed' }), 0);
  });

  it('6.3 — countTickets(closed) aumenta após fechar ticket', () => {
    const tickets = listTickets(GUILD, { status: 'open' });
    assert.ok(tickets.length > 0);
    closeTicket(GUILD, tickets[0].id, 'mod-user');
    assert.equal(countTickets(GUILD, { status: 'closed' }), 1);
    assert.equal(countTickets(GUILD, { status: 'open' }), 1);
    assert.equal(countTickets(GUILD), 2);
  });

  it('6.4 — countOpenTickets e countTickets({status:open}) concordam', () => {
    assert.equal(countOpenTickets(GUILD), countTickets(GUILD, { status: 'open' }));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 7 — reopenTicket + reopen_count (15G)
// ════════════════════════════════════════════════════════════════════════════

describe('15G — reopenTicket e reopen_count', () => {
  const GUILD = `guild-reopen-${randomUUID().slice(0, 8)}`;

  it('7.1 — ticket criado tem reopenCount 0', () => {
    const t = createTicket(GUILD, { channelId: 'ch-r1', userId: 'u-r1' });
    assert.equal(t.reopenCount, 0);
  });

  it('7.2 — reopenTicket retorna null para ticket inexistente', () => {
    assert.equal(reopenTicket(GUILD, 'nao-existe', 'ch-new'), null);
  });

  it('7.3 — reopenTicket reabre ticket fechado e incrementa reopen_count', () => {
    const original = createTicket(GUILD, { channelId: 'ch-r2', userId: 'u-r2' });
    const closed   = closeTicket(GUILD, original.id, 'mod-1');

    assert.equal(closed.status, 'closed');
    assert.ok(closed.closedAt);
    assert.equal(closed.closedBy, 'mod-1');

    const reopened = reopenTicket(GUILD, original.id, 'ch-r2-new');
    assert.equal(reopened.status, 'open');
    assert.equal(reopened.channelId, 'ch-r2-new');
    assert.equal(reopened.closedAt, null);
    assert.equal(reopened.closedBy, null);
    assert.equal(reopened.reopenCount, 1);
  });

  it('7.4 — reopen_count acumula em múltiplas aberturas', () => {
    const t = createTicket(GUILD, { channelId: 'ch-r3', userId: 'u-r3' });
    closeTicket(GUILD, t.id, 'mod-1');
    reopenTicket(GUILD, t.id, 'ch-r3-b');
    closeTicket(GUILD, t.id, 'mod-1');
    reopenTicket(GUILD, t.id, 'ch-r3-c');
    const final = getTicket(GUILD, t.id);
    assert.equal(final.reopenCount, 2);
  });

  it('7.5 — ticket normalizado inclui campo reopenCount do tipo number', () => {
    const t = createTicket(GUILD, { channelId: 'ch-r4', userId: 'u-r4' });
    assert.ok('reopenCount' in t);
    assert.equal(typeof t.reopenCount, 'number');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 8 — markConnectionError / clearConnectionError (15D)
// ════════════════════════════════════════════════════════════════════════════

describe('15D — Rastreamento de Erros em Conexões', () => {
  const GUILD = `guild-connerr-${randomUUID().slice(0, 8)}`;
  let connId;

  before(() => {
    const tmpl = createTemplate(GUILD, { name: 'Template Err Test', data: { title: 'T' } });
    const conn = createConnection(GUILD, {
      action: 'order_created', templateId: tmpl.id, targetChannelId: 'ch-test',
    });
    connId = conn.id;
  });

  it('8.1 — conexão criada tem lastError e lastErrorAt null', () => {
    const conn = getConnection(GUILD, connId);
    assert.equal(conn.lastError, null);
    assert.equal(conn.lastErrorAt, null);
  });

  it('8.2 — markConnectionError registra o erro e o timestamp', () => {
    markConnectionError(GUILD, connId, 'canal não encontrado');
    const conn = getConnection(GUILD, connId);
    assert.equal(conn.lastError, 'canal não encontrado');
    assert.ok(conn.lastErrorAt > 0);
  });

  it('8.3 — markConnectionError trunca mensagem em 500 chars', () => {
    markConnectionError(GUILD, connId, 'x'.repeat(600));
    const conn = getConnection(GUILD, connId);
    assert.ok(conn.lastError.length <= 500);
  });

  it('8.4 — clearConnectionError limpa lastError e lastErrorAt', () => {
    markConnectionError(GUILD, connId, 'erro temporário');
    clearConnectionError(GUILD, connId);
    const conn = getConnection(GUILD, connId);
    assert.equal(conn.lastError, null);
    assert.equal(conn.lastErrorAt, null);
  });

  it('8.5 — markConnectionError para ID inexistente não lança', () => {
    assert.doesNotThrow(() => markConnectionError(GUILD, 'nao-existe', 'erro'));
  });

  it('8.6 — clearConnectionError para ID inexistente não lança', () => {
    assert.doesNotThrow(() => clearConnectionError(GUILD, 'nao-existe'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 9 — Exports de generateTranscript, sendTranscriptLog e módulos 15G/15A
// (imports lazy para isolar discord.js)
// ════════════════════════════════════════════════════════════════════════════

describe('15G — Transcrições de Tickets e Módulos Discord-dependentes', () => {
  let flow;
  before(async () => {
    flow = await import('../src/modules/tickets/flow.mjs');
  });

  it('9.1 — generateTranscript é exportado como função', () => {
    assert.equal(typeof flow.generateTranscript, 'function');
  });

  it('9.2 — sendTranscriptLog é exportado como função', () => {
    assert.equal(typeof flow.sendTranscriptLog, 'function');
  });

  it('9.3 — generateTranscript retorna null para channel=null', async () => {
    const result = await flow.generateTranscript(null, { id: 'test', guildId: 'g', createdAt: 0 });
    assert.equal(result, null);
  });

  it('9.4 — generateTranscript retorna null quando channel.messages.fetch lança', async () => {
    const mockChannel = {
      name: 'ticket-test',
      messages: { fetch: async () => { throw new Error('no permission'); } },
    };
    const result = await flow.generateTranscript(mockChannel, {
      id: 'ticket-123', guildId: 'g-xyz', createdAt: 0,
    });
    assert.equal(result, null);
  });

  it('9.5 — generateTranscript com mensagens retorna string com ID e conteúdo', async () => {
    const mockMessages = new Map([
      ['msg1', {
        createdTimestamp: Date.now() - 5000,
        author: { username: 'UserA', bot: false, tag: 'UserA#0' },
        content: 'Preciso de ajuda com meu pedido!',
        embeds: [],
        attachments: new Map(),
      }],
      ['msg2', {
        createdTimestamp: Date.now() - 2000,
        author: { username: 'SupportBot', bot: true, tag: 'SupportBot#0' },
        content: '',
        embeds: [{ title: 'Ticket Aberto' }],
        attachments: new Map(),
      }],
    ]);
    const mockChannel = {
      name: 'ticket-usera',
      messages: { fetch: async () => mockMessages },
    };
    const result = await flow.generateTranscript(mockChannel, {
      id: 'tkt-abc123', guildId: 'guild-xyz', userId: 'u-001',
      createdAt: Math.floor(Date.now() / 1000) - 300,
    });
    assert.ok(typeof result === 'string', 'deve retornar string');
    assert.ok(result.includes('tkt-abc123'), 'deve incluir ID do ticket');
    assert.ok(result.includes('Preciso de ajuda com meu pedido!'), 'deve incluir conteúdo da mensagem');
    assert.ok(result.includes('UserA'), 'deve incluir nome do autor');
  });

  it('9.6 — openEmbedPanel é exportado de modules/embed/index.mjs', async () => {
    const embedMod = await import('../src/modules/embed/index.mjs');
    assert.equal(typeof embedMod.openEmbedPanel, 'function');
  });

  it('9.7 — handleTktComponent é função (inclui case reopen)', async () => {
    const mod = await import('../src/modules/tickets/userHandler.mjs');
    assert.equal(typeof mod.handleTktComponent, 'function');
  });
});
