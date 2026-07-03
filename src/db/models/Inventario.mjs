import { getDB } from '../sqlite.mjs';

export function initInventario() {
  const db = getDB();
  if (!db) return;
  db.prepare(`
    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      itemId INTEGER NOT NULL,
      nome TEXT,
      tipo TEXT,
      emoji TEXT,
      raridade TEXT DEFAULT 'comum',
      equipado INTEGER DEFAULT 0,
      obtidoEm TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

const Inventario = {
  listar(userId, guildId) {
    return getDB()?.prepare('SELECT * FROM inventario WHERE userId=? AND guildId=?').all(userId, guildId) ?? [];
  },
  adicionar(userId, guildId, item) {
    const db = getDB(); if (!db) return;
    db.prepare('INSERT INTO inventario (userId,guildId,itemId,nome,tipo,emoji,raridade) VALUES(?,?,?,?,?,?,?)')
      .run(userId, guildId, item.id, item.nome, item.tipo, item.emoji, item.raridade??'comum');
  },
  equipar(id, userId, guildId, tipo) {
    const db = getDB(); if (!db) return;
    db.prepare('UPDATE inventario SET equipado=0 WHERE userId=? AND guildId=? AND tipo=?').run(userId, guildId, tipo);
    db.prepare('UPDATE inventario SET equipado=1 WHERE id=? AND userId=? AND guildId=?').run(id, userId, guildId);
  },
  temItem(userId, guildId, itemId) {
    return !!getDB()?.prepare('SELECT id FROM inventario WHERE userId=? AND guildId=? AND itemId=?').get(userId, guildId, itemId);
  }
};

export default Inventario;
