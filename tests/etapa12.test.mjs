/**
 * Testes da Etapa 12 — Sistema de Proofs / Comprovantes de Venda
 *
 * Cobertura:
 *   BLOCO 1  — resolveUserId          (8 testes)   — puro, sem DB
 *   BLOCO 2  — buildProofModal        (6 testes)   — puro, sem DB
 *   BLOCO 3  — parseModalData         (5 testes)   — puro, sem DB (mock de interaction)
 *   BLOCO 4  — buildProofPreviewEmbed (6 testes)   — puro, sem DB
 *   BLOCO 5  — buildProofListEmbed    (5 testes)   — puro, sem DB
 *   BLOCO 6  — buildSuccessPayload    (3 testes)   — puro, sem DB
 *   BLOCO 7  — Schema: tabela proofs  (4 testes)   — DB em memória
 *   BLOCO 8  — Proofs.mjs repository  (10 testes)  — DB isolado
 *   BLOCO 9  — Integração: fluxo completo (8 testes) — DB isolado
 *   BLOCO 10 — proofs/index.mjs exports (4 testes) — imports
 *   BLOCO 11 — CustomIds ≤ 100 chars  (4 testes)   — puro
 *
 * IMPORTANTE — Isolamento de banco:
 *   Blocos 1–6 e 11 testam funções puras: NÃO importam client.mjs/bot.mjs.
 *   Blocos 7–9 definem DATABASE_PATH ANTES de importar client.mjs,
 *   garantindo que o banco seja criado no caminho de teste (sem poluição).
 *   Cada bloco com DB usa um arquivo único com Date.now() para isolamento total.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — resolveUserId
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — resolveUserId', () => {
  let resolveUserId;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    resolveUserId = mod.resolveUserId;
  });

  test('1.1 — menção <@123456789012345678> retorna ID', () => {
    const result = resolveUserId('<@123456789012345678>');
    assert.equal(result, '123456789012345678');
  });

  test('1.2 — menção <@!123456789012345678> retorna ID', () => {
    const result = resolveUserId('<@!123456789012345678>');
    assert.equal(result, '123456789012345678');
  });

  test('1.3 — ID numérico puro retorna o ID', () => {
    const result = resolveUserId('123456789012345678');
    assert.equal(result, '123456789012345678');
  });

  test('1.4 — texto livre retorna null', () => {
    const result = resolveUserId('João Silva');
    assert.equal(result, null);
  });

  test('1.5 — string vazia retorna null', () => {
    const result = resolveUserId('');
    assert.equal(result, null);
  });

  test('1.6 — null retorna null', () => {
    const result = resolveUserId(null);
    assert.equal(result, null);
  });

  test('1.7 — ID com menos de 17 dígitos retorna null', () => {
    const result = resolveUserId('12345');
    assert.equal(result, null);
  });

  test('1.8 — ID com mais de 20 dígitos retorna null', () => {
    const result = resolveUserId('123456789012345678901');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — buildProofModal
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — buildProofModal', () => {
  let buildProofModal, MODAL_CUSTOM_ID;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    buildProofModal   = mod.buildProofModal;
    MODAL_CUSTOM_ID   = mod.MODAL_CUSTOM_ID;
  });

  test('2.1 — retorna um objeto (ModalBuilder)', () => {
    const modal = buildProofModal();
    assert.ok(modal, 'Modal deve existir');
    assert.equal(typeof modal, 'object');
  });

  test('2.2 — customId é proofs:modal_submit', () => {
    const modal = buildProofModal();
    assert.equal(modal.data.custom_id, 'proofs:modal_submit');
  });

  test('2.3 — MODAL_CUSTOM_ID é proofs:modal_submit', () => {
    assert.equal(MODAL_CUSTOM_ID, 'proofs:modal_submit');
  });

  test('2.4 — tem 5 componentes (linha de inputs)', () => {
    const modal = buildProofModal();
    assert.equal(modal.components.length, 5, 'Modal deve ter 5 action rows');
  });

  test('2.5 — primeiro campo tem customId cliente_id', () => {
    const modal  = buildProofModal();
    const row    = modal.components[0];
    const input  = row.components[0];
    assert.equal(input.data.custom_id, 'cliente_id');
  });

  test('2.6 — campo cliente_id é obrigatório', () => {
    const modal  = buildProofModal();
    const input  = modal.components[0].components[0];
    assert.equal(input.data.required, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — parseModalData
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — parseModalData', () => {
  let parseModalData;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    parseModalData = mod.parseModalData;
  });

  /** Cria um mock de interaction com modal fields. */
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

  test('3.1 — extrai clienteRaw', () => {
    const interaction = makeInteraction({ cliente_id: '<@111222333444555666>' });
    const data = parseModalData(interaction);
    assert.equal(data.clienteRaw, '<@111222333444555666>');
  });

  test('3.2 — extrai produto', () => {
    const interaction = makeInteraction({ produto: 'Chroma Fang' });
    const data = parseModalData(interaction);
    assert.equal(data.produto, 'Chroma Fang');
  });

  test('3.3 — extrai valor', () => {
    const interaction = makeInteraction({ valor: 'R$ 50,00' });
    const data = parseModalData(interaction);
    assert.equal(data.valor, 'R$ 50,00');
  });

  test('3.4 — ticket ausente retorna null', () => {
    const interaction = makeInteraction({}); // não tem ticket
    const data = parseModalData(interaction);
    assert.equal(data.ticket, null);
  });

  test('3.5 — notas vazia retorna null', () => {
    const interaction = makeInteraction({ notas: '  ' });
    const data = parseModalData(interaction);
    assert.equal(data.notas, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — buildProofPreviewEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — buildProofPreviewEmbed', () => {
  let buildProofPreviewEmbed;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    buildProofPreviewEmbed = mod.buildProofPreviewEmbed;
  });

  const baseProof = {
    vendorId:   '111000111000111000',
    clientId:   '222000222000222000',
    clienteRaw: null,
    produto:    'Produto Teste',
    valor:      'R$ 100,00',
    ticketId:   null,
    notas:      null,
  };

  test('4.1 — retorna EmbedBuilder (tem .data)', () => {
    const embed = buildProofPreviewEmbed(baseProof);
    assert.ok(embed?.data, 'Deve retornar embed com .data');
  });

  test('4.2 — título indica prova registrada', () => {
    const embed = buildProofPreviewEmbed(baseProof);
    assert.ok(embed.data.title?.includes('Registrada'), `Título: ${embed.data.title}`);
  });

  test('4.3 — cor verde de sucesso', () => {
    const embed = buildProofPreviewEmbed(baseProof);
    // 0x57F287 = 5763207
    assert.equal(embed.data.color, 0x57F287);
  });

  test('4.4 — fields contém vendedor e cliente', () => {
    const embed  = buildProofPreviewEmbed(baseProof);
    const fields = embed.data.fields ?? [];
    const vendedorField = fields.find(f => f.name.includes('Vendedor'));
    const clienteField  = fields.find(f => f.name.includes('Cliente'));
    assert.ok(vendedorField, 'Deve ter campo Vendedor');
    assert.ok(clienteField,  'Deve ter campo Cliente');
    assert.ok(vendedorField.value.includes(baseProof.vendorId));
    assert.ok(clienteField.value.includes(baseProof.clientId));
  });

  test('4.5 — sem ticketId, não tem campo Ticket', () => {
    const embed  = buildProofPreviewEmbed({ ...baseProof, ticketId: null });
    const fields = embed.data.fields ?? [];
    const ticketField = fields.find(f => f.name.includes('Ticket'));
    assert.equal(ticketField, undefined, 'Não deve ter campo Ticket quando ticketId é null');
  });

  test('4.6 — com ticketId, tem campo Ticket', () => {
    const embed  = buildProofPreviewEmbed({ ...baseProof, ticketId: 'TKT-001' });
    const fields = embed.data.fields ?? [];
    const ticketField = fields.find(f => f.name.includes('Ticket'));
    assert.ok(ticketField, 'Deve ter campo Ticket quando ticketId está presente');
    assert.ok(ticketField.value.includes('TKT-001'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — buildProofListEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — buildProofListEmbed', () => {
  let buildProofListEmbed;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    buildProofListEmbed = mod.buildProofListEmbed;
  });

  test('5.1 — lista vazia mostra mensagem adequada', () => {
    const embed = buildProofListEmbed([]);
    assert.ok(embed.data.description?.length > 0, 'Deve ter descrição');
    assert.ok(
      embed.data.description.toLowerCase().includes('nenhuma'),
      `Descrição deve indicar vazio: ${embed.data.description}`,
    );
  });

  test('5.2 — lista com proofs exibe linhas', () => {
    const proofs = [
      { vendorId: '111', clientId: '222', clienteRaw: null, produto: 'Item A', valor: 'R$10', createdAt: 1700000000 },
    ];
    const embed = buildProofListEmbed(proofs);
    assert.ok(embed.data.description?.includes('Item A'), 'Deve exibir o produto');
  });

  test('5.3 — máximo de 10 itens exibidos', () => {
    const proofs = Array.from({ length: 15 }, (_, i) => ({
      vendorId: '111', clientId: null, clienteRaw: `Cliente ${i}`,
      produto: `Prod ${i}`, valor: `R$${i}`, createdAt: 1700000000 + i,
    }));
    const embed = buildProofListEmbed(proofs);
    // Conta o número de ocorrências de "**N.**" no texto
    const matches = (embed.data.description?.match(/\*\*\d+\.\*\*/g) ?? []).length;
    assert.ok(matches <= 10, `Não deve exibir mais de 10 itens: ${matches}`);
  });

  test('5.4 — com mais de 10 proofs, exibe footer', () => {
    const proofs = Array.from({ length: 15 }, (_, i) => ({
      vendorId: '111', clientId: null, clienteRaw: `C${i}`,
      produto: `P${i}`, valor: `${i}`, createdAt: 1700000000 + i,
    }));
    const embed = buildProofListEmbed(proofs);
    assert.ok(embed.data.footer?.text, 'Deve ter footer indicando total');
  });

  test('5.5 — título indica provas recentes', () => {
    const embed = buildProofListEmbed([]);
    assert.ok(embed.data.title?.includes('Prova'), `Título: ${embed.data.title}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — buildSuccessPayload e buildErrorPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — buildSuccessPayload / buildErrorPayload', () => {
  let buildSuccessPayload, buildErrorPayload;

  before(async () => {
    const mod = await import('../src/modules/proofs/flow.mjs');
    buildSuccessPayload = mod.buildSuccessPayload;
    buildErrorPayload   = mod.buildErrorPayload;
  });

  const proof = {
    vendorId: '111222333', clientId: '444555666', clienteRaw: null,
    produto: 'Produto X', valor: 'R$50', ticketId: null, notas: null,
  };

  test('6.1 — buildSuccessPayload tem embeds e é ephemeral', () => {
    const payload = buildSuccessPayload(proof);
    assert.ok(Array.isArray(payload.embeds) && payload.embeds.length > 0, 'Deve ter embeds');
    assert.ok(payload.flags !== undefined && payload.flags !== 0, 'Deve ser ephemeral');
  });

  test('6.2 — buildErrorPayload tem content com ❌', () => {
    const payload = buildErrorPayload('Algo deu errado');
    assert.ok(payload.content?.includes('❌'), 'Deve ter ❌');
    assert.ok(payload.content?.includes('Algo deu errado'), 'Deve ter a mensagem');
  });

  test('6.3 — buildErrorPayload é ephemeral', () => {
    const payload = buildErrorPayload('erro');
    assert.ok(payload.flags !== undefined && payload.flags !== 0, 'Deve ser ephemeral');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — Schema: tabela proofs existe
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — Schema: tabela proofs', () => {
  let db;

  before(async () => {
    const { runSchema } = await import('../src/database/schema.mjs');
    db = new DatabaseSync(':memory:');
    runSchema(db);
  });

  test('7.1 — tabela proofs existe', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='proofs'")
      .get();
    assert.ok(row, 'Tabela proofs deve existir');
  });

  test('7.2 — coluna vendor_id existe', () => {
    const info = db.prepare('PRAGMA table_info(proofs)').all();
    const cols  = info.map(c => c.name);
    assert.ok(cols.includes('vendor_id'), 'Deve ter coluna vendor_id');
  });

  test('7.3 — coluna client_id existe', () => {
    const info = db.prepare('PRAGMA table_info(proofs)').all();
    const cols  = info.map(c => c.name);
    assert.ok(cols.includes('client_id'), 'Deve ter coluna client_id');
  });

  test('7.4 — coluna produto existe', () => {
    const info = db.prepare('PRAGMA table_info(proofs)').all();
    const cols  = info.map(c => c.name);
    assert.ok(cols.includes('produto'), 'Deve ter coluna produto');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — Proofs.mjs: operações CRUD
// ─────────────────────────────────────────────────────────────────────────────
//
// ISOLAMENTO: DATABASE_PATH é definido aqui, ANTES do primeiro import que
// alcança client.mjs/bot.mjs. Os blocos 1–7 nunca importaram client.mjs.

describe('BLOCO 8 — Proofs.mjs CRUD', () => {
  let repo;
  const GUILD = `guild_e12_crud_${randomUUID().slice(0, 8)}`;

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-e12-crud-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Proofs.mjs');
  });

  test('8.1 — createProof retorna objeto com id', () => {
    const proof = repo.createProof(GUILD, {
      vendorId: 'vendor_001',
      clientId: 'client_001',
      produto:  'Item Teste',
      valor:    'R$10',
    });
    assert.ok(proof.id,             'Deve ter id');
    assert.equal(proof.guildId,     GUILD);
    assert.equal(proof.vendorId,    'vendor_001');
    assert.equal(proof.clientId,    'client_001');
    assert.equal(proof.produto,     'Item Teste');
    assert.equal(proof.valor,       'R$10');
  });

  test('8.2 — getProof retorna proof existente', () => {
    const created = repo.createProof(GUILD, { vendorId: 'vendor_002', produto: 'Item B', valor: 'R$20' });
    const found   = repo.getProof(GUILD, created.id);
    assert.ok(found, 'Deve encontrar a proof');
    assert.equal(found.id, created.id);
  });

  test('8.3 — getProof retorna null para id inexistente', () => {
    const result = repo.getProof(GUILD, 'id-que-nao-existe');
    assert.equal(result, null);
  });

  test('8.4 — listProofs retorna proofs do servidor', () => {
    repo.createProof(GUILD, { vendorId: 'vendor_003', produto: 'Item C', valor: 'R$30' });
    const list = repo.listProofs(GUILD);
    assert.ok(list.length > 0, 'Deve retornar ao menos uma proof');
    assert.ok(list.every(p => p.guildId === GUILD), 'Todas devem ser do mesmo guild');
  });

  test('8.5 — countProofs aumenta após createProof', () => {
    const before = repo.countProofs(GUILD);
    repo.createProof(GUILD, { vendorId: 'vendor_004', produto: 'Item D', valor: 'R$40' });
    const after  = repo.countProofs(GUILD);
    assert.equal(after, before + 1);
  });

  test('8.6 — deleteProof retorna true e remove a proof', () => {
    const p      = repo.createProof(GUILD, { vendorId: 'vendor_005', produto: 'Item E', valor: 'R$50' });
    const deleted = repo.deleteProof(GUILD, p.id);
    assert.equal(deleted, true);
    assert.equal(repo.getProof(GUILD, p.id), null, 'Não deve encontrar após excluir');
  });

  test('8.7 — deleteProof retorna false para id inexistente', () => {
    const result = repo.deleteProof(GUILD, 'id-inexistente-deletar');
    assert.equal(result, false);
  });

  test('8.8 — isolamento: proof de outro guild não aparece', () => {
    const outroGuild = `outro_guild_${randomUUID().slice(0, 8)}`;
    repo.createProof(outroGuild, { vendorId: 'vendor_x', produto: 'Item X', valor: 'R$1' });
    const list = repo.listProofs(GUILD);
    assert.ok(list.every(p => p.guildId === GUILD), 'Não deve misturar guilds');
  });

  test('8.9 — clienteRaw persiste quando clientId é null', () => {
    const p = repo.createProof(GUILD, {
      vendorId:   'vendor_006',
      clientId:   null,
      clienteRaw: 'João Silva',
      produto:    'Item F',
      valor:      'R$60',
    });
    assert.equal(p.clientId,   null);
    assert.equal(p.clienteRaw, 'João Silva');
  });

  test('8.10 — listProofs com limit respeita o limite', () => {
    // Cria 5 proofs extras
    for (let i = 0; i < 5; i++) {
      repo.createProof(GUILD, { vendorId: `v_lim_${i}`, produto: `P${i}`, valor: `${i}` });
    }
    const list = repo.listProofs(GUILD, { limit: 3 });
    assert.ok(list.length <= 3, `Não deve retornar mais de 3: ${list.length}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — Integração: fluxo completo com banco
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — Integração: fluxo completo', () => {
  let repo;
  const GUILD = `guild_e12_integ_${randomUUID().slice(0, 8)}`;

  before(async () => {
    // Usa o mesmo banco inicializado no bloco 8 (client.mjs já está cacheado)
    // Apenas reimporta o repositório (já cacheado também, sem re-execução de schema)
    repo = await import('../src/database/repositories/Proofs.mjs');
  });

  test('9.1 — fluxo básico: criar e recuperar proof', () => {
    const proof = repo.createProof(GUILD, {
      vendorId: 'flx_vendor_001',
      clientId: 'flx_client_001',
      produto:  'Fluxo Produto',
      valor:    'R$99,90',
      notas:    'Venda confirmada via PIX',
    });

    const found = repo.getProof(GUILD, proof.id);
    assert.equal(found.vendorId, 'flx_vendor_001');
    assert.equal(found.clientId, 'flx_client_001');
    assert.equal(found.produto,  'Fluxo Produto');
    assert.equal(found.valor,    'R$99,90');
    assert.equal(found.notas,    'Venda confirmada via PIX');
  });

  test('9.2 — proof com ticket', () => {
    const proof = repo.createProof(GUILD, {
      vendorId: 'flx_vendor_002',
      clientId: 'flx_client_002',
      produto:  'Produto com Ticket',
      valor:    'R$200,00',
      ticketId: 'TKT-42',
    });
    assert.equal(proof.ticketId, 'TKT-42');
  });

  test('9.3 — listProofs retorna do mais recente para o mais antigo', () => {
    const p1 = repo.createProof(GUILD, { vendorId: 'flx_v', produto: 'P Antigo', valor: '1' });
    const p2 = repo.createProof(GUILD, { vendorId: 'flx_v', produto: 'P Novo',   valor: '2' });
    const list = repo.listProofs(GUILD);
    const ids  = list.map(p => p.id);
    assert.ok(ids.indexOf(p2.id) < ids.indexOf(p1.id), 'P2 deve vir antes de P1 (mais recente)');
  });

  test('9.4 — countProofs reflete o total correto', () => {
    const before = repo.countProofs(GUILD);
    repo.createProof(GUILD, { vendorId: 'flx_count', produto: 'Cnt', valor: '1' });
    repo.createProof(GUILD, { vendorId: 'flx_count', produto: 'Cnt', valor: '2' });
    const after = repo.countProofs(GUILD);
    assert.equal(after, before + 2);
  });

  test('9.5 — createdAt é um número Unix válido', () => {
    const proof = repo.createProof(GUILD, { vendorId: 'flx_time', produto: 'T', valor: '0' });
    assert.equal(typeof proof.createdAt, 'number');
    assert.ok(proof.createdAt > 1700000000, 'createdAt deve ser um timestamp Unix recente');
  });

  test('9.6 — getProof isola por guildId', () => {
    const outroGuild = `outro_${randomUUID().slice(0, 8)}`;
    const p    = repo.createProof(GUILD, { vendorId: 'flx_iso', produto: 'Iso', valor: '1' });
    const nao  = repo.getProof(outroGuild, p.id);
    assert.equal(nao, null, 'Não deve retornar proof de outro guild');
  });

  test('9.7 — campos opcionais nulos quando não fornecidos', () => {
    const proof = repo.createProof(GUILD, { vendorId: 'flx_opt', produto: 'Opt', valor: '1' });
    assert.equal(proof.clientId,   null);
    assert.equal(proof.clienteRaw, null);
    assert.equal(proof.ticketId,   null);
    assert.equal(proof.notas,      null);
  });

  test('9.8 — múltiplos vendedores no mesmo guild são independentes', () => {
    const GUILD2 = `guild_multi_${randomUUID().slice(0, 8)}`;
    const pA = repo.createProof(GUILD2, { vendorId: 'vendedor_A', produto: 'VA-Prod', valor: '10' });
    const pB = repo.createProof(GUILD2, { vendorId: 'vendedor_B', produto: 'VB-Prod', valor: '20' });
    const list = repo.listProofs(GUILD2);
    const ids  = list.map(p => p.id);
    assert.ok(ids.includes(pA.id), 'Deve conter proof de vendedor A');
    assert.ok(ids.includes(pB.id), 'Deve conter proof de vendedor B');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — proofs/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — proofs/index.mjs exports', () => {
  let idx;

  before(async () => {
    idx = await import('../src/modules/proofs/index.mjs');
  });

  test('10.1 — exporta registerProofsHandler como função', () => {
    assert.equal(typeof idx.registerProofsHandler, 'function');
  });

  test('10.2 — exporta openProofsList como função', () => {
    assert.equal(typeof idx.openProofsList, 'function');
  });

  test('10.3 — exporta buildProofModal como função', () => {
    assert.equal(typeof idx.buildProofModal, 'function');
  });

  test('10.4 — exporta MODAL_CUSTOM_ID como string', () => {
    assert.equal(typeof idx.MODAL_CUSTOM_ID, 'string');
    assert.equal(idx.MODAL_CUSTOM_ID, 'proofs:modal_submit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 11 — CustomIds ≤ 100 chars
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 11 — Verificação de CustomIds (≤ 100 chars)', () => {
  let build;

  before(async () => {
    const mod = await import('../src/utils/customId.mjs');
    build = mod.build;
  });

  test('11.1 — proofs:modal_submit ≤ 100 chars', () => {
    const id = 'proofs:modal_submit';
    assert.ok(id.length <= 100, `${id} = ${id.length} chars`);
  });

  test('11.2 — proofs:list ≤ 100 chars', () => {
    const id = build('proofs', 'list');
    assert.ok(id.length <= 100, `${id} = ${id.length} chars`);
  });

  test('11.3 — MODAL_CUSTOM_ID segue formato namespace:action', () => {
    const parts = 'proofs:modal_submit'.split(':');
    assert.equal(parts.length, 2, 'Deve ter exatamente namespace:action');
    assert.equal(parts[0], 'proofs');
    assert.equal(parts[1], 'modal_submit');
  });

  test('11.4 — build lança erro se customId ultrapassar 100 chars', () => {
    const longPart = 'x'.repeat(95);
    assert.throws(
      () => build('proofs', longPart),
      /100/,
      'Deve lançar erro quando customId exceder 100 chars',
    );
  });
});
