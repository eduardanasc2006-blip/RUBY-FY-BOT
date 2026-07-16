import { getDb } from '../client.mjs';

/**
 * Repositório de configurações por servidor.
 *
 * Todas as funções recebem `guildId` como primeiro argumento
 * para garantir o isolamento completo entre servidores.
 */

// ── Registro do servidor ────────────────────────────────────────────────────

/**
 * Retorna o registro do servidor, criando-o se não existir.
 */
export function getOrCreate(guildId) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
  if (existing) return existing;

  db.prepare('INSERT INTO guild_configs (guild_id) VALUES (?)').run(guildId);
  return db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
}

// ── Leitura de configurações ────────────────────────────────────────────────

/**
 * Lê uma configuração específica de um módulo.
 * Retorna o valor já desserializado, ou `null` se não existir.
 */
export function getSetting(guildId, module, key) {
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM guild_settings WHERE guild_id = ? AND module = ? AND key = ?')
    .get(guildId, module, key);

  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

/**
 * Lê todas as configurações de um módulo para um servidor.
 * Retorna um objeto { key: value, ... } já desserializado.
 */
export function getAllSettings(guildId, module) {
  const db = getDb();
  const rows = db
    .prepare('SELECT key, value FROM guild_settings WHERE guild_id = ? AND module = ?')
    .all(guildId, module);

  return Object.fromEntries(
    rows.map(r => {
      let val;
      try { val = JSON.parse(r.value); } catch { val = r.value; }
      return [r.key, val];
    })
  );
}

// ── Escrita de configurações ────────────────────────────────────────────────

/**
 * Salva (ou atualiza) uma configuração de módulo para um servidor.
 * O valor é serializado automaticamente em JSON.
 */
export function setSetting(guildId, module, key, value) {
  const db = getDb();
  getOrCreate(guildId); // garante que o servidor está registrado

  db.prepare(`
    INSERT INTO guild_settings (guild_id, module, key, value, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT (guild_id, module, key)
    DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(guildId, module, key, JSON.stringify(value));
}

// ── Remoção de configurações ────────────────────────────────────────────────

/**
 * Remove uma configuração específica de um módulo.
 */
export function deleteSetting(guildId, module, key) {
  const db = getDb();
  db
    .prepare('DELETE FROM guild_settings WHERE guild_id = ? AND module = ? AND key = ?')
    .run(guildId, module, key);
}

/**
 * Remove todas as configurações de um módulo para um servidor.
 */
export function deleteAllSettings(guildId, module) {
  const db = getDb();
  db
    .prepare('DELETE FROM guild_settings WHERE guild_id = ? AND module = ?')
    .run(guildId, module);
}
