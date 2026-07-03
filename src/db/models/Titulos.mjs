import { getDB } from '../sqlite.mjs';

export function initTitulos() {
  const db = getDB();
  if (!db) return;
  db.prepare(`
    CREATE TABLE IF NOT EXISTS titulos_usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      titulo TEXT NOT NULL,
      ativo INTEGER DEFAULT 0,
      obtidoEm TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

const Titulos = {
  listar(userId, guildId) {
    return getDB()?.prepare('SELECT * FROM titulos_usuario WHERE userId=? AND guildId=?').all(userId, guildId) ?? [];
  },
  adicionar(userId, guildId, titulo) {
    const db = getDB(); if (!db) return;
    const existe = db.prepare('SELECT id FROM titulos_usuario WHERE userId=? AND guildId=? AND titulo=?').get(userId, guildId, titulo);
    if (!existe) db.prepare('INSERT INTO titulos_usuario (userId,guildId,titulo) VALUES(?,?,?)').run(userId, guildId, titulo);
  },
  ativar(userId, guildId, titulo) {
    const db = getDB(); if (!db) return;
    db.prepare('UPDATE titulos_usuario SET ativo=0 WHERE userId=? AND guildId=?').run(userId, guildId);
    db.prepare('UPDATE titulos_usuario SET ativo=1 WHERE userId=? AND guildId=? AND titulo=?').run(userId, guildId, titulo);
  }
};

export default Titulos;
