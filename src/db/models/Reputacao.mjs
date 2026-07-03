import { getDB } from '../sqlite.mjs';

export function initReputacao() {
  const db = getDB();
  if (!db) return;
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reputacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      pontos INTEGER DEFAULT 0,
      updatedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, guildId)
    )
  `).run();
}

const Reputacao = {
  get(userId, guildId) {
    return getDB()?.prepare('SELECT * FROM reputacao WHERE userId=? AND guildId=?').get(userId, guildId) ?? null;
  },
  add(userId, guildId, pontos) {
    const db = getDB(); if (!db) return;
    db.prepare(`INSERT INTO reputacao (userId,guildId,pontos) VALUES(?,?,?)
      ON CONFLICT(userId,guildId) DO UPDATE SET pontos=pontos+?, updatedAt=datetime('now')`)
      .run(userId, guildId, pontos, pontos);
  },
  top(guildId, limit=10) {
    return getDB()?.prepare('SELECT * FROM reputacao WHERE guildId=? ORDER BY pontos DESC LIMIT ?').all(guildId, limit) ?? [];
  }
};

export default Reputacao;
