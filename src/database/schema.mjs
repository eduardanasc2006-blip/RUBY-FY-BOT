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
  `);
}
