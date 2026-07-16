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
  `);
}
