/**
 * Testes da Fase 2 — Comandos Personalizados (custom_commands)
 *
 * Cobertura:
 *   BLOCO 1  — Schema: tabela custom_commands       (6 testes) — DB memória
 *   BLOCO 2  — CustomCommands.mjs CRUD              (9 testes) — DB isolado
 *   BLOCO 3  — CustomCommands.mjs isolamento        (4 testes) — DB isolado
 *   BLOCO 4  — CustomCommands.mjs toggle & count    (4 testes) — DB isolado
 *   BLOCO 5  — flow.mjs: validateName              (8 testes) — puro
 *   BLOCO 6  — flow.mjs: validateDescription      (4 testes) — puro
 *   BLOCO 7  — flow.mjs: validateTextContent      (4 testes) — puro
 *   BLOCO 8  — flow.mjs: validateEmbedContent     (5 testes) — puro
 *   BLOCO 9  — flow.mjs: builders                  (6 testes) — puro
 *   BLOCO 10 — Permissions: SUPPORTED_MODULES       (2 testes) — puro
 *   BLOCO 11 — migrations.mjs: 010_custom_commands (3 testes) — DB memória
 *
 * Isolamento:
 *   Blocos 5–9 importam apenas módulos sem cadeia DB.
 *   Blocos 1–4 e 11 usam DATABASE_PATH em /tmp.
 *
 * Padrão: node:test + node:sqlite (DatabaseSync) — sem better-sqlite3.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// =============================================================================
// BLOCO 1 — Schema: tabela custom_commands
// =============================================================================

describe('BLOCO 1 — Schema: tabela custom_commands', () => {
  let db;

  before(async () => {
    const { runSchema } = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    runSchema(db);
  });

  test('1.1 — tabela custom_commands existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_commands'")
      .get();
    assert.ok(row, 'Tabela custom_commands deve existir');
  });

  test('1.2 — coluna id existe', () => {
    const info = db.prepare('PRAGMA table_info(custom_commands)').all();
    assert.ok(info.some(c => c.name === 'id'));
  });

  test('1.3 — coluna guild_id existe', () => {
    const info = db.prepare('PRAGMA table_info(custom_commands)').all();
    assert.ok(info.some(c => c.name === 'guild_id'));
  });

  test('1.4 — coluna name existe', () => {
    const info = db.prepare('PRAGMA table_info(custom_commands)').all();
    assert.ok(info.some(c => c.name === 'name'));
  });

  test('1.5 — coluna content_type existe', () => {
    const info = db.prepare('PRAGMA table_info(custom_commands)').all();
    assert.ok(info.some(c => c.name === 'content_type'));
  });

  test('1.6 — UNIQUE constraint (guild_id, name) impede nomes duplicados', () => {
    // Configura FK e insere guild
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run('g_cc_schema_test');
    db.prepare(`
      INSERT INTO custom_commands (id, guild_id, name, content_type, content_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), 'g_cc_schema_test', 'pix', 'text', '{}');

    assert.throws(() => {
      db.prepare(`
        INSERT INTO custom_commands (id, guild_id, name, content_type, content_data)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), 'g_cc_schema_test', 'pix', 'text', '{}');
    }, /UNIQUE/, 'Deve lançar erro UNIQUE ao inserir nome duplicado no mesmo guild');
  });
});

// =============================================================================
// BLOCO 2 — CustomCommands.mjs CRUD
// =============================================================================

describe('BLOCO 2 — CustomCommands.mjs CRUD', () => {
  let repo;
  const GUILD = `guild_cc_crud_${randomUUID().slice(0, 8)}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-fase2-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/CustomCommands.mjs');
  });

  test('2.1 — createCommand retorna comando com campos corretos', () => {
    const cmd = repo.createCommand(GUILD, {
      name: 'pix',
      description: 'Chave PIX',
      contentType: 'text',
      contentData: { text: 'Minha chave PIX: {pix}' },
    });
    assert.ok(cmd.id,                    'Deve ter id');
    assert.equal(cmd.guildId, GUILD,    'guildId deve ser o passado');
    assert.equal(cmd.name,    'pix',     'name deve ser pix');
    assert.equal(cmd.description, 'Chave PIX', 'description deve ser correto');
    assert.equal(cmd.contentType, 'text', 'contentType deve ser text');
    assert.deepEqual(cmd.contentData, { text: 'Minha chave PIX: {pix}' }, 'contentData deve ser correto');
    assert.equal(cmd.enabled, true,      'enabled deve ser true');
    assert.equal(cmd.useCount, 0,        'useCount deve ser 0');
    assert.ok(cmd.createdAt,             'Deve ter createdAt');
    assert.ok(cmd.updatedAt,             'Deve ter updatedAt');
  });

  test('2.2 — getCommand retorna comando pelo ID', () => {
    const cmd    = repo.createCommand(GUILD, { name: 'regras', contentType: 'text', contentData: { text: 'Regras do servidor' } });
    const found  = repo.getCommand(GUILD, cmd.id);
    assert.ok(found);
    assert.equal(found.name, 'regras');
  });

  test('2.3 — getCommand retorna null para ID inexistente', () => {
    assert.equal(repo.getCommand(GUILD, 'nao-existe'), null);
  });

  test('2.4 — getCommand retorna null para guild errado', () => {
    const cmd = repo.createCommand(GUILD, { name: 'suporte', contentType: 'text', contentData: { text: 'Suporte' } });
    assert.equal(repo.getCommand('outro_guild', cmd.id), null);
  });

  test('2.5 — getCommandByName retorna comando pelo nome (case insensitive)', () => {
    repo.createCommand(GUILD, { name: 'horario', contentType: 'text', contentData: { text: '9h-18h' } });
    const found = repo.getCommandByName(GUILD, 'HORARIO');
    assert.ok(found);
    assert.equal(found.name, 'horario');
  });

  test('2.6 — listCommands retorna lista do guild', () => {
    const list = repo.listCommands(GUILD);
    assert.ok(list.length > 0);
    assert.ok(list.every(c => c.guildId === GUILD));
  });

  test('2.7 — updateCommand altera os campos', () => {
    const cmd     = repo.createCommand(GUILD, { name: 'temp', description: 'Antigo', contentType: 'text', contentData: { text: 'Old' } });
    const updated = repo.updateCommand(GUILD, cmd.id, {
      name: 'temp2',
      description: 'Novo',
      contentData: { text: 'New' },
    });
    assert.equal(updated.name, 'temp2');
    assert.equal(updated.description, 'Novo');
    assert.equal(updated.contentData.text, 'New');
  });

  test('2.8 — deleteCommand retorna true e remove', () => {
    const cmd = repo.createCommand(GUILD, { name: 'delete_me', contentType: 'text', contentData: { text: 'To delete' } });
    assert.equal(repo.deleteCommand(GUILD, cmd.id), true);
    assert.equal(repo.getCommand(GUILD, cmd.id), null);
  });

  test('2.9 — deleteCommand retorna false para ID inexistente', () => {
    assert.equal(repo.deleteCommand(GUILD, 'fake-id'), false);
  });
});

// =============================================================================
// BLOCO 3 — CustomCommands.mjs isolamento entre guilds
// =============================================================================

describe('BLOCO 3 — CustomCommands.mjs isolamento entre guilds', () => {
  let repo;
  const GUILD_A = `guild_a_cc_${randomUUID().slice(0, 8)}`;
  const GUILD_B = `guild_b_cc_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/CustomCommands.mjs');
  });

  test('3.1 — dois guilds podem ter comandos com o mesmo nome', () => {
    repo.createCommand(GUILD_A, { name: 'pix', contentType: 'text', contentData: { text: 'PIX-A' } });
    repo.createCommand(GUILD_B, { name: 'pix', contentType: 'text', contentData: { text: 'PIX-B' } });
    const cmdA = repo.getCommandByName(GUILD_A, 'pix');
    const cmdB = repo.getCommandByName(GUILD_B, 'pix');
    assert.equal(cmdA.contentData.text, 'PIX-A');
    assert.equal(cmdB.contentData.text, 'PIX-B');
  });

  test('3.2 — listCommands retorna apenas comandos do guild correto', () => {
    const listA = repo.listCommands(GUILD_A);
    assert.ok(listA.every(c => c.guildId === GUILD_A));
    const listB = repo.listCommands(GUILD_B);
    assert.ok(listB.every(c => c.guildId === GUILD_B));
  });

  test('3.3 — updateCommand isolado por guild', () => {
    const cmdA = repo.createCommand(GUILD_A, { name: 'update_a', contentType: 'text', contentData: { text: 'A' } });
    const cmdB = repo.createCommand(GUILD_B, { name: 'update_b', contentType: 'text', contentData: { text: 'B' } });
    repo.updateCommand(GUILD_A, cmdA.id, { contentData: { text: 'A-updated' } });
    const updatedA = repo.getCommand(GUILD_A, cmdA.id);
    const updatedB = repo.getCommand(GUILD_B, cmdB.id);
    assert.equal(updatedA.contentData.text, 'A-updated');
    assert.equal(updatedB.contentData.text, 'B');
  });

  test('3.4 — deleteCommand isolado por guild', () => {
    const cmdA = repo.createCommand(GUILD_A, { name: 'del_a', contentType: 'text', contentData: { text: 'A' } });
    repo.deleteCommand(GUILD_A, cmdA.id);
    assert.equal(repo.getCommand(GUILD_A, cmdA.id), null);
    // O comando ainda existe no outro guild com nome similar
    const cmdB = repo.createCommand(GUILD_B, { name: 'del_b', contentType: 'text', contentData: { text: 'B' } });
    assert.ok(repo.getCommand(GUILD_B, cmdB.id));
  });
});

// =============================================================================
// BLOCO 4 — CustomCommands.mjs toggle & count
// =============================================================================

describe('BLOCO 4 — CustomCommands.mjs toggle & count', () => {
  let repo;
  const GUILD = `guild_cc_toggle_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/CustomCommands.mjs');
  });

  test('4.1 — setCommandEnabled ativa comando', () => {
    const cmd = repo.createCommand(GUILD, { name: 'toggle_on', contentType: 'text', contentData: { text: 'Test' } });
    const updated = repo.setCommandEnabled(GUILD, cmd.id, true);
    assert.equal(updated.enabled, true);
  });

  test('4.2 — setCommandEnabled desativa comando', () => {
    const cmd = repo.createCommand(GUILD, { name: 'toggle_off', contentType: 'text', contentData: { text: 'Test' } });
    const updated = repo.setCommandEnabled(GUILD, cmd.id, false);
    assert.equal(updated.enabled, false);
  });

  test('4.3 — listCommands com enabledOnly filtra desativados', () => {
    const cmd1 = repo.createCommand(GUILD, { name: 'enabled_cmd', contentType: 'text', contentData: { text: 'On' } });
    repo.createCommand(GUILD, { name: 'disabled_cmd', contentType: 'text', contentData: { text: 'Off' } });
    repo.setCommandEnabled(GUILD, cmd1.id, false);

    const all = repo.listCommands(GUILD);
    const enabled = repo.listCommands(GUILD, { enabledOnly: true });

    assert.ok(all.length > enabled.length);
    assert.equal(enabled.every(c => c.enabled === true), true);
  });

  test('4.4 — incrementUseCount incrementa contador', () => {
    const cmd = repo.createCommand(GUILD, { name: 'counter_test', contentType: 'text', contentData: { text: 'Test' } });
    assert.equal(cmd.useCount, 0);

    repo.incrementUseCount(GUILD, cmd.id);
    const after1 = repo.getCommand(GUILD, cmd.id);
    assert.equal(after1.useCount, 1);

    repo.incrementUseCount(GUILD, cmd.id);
    repo.incrementUseCount(GUILD, cmd.id);
    const after3 = repo.getCommand(GUILD, cmd.id);
    assert.equal(after3.useCount, 3);
  });
});

// =============================================================================
// BLOCO 5 — flow.mjs: validateName
// =============================================================================

describe('BLOCO 5 — flow.mjs: validateName', () => {
  let validateName;

  before(async () => {
    const mod = await import('../src/modules/customcommands/flow.mjs');
    validateName = mod.validateName;
  });

  test('5.1 — nome válido retorna null', () => {
    assert.equal(validateName('pix'), null);
  });

  test('5.2 — nome com sublinhado é válido', () => {
    assert.equal(validateName('chave_pix'), null);
  });

  test('5.3 — nome com números é válido', () => {
    assert.equal(validateName('comando2'), null);
  });

  test('5.4 — nome começando com número é inválido', () => {
    assert.notEqual(validateName('1comando'), null);
  });

  test('5.5 — nome com hífen é inválido', () => {
    assert.notEqual(validateName('comando-teste'), null);
  });

  test('5.6 — nome vazio é inválido', () => {
    assert.notEqual(validateName(''), null);
  });

  test('5.7 — null é inválido', () => {
    assert.notEqual(validateName(null), null);
  });

  test('5.8 — nome com mais de 30 chars é inválido', () => {
    assert.notEqual(validateName('a'.repeat(31)), null);
  });
});

// =============================================================================
// BLOCO 6 — flow.mjs: validateDescription
// =============================================================================

describe('BLOCO 6 — flow.mjs: validateDescription', () => {
  let validateDescription;

  before(async () => {
    const mod = await import('../src/modules/customcommands/flow.mjs');
    validateDescription = mod.validateDescription;
  });

  test('6.1 — descrição válida retorna null', () => {
    assert.equal(validateDescription('Minha descrição'), null);
  });

  test('6.2 — descrição null é válida', () => {
    assert.equal(validateDescription(null), null);
  });

  test('6.3 — descrição undefined é válida', () => {
    assert.equal(validateDescription(undefined), null);
  });

  test('6.4 — descrição com mais de 200 chars é inválida', () => {
    assert.notEqual(validateDescription('a'.repeat(201)), null);
  });
});

// =============================================================================
// BLOCO 7 — flow.mjs: validateTextContent
// =============================================================================

describe('BLOCO 7 — flow.mjs: validateTextContent', () => {
  let validateTextContent;

  before(async () => {
    const mod = await import('../src/modules/customcommands/flow.mjs');
    validateTextContent = mod.validateTextContent;
  });

  test('7.1 — conteúdo válido retorna null', () => {
    assert.equal(validateTextContent('Meu conteúdo'), null);
  });

  test('7.2 — conteúdo vazio é inválido', () => {
    assert.notEqual(validateTextContent(''), null);
  });

  test('7.3 — só espaços é inválido', () => {
    assert.notEqual(validateTextContent('   '), null);
  });

  test('7.4 — conteúdo com mais de 2000 chars é inválido', () => {
    assert.notEqual(validateTextContent('a'.repeat(2001)), null);
  });
});

// =============================================================================
// BLOCO 8 — flow.mjs: validateEmbedContent
// =============================================================================

describe('BLOCO 8 — flow.mjs: validateEmbedContent', () => {
  let validateEmbedContent;

  before(async () => {
    const mod = await import('../src/modules/customcommands/flow.mjs');
    validateEmbedContent = mod.validateEmbedContent;
  });

  test('8.1 — dados de embed válidos retornam null', () => {
    const data = {
      titulo: 'Meu Embed',
      descricao: 'Descrição do embed',
    };
    assert.equal(validateEmbedContent(data), null);
  });

  test('8.2 — título com mais de 256 chars é inválido', () => {
    const data = { titulo: 'a'.repeat(257) };
    assert.notEqual(validateEmbedContent(data), null);
  });

  test('8.3 — descrição com mais de 4096 chars é inválida', () => {
    const data = { descricao: 'a'.repeat(4097) };
    assert.notEqual(validateEmbedContent(data), null);
  });

  test('8.4 — null é inválido', () => {
    assert.notEqual(validateEmbedContent(null), null);
  });

  test('8.5 — mais de 25 fields é inválido', () => {
    const fields = Array(26).fill({ name: 'Field', value: 'Value' });
    const data = { fields };
    assert.notEqual(validateEmbedContent(data), null);
  });
});

// =============================================================================
// BLOCO 9 — flow.mjs: builders
// =============================================================================

describe('BLOCO 9 — flow.mjs: builders', () => {
  let flow;

  before(async () => {
    flow = await import('../src/modules/customcommands/flow.mjs');
  });

  const makeCmd = (name = 'pix', opts = {}) => ({
    id: randomUUID(),
    guildId: 'g',
    name,
    description: opts.description || null,
    contentType: opts.contentType || 'text',
    contentData: opts.contentData || { text: 'Test content' },
    enabled: opts.enabled !== undefined ? opts.enabled : true,
    useCount: opts.useCount || 0,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  });

  test('9.1 — buildCommandsListEmbed com lista vazia mostra mensagem adequada', () => {
    const embed = flow.buildCommandsListEmbed([]);
    assert.ok(embed.embeds[0].description?.toLowerCase().includes('nenhum'));
  });

  test('9.2 — buildCommandsListEmbed com comandos exibe os nomes', () => {
    const embed = flow.buildCommandsListEmbed([makeCmd('pix')]);
    assert.ok(embed.embeds[0].description?.includes('pix'));
  });

  test('9.3 — buildCreateModal tem customId comandos:modal_create', async () => {
    const modal = await flow.buildCreateModal();
    assert.equal(modal.data.custom_id, 'comandos:modal_create');
  });

  test('9.4 — buildEditModal tem customId com ID do comando', async () => {
    const cmd   = makeCmd();
    const modal = await flow.buildEditModal(cmd);
    assert.ok(modal.data.custom_id.startsWith('comandos:modal_edit:'));
    assert.ok(modal.data.custom_id.includes(cmd.id));
  });

  test('9.5 — buildDetailButtons inclui botões com IDs corretos', async () => {
    const cmd   = makeCmd();
    const rows  = await flow.buildDetailButtons(cmd);
    const ids   = rows.flatMap(r => r.components.map(b => b.data.custom_id));

    assert.ok(ids.some(id => id.includes(cmd.id)), 'Deve ter ID do comando');
    assert.ok(ids.some(id => id.startsWith('comandos:edit:')), 'Deve ter botão editar');
    assert.ok(ids.some(id => id.startsWith('comandos:toggle:')), 'Deve ter botão toggle');
    assert.ok(ids.some(id => id.startsWith('comandos:delete:')), 'Deve ter botão delete');
  });

  test('9.6 — buildCommandDetailEmbed mostra campos corretos', async () => {
    const cmd   = makeCmd('pix', { description: 'Chave PIX', enabled: true, useCount: 5 });
    const embed = flow.buildCommandDetailEmbed(cmd, 'Test Server');

    assert.ok(embed.embeds[0].title?.includes('pix'));
    assert.ok(embed.embeds[0].description === undefined); // Sem descrição no embed principal
    assert.ok(embed.embeds[0].fields?.some(f => f.name === 'Status' && f.value?.includes('Ativado')));
    assert.ok(embed.embeds[0].fields?.some(f => f.name === 'Usos' && f.value?.includes('5')));
  });
});

// =============================================================================
// BLOCO 10 — Permissions: SUPPORTED_MODULES contém 'comandos'
// =============================================================================

describe('BLOCO 10 — Permissions: SUPPORTED_MODULES', () => {
  let SUPPORTED_MODULES;

  before(async () => {
    const mod = await import('../src/database/repositories/Permissions.mjs');
    SUPPORTED_MODULES = mod.SUPPORTED_MODULES;
  });

  test('10.1 — SUPPORTED_MODULES é um array', () => {
    assert.ok(Array.isArray(SUPPORTED_MODULES));
  });

  test('10.2 — SUPPORTED_MODULES inclui "comandos"', () => {
    assert.ok(
      SUPPORTED_MODULES.includes('comandos'),
      `'comandos' não encontrado em SUPPORTED_MODULES: [${SUPPORTED_MODULES.join(', ')}]`,
    );
  });
});

// =============================================================================
// BLOCO 11 — migrations.mjs: 010_custom_commands
// =============================================================================

describe('BLOCO 11 — migrations.mjs: 010_custom_commands', () => {
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

  test('11.1 — 010_custom_commands está na lista de migrações', async () => {
    const { listAllMigrationNames } = await import('../src/database/migrations.mjs');
    const names = listAllMigrationNames();
    assert.ok(names.includes('010_custom_commands'), `Não encontrada em: [${names.join(', ')}]`);
  });

  test('11.2 — tabela custom_commands existe após migrations', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_commands'")
      .get();
    assert.ok(row, 'Tabela custom_commands deve existir após migrations');
  });

  test('11.3 — índices existem', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_custom_commands_%'")
      .all();
    assert.ok(indexes.length >= 2, 'Deve ter pelo menos 2 índices');
  });
});
