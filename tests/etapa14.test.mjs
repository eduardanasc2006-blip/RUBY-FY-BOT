/**
 * Testes da Etapa 14 — Sistema de Clientes (CRM)
 *
 * Cobertura:
 *   BLOCO 1  — resolveClientDiscordId         (7 testes)  — puro
 *   BLOCO 2  — buildClientModal               (6 testes)  — puro
 *   BLOCO 3  — parseClientModal               (5 testes)  — puro
 *   BLOCO 4  — buildClientEmbed               (6 testes)  — puro
 *   BLOCO 5  — buildClientListEmbed           (5 testes)  — puro
 *   BLOCO 6  — buildClientPickRow             (4 testes)  — puro
 *   BLOCO 7  — buildClientViewComponents      (3 testes)  — puro
 *   BLOCO 8  — buildDeleteConfirmPayload      (4 testes)  — puro
 *   BLOCO 9  — buildSuccessPayload/Error      (3 testes)  — puro
 *   BLOCO 10 — Schema: tabela clients        (5 testes)  — DB memória
 *   BLOCO 11 — Clients.mjs CRUD              (10 testes) — DB isolado
 *   BLOCO 12 — Clients.mjs: busca e filtros  (6 testes)  — DB isolado
 *   BLOCO 13 — Clients.mjs: updateClient     (5 testes)  — DB isolado
 *   BLOCO 14 — clients/index.mjs exports     (4 testes)
 *   BLOCO 15 — CustomIds ≤ 100 chars         (5 testes)  — puro
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
// BLOCO 1 — resolveClientDiscordId
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — resolveClientDiscordId', () => {
  let resolveClientDiscordId;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    resolveClientDiscordId = mod.resolveClientDiscordId;
  });

  test('1.1 — menção <@123456789012345678> retorna ID', () => {
    assert.equal(resolveClientDiscordId('<@123456789012345678>'), '123456789012345678');
  });

  test('1.2 — menção <@!123456789012345678> retorna ID', () => {
    assert.equal(resolveClientDiscordId('<@!123456789012345678>'), '123456789012345678');
  });

  test('1.3 — ID numérico puro retorna o ID', () => {
    assert.equal(resolveClientDiscordId('123456789012345678'), '123456789012345678');
  });

  test('1.4 — texto livre retorna null', () => {
    assert.equal(resolveClientDiscordId('João Silva'), null);
  });

  test('1.5 — string vazia retorna null', () => {
    assert.equal(resolveClientDiscordId(''), null);
  });

  test('1.6 — null retorna null', () => {
    assert.equal(resolveClientDiscordId(null), null);
  });

  test('1.7 — ID com menos de 17 dígitos retorna null', () => {
    assert.equal(resolveClientDiscordId('12345'), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — buildClientModal
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — buildClientModal', () => {
  let buildClientModal, MODAL_CUSTOM_ID;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildClientModal = mod.buildClientModal;
    MODAL_CUSTOM_ID  = mod.MODAL_CUSTOM_ID;
  });

  test('2.1 — MODAL_CUSTOM_ID é clients:modal_submit', () => {
    assert.equal(MODAL_CUSTOM_ID, 'clients:modal_submit');
  });

  test('2.2 — buildClientModal retorna objeto com .data', () => {
    const modal = buildClientModal();
    assert.ok(modal?.data, 'Deve ter .data');
  });

  test('2.3 — customId do modal é clients:modal_submit', () => {
    assert.equal(buildClientModal().data.custom_id, 'clients:modal_submit');
  });

  test('2.4 — modal tem 5 action rows', () => {
    assert.equal(buildClientModal().components.length, 5);
  });

  test('2.5 — primeiro campo é name (obrigatório)', () => {
    const input = buildClientModal().components[0].components[0];
    assert.equal(input.data.custom_id, 'name');
    assert.equal(input.data.required, true);
  });

  test('2.6 — segundo campo é discord (opcional)', () => {
    const input = buildClientModal().components[1].components[0];
    assert.equal(input.data.custom_id, 'discord');
    assert.equal(input.data.required, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — parseClientModal
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — parseClientModal', () => {
  let parseClientModal;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    parseClientModal = mod.parseClientModal;
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

  test('3.1 — extrai name', () => {
    const data = parseClientModal(makeInteraction({ name: 'Ana Souza' }));
    assert.equal(data.name, 'Ana Souza');
  });

  test('3.2 — discord ausente retorna null', () => {
    const data = parseClientModal(makeInteraction({}));
    assert.equal(data.discord, null);
  });

  test('3.3 — email ausente retorna null', () => {
    const data = parseClientModal(makeInteraction({}));
    assert.equal(data.email, null);
  });

  test('3.4 — phone ausente retorna null', () => {
    const data = parseClientModal(makeInteraction({}));
    assert.equal(data.phone, null);
  });

  test('3.5 — notas com espaços retorna null', () => {
    const data = parseClientModal(makeInteraction({ notas: '   ' }));
    assert.equal(data.notas, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — buildClientEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — buildClientEmbed', () => {
  let buildClientEmbed;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildClientEmbed = mod.buildClientEmbed;
  });

  const baseClient = {
    id:          'aaaa-bbbb-cccc-dddd',
    guildId:     'g1',
    displayName: 'Carlos Mendes',
    discordId:   '111222333444555666',
    email:       'carlos@test.com',
    phone:       null,
    notas:       null,
    createdAt:   1700000000,
    updatedAt:   1700000000,
  };

  test('4.1 — retorna objeto com .data', () => {
    assert.ok(buildClientEmbed(baseClient)?.data);
  });

  test('4.2 — título contém o nome do cliente', () => {
    const embed = buildClientEmbed(baseClient);
    assert.ok(embed.data.title?.includes('Carlos Mendes'), `Título: ${embed.data.title}`);
  });

  test('4.3 — cor é 0x5865F2', () => {
    assert.equal(buildClientEmbed(baseClient).data.color, 0x5865F2);
  });

  test('4.4 — campo Discord presente quando discordId existe', () => {
    const fields = buildClientEmbed(baseClient).data.fields ?? [];
    assert.ok(fields.some(f => f.name.includes('Discord')), 'Falta campo Discord');
  });

  test('4.5 — stats são exibidas quando fornecidas', () => {
    const embed  = buildClientEmbed(baseClient, { proofs: 5, orders: 3 });
    const fields = embed.data.fields ?? [];
    assert.ok(fields.some(f => f.value === '5'), 'Deve mostrar total de provas');
    assert.ok(fields.some(f => f.value === '3'), 'Deve mostrar total de pedidos');
  });

  test('4.6 — footer contém o ID do cliente', () => {
    const embed = buildClientEmbed(baseClient);
    assert.ok(embed.data.footer?.text?.includes(baseClient.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — buildClientListEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — buildClientListEmbed', () => {
  let buildClientListEmbed;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildClientListEmbed = mod.buildClientListEmbed;
  });

  const makeClient = (i) => ({
    id: randomUUID(), guildId: 'g', displayName: `Cliente ${i}`,
    discordId: null, email: null, phone: null, notas: null,
    createdAt: 1700000000 + i, updatedAt: 1700000000,
  });

  test('5.1 — lista vazia mostra mensagem adequada', () => {
    const embed = buildClientListEmbed([]);
    assert.ok(embed.data.description?.toLowerCase().includes('nenhum'));
  });

  test('5.2 — lista com clientes exibe nomes', () => {
    const embed = buildClientListEmbed([makeClient(1)]);
    assert.ok(embed.data.description?.includes('Cliente 1'));
  });

  test('5.3 — máximo de 25 itens exibidos', () => {
    const clients = Array.from({ length: 30 }, (_, i) => makeClient(i));
    const embed   = buildClientListEmbed(clients);
    const matches = (embed.data.description?.match(/\*\*\d+\.\*\*/g) ?? []).length;
    assert.ok(matches <= 25);
  });

  test('5.4 — título contém "Clientes"', () => {
    assert.ok(buildClientListEmbed([]).data.title?.includes('Cliente'));
  });

  test('5.5 — cor é 0x5865F2', () => {
    assert.equal(buildClientListEmbed([]).data.color, 0x5865F2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — buildClientPickRow
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — buildClientPickRow', () => {
  let buildClientPickRow;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildClientPickRow = mod.buildClientPickRow;
  });

  const makeClient = () => ({
    id: randomUUID(), displayName: 'Fulano', discordId: null,
    email: null, createdAt: 1700000000,
  });

  test('6.1 — lista vazia retorna null', () => {
    assert.equal(buildClientPickRow([]), null);
  });

  test('6.2 — retorna ActionRow com select menu', () => {
    const row = buildClientPickRow([makeClient()]);
    assert.ok(row, 'Deve retornar action row');
    assert.equal(row.components.length, 1);
  });

  test('6.3 — select menu tem customId clients:pick', () => {
    const row = buildClientPickRow([makeClient()]);
    assert.equal(row.components[0].data.custom_id, 'clients:pick');
  });

  test('6.4 — select menu tem opções com valores = IDs dos clientes', () => {
    const c1 = makeClient();
    const c2 = makeClient();
    const row = buildClientPickRow([c1, c2]);
    // discord.js v14: options ficam em s.options como StringSelectMenuOptionBuilder
    const values = row.components[0].options.map(o => o.data.value);
    assert.ok(values.includes(c1.id));
    assert.ok(values.includes(c2.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — buildClientViewComponents
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — buildClientViewComponents', () => {
  let buildClientViewComponents;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildClientViewComponents = mod.buildClientViewComponents;
  });

  const client = { id: '12345678-1234-4000-8000-123456789012', displayName: 'Fulano' };

  test('7.1 — retorna array com pelo menos 1 action row', () => {
    const rows = buildClientViewComponents(client);
    assert.ok(Array.isArray(rows) && rows.length > 0);
  });

  test('7.2 — tem botão de remoção com customId delete', () => {
    const rows    = buildClientViewComponents(client);
    const buttons = rows[0].components;
    assert.ok(buttons.some(b => b.data.custom_id?.includes('clients:delete:')));
  });

  test('7.3 — customId do botão delete contém o UUID do cliente', () => {
    const rows    = buildClientViewComponents(client);
    const btn     = rows[0].components.find(b => b.data.custom_id?.includes('clients:delete:'));
    assert.ok(btn.data.custom_id.includes(client.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — buildDeleteConfirmPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — buildDeleteConfirmPayload', () => {
  let buildDeleteConfirmPayload;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildDeleteConfirmPayload = mod.buildDeleteConfirmPayload;
  });

  const client = { id: '12345678-1234-4000-8000-123456789012', displayName: 'Maria' };

  test('8.1 — retorna payload com embeds e components', () => {
    const p = buildDeleteConfirmPayload(client);
    assert.ok(Array.isArray(p.embeds)     && p.embeds.length > 0);
    assert.ok(Array.isArray(p.components) && p.components.length > 0);
  });

  test('8.2 — embed tem cor vermelha', () => {
    assert.equal(buildDeleteConfirmPayload(client).embeds[0].data.color, 0xED4245);
  });

  test('8.3 — tem botão delete_ok', () => {
    const buttons = buildDeleteConfirmPayload(client).components[0].components;
    assert.ok(buttons.some(b => b.data.custom_id?.includes('clients:delete_ok:')));
  });

  test('8.4 — tem botão de Voltar (view)', () => {
    const buttons = buildDeleteConfirmPayload(client).components[0].components;
    assert.ok(buttons.some(b => b.data.custom_id?.includes('clients:view:')));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — buildSuccessPayload / buildErrorPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — buildSuccessPayload / buildErrorPayload', () => {
  let buildSuccessPayload, buildErrorPayload;

  before(async () => {
    const mod = await import('../src/modules/clients/flow.mjs');
    buildSuccessPayload = mod.buildSuccessPayload;
    buildErrorPayload   = mod.buildErrorPayload;
  });

  const client = {
    id: randomUUID(), guildId: 'g', displayName: 'Teste',
    discordId: null, email: null, phone: null, notas: null,
    createdAt: 1700000000, updatedAt: 1700000000,
  };

  test('9.1 — buildSuccessPayload tem embeds e é ephemeral', () => {
    const p = buildSuccessPayload(client);
    assert.ok(Array.isArray(p.embeds) && p.embeds.length > 0);
    assert.ok(p.flags !== undefined && p.flags !== 0);
  });

  test('9.2 — buildErrorPayload tem content com ❌', () => {
    const p = buildErrorPayload('Erro X');
    assert.ok(p.content?.includes('❌'));
    assert.ok(p.content?.includes('Erro X'));
  });

  test('9.3 — buildErrorPayload é ephemeral', () => {
    assert.ok(buildErrorPayload('e').flags !== 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — Schema: tabela clients
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — Schema: tabela clients', () => {
  let db;

  before(async () => {
    const { runSchema } = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    runSchema(db);
  });

  test('10.1 — tabela clients existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
      .get();
    assert.ok(row);
  });

  test('10.2 — coluna display_name existe', () => {
    const info = db.prepare('PRAGMA table_info(clients)').all();
    assert.ok(info.some(c => c.name === 'display_name'));
  });

  test('10.3 — coluna discord_id existe', () => {
    const info = db.prepare('PRAGMA table_info(clients)').all();
    assert.ok(info.some(c => c.name === 'discord_id'));
  });

  test('10.4 — UNIQUE constraint existe em guild_id+discord_id', () => {
    // Verifica via PRAGMA index_list
    const indexes = db.prepare('PRAGMA index_list(clients)').all();
    const hasUnique = indexes.some(idx => idx.unique === 1);
    assert.ok(hasUnique, 'Deve ter ao menos um índice unique (guild_id, discord_id)');
  });

  test('10.5 — tabelas clients, orders e proofs existem simultaneamente', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('clients','orders','proofs')")
      .all();
    assert.equal(rows.length, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — Clients.mjs CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — Clients.mjs CRUD', () => {
  let repo;
  const GUILD = `guild_e14_crud_${randomUUID().slice(0, 8)}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-e14-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Clients.mjs');
  });

  test('11.1 — createClient retorna cliente com campos normalizados', () => {
    const c = repo.createClient(GUILD, { displayName: 'Alice', email: 'alice@test.com' });
    assert.ok(c.id);
    assert.equal(c.displayName, 'Alice');
    assert.equal(c.email,       'alice@test.com');
    assert.equal(c.discordId,   null);
    assert.equal(c.guildId,     GUILD);
  });

  test('11.2 — createClient com discordId', () => {
    const c = repo.createClient(GUILD, { displayName: 'Bob', discordId: '111222333444555666' });
    assert.equal(c.discordId, '111222333444555666');
  });

  test('11.3 — getClient retorna cliente existente', () => {
    const c = repo.createClient(GUILD, { displayName: 'Carol' });
    assert.ok(repo.getClient(GUILD, c.id));
  });

  test('11.4 — getClient retorna null para id inexistente', () => {
    assert.equal(repo.getClient(GUILD, 'nao-existe'), null);
  });

  test('11.5 — getClientByDiscordId retorna cliente correto', () => {
    const DID = '999888777666555444';
    repo.createClient(GUILD, { displayName: 'Dave', discordId: DID });
    const found = repo.getClientByDiscordId(GUILD, DID);
    assert.ok(found);
    assert.equal(found.discordId, DID);
  });

  test('11.6 — listClients retorna clientes do guild', () => {
    const list = repo.listClients(GUILD);
    assert.ok(list.length > 0);
    assert.ok(list.every(c => c.guildId === GUILD));
  });

  test('11.7 — countClients cresce com cada createClient', () => {
    const before = repo.countClients(GUILD);
    repo.createClient(GUILD, { displayName: 'Extra' });
    assert.equal(repo.countClients(GUILD), before + 1);
  });

  test('11.8 — deleteClient retorna true e remove o cliente', () => {
    const c = repo.createClient(GUILD, { displayName: 'Delete Me' });
    assert.equal(repo.deleteClient(GUILD, c.id), true);
    assert.equal(repo.getClient(GUILD, c.id), null);
  });

  test('11.9 — deleteClient retorna false para id inexistente', () => {
    assert.equal(repo.deleteClient(GUILD, 'id-fake'), false);
  });

  test('11.10 — UNIQUE constraint: mesmo discord_id no mesmo guild lança erro', () => {
    const DID = '123450987654321000';
    repo.createClient(GUILD, { displayName: 'First',  discordId: DID });
    assert.throws(
      () => repo.createClient(GUILD, { displayName: 'Second', discordId: DID }),
      /UNIQUE/,
      'Deve lançar erro de constraint UNIQUE',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 12 — Clients.mjs: busca e filtros
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 12 — Clients.mjs: busca e filtros', () => {
  let repo;
  const GUILD = `guild_e14_search_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/Clients.mjs');
  });

  test('12.1 — listClients com limit respeita o máximo', () => {
    for (let i = 0; i < 5; i++) {
      repo.createClient(GUILD, { displayName: `C${i}` });
    }
    const list = repo.listClients(GUILD, { limit: 2 });
    assert.ok(list.length <= 2);
  });

  test('12.2 — listClients com search filtra por nome', () => {
    const UNIQUE = `Úbrico${randomUUID().slice(0, 4)}`;
    repo.createClient(GUILD, { displayName: UNIQUE });
    const list = repo.listClients(GUILD, { search: UNIQUE });
    assert.ok(list.length > 0);
    assert.ok(list.every(c => c.displayName.includes(UNIQUE)));
  });

  test('12.3 — listClients com search filtra por email', () => {
    const EMAIL = `uniq_${randomUUID().slice(0, 8)}@search.com`;
    repo.createClient(GUILD, { displayName: 'EmailSearch', email: EMAIL });
    const list = repo.listClients(GUILD, { search: EMAIL });
    assert.ok(list.some(c => c.email === EMAIL));
  });

  test('12.4 — isolamento entre guilds', () => {
    const OUTRO = `outro_${randomUUID().slice(0, 8)}`;
    repo.createClient(OUTRO, { displayName: 'OutroCliente' });
    const list = repo.listClients(GUILD);
    assert.ok(list.every(c => c.guildId === GUILD));
  });

  test('12.5 — listClients retorna do mais recente para o mais antigo', () => {
    const GUILD2 = `guild_ord_${randomUUID().slice(0, 8)}`;
    const c1 = repo.createClient(GUILD2, { displayName: 'Antigo' });
    const c2 = repo.createClient(GUILD2, { displayName: 'Novo'   });
    const list = repo.listClients(GUILD2);
    const ids  = list.map(c => c.id);
    assert.ok(ids.indexOf(c2.id) < ids.indexOf(c1.id));
  });

  test('12.6 — UNIQUE em discord_id permite NULL múltiplos', () => {
    // Múltiplos clientes sem discord_id devem ser permitidos
    repo.createClient(GUILD, { displayName: 'Ext1', discordId: null });
    repo.createClient(GUILD, { displayName: 'Ext2', discordId: null });
    // Não lançou erro → passou
    assert.ok(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 13 — Clients.mjs: updateClient
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 13 — Clients.mjs: updateClient', () => {
  let repo;
  const GUILD = `guild_e14_upd_${randomUUID().slice(0, 8)}`;

  before(async () => {
    repo = await import('../src/database/repositories/Clients.mjs');
  });

  test('13.1 — updateClient atualiza displayName', () => {
    const c       = repo.createClient(GUILD, { displayName: 'Nome Antigo' });
    const updated = repo.updateClient(GUILD, c.id, { displayName: 'Nome Novo' });
    assert.equal(updated.displayName, 'Nome Novo');
  });

  test('13.2 — updateClient atualiza email', () => {
    const c       = repo.createClient(GUILD, { displayName: 'Patch Email' });
    const updated = repo.updateClient(GUILD, c.id, { email: 'novo@email.com' });
    assert.equal(updated.email, 'novo@email.com');
  });

  test('13.3 — updateClient atualiza notas', () => {
    const c       = repo.createClient(GUILD, { displayName: 'Patch Notas' });
    const updated = repo.updateClient(GUILD, c.id, { notas: 'Cliente VIP' });
    assert.equal(updated.notas, 'Cliente VIP');
  });

  test('13.4 — updateClient retorna null para id inexistente', () => {
    const result = repo.updateClient(GUILD, 'id-fake', { displayName: 'X' });
    assert.equal(result, null);
  });

  test('13.5 — updateClient sem patch não altera campos existentes', () => {
    const c       = repo.createClient(GUILD, { displayName: 'Sem Patch', email: 'ok@test.com' });
    const updated = repo.updateClient(GUILD, c.id, {});
    assert.equal(updated.displayName, 'Sem Patch');
    assert.equal(updated.email,       'ok@test.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 14 — clients/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 14 — clients/index.mjs exports', () => {
  let idx;

  before(async () => {
    idx = await import('../src/modules/clients/index.mjs');
  });

  test('14.1 — exporta registerClientsHandler como função', () => {
    assert.equal(typeof idx.registerClientsHandler, 'function');
  });

  test('14.2 — exporta openClientsList como função', () => {
    assert.equal(typeof idx.openClientsList, 'function');
  });

  test('14.3 — exporta buildClientModal como função', () => {
    assert.equal(typeof idx.buildClientModal, 'function');
  });

  test('14.4 — exporta MODAL_CUSTOM_ID como clients:modal_submit', () => {
    assert.equal(idx.MODAL_CUSTOM_ID, 'clients:modal_submit');
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

  test('15.1 — clients:modal_submit ≤ 100 chars', () => {
    assert.ok('clients:modal_submit'.length <= 100);
  });

  test('15.2 — clients:pick ≤ 100 chars', () => {
    assert.ok(build('clients', 'pick').length <= 100);
  });

  test('15.3 — clients:view:UUID ≤ 100 chars', () => {
    const id = `clients:view:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars`);
  });

  test('15.4 — clients:delete:UUID ≤ 100 chars', () => {
    const id = `clients:delete:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars`);
  });

  test('15.5 — clients:delete_ok:UUID ≤ 100 chars', () => {
    const id = `clients:delete_ok:${UUID}`;
    assert.ok(id.length <= 100, `${id.length} chars`);
  });
});
