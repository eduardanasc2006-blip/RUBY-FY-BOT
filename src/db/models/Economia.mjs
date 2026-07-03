import { getDB } from '../sqlite.mjs';

export function initEconomia() {
  const db = getDB();
  if (!db) return;
  db.prepare(`
    CREATE TABLE IF NOT EXISTS economia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      xpDisponivel INTEGER DEFAULT 0,
      totalGasto INTEGER DEFAULT 0,
      totalGanho INTEGER DEFAULT 0,
      updatedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, guildId)
    )
  `).run();
}

const Economia = {
  get(userId, guildId) {
    return getDB()?.prepare('SELECT * FROM economia WHERE userId=? AND guildId=?').get(userId, guildId) ?? null;
  },
  credit(userId, guildId, amount) {
    const db = getDB(); if (!db) return;
    db.prepare(`INSERT INTO economia (userId,guildId,xpDisponivel,totalGanho) VALUES(?,?,?,?)
      ON CONFLICT(userId,guildId) DO UPDATE SET xpDisponivel=xpDisponivel+?, totalGanho=totalGanho+?, updatedAt=datetime('now')`)
      .run(userId, guildId, amount, amount, amount, amount);
  },
  debit(userId, guildId, amount) {
    const db = getDB(); if (!db) return false;
    const row = this.get(userId, guildId);
    if (!row || row.xpDisponivel < amount) return false;
    db.prepare(`UPDATE economia SET xpDisponivel=xpDisponivel-?, totalGasto=totalGasto+?, updatedAt=datetime('now') WHERE userId=? AND guildId=?`)
      .run(amount, amount, userId, guildId);
    return true;
  }
};

export default Economia;
