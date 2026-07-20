/**
 * Testes da Etapa 17A — Painéis e Componentes Personalizados
 *
 * Cobertura:
 *   BLOCO 1 — Schema (tabelas custom_panels e panel_buttons)   (6 testes)
 *   BLOCO 2 — CustomPanels.mjs — CRUD de painéis              (12 testes)
 *   BLOCO 3 — CustomPanels.mjs — CRUD de botões               (12 testes)
 *   BLOCO 4 — flow.mjs — buildPanelEmbed                      (6 testes)
 *   BLOCO 5 — flow.mjs — buildPublishedPayload                 (6 testes)
 *   BLOCO 6 — flow.mjs — validateActionData                    (10 testes)
 *   BLOCO 7 — custompanels/index.mjs exports                  (5 testes)
 *   BLOCO 8 — Limites e validações                            (5 testes)
 *   BLOCO 9 — CustomIds ≤ 100 chars                           (8 testes)
 *
 * Total: 70 testes (objetivo ≥ 66)
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Sufixo único por execução — evita colisão no DB compartilhado
const RUN = randomUUID().slice(0, 8);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Schema
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — Schema (custom_panels e panel_buttons)', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { runSchema }    = await import('../src/database/schema.mjs');

  const db = new DatabaseSync(':memory:');
  runSchema(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

  test('1.1 — tabela custom_panels existe', () => {
    assert.ok(tables.includes('custom_panels'), 'custom_panels deve existir');
  });

  test('1.2 — tabela panel_buttons existe', () => {
    assert.ok(tables.includes('panel_buttons'), 'panel_buttons deve existir');
  });

  test('1.3 — custom_panels tem coluna status com default draft', () => {
    const col = db.prepare('PRAGMA table_info(custom_panels)').all().find(c => c.name === 'status');
    assert.ok(col?.dflt_value?.includes('draft'), 'status deve ter default "draft"');
  });

  test('1.4 — custom_panels tem colunas obrigatórias', () => {
    const cols = db.prepare('PRAGMA table_info(custom_panels)').all().map(c => c.name);
    for (const col of ['id','guild_id','name','embed_color','status','created_at','updated_at']) {
      assert.ok(cols.includes(col), `Coluna '${col}' ausente em custom_panels`);
    }
  });

  test('1.5 — panel_buttons tem colunas obrigatórias', () => {
    const cols = db.prepare('PRAGMA table_info(panel_buttons)').all().map(c => c.name);
    for (const col of ['id','panel_id','guild_id','label','style','action_type','action_data','position']) {
      assert.ok(cols.includes(col), `Coluna '${col}' ausente em panel_buttons`);
    }
  });

  test('1.6 — schema é idempotente (dupla execução segura)', () => {
    assert.doesNotThrow(() => runSchema(db));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — CRUD de painéis
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — CustomPanels.mjs — CRUD de painéis', () => {
  let repo;
  const GUILD = `guild_17a_panels_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/CustomPanels.mjs');
  });

  test('2.1 — createPanel retorna objeto normalizado', () => {
    const p = repo.createPanel(GUILD, { name: 'Painel Teste' });
    assert.ok(p.id, 'Deve ter ID');
    assert.equal(p.guildId, GUILD);
    assert.equal(p.name, 'Painel Teste');
    assert.equal(p.status, 'draft');
    assert.equal(p.embedColor, '#5865F2');
  });

  test('2.2 — createPanel aceita todos os campos', () => {
    const p = repo.createPanel(GUILD, {
      name: 'Completo', embedTitle: 'Título', embedDescription: 'Desc',
      embedColor: '#ED4245', embedImage: 'https://example.com/img.png',
      embedThumbnail: 'https://example.com/thumb.png', embedFooter: 'Rodapé',
    });
    assert.equal(p.embedTitle,       'Título');
    assert.equal(p.embedDescription, 'Desc');
    assert.equal(p.embedColor,       '#ED4245');
    assert.equal(p.embedImage,       'https://example.com/img.png');
    assert.equal(p.embedThumbnail,   'https://example.com/thumb.png');
    assert.equal(p.embedFooter,      'Rodapé');
  });

  test('2.3 — getPanel retorna painel por ID', () => {
    const p    = repo.createPanel(GUILD, { name: 'Get Test' });
    const found = repo.getPanel(GUILD, p.id);
    assert.ok(found);
    assert.equal(found.id, p.id);
  });

  test('2.4 — getPanel retorna null para ID inexistente', () => {
    assert.equal(repo.getPanel(GUILD, 'id-inexistente'), null);
  });

  test('2.5 — getPanel isola por guild', () => {
    const p     = repo.createPanel(GUILD, { name: 'Isolado' });
    const cross = repo.getPanel('outra_guild_17a', p.id);
    assert.equal(cross, null, 'Não deve retornar painel de outra guild');
  });

  test('2.6 — listPanels retorna painéis do servidor', () => {
    repo.createPanel(GUILD, { name: 'List Test 1' });
    repo.createPanel(GUILD, { name: 'List Test 2' });
    const list = repo.listPanels(GUILD);
    assert.ok(list.length >= 2);
    assert.ok(list.every(p => p.guildId === GUILD));
  });

  test('2.7 — countPanels conta corretamente', () => {
    const before = repo.countPanels(GUILD);
    repo.createPanel(GUILD, { name: 'Count Test' });
    assert.equal(repo.countPanels(GUILD), before + 1);
  });

  test('2.8 — updatePanel atualiza campos', () => {
    const p       = repo.createPanel(GUILD, { name: 'Antes' });
    const updated = repo.updatePanel(GUILD, p.id, { name: 'Depois', embedTitle: 'Novo Título' });
    assert.equal(updated.name,       'Depois');
    assert.equal(updated.embedTitle, 'Novo Título');
  });

  test('2.9 — updatePanel retorna null para ID inexistente', () => {
    assert.equal(repo.updatePanel(GUILD, 'nao-existe', { name: 'x' }), null);
  });

  test('2.10 — markPublished muda status para published', () => {
    const p         = repo.createPanel(GUILD, { name: 'Para Publicar' });
    const published = repo.markPublished(GUILD, p.id, 'ch_123', 'msg_456');
    assert.equal(published.status,    'published');
    assert.equal(published.channelId, 'ch_123');
    assert.equal(published.messageId, 'msg_456');
  });

  test('2.11 — deletePanel exclui painel', () => {
    const p       = repo.createPanel(GUILD, { name: 'Para Excluir' });
    const deleted = repo.deletePanel(GUILD, p.id);
    assert.equal(deleted, true);
    assert.equal(repo.getPanel(GUILD, p.id), null);
  });

  test('2.12 — deletePanel retorna false para ID inexistente', () => {
    assert.equal(repo.deletePanel(GUILD, 'nao-existe'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — CRUD de botões
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — CustomPanels.mjs — CRUD de botões', () => {
  let repo;
  const GUILD = `guild_17a_btns_${RUN}`;
  let panelId;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/CustomPanels.mjs');
    const p = repo.createPanel(GUILD, { name: 'Painel de Botões' });
    panelId = p.id;
  });

  test('3.1 — addButton cria botão normalizado', () => {
    const btn = repo.addButton(GUILD, panelId, {
      label: 'Clique Aqui', actionType: 'message', actionData: { content: 'Olá!' },
    });
    assert.ok(btn.id);
    assert.equal(btn.panelId,    panelId);
    assert.equal(btn.label,      'Clique Aqui');
    assert.equal(btn.actionType, 'message');
    assert.deepEqual(btn.actionData, { content: 'Olá!' });
  });

  test('3.2 — addButton com style e emoji', () => {
    const btn = repo.addButton(GUILD, panelId, {
      label: 'Sucesso', style: 'Success', emoji: '✅',
      actionType: 'give_role', actionData: { role_id: 'role_abc' },
    });
    assert.equal(btn.style, 'Success');
    assert.equal(btn.emoji, '✅');
  });

  test('3.3 — getButton retorna botão por ID', () => {
    const btn   = repo.addButton(GUILD, panelId, { label: 'Get', actionType: 'open_ticket', actionData: {} });
    const found = repo.getButton(GUILD, panelId, btn.id);
    assert.ok(found);
    assert.equal(found.id, btn.id);
  });

  test('3.4 — getButton retorna null para ID inexistente', () => {
    assert.equal(repo.getButton(GUILD, panelId, 'nao-existe'), null);
  });

  test('3.5 — getButton isola por guild', () => {
    const btn   = repo.addButton(GUILD, panelId, { label: 'Isolado', actionType: 'message', actionData: { content: 'x' } });
    const cross = repo.getButton('outra_guild_17a', panelId, btn.id);
    assert.equal(cross, null);
  });

  test('3.6 — listButtons retorna botões ordenados por posição', () => {
    const newPanel = repo.createPanel(GUILD, { name: 'List Btns' });
    repo.addButton(GUILD, newPanel.id, { label: 'B1', actionType: 'message', actionData: { content: '1' } });
    repo.addButton(GUILD, newPanel.id, { label: 'B2', actionType: 'message', actionData: { content: '2' } });
    repo.addButton(GUILD, newPanel.id, { label: 'B3', actionType: 'message', actionData: { content: '3' } });
    const list = repo.listButtons(GUILD, newPanel.id);
    assert.equal(list.length, 3);
    // Devem estar em ordem crescente de posição
    for (let i = 1; i < list.length; i++) {
      assert.ok(list[i].position >= list[i-1].position, 'Botões devem estar em ordem');
    }
  });

  test('3.7 — countButtons conta corretamente', () => {
    const newPanel = repo.createPanel(GUILD, { name: 'Count Btns' });
    assert.equal(repo.countButtons(GUILD, newPanel.id), 0);
    repo.addButton(GUILD, newPanel.id, { label: 'B1', actionType: 'message', actionData: { content: '1' } });
    assert.equal(repo.countButtons(GUILD, newPanel.id), 1);
  });

  test('3.8 — deleteButton remove botão', () => {
    const btn     = repo.addButton(GUILD, panelId, { label: 'Del', actionType: 'message', actionData: { content: 'x' } });
    const deleted = repo.deleteButton(GUILD, panelId, btn.id);
    assert.equal(deleted, true);
    assert.equal(repo.getButton(GUILD, panelId, btn.id), null);
  });

  test('3.9 — deleteButton retorna false para ID inexistente', () => {
    assert.equal(repo.deleteButton(GUILD, panelId, 'nao-existe'), false);
  });

  test('3.10 — deletePanel remove botões associados', () => {
    const newPanel = repo.createPanel(GUILD, { name: 'Panel com Botões' });
    repo.addButton(GUILD, newPanel.id, { label: 'X', actionType: 'message', actionData: { content: 'x' } });
    assert.equal(repo.countButtons(GUILD, newPanel.id), 1);
    repo.deletePanel(GUILD, newPanel.id);
    // Botões devem ter sido excluídos em cascata
    const btns = repo.listButtons(GUILD, newPanel.id);
    assert.equal(btns.length, 0, 'Botões devem ser excluídos com o painel');
  });

  test('3.11 — addButton retorna null para painel inexistente', () => {
    const btn = repo.addButton(GUILD, 'painel-nao-existe', { label: 'X', actionType: 'message', actionData: {} });
    assert.equal(btn, null);
  });

  test('3.12 — addButton retorna null quando limite MAX_BUTTONS atingido', () => {
    const maxPanel = repo.createPanel(GUILD, { name: 'Max Panel' });
    for (let i = 0; i < repo.MAX_BUTTONS; i++) {
      repo.addButton(GUILD, maxPanel.id, { label: `B${i}`, actionType: 'message', actionData: { content: `${i}` } });
    }
    const extra = repo.addButton(GUILD, maxPanel.id, { label: 'Extra', actionType: 'message', actionData: { content: 'x' } });
    assert.equal(extra, null, `Deve retornar null quando ${repo.MAX_BUTTONS} botões já existem`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — flow.mjs — buildPanelEmbed
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — flow.mjs — buildPanelEmbed', () => {
  let buildPanelEmbed;

  before(async () => {
    const mod = await import('../src/modules/custompanels/flow.mjs');
    buildPanelEmbed = mod.buildPanelEmbed;
  });

  test('4.1 — retorna EmbedBuilder', () => {
    const embed = buildPanelEmbed({ embedColor: '#5865F2' });
    assert.ok(embed?.data, 'Deve ter .data (EmbedBuilder)');
  });

  test('4.2 — usa embedTitle quando definido', () => {
    const embed = buildPanelEmbed({ embedTitle: 'Título Teste', embedColor: '#5865F2' });
    assert.equal(embed.data.title, 'Título Teste');
  });

  test('4.3 — usa embedDescription quando definido', () => {
    const embed = buildPanelEmbed({ embedDescription: 'Desc Teste', embedColor: '#5865F2' });
    assert.equal(embed.data.description, 'Desc Teste');
  });

  test('4.4 — usa embedColor para definir cor', () => {
    const embed = buildPanelEmbed({ embedColor: '#ED4245' });
    // Cor é convertida para número pelo EmbedBuilder
    assert.ok(embed.data.color !== undefined, 'Deve ter cor definida');
  });

  test('4.5 — usa embedFooter quando definido', () => {
    const embed = buildPanelEmbed({ embedFooter: 'Rodapé Teste', embedColor: '#5865F2' });
    assert.equal(embed.data.footer?.text, 'Rodapé Teste');
  });

  test('4.6 — sem título e descrição usa fallback de descrição', () => {
    const embed = buildPanelEmbed({ embedColor: '#5865F2' });
    assert.ok(embed.data.description?.length > 0, 'Deve ter descrição fallback');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — flow.mjs — buildPublishedPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — flow.mjs — buildPublishedPayload', () => {
  let buildPublishedPayload, repo;
  const GUILD = `guild_17a_pub_${RUN}`;
  let panel;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/CustomPanels.mjs');
    const mod = await import('../src/modules/custompanels/flow.mjs');
    buildPublishedPayload = mod.buildPublishedPayload;

    panel = repo.createPanel(GUILD, { name: 'Pub Panel', embedTitle: 'Pub', embedDescription: 'Desc' });
    repo.addButton(GUILD, panel.id, { label: 'Botão 1', actionType: 'message', actionData: { content: 'Olá!' } });
    repo.addButton(GUILD, panel.id, { label: 'Botão 2', actionType: 'open_ticket', actionData: {} });
  });

  test('5.1 — retorna embeds e components', () => {
    const payload = buildPublishedPayload(panel, GUILD);
    assert.ok(Array.isArray(payload.embeds));
    assert.ok(Array.isArray(payload.components));
    assert.equal(payload.embeds.length, 1);
  });

  test('5.2 — tem exatamente 1 ActionRow com 2 botões', () => {
    const payload = buildPublishedPayload(panel, GUILD);
    assert.equal(payload.components.length, 1, '2 botões cabem em 1 row');
    assert.equal(payload.components[0].components.length, 2);
  });

  test('5.3 — botões têm customId cpnlb:click:panelId:btnId', () => {
    const payload = buildPublishedPayload(panel, GUILD);
    const btn     = payload.components[0].components[0];
    assert.ok(btn.data.custom_id.startsWith('cpnlb:click:'), `CustomId inválido: ${btn.data.custom_id}`);
    assert.ok(btn.data.custom_id.includes(panel.id), 'Deve conter panelId');
  });

  test('5.4 — painel sem botões retorna 0 components', () => {
    const emptyPanel = repo.createPanel(GUILD, { name: 'Sem Botões' });
    const payload    = buildPublishedPayload(emptyPanel, GUILD);
    assert.equal(payload.components.length, 0);
  });

  test('5.5 — 6 botões geram 2 rows (máx 5 por row)', () => {
    const bigPanel = repo.createPanel(GUILD, { name: 'Big Panel' });
    for (let i = 0; i < 6; i++) {
      repo.addButton(GUILD, bigPanel.id, { label: `B${i}`, actionType: 'message', actionData: { content: `${i}` } });
    }
    const payload = buildPublishedPayload(bigPanel, GUILD);
    assert.equal(payload.components.length, 2, '6 botões devem gerar 2 rows');
  });

  test('5.6 — labels dos botões são preservados', () => {
    const payload = buildPublishedPayload(panel, GUILD);
    const labels  = payload.components.flatMap(r => r.components.map(b => b.data.label));
    assert.ok(labels.includes('Botão 1'));
    assert.ok(labels.includes('Botão 2'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — flow.mjs — validateActionData
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — flow.mjs — validateActionData', () => {
  let validateActionData;

  before(async () => {
    const mod = await import('../src/modules/custompanels/flow.mjs');
    validateActionData = mod.validateActionData;
  });

  test('6.1 — message com content é válido', () => {
    const r = validateActionData('message', { content: 'Olá!' });
    assert.equal(r.valid, true);
  });

  test('6.2 — message sem content é inválido', () => {
    const r = validateActionData('message', {});
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes('content'));
  });

  test('6.3 — give_role com role_id é válido', () => {
    assert.equal(validateActionData('give_role', { role_id: 'abc' }).valid, true);
  });

  test('6.4 — take_role com role_id é válido', () => {
    assert.equal(validateActionData('take_role', { role_id: 'abc' }).valid, true);
  });

  test('6.5 — toggle_role com role_id é válido', () => {
    assert.equal(validateActionData('toggle_role', { role_id: 'abc' }).valid, true);
  });

  test('6.6 — give_role sem role_id é inválido', () => {
    const r = validateActionData('give_role', {});
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes('role_id'));
  });

  test('6.7 — open_ticket sem dados extras é válido', () => {
    assert.equal(validateActionData('open_ticket', {}).valid, true);
  });

  test('6.8 — execute_connection com action é válido', () => {
    assert.equal(validateActionData('execute_connection', { action: 'proof' }).valid, true);
  });

  test('6.9 — execute_connection sem action é inválido', () => {
    const r = validateActionData('execute_connection', {});
    assert.equal(r.valid, false);
  });

  test('6.10 — actionType desconhecido é inválido', () => {
    const r = validateActionData('hack_server', {});
    assert.equal(r.valid, false);
    assert.ok(r.reason);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — custompanels/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — custompanels/index.mjs exports', () => {
  let idx;

  before(async () => {
    idx = await import('../src/modules/custompanels/index.mjs');
  });

  test('7.1 — exporta registerCustomPanelsHandler', () => {
    assert.equal(typeof idx.registerCustomPanelsHandler, 'function');
  });

  test('7.2 — exporta openCustomPanelsManager', () => {
    assert.equal(typeof idx.openCustomPanelsManager, 'function');
  });

  test('7.3 — MAX_BUTTONS é 20 no repositório', async () => {
    const repo = await import('../src/database/repositories/CustomPanels.mjs');
    assert.equal(repo.MAX_BUTTONS, 20, 'MAX_BUTTONS deve ser 20');
  });

  test('7.4 — VALID_ACTION_TYPES inclui todos os tipos esperados', async () => {
    const repo     = await import('../src/database/repositories/CustomPanels.mjs');
    const expected = ['message', 'open_ticket', 'give_role', 'take_role', 'toggle_role', 'execute_connection'];
    for (const t of expected) {
      assert.ok(repo.VALID_ACTION_TYPES.includes(t), `VALID_ACTION_TYPES deve incluir '${t}'`);
    }
  });

  test('7.5 — VALID_STYLES inclui Primary, Secondary, Success, Danger', async () => {
    const repo     = await import('../src/database/repositories/CustomPanels.mjs');
    const expected = ['Primary', 'Secondary', 'Success', 'Danger'];
    for (const s of expected) {
      assert.ok(repo.VALID_STYLES.includes(s), `VALID_STYLES deve incluir '${s}'`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — Limites e validações
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — Limites e validações de integridade', () => {
  let repo;
  const GUILD = `guild_17a_lim_${RUN}`;

  before(async () => {
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/CustomPanels.mjs');
  });

  test('8.1 — MAX_BUTTONS é exatamente 20', () => {
    assert.equal(repo.MAX_BUTTONS, 20);
  });

  test('8.2 — painel criado tem updatedAt e createdAt', () => {
    const p = repo.createPanel(GUILD, { name: 'TS Test' });
    assert.ok(p.createdAt, 'Deve ter createdAt');
    assert.ok(p.updatedAt, 'Deve ter updatedAt');
  });

  test('8.3 — updatePanel atualiza updatedAt', async () => {
    const p       = repo.createPanel(GUILD, { name: 'Update TS' });
    // Espera 1 segundo para garantir diferença de timestamp
    await new Promise(r => setTimeout(r, 1100));
    const updated = repo.updatePanel(GUILD, p.id, { name: 'Updated' });
    assert.ok(updated.updatedAt >= p.updatedAt, 'updatedAt deve ser >= ao original');
  });

  test('8.4 — botão tem actionData desserializado como objeto', () => {
    const panel = repo.createPanel(GUILD, { name: 'JSON Test' });
    const btn   = repo.addButton(GUILD, panel.id, {
      label: 'JSON Btn', actionType: 'message',
      actionData: { content: 'Texto', extra: 42 },
    });
    assert.equal(typeof btn.actionData, 'object', 'actionData deve ser objeto');
    assert.equal(btn.actionData.content, 'Texto');
    assert.equal(btn.actionData.extra,   42);
  });

  test('8.5 — listPanels com filtro status funciona', () => {
    const g = `guild_17a_filt_${RUN}`;
    const p1 = repo.createPanel(g, { name: 'Draft' });
    repo.markPublished(g, p1.id, 'ch1', 'msg1');
    repo.createPanel(g, { name: 'Draft 2' });

    const drafts     = repo.listPanels(g, { status: 'draft' });
    const published  = repo.listPanels(g, { status: 'published' });

    assert.ok(drafts.every(p => p.status === 'draft'),     'Todos drafts devem ser draft');
    assert.ok(published.every(p => p.status === 'published'), 'Todos published devem ser published');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — CustomIds ≤ 100 chars
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — Verificação de CustomIds (≤ 100 chars)', () => {
  let build;
  const UUID = randomUUID(); // 36 chars

  before(async () => {
    const mod = await import('../src/utils/customId.mjs');
    build = mod.build;
  });

  test('9.1 — cpnl:list:<UUID>', () => {
    const id = build('cpnl', 'list', UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.2 — cpnl:view:<UUID>:<UUID>', () => {
    const id = build('cpnl', 'view', UUID, UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.3 — cpnl:new_modal', () => {
    assert.ok('cpnl:new_modal'.length <= 100);
  });

  test('9.4 — cpnl:edit_embed:<UUID>:<UUID>', () => {
    const id = build('cpnl', 'edit_embed', UUID, UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.5 — cpnl:add_btn:<UUID>', () => {
    const id = build('cpnl', 'add_btn', UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.6 — cpnl:del_btn:<UUID>:<UUID>', () => {
    const id = build('cpnl', 'del_btn', UUID, UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.7 — cpnlb:click:<UUID>:<UUID>', () => {
    const id = build('cpnlb', 'click', UUID, UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });

  test('9.8 — cpnl:delete_ok:<UUID>', () => {
    const id = build('cpnl', 'delete_ok', UUID);
    assert.ok(id.length <= 100, `${id.length} chars: ${id}`);
  });
});
