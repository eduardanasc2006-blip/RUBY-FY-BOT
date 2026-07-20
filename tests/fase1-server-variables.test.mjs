/**
 * Testes da Fase 1 — Variáveis de Servidor (server_variables)
 *
 * Cobertura:
 *   BLOCO 1  — Schema: tabela server_variables       (6 testes) — DB memória
 *   BLOCO 2  — ServerVariables.mjs CRUD              (9 testes) — DB isolado
 *   BLOCO 3  — ServerVariables.mjs isolamento        (4 testes) — DB isolado
 *   BLOCO 4  — ServerVariables.mjs loadVariablesMap  (3 testes) — DB isolado
 *   BLOCO 5  — resolveVariables: variáveis padrão    (5 testes) — puro
 *   BLOCO 6  — resolveVariables: variáveis de server (5 testes) — puro
 *   BLOCO 7  — resolveVariables: segurança           (4 testes) — puro
 *   BLOCO 8  — flow.mjs: validateName                (7 testes) — puro
 *   BLOCO 9  — flow.mjs: validateValue               (4 testes) — puro
 *   BLOCO 10 — flow.mjs: builders                    (6 testes) — puro
 *   BLOCO 11 — Permissions: SUPPORTED_MODULES        (2 testes) — puro
 *   BLOCO 12 — migrations.mjs: 009_server_variables  (3 testes) — DB memória
 *
 * Isolamento:
 *   Blocos 5–11 importam apenas módulos sem cadeia DB.
 *   Blocos 1–4 e 12 usam DatabaseSync(:memory:) ou DATABASE_PATH em /tmp.
 *
 * Padrão: node:test + node:sqlite (DatabaseSync) — sem better-sqlite3.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// =============================================================================
// BLOCO 1 — Schema: tabela server_variables
// =============================================================================

describe('BLOCO 1 — Schema: tabela server_variables', () => {
  let db;

  before(async () => {
    const { runSchema } = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    runSchema(db);
  });

  test('1.1 — tabela server_variables existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='server_variables'")
      .get();
    assert.ok(row, 'Tabela server_variables deve existir');
  });

  test('1.2 — coluna id existe', () => {
    const info = db.prepare('PRAGMA table_info(server_variables)').all();
    assert.ok(info.some(c => c.name === 'id'));
  });

  test('1.3 — coluna guild_id existe', () => {
    const info = db.prepare('PRAGMA table_info(server_variables)').all();
    assert.ok(info.some(c => c.name === 'guild_id'));
  });

  test('1.4 — coluna name existe', () => {
    const info = db.prepare('PRAGMA table_info(server_variables)').all();
    assert.ok(info.some(c => c.name === 'name'));
  });

  test('1.5 — coluna value existe', () => {
    const info = db.prepare('PRAGMA table_info(server_variables)').all();
    assert.ok(info.some(c => c.name === 'value'));
  });

  test('1.6 — UNIQUE constraint (guild_id, name) impede nomes duplicados', () => {
    // Configura FK e insere guild
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run('g_schema_test');
    db.prepare(`
      INSERT INTO server_variables (id, guild_id, name, value)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), 'g_schema_test', 'pix', 'chave-a');

    assert.throws(() => {
      db.prepare(`
        INSERT INTO server_variables (id, guild_id, name, value)
        VALUES (?, ?, ?, ?)
      `).run(randomUUID(), 'g_schema_test', 'pix', 'chave-b');
    }, /UNIQUE/, 'Deve lançar erro UNIQUE ao inserir nome duplicado no mesmo guild');
  });
});

// =============================================================================
// BLOCO 2 — ServerVariables.mjs CRUD
// =============================================================================

describe('BLOCO 2 — ServerVariables.mjs CRUD', () => {
  let repo;
  const GUILD = `guild_sv_crud_${randomUUID().slice(0, 8)}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase1-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/ServerVariables.mjs');
  });

  test('2.1 — createServerVariable retorna variável com campos corretos', () => {
    const v = repo.createServerVariable(GUILD, { name: 'pix', value: 'chave-teste' });
    assert.ok(v.id,                    'Deve ter id');
    assert.equal(v.guildId, GUILD,     'guildId deve ser o passado');
    assert.equal(v.name,    'pix',     'name deve ser pix');
    assert.equal(v.value,   'chave-teste', 'value deve ser o passado');
    assert.ok(v.createdAt,             'Deve ter createdAt');
    assert.ok(v.updatedAt,             'Deve ter updatedAt');
  });

  test('2.2 — getServerVariable retorna variável pelo ID', () => {
    const v    = repo.createServerVariable(GUILD, { name: 'loja', value: 'Ruby FY' });
    const found = repo.getServerVariable(GUILD, v.id);
    assert.ok(found);
    assert.equal(found.name, 'loja');
  });

  test('2.3 — getServerVariable retorna null para ID inexistente', () => {
    assert.equal(repo.getServerVariable(GUILD, 'nao-existe'), null);
  });

  test('2.4 — getServerVariable retorna null para guild errado', () => {
    const v = repo.createServerVariable(GUILD, { name: 'horario', value: '9h-18h' });
    assert.equal(repo.getServerVariable('outro_guild', v.id), null);
  });

  test('2.5 — getServerVariableByName retorna variável pelo nome', () => {
    repo.createServerVariable(GUILD, { name: 'site', value: 'ruby.fy' });
    const found = repo.getServerVariableByName(GUILD, 'site');
    assert.ok(found);
    assert.equal(found.value, 'ruby.fy');
  });

  test('2.6 — listServerVariables retorna lista do guild', () => {
    const list = repo.listServerVariables(GUILD);
    assert.ok(list.length > 0);
    assert.ok(list.every(v => v.guildId === GUILD));
  });

  test('2.7 — updateServerVariable altera o valor', () => {
    const v       = repo.createServerVariable(GUILD, { name: 'instagram', value: '@antigo' });
    const updated = repo.updateServerVariable(GUILD, v.id, { value: '@novo' });
    assert.equal(updated.value, '@novo');
    assert.equal(updated.name,  'instagram', 'nome não deve mudar');
  });

  test('2.8 — deleteServerVariable retorna true e remove', () => {
    const v = repo.createServerVariable(GUILD, { name: 'temp', value: 'val' });
    assert.equal(repo.deleteServerVariable(GUILD, v.id), true);
    assert.equal(repo.getServerVariable(GUILD, v.id), null);
  });

  test('2.9 — deleteServerVariable retorna false para ID inexistente', () => {
    assert.equal(repo.deleteServerVariable(GUILD, 'fake-id'), false);
  });
});

// =============================================================================
// BLOCO 3 — ServerVariables.mjs isolamento entre guilds
// =============================================================================

describe('BLOCO 3 — ServerVariables.mjs isolamento entre guilds', () => {
  let repo;
  const GUILD_A = `guild_a_${randomUUID().slice(0, 8)}`;
  const GUILD_B = `guild_b_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/ServerVariables.mjs');
  });

  test('3.1 — dois guilds podem ter variáveis com o mesmo nome', () => {
    repo.createServerVariable(GUILD_A, { name: 'pix', value: 'chave-a' });
    repo.createServerVariable(GUILD_B, { name: 'pix', value: 'chave-b' });
    const va = repo.getServerVariableByName(GUILD_A, 'pix');
    const vb = repo.getServerVariableByName(GUILD_B, 'pix');
    assert.equal(va.value, 'chave-a');
    assert.equal(vb.value, 'chave-b');
  });

  test('3.2 — listServerVariables retorna apenas variáveis do guild correto', () => {
    const listA = repo.listServerVariables(GUILD_A);
    assert.ok(listA.every(v => v.guildId === GUILD_A));
    const listB = repo.listServerVariables(GUILD_B);
    assert.ok(listB.every(v => v.guildId === GUILD_B));
  });

  test('3.3 — UNIQUE impede nome duplicado no MESMO guild', () => {
    repo.createServerVariable(GUILD_A, { name: 'loja', value: 'A' });
    assert.throws(
      () => repo.createServerVariable(GUILD_A, { name: 'loja', value: 'B' }),
      /UNIQUE/,
      'Deve lançar erro UNIQUE',
    );
  });

  test('3.4 — existsServerVariable respeita guild', () => {
    repo.createServerVariable(GUILD_A, { name: 'unico_a', value: 'x' });
    assert.equal(repo.existsServerVariable(GUILD_A, 'unico_a'), true);
    assert.equal(repo.existsServerVariable(GUILD_B, 'unico_a'), false);
  });
});

// =============================================================================
// BLOCO 4 — ServerVariables.mjs loadServerVariablesMap
// =============================================================================

describe('BLOCO 4 — ServerVariables.mjs loadServerVariablesMap', () => {
  let repo;
  const GUILD = `guild_map_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/ServerVariables.mjs');
  });

  test('4.1 — loadServerVariablesMap retorna mapa name→value', () => {
    repo.createServerVariable(GUILD, { name: 'a', value: 'valor-a' });
    repo.createServerVariable(GUILD, { name: 'b', value: 'valor-b' });
    const map = repo.loadServerVariablesMap(GUILD);
    assert.equal(map['a'], 'valor-a');
    assert.equal(map['b'], 'valor-b');
  });

  test('4.2 — loadServerVariablesMap retorna objeto vazio para guild sem variáveis', () => {
    const map = repo.loadServerVariablesMap(`vazio_${randomUUID().slice(0, 8)}`);
    assert.deepEqual(map, {});
  });

  test('4.3 — loadServerVariablesMap não inclui variáveis de outros guilds', () => {
    const OTHER = `outro_map_${randomUUID().slice(0, 8)}`;
    repo.createServerVariable(OTHER, { name: 'secreto', value: 'valor-outro' });
    const map = repo.loadServerVariablesMap(GUILD);
    assert.equal('secreto' in map, false);
  });
});

// =============================================================================
// BLOCO 5 — resolveVariables: variáveis padrão (sem servidor)
// =============================================================================

describe('BLOCO 5 — resolveVariables: variáveis padrão', () => {
  let resolveVariables;

  before(async () => {
    const mod = await import('../src/modules/variables/index.mjs');
    resolveVariables = mod.resolveVariables;
  });

  test('5.1 — resolve {servidor} do contexto', () => {
    const result = resolveVariables('{servidor}', { guild: { name: 'Meu Server' } });
    assert.equal(result, 'Meu Server');
  });

  test('5.2 — resolve {data} sem context', () => {
    const result = resolveVariables('{data}', {});
    // data é uma string de data — não é o placeholder original
    assert.notEqual(result, '{data}');
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('5.3 — variável desconhecida é mantida como-está', () => {
    const result = resolveVariables('{inexistente}', {});
    assert.equal(result, '{inexistente}');
  });

  test('5.4 — texto sem variáveis é retornado intacto', () => {
    const result = resolveVariables('Olá mundo!', {});
    assert.equal(result, 'Olá mundo!');
  });

  test('5.5 — input não-string é retornado como-está', () => {
    const result = resolveVariables(null, {});
    assert.equal(result, null);
  });
});

// =============================================================================
// BLOCO 6 — resolveVariables: variáveis de servidor
// =============================================================================

describe('BLOCO 6 — resolveVariables: variáveis de servidor', () => {
  let resolveVariables;

  before(async () => {
    const mod = await import('../src/modules/variables/index.mjs');
    resolveVariables = mod.resolveVariables;
  });

  test('6.1 — resolve {pix} do servidor A', () => {
    const ctx    = { serverVariables: { pix: 'chave-a' } };
    const result = resolveVariables('Meu PIX é {pix}', ctx);
    assert.equal(result, 'Meu PIX é chave-a');
  });

  test('6.2 — resolve {pix} do servidor B (valor diferente)', () => {
    const ctx    = { serverVariables: { pix: 'chave-b' } };
    const result = resolveVariables('Meu PIX é {pix}', ctx);
    assert.equal(result, 'Meu PIX é chave-b');
  });

  test('6.3 — variável de servidor não resolve em outro contexto (sem serverVariables)', () => {
    const result = resolveVariables('{pix}', {});
    assert.equal(result, '{pix}', 'Deve manter o placeholder original');
  });

  test('6.4 — múltiplas variáveis de servidor na mesma string', () => {
    const ctx = { serverVariables: { loja: 'Ruby FY', horario: '9h-18h' } };
    const result = resolveVariables('{loja} — Atendimento: {horario}', ctx);
    assert.equal(result, 'Ruby FY — Atendimento: 9h-18h');
  });

  test('6.5 — variável padrão e de servidor coexistem', () => {
    const ctx = {
      guild: { name: 'Meu Server' },
      serverVariables: { pix: 'minha-chave' },
    };
    const result = resolveVariables('{servidor} | PIX: {pix}', ctx);
    assert.equal(result, 'Meu Server | PIX: minha-chave');
  });
});

// =============================================================================
// BLOCO 7 — resolveVariables: segurança e edge cases
// =============================================================================

describe('BLOCO 7 — resolveVariables: segurança e edge cases', () => {
  let resolveVariables;

  before(async () => {
    const mod = await import('../src/modules/variables/index.mjs');
    resolveVariables = mod.resolveVariables;
  });

  test('7.1 — variável inexistente em serverVariables mantém placeholder', () => {
    const ctx    = { serverVariables: { pix: 'chave' } };
    const result = resolveVariables('{inexistente}', ctx);
    assert.equal(result, '{inexistente}');
  });

  test('7.2 — variável padrão tem prioridade sobre serverVariables', () => {
    // {servidor} é uma variável padrão — não pode ser sobrescrita via serverVariables
    const ctx    = { guild: { name: 'Real Server' }, serverVariables: { servidor: 'Fake' } };
    const result = resolveVariables('{servidor}', ctx);
    assert.equal(result, 'Real Server', 'Variável padrão deve ter prioridade');
  });

  test('7.3 — resultado não é reprocessado (sem encadeamento)', () => {
    // Valor contém outro placeholder — não deve ser resolvido recursivamente
    const ctx    = { serverVariables: { a: '{b}', b: 'final' } };
    const result = resolveVariables('{a}', ctx);
    assert.equal(result, '{b}', 'Não deve resolver recursivamente');
  });

  test('7.4 — string vazia retorna string vazia', () => {
    assert.equal(resolveVariables('', {}), '');
  });
});

// =============================================================================
// BLOCO 8 — flow.mjs: validateName
// =============================================================================

describe('BLOCO 8 — flow.mjs: validateName', () => {
  let validateName;

  before(async () => {
    const mod = await import('../src/modules/variables/flow.mjs');
    validateName = mod.validateName;
  });

  test('8.1 — nome válido retorna null', () => {
    assert.equal(validateName('pix'), null);
  });

  test('8.2 — nome com sublinhado é válido', () => {
    assert.equal(validateName('chave_pix'), null);
  });

  test('8.3 — nome começando com número é inválido', () => {
    assert.notEqual(validateName('1pix'), null);
  });

  test('8.4 — nome com hífen é inválido', () => {
    assert.notEqual(validateName('chave-pix'), null);
  });

  test('8.5 — nome vazio é inválido', () => {
    assert.notEqual(validateName(''), null);
  });

  test('8.6 — null é inválido', () => {
    assert.notEqual(validateName(null), null);
  });

  test('8.7 — nome com mais de 30 chars é inválido', () => {
    assert.notEqual(validateName('a'.repeat(31)), null);
  });
});

// =============================================================================
// BLOCO 9 — flow.mjs: validateValue
// =============================================================================

describe('BLOCO 9 — flow.mjs: validateValue', () => {
  let validateValue;

  before(async () => {
    const mod = await import('../src/modules/variables/flow.mjs');
    validateValue = mod.validateValue;
  });

  test('9.1 — valor válido retorna null', () => {
    assert.equal(validateValue('minha-chave-pix'), null);
  });

  test('9.2 — valor vazio é inválido', () => {
    assert.notEqual(validateValue(''), null);
  });

  test('9.3 — só espaços é inválido', () => {
    assert.notEqual(validateValue('   '), null);
  });

  test('9.4 — valor com mais de 500 chars é inválido', () => {
    assert.notEqual(validateValue('a'.repeat(501)), null);
  });
});

// =============================================================================
// BLOCO 10 — flow.mjs: builders de UI
// =============================================================================

describe('BLOCO 10 — flow.mjs: builders de UI', () => {
  let flow;

  before(async () => {
    flow = await import('../src/modules/variables/flow.mjs');
  });

  const makeVar = (name = 'pix', value = 'chave') => ({
    id: randomUUID(), guildId: 'g', name, value, createdAt: 1700000000, updatedAt: 1700000000,
  });

  test('10.1 — buildVariablesListEmbed com lista vazia mostra mensagem adequada', () => {
    const embed = flow.buildVariablesListEmbed([]);
    assert.ok(embed.data.description?.toLowerCase().includes('nenhuma'));
  });

  test('10.2 — buildVariablesListEmbed com variáveis exibe os nomes', () => {
    const embed = flow.buildVariablesListEmbed([makeVar('pix', 'chave-a')]);
    assert.ok(embed.data.description?.includes('{pix}'));
  });

  test('10.3 — buildCreateModal tem customId variaveis:modal_create', () => {
    const modal = flow.buildCreateModal();
    assert.equal(modal.data.custom_id, 'variaveis:modal_create');
  });

  test('10.4 — buildEditModal tem customId variaveis:modal_edit:{id}', () => {
    const v     = makeVar();
    const modal = flow.buildEditModal(v);
    assert.ok(modal.data.custom_id.startsWith('variaveis:modal_edit:'));
    assert.ok(modal.data.custom_id.includes(v.id));
  });

  test('10.5 — buildVariablePickRow retorna null para lista vazia', () => {
    assert.equal(flow.buildVariablePickRow([]), null);
  });

  test('10.6 — buildDetailButtons tem customId com ID da variável', () => {
    const v   = makeVar();
    const row = flow.buildDetailButtons(v);
    const ids = row.components.map(b => b.data.custom_id);
    assert.ok(ids.some(id => id.includes(v.id)));
  });
});

// =============================================================================
// BLOCO 11 — Permissions: SUPPORTED_MODULES contém 'variaveis'
// =============================================================================

describe('BLOCO 11 — Permissions: SUPPORTED_MODULES', () => {
  let SUPPORTED_MODULES;

  before(async () => {
    const mod = await import('../src/database/repositories/Permissions.mjs');
    SUPPORTED_MODULES = mod.SUPPORTED_MODULES;
  });

  test('11.1 — SUPPORTED_MODULES é um array', () => {
    assert.ok(Array.isArray(SUPPORTED_MODULES));
  });

  test('11.2 — SUPPORTED_MODULES inclui "variaveis"', () => {
    assert.ok(
      SUPPORTED_MODULES.includes('variaveis'),
      `'variaveis' não encontrado em SUPPORTED_MODULES: [${SUPPORTED_MODULES.join(', ')}]`,
    );
  });
});

// =============================================================================
// BLOCO 12 — migrations.mjs: 009_server_variables
// =============================================================================

describe('BLOCO 12 — migrations.mjs: 009_server_variables', () => {
  let db;

  before(async () => {
    const { runMigrations } = await import('../src/database/migrations.mjs');
    const { runSchema }     = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    // Executa schema base primeiro
    runSchema(db);
    // Executa migrations (passando db diretamente)
    runMigrations(db);
  });

  test('12.1 — 009_server_variables está na lista de migrações', async () => {
    const { listAllMigrationNames } = await import('../src/database/migrations.mjs');
    const names = listAllMigrationNames();
    assert.ok(names.includes('009_server_variables'), `Não encontrada em: [${names.join(', ')}]`);
  });

  test('12.2 — tabela server_variables existe após migrations', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='server_variables'")
      .get();
    assert.ok(row, 'Tabela server_variables deve existir após migrations');
  });

  test('12.3 — índice idx_server_variables_guild_name existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_server_variables_guild_name'")
      .get();
    assert.ok(row, 'Índice idx_server_variables_guild_name deve existir');
  });
});
