/**
 * Repositório de Audit Log — Etapa 18.
 *
 * Registra e consulta eventos de auditoria por guildId.
 * Completamente isolado: nenhuma consulta cross-guild é permitida.
 *
 * Fontes de origem (source):
 *   'admin'         — ação administrativa (comando, painel, editor)
 *   'discord_event' — evento capturado do Discord (mensagem apagada, membro entrou, etc.)
 *   'system'        — ação interna do bot (automação, migração, etc.)
 *
 * Campos de result:
 *   'success' | 'error' | 'skipped'
 */

import { randomUUID } from 'node:crypto';
import { getDb }      from '../client.mjs';
import { getOrCreate } from './GuildConfig.mjs';

// ── Constantes ─────────────────────────────────────────────────────────────────

export const AUDIT_SOURCE = Object.freeze({
  ADMIN:         'admin',
  DISCORD_EVENT: 'discord_event',
  SYSTEM:        'system',
});

export const AUDIT_RESULT = Object.freeze({
  SUCCESS: 'success',
  ERROR:   'error',
  SKIPPED: 'skipped',
});

/** Limite máximo de registros por exportação (segurança). */
const EXPORT_LIMIT = 1000;

/** Limite máximo de registros por consulta paginada. */
const PAGE_SIZE = 10;

// ── Escrita ───────────────────────────────────────────────────────────────────

/**
 * Registra um evento de auditoria.
 *
 * Nunca lança exceção — falha silenciosa para não interromper o fluxo principal.
 *
 * @param {{
 *   guildId:    string,
 *   actorId?:   string|null,
 *   module:     string,
 *   action:     string,
 *   entity?:    string|null,
 *   entityId?:  string|null,
 *   before?:    object|null,
 *   after?:     object|null,
 *   result?:    'success'|'error'|'skipped',
 *   details?:   object|null,
 *   source?:    'admin'|'discord_event'|'system',
 * }} params
 * @returns {object|null} Registro criado, ou null em caso de falha silenciosa.
 */
export function logAudit({
  guildId,
  actorId   = null,
  module,
  action,
  entity    = null,
  entityId  = null,
  before    = null,
  after     = null,
  result    = AUDIT_RESULT.SUCCESS,
  details   = null,
  source    = AUDIT_SOURCE.ADMIN,
}) {
  try {
    const db = getDb();
    getOrCreate(guildId);

    const id = randomUUID();

    db.prepare(`
      INSERT INTO audit_log
        (id, guild_id, actor_id, module, action, entity, entity_id,
         before_data, after_data, result, details, source, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    `).run(
      id,
      guildId,
      actorId,
      module,
      action,
      entity,
      entityId,
      before  ? JSON.stringify(before)  : null,
      after   ? JSON.stringify(after)   : null,
      result,
      details ? JSON.stringify(details) : null,
      source,
    );

    return getAuditEntry(guildId, id);
  } catch {
    // Falha silenciosa — auditoria nunca quebra o fluxo principal
    return null;
  }
}

/**
 * Atalho para registrar evento de erro de auditoria.
 *
 * @param {string} guildId
 * @param {string} module
 * @param {string} action
 * @param {string|Error} err
 * @param {object} extra
 * @returns {object|null}
 */
export function logAuditError(guildId, module, action, err, extra = {}) {
  return logAudit({
    guildId,
    module,
    action,
    result:  AUDIT_RESULT.ERROR,
    details: { error: err instanceof Error ? err.message : String(err), ...extra },
    ...extra,
  });
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Retorna um único registro de auditoria por ID, isolado por guildId.
 *
 * @param {string} guildId
 * @param {string} id
 * @returns {object|null}
 */
export function getAuditEntry(guildId, id) {
  try {
    const row = getDb()
      .prepare('SELECT * FROM audit_log WHERE id = ? AND guild_id = ?')
      .get(id, guildId);
    return row ? deserialize(row) : null;
  } catch {
    return null;
  }
}

/**
 * Lista registros de auditoria com filtros e paginação.
 *
 * @param {string} guildId
 * @param {{
 *   actorId?:  string,
 *   module?:   string,
 *   action?:   string,
 *   entity?:   string,
 *   entityId?: string,
 *   source?:   string,
 *   result?:   string,
 *   from?:     number,   // timestamp unix início
 *   to?:       number,   // timestamp unix fim
 *   page?:     number,   // 1-based
 *   pageSize?: number,
 * }} filters
 * @returns {{ entries: object[], total: number, page: number, pageSize: number, totalPages: number }}
 */
export function listAuditLogs(guildId, filters = {}) {
  try {
    const db = getDb();
    const {
      actorId, module, action, entity, entityId,
      source, result,
      from, to,
      page     = 1,
      pageSize = PAGE_SIZE,
    } = filters;

    const ps   = Math.min(Math.max(1, pageSize), 100);
    const pg   = Math.max(1, page);
    const offset = (pg - 1) * ps;

    const { where, params } = buildWhere(guildId, { actorId, module, action, entity, entityId, source, result, from, to });

    const total = db.prepare(`SELECT COUNT(*) as c FROM audit_log ${where}`).get(...params).c;

    const rows = db.prepare(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, ps, offset);

    return {
      entries:    rows.map(deserialize),
      total,
      page:       pg,
      pageSize:   ps,
      totalPages: Math.max(1, Math.ceil(total / ps)),
    };
  } catch {
    return { entries: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };
  }
}

// ── Estatísticas ──────────────────────────────────────────────────────────────

/**
 * Retorna estatísticas básicas de auditoria para um servidor.
 *
 * @param {string} guildId
 * @returns {{
 *   total: number,
 *   byModule: Record<string, number>,
 *   byResult: Record<string, number>,
 *   bySource: Record<string, number>,
 *   last24h: number,
 *   last7d:  number,
 * }}
 */
export function getAuditStats(guildId) {
  try {
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) as c FROM audit_log WHERE guild_id = ?').get(guildId).c;

    const byModule = {};
    for (const r of db.prepare(
      'SELECT module, COUNT(*) as c FROM audit_log WHERE guild_id = ? GROUP BY module'
    ).all(guildId)) {
      byModule[r.module] = r.c;
    }

    const byResult = {};
    for (const r of db.prepare(
      'SELECT result, COUNT(*) as c FROM audit_log WHERE guild_id = ? GROUP BY result'
    ).all(guildId)) {
      byResult[r.result] = r.c;
    }

    const bySource = {};
    for (const r of db.prepare(
      'SELECT source, COUNT(*) as c FROM audit_log WHERE guild_id = ? GROUP BY source'
    ).all(guildId)) {
      bySource[r.source] = r.c;
    }

    const now   = Math.floor(Date.now() / 1000);
    const last24h = db.prepare(
      'SELECT COUNT(*) as c FROM audit_log WHERE guild_id = ? AND created_at >= ?'
    ).get(guildId, now - 86400).c;

    const last7d = db.prepare(
      'SELECT COUNT(*) as c FROM audit_log WHERE guild_id = ? AND created_at >= ?'
    ).get(guildId, now - 604800).c;

    return { total, byModule, byResult, bySource, last24h, last7d };
  } catch {
    return { total: 0, byModule: {}, byResult: {}, bySource: {}, last24h: 0, last7d: 0 };
  }
}

// ── Exportação ────────────────────────────────────────────────────────────────

/**
 * Exporta registros de auditoria em formato texto, CSV ou JSON.
 * Aplica os mesmos filtros de listAuditLogs, com limite de segurança.
 *
 * @param {string} guildId
 * @param {object} filters   — mesmos filtros de listAuditLogs, sem page/pageSize
 * @param {'txt'|'csv'|'json'} format
 * @returns {{ content: string, filename: string, count: number }}
 */
export function exportAuditLogs(guildId, filters = {}, format = 'txt') {
  try {
    const db = getDb();
    const { where, params } = buildWhere(guildId, filters);

    const rows = db.prepare(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ?`
    ).all(...params, EXPORT_LIMIT);

    const entries = rows.map(deserialize);
    const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const base    = `audit-${guildId.slice(-6)}-${ts}`;

    if (format === 'json') {
      return {
        content:  JSON.stringify(entries, null, 2),
        filename: `${base}.json`,
        count:    entries.length,
      };
    }

    if (format === 'csv') {
      const header = 'id,guild_id,actor_id,module,action,entity,entity_id,result,source,created_at';
      const lines  = entries.map(e =>
        [
          e.id, e.guildId, e.actorId ?? '', e.module, e.action,
          e.entity ?? '', e.entityId ?? '', e.result, e.source,
          new Date(e.createdAt * 1000).toISOString(),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      return {
        content:  [header, ...lines].join('\n'),
        filename: `${base}.csv`,
        count:    entries.length,
      };
    }

    // TXT (padrão)
    const lines = entries.map(e => {
      const date = new Date(e.createdAt * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const actor = e.actorId ? `actor:${e.actorId}` : 'actor:sistema';
      const ent   = e.entity   ? ` entity:${e.entity}${e.entityId ? `(${e.entityId})` : ''}` : '';
      return `[${date}] [${e.source}] [${e.module}/${e.action}] [${e.result}] ${actor}${ent}`;
    });

    return {
      content:  lines.join('\n') || '(sem registros)',
      filename: `${base}.txt`,
      count:    entries.length,
    };
  } catch (err) {
    return { content: '(erro na exportação)', filename: 'audit-error.txt', count: 0 };
  }
}

// ── Utilitários internos ──────────────────────────────────────────────────────

/**
 * Constrói a cláusula WHERE e array de parâmetros para as consultas.
 */
function buildWhere(guildId, filters = {}) {
  const conditions = ['guild_id = ?'];
  const params     = [guildId];

  const { actorId, module, action, entity, entityId, source, result, from, to } = filters;

  if (actorId)  { conditions.push('actor_id = ?');   params.push(actorId); }
  if (module)   { conditions.push('module = ?');      params.push(module); }
  if (action)   { conditions.push('action = ?');      params.push(action); }
  if (entity)   { conditions.push('entity = ?');      params.push(entity); }
  if (entityId) { conditions.push('entity_id = ?');   params.push(entityId); }
  if (source)   { conditions.push('source = ?');      params.push(source); }
  if (result)   { conditions.push('result = ?');      params.push(result); }
  if (from)     { conditions.push('created_at >= ?'); params.push(from); }
  if (to)       { conditions.push('created_at <= ?'); params.push(to); }

  return {
    where:  'WHERE ' + conditions.join(' AND '),
    params,
  };
}

/**
 * Desserializa uma linha do banco para objeto normalizado.
 *
 * @param {object} row
 * @returns {object}
 */
function deserialize(row) {
  let before  = null;
  let after   = null;
  let details = null;

  try { before  = row.before_data  ? JSON.parse(row.before_data)  : null; } catch { before  = null; }
  try { after   = row.after_data   ? JSON.parse(row.after_data)   : null; } catch { after   = null; }
  try { details = row.details      ? JSON.parse(row.details)      : null; } catch { details = null; }

  return {
    id:        row.id,
    guildId:   row.guild_id,
    actorId:   row.actor_id   ?? null,
    module:    row.module,
    action:    row.action,
    entity:    row.entity     ?? null,
    entityId:  row.entity_id  ?? null,
    before,
    after,
    result:    row.result,
    details,
    source:    row.source,
    createdAt: row.created_at,
  };
}
