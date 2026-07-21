/**
 * Schema do banco de dados.
 * Executa a criação das tabelas caso ainda não existam.
 */

export function runSchema(db) {
  db.exec(`
    -- Registro de servidores que usam o bot
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id   TEXT    PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Configurações modulares por servidor (chave-valor por módulo)
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id   TEXT    NOT NULL,
      module     TEXT    NOT NULL,
      key        TEXT    NOT NULL,
      value      TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (guild_id, module, key),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Modelos reutilizáveis de mensagens/embeds por servidor
    CREATE TABLE IF NOT EXISTS templates (
      id          TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      type        TEXT    NOT NULL DEFAULT 'embed',
      data        TEXT    NOT NULL DEFAULT '{}',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Conexões: ligam uma ação a um modelo e a um canal de destino
    -- Sem FK para template_id: modelos podem ser excluídos independentemente;
    -- o executor trata o template ausente com graciosidade.
    CREATE TABLE IF NOT EXISTS connections (
      id                TEXT    NOT NULL,
      guild_id          TEXT    NOT NULL,
      action            TEXT    NOT NULL,
      template_id       TEXT    NOT NULL,
      target_channel_id TEXT    NOT NULL,
      enabled           INTEGER NOT NULL DEFAULT 1,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Instâncias de tickets abertos por servidor
    -- A configuração do sistema de tickets fica em guild_settings (module='tickets').
    CREATE TABLE IF NOT EXISTS tickets (
      id          TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      channel_id  TEXT    NOT NULL,
      user_id     TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'open',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      closed_at   INTEGER,
      closed_by   TEXT,
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Clientes cadastrados por servidor (Etapa 14)
    -- discord_id é único por servidor (UNIQUE ignora NULLs no SQLite,
    --   portanto múltiplos clientes externos sem Discord são permitidos).
    CREATE TABLE IF NOT EXISTS clients (
      id           TEXT    NOT NULL,
      guild_id     TEXT    NOT NULL,
      display_name TEXT    NOT NULL,
      discord_id   TEXT,
      email        TEXT,
      phone        TEXT,
      notas        TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      UNIQUE (guild_id, discord_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Pedidos de venda por servidor (Etapa 13)
    -- vendor_id   — quem criou o pedido (Discord userId)
    -- client_id   — ID Discord do cliente resolvido (null se não identificado)
    -- cliente_raw — texto original do campo cliente
    -- status      — pending|awaiting_payment|paid|processing|delivered|completed|cancelled
    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      vendor_id   TEXT    NOT NULL,
      client_id   TEXT,
      cliente_raw TEXT,
      produto     TEXT    NOT NULL,
      valor       TEXT,
      ticket_id   TEXT,
      status      TEXT    NOT NULL DEFAULT 'pending',
      notas       TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Provas de venda registradas por servidor (Etapa 12)
    -- vendor_id   — quem registrou a prova (Discord userId)
    -- client_id   — ID Discord do cliente resolvido (null se não identificado)
    -- cliente_raw — texto original do campo cliente (null se client_id resolvido)
    -- ticket_id   — referência opcional ao ticket relacionado
    CREATE TABLE IF NOT EXISTS proofs (
      id          TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      vendor_id   TEXT    NOT NULL,
      client_id   TEXT,
      cliente_raw TEXT,
      produto     TEXT,
      valor       TEXT,
      ticket_id   TEXT,
      notas       TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Automações visuais por servidor (Etapa 16)
    -- trigger_type — nome do gatilho (ticket_opened, order_paid, etc.)
    --               Coluna nomeada trigger_type para evitar conflito com palavra reservada SQL.
    -- conditions   — JSON array de condições (avaliadas em AND)
    -- actions      — JSON array de ações (executadas em sequência)
    CREATE TABLE IF NOT EXISTS automations (
      id           TEXT    NOT NULL,
      guild_id     TEXT    NOT NULL,
      name         TEXT    NOT NULL,
      trigger_type TEXT    NOT NULL,
      conditions   TEXT    NOT NULL DEFAULT '[]',
      actions      TEXT    NOT NULL DEFAULT '[]',
      enabled      INTEGER NOT NULL DEFAULT 1,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Logs de execução de automações (Etapa 16)
    -- result — 'success' | 'skipped' | 'error'
    -- detail — motivo do skip/erro (ex: 'rate_limit', 'condition_failed')
    CREATE TABLE IF NOT EXISTS automation_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      automation_id TEXT    NOT NULL,
      guild_id      TEXT    NOT NULL,
      trigger_type  TEXT    NOT NULL,
      result        TEXT    NOT NULL,
      detail        TEXT,
      executed_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Catálogo de produtos por servidor (Etapa 17B)
    -- status: 'active' | 'inactive' | 'out_of_stock'
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      price       TEXT,
      stock       INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      image_url   TEXT,
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Log de compras (!comprar) por servidor (Etapa 17B)
    CREATE TABLE IF NOT EXISTS purchase_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id     TEXT    NOT NULL,
      product_id   TEXT    NOT NULL,
      buyer_id     TEXT    NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      unit_price   TEXT,
      order_id     TEXT,
      purchased_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Sessões web de usuários autenticados via Discord OAuth2 (Etapa 19A)
    CREATE TABLE IF NOT EXISTS web_sessions (
      token      TEXT    NOT NULL PRIMARY KEY,
      user_id    TEXT    NOT NULL,
      data       TEXT    NOT NULL DEFAULT '{}',
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_web_sessions_user
      ON web_sessions (user_id);

    CREATE INDEX IF NOT EXISTS idx_web_sessions_expires
      ON web_sessions (expires_at);

    -- Tabela de auditoria centralizada (Etapa 18)
    -- Registra ações administrativas, eventos do Discord e ações do sistema.
    -- source: 'admin' | 'discord_event' | 'system'
    -- result: 'success' | 'error' | 'skipped'
    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT    NOT NULL PRIMARY KEY,
      guild_id    TEXT    NOT NULL,
      actor_id    TEXT,
      module      TEXT    NOT NULL,
      action      TEXT    NOT NULL,
      entity      TEXT,
      entity_id   TEXT,
      before_data TEXT,
      after_data  TEXT,
      result      TEXT    NOT NULL DEFAULT 'success',
      details     TEXT,
      source      TEXT    NOT NULL DEFAULT 'admin',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_guild_created
      ON audit_log (guild_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_log_guild_module
      ON audit_log (guild_id, module);

    CREATE INDEX IF NOT EXISTS idx_audit_log_guild_actor
      ON audit_log (guild_id, actor_id);

    -- Painéis personalizados criados pelos admins (Etapa 17A)
    -- status: 'draft' | 'published'
    -- channel_id / message_id preenchidos após publicação
    CREATE TABLE IF NOT EXISTS custom_panels (
      id                TEXT    NOT NULL,
      guild_id          TEXT    NOT NULL,
      name              TEXT    NOT NULL,
      embed_title       TEXT,
      embed_description TEXT,
      embed_color       TEXT    NOT NULL DEFAULT '#5865F2',
      embed_image       TEXT,
      embed_thumbnail   TEXT,
      embed_footer      TEXT,
      status            TEXT    NOT NULL DEFAULT 'draft',
      channel_id        TEXT,
      message_id        TEXT,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Variáveis personalizadas por servidor (Fase 1)
    -- Cada servidor pode criar variáveis como {pix}, {loja}, {horario}.
    -- UNIQUE (guild_id, name): mesmo servidor não pode ter nomes duplicados.
    -- Servidores diferentes podem ter variáveis com o mesmo nome.
    CREATE TABLE IF NOT EXISTS server_variables (
      id          TEXT    NOT NULL PRIMARY KEY,
      guild_id    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      value       TEXT    NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (guild_id)
        REFERENCES guild_configs (guild_id)
        ON DELETE CASCADE,
      UNIQUE (guild_id, name)
    );

    -- Botões de painéis personalizados (Etapa 17A)
    -- action_type: 'message' | 'open_ticket' | 'give_role' | 'take_role' | 'toggle_role' | 'execute_connection'
    -- action_data: JSON com parâmetros da ação (ex: {"content":"..."} ou {"role_id":"..."})
    -- position: 0-based, usado para ordenar botões em rows (cada row = 5 botões)
    CREATE TABLE IF NOT EXISTS panel_buttons (
      id          TEXT    NOT NULL,
      panel_id    TEXT    NOT NULL,
      guild_id    TEXT    NOT NULL,
      label       TEXT    NOT NULL,
      style       TEXT    NOT NULL DEFAULT 'Primary',
      emoji       TEXT,
      action_type TEXT    NOT NULL DEFAULT 'message',
      action_data TEXT    NOT NULL DEFAULT '{}',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (id, panel_id, guild_id),
      FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
    );

    -- Comandos personalizados por servidor (Fase 2)
    -- Cada servidor pode criar comandos como /pix, /regras, /horario
    -- UNIQUE (guild_id, name): mesmo servidor não pode ter nomes duplicados
    -- content_type: 'text' | 'embed'
    -- content_data: JSON com o conteúdo (texto ou dados do embed)
    -- enabled: 1 = ativo, 0 = desativado
    -- use_count: quantas vezes o comando foi executado
    CREATE TABLE IF NOT EXISTS custom_commands (
      id          TEXT    NOT NULL PRIMARY KEY,
      guild_id    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      content_type TEXT   NOT NULL DEFAULT 'text',
      content_data TEXT    NOT NULL DEFAULT '{}',
      enabled     INTEGER NOT NULL DEFAULT 1,
      use_count   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (guild_id)
        REFERENCES guild_configs (guild_id)
        ON DELETE CASCADE,
      UNIQUE (guild_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild
      ON custom_commands (guild_id);

    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild_enabled
      ON custom_commands (guild_id, enabled);
  `);
}
