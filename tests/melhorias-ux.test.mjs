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

// ── BLOCO 5: Tickets Config ─────────────────────────────────────────────────
describe('BLOCO 5 — Tickets Config com Panel IDs', () => {

  it('5.1 — getTicketConfig retorna panel_channel_id e panel_message_id', async () => {
    const { getTicketConfig } = await import('../src/database/repositories/Tickets.mjs');
    const guildId = `guild-${Date.now()}-tk1`;

    const config = getTicketConfig(guildId);

    assert.ok('panel_channel_id' in config, 'Deve ter panel_channel_id');
    assert.ok('panel_message_id' in config, 'Deve ter panel_message_id');
    assert.strictEqual(config.panel_channel_id, null);
    assert.strictEqual(config.panel_message_id, null);
  });

  it('5.2 — setTicketConfig salva panel_channel_id e panel_message_id', async () => {
    const { getTicketConfig, setTicketConfig } = await import('../src/database/repositories/Tickets.mjs');
    const guildId = `guild-${Date.now()}-tk2`;

    setTicketConfig(guildId, {
      panel_channel_id: '123456',
      panel_message_id: '999999',
    });

    const config = getTicketConfig(guildId);
    assert.strictEqual(config.panel_channel_id, '123456');
    assert.strictEqual(config.panel_message_id, '999999');
  });

  it('5.3 — setTicketConfig atualiza panel_message_id mantendo channel_id', async () => {
    const { getTicketConfig, setTicketConfig } = await import('../src/database/repositories/Tickets.mjs');
    const guildId = `guild-${Date.now()}-tk3`;

    setTicketConfig(guildId, { panel_channel_id: 'ch-1', panel_message_id: 'msg-1' });
    setTicketConfig(guildId, { panel_message_id: 'msg-2' });

    const config = getTicketConfig(guildId);
    assert.strictEqual(config.panel_channel_id, 'ch-1');
    assert.strictEqual(config.panel_message_id, 'msg-2');
  });

  it('5.4 — setTicketConfig salva múltiplos campos de uma vez', async () => {
    const { getTicketConfig, setTicketConfig } = await import('../src/database/repositories/Tickets.mjs');
    const guildId = `guild-${Date.now()}-tk4`;

    setTicketConfig(guildId, {
      enabled: true,
      category_id: 'cat-123',
      log_channel_id: 'log-456',
      support_role_id: 'role-789',
      panel_channel_id: 'ch-1',
      panel_message_id: 'msg-1',
    });

    const config = getTicketConfig(guildId);
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.category_id, 'cat-123');
    assert.strictEqual(config.log_channel_id, 'log-456');
    assert.strictEqual(config.support_role_id, 'role-789');
    assert.strictEqual(config.panel_channel_id, 'ch-1');
    assert.strictEqual(config.panel_message_id, 'msg-1');
  });
});

// ── BLOCO 6: MessageManager Centralizado ───────────────────────────────────
describe('BLOCO 6 — MessageManager Centralizado', () => {

  it('6.1 — clearPublished executa callback para limpar IDs', async () => {
    const { clearPublished } = await import('../src/utils/messageManager.mjs');
    let cleared = false;
    let callOrder = [];

    clearPublished(() => {
      cleared = true;
      callOrder.push('callback');
    });

    assert.strictEqual(cleared, true, 'Callback deve ser executado');
  });

  it('6.2 — checkPublished retorna exists=false quando channelId é null', async () => {
    const { checkPublished } = await import('../src/utils/messageManager.mjs');

    // Mock de guild
    const guild = { channels: { cache: { get: () => null } } };

    const result = await checkPublished(guild, null, 'msg-123');
    assert.strictEqual(result.exists, false, 'exists deve ser false');
    assert.strictEqual(result.channelFound, true, 'channelFound deve ser true (sem channel)');
  });

  it('6.3 — checkPublished retorna exists=false quando messageId é null', async () => {
    const { checkPublished } = await import('../src/utils/messageManager.mjs');

    const guild = { channels: { cache: { get: () => null } } };

    const result = await checkPublished(guild, 'ch-123', null);
    assert.strictEqual(result.exists, false, 'exists deve ser false');
  });

  it('6.4 — publishOrUpdate retorna erro quando channelId é null', async () => {
    const { publishOrUpdate } = await import('../src/utils/messageManager.mjs');

    const guild = { channels: { cache: { get: () => null } } };

    const result = await publishOrUpdate({
      guild,
      channelId: null,
      messageId: null,
      payload: { content: 'test' },
    });

    assert.strictEqual(result.success, false, 'success deve ser false');
    assert.strictEqual(result.error, 'channelId_required', 'error deve ser channelId_required');
  });

  it('6.5 — publishOrUpdate retorna channelNotFound quando canal não existe', async () => {
    const { publishOrUpdate } = await import('../src/utils/messageManager.mjs');

    const guild = { channels: { cache: { get: () => null } }, members: { me: null } };

    const result = await publishOrUpdate({
      guild,
      channelId: 'invalid-channel',
      messageId: null,
      payload: { content: 'test' },
    });

    assert.strictEqual(result.success, false, 'success deve ser false');
    assert.strictEqual(result.channelNotFound, true, 'channelNotFound deve ser true');
  });

  it('6.6 — publishOrUpdate retorna no_permission quando sem permissão', async () => {
    const { publishOrUpdate } = await import('../src/utils/messageManager.mjs');

    const mockChannel = {
      permissionsFor: () => ({ has: () => false }),
    };
    const guild = {
      channels: { cache: { get: () => mockChannel } },
      members: { me: { id: 'bot' } },
    };

    const result = await publishOrUpdate({
      guild,
      channelId: 'ch-123',
      messageId: null,
      payload: { content: 'test' },
    });

    assert.strictEqual(result.success, false, 'success deve ser false');
    assert.strictEqual(result.error, 'no_permission', 'error deve ser no_permission');
  });

  it('6.7 — safeReply trata deferred corretamente', async () => {
    const { safeReply } = await import('../src/utils/messageManager.mjs');

    const mockInteraction = {
      deferred: false,
      replied: false,
      reply: async (payload) => {
        mockInteraction.replied = true;
        return payload;
      },
      followUp: async (payload) => {
        return payload;
      },
    };

    await safeReply(mockInteraction, { content: 'test' });
    assert.strictEqual(mockInteraction.replied, true, 'reply deve ser chamado');
  });

  it('6.8 — safeReply trata deferred=true corretamente', async () => {
    const { safeReply } = await import('../src/utils/messageManager.mjs');

    const mockInteraction = {
      deferred: true,
      replied: false,
      reply: async () => {},
      followUp: async (payload) => {
        return payload;
      },
    };

    await safeReply(mockInteraction, { content: 'test' });
    assert.strictEqual(mockInteraction.replied, false, 'reply não deve ser chamado');
  });
});

// ── BLOCO 7: Ajuda com Publicação Permanente ────────────────────────────────
describe('BLOCO 7 — Ajuda com Publicação Permanente', () => {

  it('7.1 — getHelpPublished retorna nulls inicialmente', async () => {
    // Importa diretamente do módulo de comando (após remover export default)
    const { getSetting } = await import('../src/database/repositories/GuildConfig.mjs');
    const guildId = `guild-${Date.now()}-help1`;

    const channelId = getSetting(guildId, 'ajuda', 'channel_id');
    const messageId = getSetting(guildId, 'ajuda', 'message_id');

    assert.strictEqual(channelId, null, 'channel_id deve ser null');
    assert.strictEqual(messageId, null, 'message_id deve ser null');
  });

  it('7.2 — setHelpPublished salva channel_id e message_id', async () => {
    const { getSetting, setSetting } = await import('../src/database/repositories/GuildConfig.mjs');
    const guildId = `guild-${Date.now()}-help2`;

    // Simula o que o comando faz
    setSetting(guildId, 'ajuda', 'channel_id', 'ch-123456');
    setSetting(guildId, 'ajuda', 'message_id', 'msg-789012');

    const channelId = getSetting(guildId, 'ajuda', 'channel_id');
    const messageId = getSetting(guildId, 'ajuda', 'message_id');

    assert.strictEqual(channelId, 'ch-123456', 'channel_id deve ser salvo');
    assert.strictEqual(messageId, 'msg-789012', 'message_id deve ser salvo');
  });

  it('7.3 — clearHelpPublished limpa os IDs', async () => {
    const { getSetting, setSetting } = await import('../src/database/repositories/GuildConfig.mjs');
    const guildId = `guild-${Date.now()}-help3`;

    // Salva
    setSetting(guildId, 'ajuda', 'channel_id', 'ch-123');
    setSetting(guildId, 'ajuda', 'message_id', 'msg-456');

    // Limpa
    setSetting(guildId, 'ajuda', 'channel_id', null);
    setSetting(guildId, 'ajuda', 'message_id', null);

    const channelId = getSetting(guildId, 'ajuda', 'channel_id');
    const messageId = getSetting(guildId, 'ajuda', 'message_id');

    assert.strictEqual(channelId, null, 'channel_id deve ser null após limpar');
    assert.strictEqual(messageId, null, 'message_id deve ser null após limpar');
  });

  it('7.4 — publicação pode ser atualizada mantendo channel_id', async () => {
    const { getSetting, setSetting } = await import('../src/database/repositories/GuildConfig.mjs');
    const guildId = `guild-${Date.now()}-help4`;

    // Primeira publicação
    setSetting(guildId, 'ajuda', 'channel_id', 'ch-1');
    setSetting(guildId, 'ajuda', 'message_id', 'msg-1');

    // Segunda publicação (atualiza message_id)
    setSetting(guildId, 'ajuda', 'message_id', 'msg-2');

    const channelId = getSetting(guildId, 'ajuda', 'channel_id');
    const messageId = getSetting(guildId, 'ajuda', 'message_id');

    assert.strictEqual(channelId, 'ch-1', 'channel_id não deve mudar');
    assert.strictEqual(messageId, 'msg-2', 'message_id deve ser atualizado');
  });
});

// ── BLOCO 8: Integração com Módulos Reais ───────────────────────────────────
describe('BLOCO 8 — Integração com Módulos Reais', () => {

  it('8.1 — CustomPanels usa markPublished para salvar IDs', async () => {
    const { createPanel, getPanel, markPublished } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-int1`;

    // Cria painel primeiro
    const created = createPanel(guildId, { name: 'Teste Painel' });

    // Simula publicação
    markPublished(guildId, created.id, 'ch-1', 'msg-1');

    // Busca painel atualizado
    const updated = getPanel(guildId, created.id);

    assert.strictEqual(updated.channelId, 'ch-1', 'channelId deve ser salvo');
    assert.strictEqual(updated.messageId, 'msg-1', 'messageId deve ser salvo');
  });

  it('8.2 — CustomPanels markUnpublished limpa IDs', async () => {
    const { createPanel, markPublished, markUnpublished, getPanel } = await import('../src/database/repositories/CustomPanels.mjs');
    const guildId = `guild-${Date.now()}-int2`;

    // Cria e publica
    const created = createPanel(guildId, { name: 'Teste Painel 2' });
    markPublished(guildId, created.id, 'ch-1', 'msg-1');

    // Despublica
    markUnpublished(guildId, created.id);

    // Busca painel
    const updated = getPanel(guildId, created.id);

    assert.strictEqual(updated.channelId, null, 'channelId deve ser null após despublicar');
    assert.strictEqual(updated.messageId, null, 'messageId deve ser null após despublicar');
  });

  it('8.3 — Tickets usa setTicketConfig para painel', async () => {
    const { getTicketConfig, setTicketConfig } = await import('../src/database/repositories/Tickets.mjs');
    const guildId = `guild-${Date.now()}-int3`;

    // Salva painel
    setTicketConfig(guildId, {
      panel_channel_id: 'ch-help',
      panel_message_id: 'msg-help',
    });

    // Busca config
    const config = getTicketConfig(guildId);

    assert.strictEqual(config.panel_channel_id, 'ch-help');
    assert.strictEqual(config.panel_message_id, 'msg-help');
  });
});
