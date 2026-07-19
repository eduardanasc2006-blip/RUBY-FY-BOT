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
  `);
}
