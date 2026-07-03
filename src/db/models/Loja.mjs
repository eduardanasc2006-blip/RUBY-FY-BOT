import { getDB } from '../sqlite.mjs';

export function initLoja() {
  const db = getDB();
  if (!db) return;
  db.prepare(`
    CREATE TABLE IF NOT EXISTS loja_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      raridade TEXT DEFAULT 'comum',
      emoji TEXT DEFAULT '📦',
      preco INTEGER NOT NULL,
      descricao TEXT,
      ativo INTEGER DEFAULT 1
    )
  `).run();
}

const Loja = {
  listar(tipo) {
    const db = getDB(); if (!db) return [];
    if (tipo) return db.prepare('SELECT * FROM loja_itens WHERE tipo=? AND ativo=1').all(tipo);
    return db.prepare('SELECT * FROM loja_itens WHERE ativo=1').all();
  },
  findById(id) {
    return getDB()?.prepare('SELECT * FROM loja_itens WHERE id=? AND ativo=1').get(id) ?? null;
  }
};

export default Loja;
