import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../fiskbot.db');

let _db = null;

export function isDBConnected() {
  return _db !== null;
}

export function getDB() {
  return _db;
}

// ─────────────────────────────────────────────
// TABLE CREATION
// ─────────────────────────────────────────────
function _createTables() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      xpTotal INTEGER NOT NULL DEFAULT 0,
      xpDisponivel INTEGER NOT NULL DEFAULT 0,
      nivel INTEGER NOT NULL DEFAULT 1,
      reputacao INTEGER NOT NULL DEFAULT 0,
      ultimaRep TEXT,
      tituloEquipado TEXT,
      titulos TEXT NOT NULL DEFAULT '[]',
      mensagens INTEGER NOT NULL DEFAULT 0,
      ultimaMensagem TEXT,
      ultimoXP TEXT,
      streak INTEGER NOT NULL DEFAULT 0,
      ultimoDiaAtivo TEXT,
      genero TEXT,
      moldura TEXT NOT NULL DEFAULT 'padrao',
      fundo TEXT NOT NULL DEFAULT 'escuro',
      badges TEXT NOT NULL DEFAULT '[]',
      efeitos TEXT NOT NULL DEFAULT '[]',
      inventario TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL UNIQUE,
      prefixo TEXT NOT NULL DEFAULT '!',
      canalLogs TEXT,
      canalSuporte TEXT,
      canalDenuncias TEXT,
      canalSugestoes TEXT,
      cargoEquipe TEXT,
      cargoSuporte TEXT,
      cargoVendedor TEXT,
      cargoAdmin TEXT,
      cargoServicos TEXT,
      canalBemVindo TEXT,
      mensagemBemVindo TEXT,
      autoRole TEXT,
      taxa REAL NOT NULL DEFAULT 38,
      taxaHistorico TEXT NOT NULL DEFAULT '[]',
      levelRoles TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS casamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId1 TEXT NOT NULL,
      userId2 TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      dataCasamento TEXT NOT NULL DEFAULT (datetime('now')),
      dataFim TEXT
    );

    CREATE TABLE IF NOT EXISTS afinidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId1 TEXT NOT NULL,
      userId2 TEXT NOT NULL,
      pontos INTEGER NOT NULL DEFAULT 0,
      interacoes INTEGER NOT NULL DEFAULT 0,
      ultimaInteracao TEXT,
      UNIQUE(guildId, userId1, userId2)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      categoria TEXT NOT NULL,
      channelId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberto',
      responsavel TEXT,
      transcript TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(guildId, ticketId)
    );

    CREATE TABLE IF NOT EXISTS conquistas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      conquistas TEXT NOT NULL DEFAULT '[]',
      badges TEXT NOT NULL DEFAULT '[]',
      UNIQUE(userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS missoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      diarias TEXT NOT NULL DEFAULT '[]',
      semanais TEXT NOT NULL DEFAULT '[]',
      ultimaRenovacaoDiaria TEXT,
      ultimaRenovacaoSemanal TEXT,
      ultimaDiaMissao TEXT,
      ultimaSemanaMissao TEXT,
      UNIQUE(userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT NOT NULL DEFAULT '',
      imagem TEXT,
      tabela TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'disponivel'
    );

    CREATE TABLE IF NOT EXISTS quiz_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      acertos INTEGER NOT NULL DEFAULT 0,
      erros INTEGER NOT NULL DEFAULT 0,
      categoriaFavorita TEXT,
      categoriasContagem TEXT NOT NULL DEFAULT '{}',
      UNIQUE(userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS denuncias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      denuncianteId TEXT NOT NULL,
      denunciadoId TEXT NOT NULL,
      motivo TEXT NOT NULL,
      descricao TEXT NOT NULL DEFAULT '',
      provas TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pendente',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      nota INTEGER NOT NULL,
      comentario TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      tipo TEXT NOT NULL,
      userId TEXT,
      dados TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS forca (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      vitorias INTEGER NOT NULL DEFAULT 0,
      derrotas INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS xp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'ganho',
      valor INTEGER NOT NULL DEFAULT 0,
      saldoAntes INTEGER NOT NULL DEFAULT 0,
      saldoApos INTEGER NOT NULL DEFAULT 0,
      xpTotalAntes INTEGER NOT NULL DEFAULT 0,
      xpTotalApos INTEGER NOT NULL DEFAULT 0,
      origem TEXT NOT NULL DEFAULT 'sistema',
      descricao TEXT NOT NULL DEFAULT '',
      referenciaId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      sistema TEXT NOT NULL,
      acao TEXT NOT NULL,
      dados TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

      -- ─── ÍNDICES DE PERFORMANCE ────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_usuarios_user_guild
        ON usuarios(userId, guildId);

      CREATE INDEX IF NOT EXISTS idx_usuarios_xp_ranking
        ON usuarios(guildId, xpTotal DESC);

      CREATE INDEX IF NOT EXISTS idx_usuarios_nivel
        ON usuarios(guildId, nivel DESC);

      CREATE INDEX IF NOT EXISTS idx_afinidades_par
        ON afinidades(guildId, userId1, userId2);

      CREATE INDEX IF NOT EXISTS idx_casamentos_guild
        ON casamentos(guildId, ativo);

      CREATE INDEX IF NOT EXISTS idx_tickets_guild_user
        ON tickets(guildId, userId, status);
    `);

  // ─────────────────────────────
  // INDEXES
  // ─────────────────────────────
  try {
    _db.exec(`
      CREATE INDEX IF NOT EXISTS idx_usuario ON usuarios(userId, guildId);
      CREATE INDEX IF NOT EXISTS idx_xplogs_usuario ON xp_logs(userId, guildId);
      CREATE INDEX IF NOT EXISTS idx_historico_usuario ON historico(userId, guildId);
      CREATE INDEX IF NOT EXISTS idx_logs_guild ON logs(guildId);
    `);
  } catch (e) {
    console.error('[SQLite] erro ao criar índices:', e.message);
  }

// ─────────────────────────────
// SAFE MIGRATIONS (FULL)
// ─────────────────────────────
const migrations = [
  // usuarios
  `ALTER TABLE usuarios ADD COLUMN xpTotal INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE usuarios ADD COLUMN xpDisponivel INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE usuarios ADD COLUMN streak INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE usuarios ADD COLUMN ultimoDiaAtivo TEXT`,
  `ALTER TABLE usuarios ADD COLUMN genero TEXT`,
  `ALTER TABLE usuarios ADD COLUMN moldura TEXT NOT NULL DEFAULT 'padrao'`,
  `ALTER TABLE usuarios ADD COLUMN fundo TEXT NOT NULL DEFAULT 'escuro'`,
  `ALTER TABLE usuarios ADD COLUMN badges TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE usuarios ADD COLUMN efeitos TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE usuarios ADD COLUMN inventario TEXT NOT NULL DEFAULT '{}'`,

  // missoes
  `ALTER TABLE missoes ADD COLUMN ultimaDiaMissao TEXT`,
  `ALTER TABLE missoes ADD COLUMN ultimaSemanaMissao TEXT`,

  // xp_logs
  `ALTER TABLE xp_logs ADD COLUMN saldoAntes INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE xp_logs ADD COLUMN xpTotalAntes INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE xp_logs ADD COLUMN xpTotalApos INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE xp_logs ADD COLUMN descricao TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE xp_logs ADD COLUMN referenciaId TEXT`
];

// execução segura
for (const sql of migrations) {
  try {
    _db.prepare(sql).run();
  } catch (e) {
    // ignora coluna duplicada, mas mostra outros erros reais
    if (!e.message.includes('duplicate column')) {
      console.warn('[Migration error]', sql, '->', e.message);
    }
  }
  }
}
// ─────────────────────────────────────────────
// INIT DB
// ─────────────────────────────────────────────
export function initDB() {
  try {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('synchronous = NORMAL');

    _createTables();

    console.log('[SQLite] Banco de dados iniciado:', DB_PATH);
    return true;
  } catch (e) {
    console.error('[SQLite] Erro ao iniciar:', e.message);
    _db = null;
    return false;
  }
 }


// ── Filter builder ───────────────────────────────────────────
function buildWhere(filter) {
  const parts = [];
  const params = [];
  const dotted = {};

  for (const [key, val] of Object.entries(filter || {})) {
    if (key === '$or') {
      const orParts = [];
      for (const sub of val) {
        const sub2 = {};
        for (const [k2, v2] of Object.entries(sub)) {
          if (!k2.includes('.')) sub2[k2] = v2;
        }
        const { where: w, params: p } = buildWhere(sub2);
        if (w && w !== '1=1') { orParts.push(`(${w})`); params.push(...p); }
      }
      if (orParts.length) parts.push(`(${orParts.join(' OR ')})`);
    } else if (key.includes('.')) {
      dotted[key] = val;
    } else if (val === null || val === undefined) {
      parts.push(`${key} IS NULL`);
    } else if (typeof val === 'boolean') {
      parts.push(`${key} = ?`); params.push(val ? 1 : 0);
    } else if (typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
      for (const [op, ov] of Object.entries(val)) {
        if (op === '$gt')       { parts.push(`${key} > ?`);  params.push(ov); }
        else if (op === '$gte') { parts.push(`${key} >= ?`); params.push(ov); }
        else if (op === '$lt')  { parts.push(`${key} < ?`);  params.push(ov); }
        else if (op === '$lte') { parts.push(`${key} <= ?`); params.push(ov); }
        else if (op === '$ne')  { parts.push(`${key} != ?`); params.push(ov); }
        else if (op === '$in')  { parts.push(`${key} IN (${ov.map(() => '?').join(',')})`); params.push(...ov); }
      }
    } else {
      parts.push(`${key} = ?`);
      params.push(val instanceof Date ? val.toISOString() : val);
    }
  }

  return { where: parts.length ? parts.join(' AND ') : '1=1', params, dotted };
}

// ── Document parser ──────────────────────────────────────────
function parseDoc(row, jsonFields, dateFields) {
  if (!row) return null;
  const doc = { ...row, _id: row.id };
  for (const f of jsonFields) {
    if (doc[f] != null) {
      try { doc[f] = JSON.parse(doc[f]); }
      catch { doc[f] = []; }
    }
  }
  for (const f of dateFields) {
    if (doc[f]) doc[f] = new Date(doc[f]);
  }
  if ('ativo' in doc) doc.ativo = doc.ativo === 1 || doc.ativo === true;
  return doc;
}

function serializeValue(v, isJson, isDate) {
  if (isJson && v != null) return typeof v === 'string' ? v : JSON.stringify(v);
  if (isDate && v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function serializeDoc(data, jsonFields, dateFields) {
  const row = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id' || k === '_id' || k === 'save') continue;
    row[k] = serializeValue(v, jsonFields.includes(k), dateFields.includes(k));
  }
  return row;
}

// ── Apply update operators ───────────────────────────────────
function applyUpdate(row, update, jsonFields, dateFields, isInsert) {
  const r = { ...row };
  const hasOps = Object.keys(update).some(k => k.startsWith('$'));

  if (!hasOps) {
    for (const [k, v] of Object.entries(update)) {
      r[k] = serializeValue(v, jsonFields.includes(k), dateFields.includes(k));
    }
    r.updatedAt = new Date().toISOString();
    return r;
  }

  for (const [op, fields] of Object.entries(update)) {
    if (op === '$set' || (op === '$setOnInsert' && isInsert)) {
      for (const [k, v] of Object.entries(fields)) {
        if (!k.includes('.'))
          r[k] = serializeValue(v, jsonFields.includes(k), dateFields.includes(k));
      }
    } else if (op === '$inc') {
      for (const [k, n] of Object.entries(fields)) {
        if (!k.includes('.')) r[k] = (Number(r[k]) || 0) + n;
      }
    } else if (op === '$push') {
      for (const [k, v] of Object.entries(fields)) {
        if (!k.includes('.') && jsonFields.includes(k)) {
          let arr = []; try { arr = JSON.parse(r[k] || '[]'); } catch {}
          arr.push(v);
          r[k] = JSON.stringify(arr);
        }
      }
    } else if (op === '$pull') {
      for (const [k, matcher] of Object.entries(fields)) {
        if (!k.includes('.') && jsonFields.includes(k)) {
          let arr = []; try { arr = JSON.parse(r[k] || '[]'); } catch {}
          if (matcher && typeof matcher === 'object') {
            arr = arr.filter(item => {
              for (const [mk, mv] of Object.entries(matcher)) {
                if (String(item[mk]) !== String(mv)) return true;
              }
              return false;
            });
          } else {
            arr = arr.filter(i => i !== matcher);
          }
          r[k] = JSON.stringify(arr);
        }
      }
    } else if (op === '$unset') {
      for (const k of Object.keys(fields)) { if (!k.includes('.')) r[k] = null; }
    }
  }
  r.updatedAt = new Date().toISOString();
  return r;
}

function applyPositionalInc(row, update, filter, jsonFields) {
  if (!update.$inc) return row;
  const r = { ...row };
  for (const [k, n] of Object.entries(update.$inc)) {
    if (!k.includes('.$')) continue;
    const [field, , subField] = k.split('.');
    if (!jsonFields.includes(field)) continue;
    let arr = []; try { arr = JSON.parse(r[field] || '[]'); } catch {}
    const dottedFilters = Object.entries(filter).filter(([fk]) => fk.startsWith(field + '.'));
    arr = arr.map(item => {
      let matches = true;
      for (const [fk, fv] of dottedFilters) {
        const sub = fk.split('.')[1];
        const iv = item[sub];
        if (typeof fv === 'boolean') { if (fv !== (iv === true || iv === 1)) matches = false; }
        else if (String(iv) !== String(fv)) matches = false;
      }
      return matches ? { ...item, [subField]: (item[subField] || 0) + n } : item;
    });
    r[field] = JSON.stringify(arr);
  }
  return r;
}

// ── QueryResult (supports .sort().limit().lean()) ────────────
class QueryResult {
  constructor(rows, parseFn) { this._rows = rows; this._p = parseFn; }

  sort(spec) {
    const entries = Object.entries(spec);
    this._rows = [...this._rows].sort((a, b) => {
      for (const [f, d] of entries) {
        const av = a[f] ?? 0, bv = b[f] ?? 0;
        if (av < bv) return d < 0 ? 1 : -1;
        if (av > bv) return d < 0 ? -1 : 1;
      }
      return 0;
    });
    return this;
  }

  limit(n) { this._rows = this._rows.slice(0, n); return this; }

  lean() { return Promise.resolve(this._rows.map(r => this._p(r))); }

  then(res, rej) {
    try { res(this._rows.map(r => this._p(r))); }
    catch (e) { rej(e); }
  }

  catch(fn) { return Promise.resolve(this).catch(fn); }
}

// ── Model factory ────────────────────────────────────────────
export function makeModel(table, { jsonFields = [], dateFields = [] } = {}) {
  function _parse(row) {
    const doc = parseDoc(row, jsonFields, dateFields);
    if (!doc) return null;
    doc.save = async function () {
      if (!_db) return this;
      const { id, _id, save: _s, ...data } = this;
      const ser = serializeDoc(data, jsonFields, dateFields);
      ser.updatedAt = new Date().toISOString();
      const keys = Object.keys(ser);
      _db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`)
        .run(...keys.map(k => ser[k]), id);
      return this;
    };
    return doc;
  }

  function _rows(filter) {
    if (!_db) return [];
    const { where, params, dotted } = buildWhere(filter);
    const rows = _db.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...params);
    if (!Object.keys(dotted).length) return rows;
    return rows.filter(row => {
      for (const [dk, dv] of Object.entries(dotted)) {
        const [field, ...rest] = dk.split('.');
        if (!jsonFields.includes(field)) continue;
        let arr = []; try { arr = JSON.parse(row[field] || '[]'); } catch {}
        const sub = rest.join('.');
        const ok = arr.some(item => {
          const iv = sub.split('.').reduce((o, k) => o?.[k], item);
          if (typeof dv === 'boolean') return dv ? (iv === true || iv === 1) : (iv === false || iv === 0);
          return String(iv) === String(dv);
        });
        if (!ok) return false;
      }
      return true;
    });
  }

  return {
    async findOne(filter) {
      const rows = _rows(filter);
      return rows.length ? _parse(rows[0]) : null;
    },

    find(filter) {
      return new QueryResult(_rows(filter), _parse);
    },

    async create(data) {
      if (!_db) return null;
      const ser = serializeDoc(data, jsonFields, dateFields);
      const keys = Object.keys(ser);
      const r = _db.prepare(
        `INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
      ).run(...keys.map(k => ser[k]));
      const inserted = _db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid);
      return inserted ? _parse(inserted) : null;
    },

    async updateOne(filter, update) {
      if (!_db) return { matchedCount: 0 };
      const rows = _rows(filter);
      if (!rows.length) return { matchedCount: 0, modifiedCount: 0 };
      let row = rows[0];
      row = applyUpdate(row, update, jsonFields, dateFields, false);
      row = applyPositionalInc(row, update, filter, jsonFields);
      const { id, _id, save: _s, ...data } = row;
      const ser = serializeDoc(data, jsonFields, dateFields);
      const keys = Object.keys(ser);
      _db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`)
        .run(...keys.map(k => ser[k]), rows[0].id);
      return { matchedCount: 1, modifiedCount: 1 };
    },

    async findOneAndUpdate(filter, update, opts = {}) {
      if (!_db) return null;
      let rows = _rows(filter);
      let row = rows[0];
      let isInsert = false;

      if (!row) {
        if (!opts.upsert) return null;
        isInsert = true;
        const seed = {};
        for (const [k, v] of Object.entries(filter)) {
          if (!k.startsWith('$') && !k.includes('.'))
            seed[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
        }
        const keys = Object.keys(seed);
        if (keys.length) {
          const r = _db.prepare(
            `INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
          ).run(...keys.map(k => seed[k]));
          row = _db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid);
        }
        if (!row) {
          rows = _rows(filter);
          row = rows[0];
        }
        if (!row) return null;
      }

      let updated = applyUpdate(row, update, jsonFields, dateFields, isInsert);
      updated = applyPositionalInc(updated, update, filter, jsonFields);
      const { id, _id, save: _s, ...data } = updated;
      const ser = serializeDoc(data, jsonFields, dateFields);
      const keys = Object.keys(ser);
      _db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`)
        .run(...keys.map(k => ser[k]), row.id);

      if (opts.new === false) return _parse(row);
      const fresh = _db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(row.id);
      return fresh ? _parse(fresh) : null;
    },

    async findByIdAndUpdate(id, update) {
      if (!_db) return null;
      const row = _db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      if (!row) return null;
      const updated = applyUpdate(row, update, jsonFields, dateFields, false);
      const { id: _i, _id, save: _s, ...data } = updated;
      const ser = serializeDoc(data, jsonFields, dateFields);
      const keys = Object.keys(ser);
      _db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`)
        .run(...keys.map(k => ser[k]), id);
      return _parse(_db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
    },

    async countDocuments(filter) {
      if (!_db) return 0;
      const { where, params, dotted } = buildWhere(filter);
      if (!Object.keys(dotted).length) {
        return _db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${where}`).get(...params).cnt;
      }
      return _rows(filter).length;
    },

    async deleteOne(filter) {
      if (!_db) return { deletedCount: 0 };
      const rows = _rows(filter);
      if (!rows.length) return { deletedCount: 0 };
      _db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(rows[0].id);
      return { deletedCount: 1 };
    },

    async deleteMany(filter) {
      if (!_db) return { deletedCount: 0 };
      const { where, params } = buildWhere(filter);
      const r = _db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...params);
      return { deletedCount: r.changes };
    },
  };
}
