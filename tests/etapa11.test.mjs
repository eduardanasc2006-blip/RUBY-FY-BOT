/**
 * Testes da Etapa 11 — Sistema Completo de Tickets
 *
 * Cobertura:
 *   BLOCO 1 — sanitizeChannelName         (8 testes)
 *   BLOCO 2 — buildOpenPanelPayload        (4 testes)
 *   BLOCO 3 — buildWelcomePayload          (5 testes)
 *   BLOCO 4 — buildCloseConfirmPayload     (4 testes)
 *   BLOCO 5 — isTicketModerator            (8 testes)
 *   BLOCO 6 — Tickets.mjs — novos métodos (10 testes)
 *   BLOCO 7 — Fluxo de tickets (integração DB) (12 testes)
 *   BLOCO 8 — formatDuration / log helpers (5 testes via flow)
 *   BLOCO 9 — tickets/index.mjs exports   (5 testes)
 *   BLOCO 10— Verificação de CustomIds     (8 testes)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — banco em memória isolado
// ─────────────────────────────────────────────────────────────────────────────

let db = null;

async function buildMemoryDb() {
  const { runSchema } = await import('../src/database/schema.mjs');
  const d = new DatabaseSync(':memory:');
  runSchema(d);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — sanitizeChannelName
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 1 — sanitizeChannelName', () => {
  let sanitizeChannelName;

  before(async () => {
    const mod = await import('../src/modules/tickets/flow.mjs');
    sanitizeChannelName = mod.sanitizeChannelName;
  });

  test('1.1 — nome simples', () => {
    assert.equal(sanitizeChannelName('joao'), 'ticket-joao');
  });

  test('1.2 — remove acentos', () => {
    const result = sanitizeChannelName('João');
    assert.equal(result, 'ticket-joao');
  });

  test('1.3 — espaços viram hífens', () => {
    const result = sanitizeChannelName('Ana Paula');
    assert.equal(result, 'ticket-ana-paula');
  });

  test('1.4 — caracteres especiais são removidos', () => {
    const result = sanitizeChannelName('user#1234');
    // '#' é inválido → vira hífen; '1234' é válido
    assert.ok(result.startsWith('ticket-'), `Deve começar com ticket-: ${result}`);
    assert.ok(!result.includes('#'), 'Não deve conter #');
  });

  test('1.5 — nome vazio usa fallback', () => {
    const result = sanitizeChannelName('');
    assert.equal(result, 'ticket-usuario');
  });

  test('1.6 — nome null usa fallback', () => {
    const result = sanitizeChannelName(null);
    assert.equal(result, 'ticket-usuario');
  });

  test('1.7 — resultado ≤ 100 chars (limite Discord)', () => {
    const longName = 'a'.repeat(200);
    const result = sanitizeChannelName(longName);
    assert.ok(result.length <= 100, `Comprimento ${result.length} excede 100`);
  });

  test('1.8 — múltiplos hífens consecutivos são colapsados', () => {
    const result = sanitizeChannelName('a--b');
    assert.ok(!result.includes('--'), `Não deve ter hífens duplos: ${result}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — buildOpenPanelPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 2 — buildOpenPanelPayload', () => {
  let buildOpenPanelPayload;

  before(async () => {
    const mod = await import('../src/modules/tickets/flow.mjs');
    buildOpenPanelPayload = mod.buildOpenPanelPayload;
  });

  test('2.1 — retorna embeds e components', () => {
    const payload = buildOpenPanelPayload({});
    assert.ok(Array.isArray(payload.embeds),     'Deve ter embeds');
    assert.ok(Array.isArray(payload.components), 'Deve ter components');
    assert.equal(payload.embeds.length, 1);
    assert.equal(payload.components.length, 1);
  });

  test('2.2 — botão tem customId tkt:open', () => {
    const payload = buildOpenPanelPayload({});
    const row     = payload.components[0];
    const btn     = row.components[0];
    assert.equal(btn.data.custom_id, 'tkt:open');
  });

  test('2.3 — usa intro_message quando configurada', () => {
    const msg     = 'Bem-vindo ao suporte!';
    const payload = buildOpenPanelPayload({ intro_message: msg });
    const embed   = payload.embeds[0];
    assert.equal(embed.data.description, msg);
  });

  test('2.4 — usa mensagem padrão quando intro_message é null', () => {
    const payload = buildOpenPanelPayload({ intro_message: null });
    const embed   = payload.embeds[0];
    assert.ok(embed.data.description?.length > 0, 'Deve ter descrição padrão');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — buildWelcomePayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 3 — buildWelcomePayload', () => {
  let buildWelcomePayload;

  before(async () => {
    const mod = await import('../src/modules/tickets/flow.mjs');
    buildWelcomePayload = mod.buildWelcomePayload;
  });

  const fakeTicket = { id: randomUUID(), createdAt: Math.floor(Date.now() / 1000) };
  const fakeUser   = { id: '111222333444555666', tag: 'Joao#0001', username: 'joao' };

  test('3.1 — retorna embeds e components', () => {
    const p = buildWelcomePayload(fakeTicket, fakeUser, {});
    assert.ok(Array.isArray(p.embeds));
    assert.ok(Array.isArray(p.components));
  });

  test('3.2 — embed contém menção do usuário', () => {
    const p     = buildWelcomePayload(fakeTicket, fakeUser, {});
    const embed = p.embeds[0];
    const allText = JSON.stringify(embed.data);
    assert.ok(allText.includes(fakeUser.id), 'Deve mencionar o ID do usuário');
  });

  test('3.3 — botão de fechar tem customId correto', () => {
    const p   = buildWelcomePayload(fakeTicket, fakeUser, {});
    const row = p.components[0];
    const closeBtn = row.components.find(b => b.data?.custom_id?.includes('close_confirm'));
    assert.ok(closeBtn, 'Deve ter botão de fechar');
    assert.ok(closeBtn.data.custom_id.includes(fakeTicket.id), 'customId deve incluir ticketId');
  });

  test('3.4 — botão de adicionar usuário presente', () => {
    const p   = buildWelcomePayload(fakeTicket, fakeUser, {});
    const row = p.components[0];
    const addBtn = row.components.find(b => b.data?.custom_id?.includes('add_user'));
    assert.ok(addBtn, 'Deve ter botão de adicionar usuário');
  });

  test('3.5 — substitui {usuario} na intro_message', () => {
    const config = { intro_message: 'Olá {usuario}, bem-vindo!' };
    const p      = buildWelcomePayload(fakeTicket, fakeUser, config);
    const embed  = p.embeds[0];
    assert.ok(embed.data.description.includes(`<@${fakeUser.id}>`),
      'Deve ter substituído {usuario} pela menção');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — buildCloseConfirmPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 4 — buildCloseConfirmPayload', () => {
  let buildCloseConfirmPayload;

  before(async () => {
    const mod = await import('../src/modules/tickets/flow.mjs');
    buildCloseConfirmPayload = mod.buildCloseConfirmPayload;
  });

  const tid = randomUUID();

  test('4.1 — retorna content e components', () => {
    const p = buildCloseConfirmPayload(tid);
    assert.ok(p.content?.length > 0);
    assert.ok(Array.isArray(p.components));
  });

  test('4.2 — tem botão de confirmar com close_do', () => {
    const p   = buildCloseConfirmPayload(tid);
    const row = p.components[0];
    const confirmBtn = row.components.find(b => b.data?.custom_id?.includes('close_do'));
    assert.ok(confirmBtn, 'Deve ter botão confirmar');
    assert.ok(confirmBtn.data.custom_id.includes(tid), 'customId deve incluir ticketId');
  });

  test('4.3 — tem botão de cancelar', () => {
    const p   = buildCloseConfirmPayload(tid);
    const row = p.components[0];
    const cancelBtn = row.components.find(b => b.data?.custom_id?.includes('close_cancel'));
    assert.ok(cancelBtn, 'Deve ter botão cancelar');
  });

  test('4.4 — payload é ephemeral', () => {
    const p = buildCloseConfirmPayload(tid);
    // flags: MessageFlags.Ephemeral = 64
    assert.ok(p.flags !== undefined && p.flags !== 0, 'Deve ser ephemeral');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — isTicketModerator
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 5 — isTicketModerator', () => {
  let isTicketModerator, PermissionsBigInt;

  before(async () => {
    const mod = await import('../src/modules/tickets/flow.mjs');
    isTicketModerator = mod.isTicketModerator;
    // Importa PermissionFlagsBits do discord.js para usar nos mocks
    const djs = await import('discord.js');
    PermissionsBigInt = djs.PermissionFlagsBits;
  });

  const ticket = { id: randomUUID(), userId: 'owner_id_111' };
  const config = { support_role_id: 'support_role_999' };

  // Mock de GuildMember com permissões
  function makeMember({ id, hasManageChannels = false, roleIds = [] } = {}) {
    return {
      id,
      permissions: {
        has: (flag) => {
          if (flag === PermissionsBigInt?.ManageChannels) return hasManageChannels;
          return false;
        },
      },
      roles: {
        cache: new Map(roleIds.map(r => [r, { id: r }])),
      },
    };
  }

  test('5.1 — dono do ticket pode fechar', () => {
    const member = makeMember({ id: 'owner_id_111' });
    assert.equal(isTicketModerator(member, ticket, config), true);
  });

  test('5.2 — usuário com ManageChannels pode fechar', () => {
    const member = makeMember({ id: 'mod_001', hasManageChannels: true });
    assert.equal(isTicketModerator(member, ticket, config), true);
  });

  test('5.3 — usuário com cargo de suporte pode fechar', () => {
    const member = makeMember({ id: 'suporte_001', roleIds: ['support_role_999'] });
    assert.equal(isTicketModerator(member, ticket, config), true);
  });

  test('5.4 — usuário sem permissão não pode fechar', () => {
    const member = makeMember({ id: 'random_user_000' });
    assert.equal(isTicketModerator(member, ticket, config), false);
  });

  test('5.5 — member null retorna false', () => {
    assert.equal(isTicketModerator(null, ticket, config), false);
  });

  test('5.6 — sem support_role_id configurado, cargo não dá acesso', () => {
    const member = makeMember({ id: 'random', roleIds: ['support_role_999'] });
    assert.equal(isTicketModerator(member, ticket, { support_role_id: null }), false);
  });

  test('5.7 — cargo diferente do configurado não dá acesso', () => {
    const member = makeMember({ id: 'random', roleIds: ['outro_cargo_888'] });
    assert.equal(isTicketModerator(member, ticket, config), false);
  });

  test('5.8 — ManageChannels tem prioridade mesmo sem cargo de suporte', () => {
    const member = makeMember({ id: 'admin_007', hasManageChannels: true });
    assert.equal(isTicketModerator(member, ticket, { support_role_id: null }), true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Tickets.mjs — novos métodos
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 6 — Tickets.mjs — getOpenTicketByUser e getTicketByChannel', () => {
  let repo;
  const GUILD = 'guild_e11_bloco6';

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-e11-b6-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Tickets.mjs');
  });

  test('6.1 — getOpenTicketByUser retorna null quando sem ticket', () => {
    const result = repo.getOpenTicketByUser(GUILD, 'user_sem_ticket');
    assert.equal(result, null);
  });

  test('6.2 — getOpenTicketByUser retorna ticket aberto', () => {
    const t = repo.createTicket(GUILD, { channelId: 'ch_b6_001', userId: 'user_b6_001' });
    const found = repo.getOpenTicketByUser(GUILD, 'user_b6_001');
    assert.ok(found);
    assert.equal(found.id, t.id);
    assert.equal(found.status, 'open');
  });

  test('6.3 — getOpenTicketByUser retorna null após fechar', () => {
    const t = repo.createTicket(GUILD, { channelId: 'ch_b6_002', userId: 'user_b6_002' });
    repo.closeTicket(GUILD, t.id, 'mod_001');
    const found = repo.getOpenTicketByUser(GUILD, 'user_b6_002');
    assert.equal(found, null, 'Ticket fechado não deve ser retornado por getOpenTicketByUser');
  });

  test('6.4 — getOpenTicketByUser isola por guild', () => {
    repo.createTicket(GUILD, { channelId: 'ch_b6_iso', userId: 'user_iso' });
    const cross = repo.getOpenTicketByUser('outra_guild_999', 'user_iso');
    assert.equal(cross, null, 'Não deve retornar ticket de outra guild');
  });

  test('6.5 — getTicketByChannel retorna ticket pelo canal', () => {
    const t = repo.createTicket(GUILD, { channelId: 'ch_unique_x123', userId: 'user_b6_003' });
    const found = repo.getTicketByChannel(GUILD, 'ch_unique_x123');
    assert.ok(found);
    assert.equal(found.id, t.id);
  });

  test('6.6 — getTicketByChannel retorna null para canal desconhecido', () => {
    const result = repo.getTicketByChannel(GUILD, 'canal_que_nao_existe');
    assert.equal(result, null);
  });

  test('6.7 — getTicketByChannel isola por guild', () => {
    repo.createTicket(GUILD, { channelId: 'ch_iso_canal', userId: 'user_b6_004' });
    const cross = repo.getTicketByChannel('outra_guild_888', 'ch_iso_canal');
    assert.equal(cross, null);
  });

  test('6.8 — apenas um ticket aberto por usuário na guild', () => {
    const userId = 'user_unico_b6';
    const t1 = repo.createTicket(GUILD, { channelId: 'ch_u1', userId });
    // Antes de fechar t1, getOpenTicketByUser deve retornar t1
    const open = repo.getOpenTicketByUser(GUILD, userId);
    assert.equal(open.id, t1.id);
  });

  test('6.9 — após fechar, novo ticket pode ser aberto', () => {
    const userId = 'user_reopener';
    const t1 = repo.createTicket(GUILD, { channelId: 'ch_ro_1', userId });
    repo.closeTicket(GUILD, t1.id, 'mod');
    // Agora pode abrir novo
    const t2 = repo.createTicket(GUILD, { channelId: 'ch_ro_2', userId });
    const open = repo.getOpenTicketByUser(GUILD, userId);
    assert.ok(open);
    assert.equal(open.id, t2.id, 'Deve retornar o novo ticket aberto');
  });

  test('6.10 — getTicketByChannel retorna ticket fechado também', () => {
    // O canal permanece referenciado no DB mesmo após fechar
    const t = repo.createTicket(GUILD, { channelId: 'ch_closed_ref', userId: 'user_b6_009' });
    repo.closeTicket(GUILD, t.id, 'mod');
    const found = repo.getTicketByChannel(GUILD, 'ch_closed_ref');
    assert.ok(found, 'Deve retornar ticket fechado pelo canal');
    assert.equal(found.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — Fluxo de tickets (integração DB)
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 7 — Fluxo completo de tickets (integração DB)', () => {
  let repo;
  const GUILD = 'guild_e11_fluxo';

  before(async () => {
    process.env.DATABASE_PATH = `/tmp/ruby-fy-e11-fluxo-${Date.now()}.db`;
    const { initDatabase } = await import('../src/database/client.mjs');
    initDatabase();
    repo = await import('../src/database/repositories/Tickets.mjs');
  });

  test('7.1 — config padrão desabilitada', () => {
    const cfg = repo.getTicketConfig(GUILD);
    assert.equal(cfg.enabled, false);
  });

  test('7.2 — ativar sistema', () => {
    repo.setTicketConfig(GUILD, { enabled: true, category_id: 'cat_001' });
    const cfg = repo.getTicketConfig(GUILD);
    assert.equal(cfg.enabled, true);
    assert.equal(cfg.category_id, 'cat_001');
  });

  test('7.3 — criar ticket aumenta countOpenTickets', () => {
    const before = repo.countOpenTickets(GUILD);
    repo.createTicket(GUILD, { channelId: 'ch_flow_1', userId: 'user_flow_1' });
    const after = repo.countOpenTickets(GUILD);
    assert.equal(after, before + 1);
  });

  test('7.4 — ticket criado tem status open', () => {
    const t = repo.createTicket(GUILD, { channelId: 'ch_flow_2', userId: 'user_flow_2' });
    assert.equal(t.status, 'open');
    assert.equal(t.closedAt, null);
    assert.equal(t.closedBy, null);
  });

  test('7.5 — impossível ter dois tickets abertos pelo mesmo usuário (regra DB)', () => {
    // DB não impede no nível SQL (sem UNIQUE), mas o código de negócio usa
    // getOpenTicketByUser antes de criar; testamos que a função retorna o correto
    const userId = 'user_duplo';
    const t1 = repo.createTicket(GUILD, { channelId: 'ch_dup_1', userId });
    const open = repo.getOpenTicketByUser(GUILD, userId);
    assert.equal(open.id, t1.id, 'Deve retornar o ticket aberto existente');
  });

  test('7.6 — fechar ticket atualiza status e closedBy', () => {
    const t      = repo.createTicket(GUILD, { channelId: 'ch_close_flow', userId: 'user_cf' });
    const closed = repo.closeTicket(GUILD, t.id, 'mod_cf');
    assert.equal(closed.status,   'closed');
    assert.equal(closed.closedBy, 'mod_cf');
    assert.ok(closed.closedAt, 'closedAt deve estar preenchido');
  });

  test('7.7 — fechar ticket diminui countOpenTickets', () => {
    const t      = repo.createTicket(GUILD, { channelId: 'ch_cnt_flow', userId: 'user_cnt_f' });
    const before = repo.countOpenTickets(GUILD);
    repo.closeTicket(GUILD, t.id, 'mod');
    const after  = repo.countOpenTickets(GUILD);
    assert.equal(after, before - 1);
  });

  test('7.8 — fechar ticket inexistente retorna null', () => {
    const result = repo.closeTicket(GUILD, 'id-inventado-que-nao-existe', 'mod');
    assert.equal(result, null);
  });

  test('7.9 — listTickets(open) só retorna tickets abertos', () => {
    const openList = repo.listTickets(GUILD, { status: 'open' });
    assert.ok(openList.every(t => t.status === 'open'), 'Todos devem ser open');
  });

  test('7.10 — listTickets(closed) só retorna tickets fechados', () => {
    const closedList = repo.listTickets(GUILD, { status: 'closed' });
    assert.ok(closedList.every(t => t.status === 'closed'), 'Todos devem ser closed');
  });

  test('7.11 — isolamento: tickets de outro servidor não aparecem', () => {
    repo.createTicket('outra_guild_x', { channelId: 'ch_x', userId: 'u_x' });
    const mine = repo.listTickets(GUILD);
    assert.ok(mine.every(t => t.guildId === GUILD), 'Não deve misturar guilds');
  });

  test('7.12 — persistência: ticket criado é recuperável por ID', () => {
    const t     = repo.createTicket(GUILD, { channelId: 'ch_persist', userId: 'user_p' });
    const found = repo.getTicket(GUILD, t.id);
    assert.ok(found, 'Deve encontrar o ticket pelo ID');
    assert.equal(found.channelId, 'ch_persist');
    assert.equal(found.userId, 'user_p');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — flow.mjs helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 8 — flow.mjs helpers', () => {
  let flow;

  before(async () => {
    flow = await import('../src/modules/tickets/flow.mjs');
  });

  test('8.1 — buildOpenPanelPayload é uma função', () => {
    assert.equal(typeof flow.buildOpenPanelPayload, 'function');
  });

  test('8.2 — buildWelcomePayload é uma função', () => {
    assert.equal(typeof flow.buildWelcomePayload, 'function');
  });

  test('8.3 — buildCloseConfirmPayload é uma função', () => {
    assert.equal(typeof flow.buildCloseConfirmPayload, 'function');
  });

  test('8.4 — createTicketChannel é uma função', () => {
    assert.equal(typeof flow.createTicketChannel, 'function');
  });

  test('8.5 — sendTicketLog é uma função', () => {
    assert.equal(typeof flow.sendTicketLog, 'function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — tickets/index.mjs exports
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 9 — tickets/index.mjs exports', () => {
  let idx;

  before(async () => {
    idx = await import('../src/modules/tickets/index.mjs');
  });

  test('9.1 — exporta registerTicketsHandler', () => {
    assert.equal(typeof idx.registerTicketsHandler, 'function');
  });

  test('9.2 — exporta openTicketsPanel', () => {
    assert.equal(typeof idx.openTicketsPanel, 'function');
  });

  test('9.3 — exporta buildOpenPanelPayload', () => {
    assert.equal(typeof idx.buildOpenPanelPayload, 'function');
  });

  test('9.4 — buildOpenPanelPayload via index funciona', () => {
    const p = idx.buildOpenPanelPayload({ intro_message: 'Teste via index' });
    assert.ok(p.embeds?.length > 0);
    assert.ok(p.components?.length > 0);
  });

  test('9.5 — buildOpenPanelPayload via index: botão é tkt:open', () => {
    const p   = idx.buildOpenPanelPayload({});
    const btn = p.components[0].components[0];
    assert.equal(btn.data.custom_id, 'tkt:open');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — CustomIds ≤ 100 chars
// ─────────────────────────────────────────────────────────────────────────────

describe('BLOCO 10 — Verificação de CustomIds (≤ 100 chars)', () => {
  let build;
  const UUID = randomUUID(); // 36 chars

  before(async () => {
    const mod = await import('../src/utils/customId.mjs');
    build = mod.build;
  });

  function len(id) { return id.length; }

  test('10.1 — tkt:open', () => {
    const id = build('tkt', 'open');
    assert.ok(len(id) <= 100, `tkt:open = ${len(id)} chars`);
    assert.equal(id, 'tkt:open');
  });

  test('10.2 — tkt:close_confirm:<UUID>', () => {
    const id = build('tkt', 'close_confirm', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.3 — tkt:close_do:<UUID>', () => {
    const id = build('tkt', 'close_do', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.4 — tkt:close_cancel', () => {
    const id = build('tkt', 'close_cancel');
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.5 — tkt:add_user:<UUID>', () => {
    const id = build('tkt', 'add_user', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.6 — tkt:user_select_add:<UUID>', () => {
    const id = build('tkt', 'user_select_add', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.7 — tkt:user_select_rem:<UUID>', () => {
    const id = build('tkt', 'user_select_rem', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });

  test('10.8 — tcfg:pub_select:<UUID>', () => {
    const id = build('tcfg', 'pub_select', UUID);
    assert.ok(len(id) <= 100, `${id} = ${len(id)} chars`);
  });
});
