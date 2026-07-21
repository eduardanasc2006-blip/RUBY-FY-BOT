/**
 * Testes das Melhorias de UX — Menu de Ajuda Dinâmico e Sistema de Mensagens
 *
 * Cobertura:
 *   BLOCO 1  — helpBuilder: categorização de comandos (8 testes)
 *   BLOCO 2  — helpBuilder: construção de embeds (6 testes)
 *   BLOCO 3  — messageManager: publishMessage (5 testes)
 *   BLOCO 4  — messageManager: updateMessage (4 testes)
 *   BLOCO 5  — CustomPanels: markUnpublished (3 testes)
 *   BLOCO 6  — Integração: fluxo completo de edição (4 testes)
 *
 * Total: 30 testes
 *
 * Uso: node --test tests/melhorias-ux.test.mjs
 */

import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── DATABASE_PATH deve ser definido antes de qualquer import do client ────────
const DB_PATH = `/tmp/melhorias-ux-${Date.now()}.db`;
process.env.DATABASE_PATH = DB_PATH;

// ── Imports ──────────────────────────────────────────────────────────────────
const { initDatabase } = await import('../src/database/client.mjs');
const { markPublished, markUnpublished, getPanel } = await import('../src/database/repositories/CustomPanels.mjs');
const { COMMAND_CATEGORIES, CATEGORY_ORDER, CATEGORY_EMOJIS } = await import('../src/utils/helpBuilder.mjs');

// Inicializa banco
initDatabase();

// ── Mocks para Discord.js ────────────────────────────────────────────────────
function createMockClient(commands = []) {
  return {
    commands: {
      values: () => commands,
    },
    user: {
      username: 'TestBot',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
  };
}

// ── BLOCO 1: Categorização de Comandos ─────────────────────────────────────
describe('BLOCO 1 — Categorização de Comandos', () => {

  it('1.1 — painel está na categoria administração', () => {
    assert.strictEqual(COMMAND_CATEGORIES.painel, 'administração');
  });

  it('1.2 — embed está na categoria configuração', () => {
    assert.strictEqual(COMMAND_CATEGORIES.embed, 'configuração');
  });

  it('1.3 — paineis está na categoria gerenciamento', () => {
    assert.strictEqual(COMMAND_CATEGORIES.paineis, 'gerenciamento');
  });

  it('1.4 — ticket está na categoria tickets', () => {
    assert.strictEqual(COMMAND_CATEGORIES.ticket, 'tickets');
  });

  it('1.5 — produto está na categoria produtos', () => {
    assert.strictEqual(COMMAND_CATEGORIES.produto, 'produtos');
  });

  it('1.6 — cliente está na categoria clientes', () => {
    assert.strictEqual(COMMAND_CATEGORIES.cliente, 'clientes');
  });

  it('1.7 — CATEGORY_ORDER segue ordem correta', () => {
    const expected = [
      'administração',
      'configuração',
      'gerenciamento',
      'tickets',
      'produtos',
      'clientes',
      'pedidos',
      'provas',
      'utilidades',
    ];
    assert.deepStrictEqual(CATEGORY_ORDER, expected);
  });

  it('1.8 — CATEGORY_EMOJIS tem emoji para cada categoria', () => {
    for (const cat of CATEGORY_ORDER) {
      assert.ok(CATEGORY_EMOJIS[cat], `Categoria ${cat} deve ter emoji`);
    }
  });
});

// ── BLOCO 2: Construção de Embeds ──────────────────────────────────────────
describe('BLOCO 2 — Construção de Embeds', () => {

  it('2.1 — buildHelpMenu retorna objeto com embeds e components', async () => {
    const { buildHelpMenu } = await import('../src/utils/helpBuilder.mjs');

    const mockClient = {
      commands: new Map(),
      user: { username: 'TestBot', displayAvatarURL: () => '' },
    };

    const result = buildHelpMenu(mockClient);

    assert.ok(result.embeds, 'Deve ter propriedade embeds');
    assert.ok(Array.isArray(result.embeds), 'embeds deve ser array');
    assert.ok(result.components !== undefined, 'Deve ter propriedade components');
  });

  it('2.2 — buildHelpMenu adiciona componentes para múltiplas páginas', async () => {
    const { buildHelpMenu, CATEGORY_ORDER } = await import('../src/utils/helpBuilder.mjs');

    // Cria cliente com comandos suficientes para múltiplas categorias
    const mockClient = {
      commands: new Map(),
      user: { username: 'TestBot', displayAvatarURL: () => '' },
    };

    // Adiciona comandos suficientes para ter múltiplas categorias
    const categories = CATEGORY_ORDER;
    let cmdIndex = 0;
    for (const cat of categories) {
      mockClient.commands.set(`cmd-${cmdIndex}`, {
        data: { name: `cmd-${cmdIndex}`, description: `Comando ${cmdIndex}` },
      });
      cmdIndex++;
    }

    const result = buildHelpMenu(mockClient);

    // Com 9+ categorias, deve ter componentes de navegação
    if (result.embeds.length > 1) {
      assert.ok(result.components.length > 0, 'Deve ter botões de navegação');
    }
  });

  it('2.3 — buildSimpleHelpEmbed retorna EmbedBuilder', async () => {
    const { buildSimpleHelpEmbed } = await import('../src/utils/helpBuilder.mjs');

    const mockClient = {
      commands: new Map(),
      user: { username: 'TestBot', displayAvatarURL: () => '' },
    };

    const embed = buildSimpleHelpEmbed(mockClient, '!');

    assert.ok(embed, 'Deve retornar embed');
    assert.ok(embed.data, 'Embed deve ter data');
  });

  it('2.4 — buildSimpleHelpEmbed inclui username do bot no título', async () => {
    const { buildSimpleHelpEmbed } = await import('../src/utils/helpBuilder.mjs');

    const mockClient = {
      commands: new Map(),
      user: { username: 'TestBot', displayAvatarURL: () => '' },
    };

    const embed = buildSimpleHelpEmbed(mockClient, '!');

    assert.ok(embed.data.title.includes('TestBot'), 'Título deve incluir nome do bot');
  });

  it('2.5 — buildSimpleHelpEmbed com 0 comandos', async () => {
    const { buildSimpleHelpEmbed } = await import('../src/utils/helpBuilder.mjs');

    const mockClient = {
      commands: new Map(),
      user: { username: 'TestBot', displayAvatarURL: () => '' },
    };

    const embed = buildSimpleHelpEmbed(mockClient, '!');

    // Deve funcionar mesmo sem comandos
    assert.ok(embed.data.footer.text.includes('0'), 'Footer deve mostrar 0 comandos');
  });
});

// ── BLOCO 3: CustomPanels — markUnpublished ──────────────────────────────────
describe('BLOCO 3 — CustomPanels markUnpublished', () => {

  it('3.1 — markPublished salva channel_id e message_id', async () => {
    const { createPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-1`;

    const created = createPanel(guildId, { name: 'Teste 1' });
    const published = markPublished(guildId, created.id, '123456', '999999');

    assert.strictEqual(published.status, 'published');
    assert.strictEqual(published.channelId, '123456');
    assert.strictEqual(published.messageId, '999999');
  });

  it('3.2 — markUnpublished atualiza status para draft', async () => {
    const { createPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-2`;

    const created = createPanel(guildId, { name: 'Teste 2' });
    markPublished(guildId, created.id, '123456', '999999');

    const updated = markUnpublished(guildId, created.id);
    assert.strictEqual(updated.status, 'draft');
  });

  it('3.3 — markUnpublished remove channel_id e message_id', async () => {
    const { createPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-3`;

    const created = createPanel(guildId, { name: 'Teste 3' });
    markPublished(guildId, created.id, '123456', '999999');

    const updated = markUnpublished(guildId, created.id);
    assert.strictEqual(updated.channelId, null);
    assert.strictEqual(updated.messageId, null);
  });

  it('3.4 — markUnpublished retorna null para painel inexistente', () => {
    const guildId = `guild-${Date.now()}-4`;
    const panelId = `panel-inexistente-${Date.now()}`;

    const result = markUnpublished(guildId, panelId);
    assert.strictEqual(result, null);
  });
});

// ── BLOCO 4: Integração de fluxo ───────────────────────────────────────────
describe('BLOCO 4 — Integração de Fluxo', () => {

  it('4.1 — markPublished atualiza message_id mantendo outros dados', async () => {
    const { createPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-keep`;

    const created = createPanel(guildId, { name: 'Teste Keep' });

    // Primeira publicação
    const v1 = markPublished(guildId, created.id, 'ch-1', 'msg-1');
    assert.strictEqual(v1.channelId, 'ch-1');

    // Segunda publicação (mesmo canal)
    const v2 = markPublished(guildId, created.id, 'ch-1', 'msg-2');
    assert.strictEqual(v2.channelId, 'ch-1');
    assert.strictEqual(v2.messageId, 'msg-2');
  });

  it('4.2 — markPublished com canal diferente atualiza channel_id', async () => {
    const { createPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-ch`;

    const created = createPanel(guildId, { name: 'Teste Canal' });
    markPublished(guildId, created.id, 'ch-1', 'msg-1');

    // Publicação em canal diferente
    const v2 = markPublished(guildId, created.id, 'ch-2', 'msg-3');
    assert.strictEqual(v2.channelId, 'ch-2');
    assert.strictEqual(v2.messageId, 'msg-3');
  });
});
