/**
 * Sistema de Migrações do Banco de Dados.
 *
 * Responsável por executar migrações pendentes de forma segura:
 *   - Cria a tabela schema_migrations se não existir
 *   - Executa apenas migrações ainda não aplicadas
 *   - Cada migração é idempotente (usa IF NOT EXISTS / try-catch para ALTER TABLE)
 *   - Não apaga dados existentes
 *   - Falha fatal em caso de erro — o bot não inicia com schema inconsistente
 *
 * Uso:
 *   import { runMigrations } from './migrations.mjs';
 *   runMigrations(); // chamado após initDatabase()
 */

import { getDb } from './client.mjs';
import { logger } from '../utils/logger.mjs';

// ── Tabela de controle de migrações ───────────────────────────────────────────

/**
 * Cria a tabela schema_migrations se ainda não existir.
 * Sempre chamada antes de verificar migrações.
 */
function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

/**
 * Verifica se uma migração já foi executada.
 * @param {object} db
 * @param {string} name
 * @returns {boolean}
 */
function isMigrationExecuted(db, name) {
  const row = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(name);
  return !!row;
}

/**
 * Registra uma migração como executada.
 * @param {object} db
 * @param {string} name
 */
function markMigrationExecuted(db, name) {
  db.prepare('INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)').run(name);
}

// ── Lista de migrações ────────────────────────────────────────────────────────

/**
 * Lista ordenada de migrações.
 * Cada entrada: { name: string, up(db): void }
 *
 * Regras ao adicionar uma nova migração:
 *   1. Nunca altere migrações já existentes — crie uma nova.
 *   2. Use IF NOT EXISTS / try-catch em todo DDL para garantir idempotência.
 *   3. Nunca use DROP TABLE / DELETE sem condição.
 *   4. O nome deve ser único e seguir o padrão NNN_descricao.
 */
const MIGRATIONS = [
  {
    name: '000_baseline',
    up(db) {
      // Migração zero: registra o schema base existente.
      // As tabelas já foram criadas por runSchema() com CREATE TABLE IF NOT EXISTS.
      // Esta migração apenas confirma que o baseline foi processado.
      logger.info('[Migrations] Baseline registrado — schema existente confirmado.');
    },
  },
  {
    name: '001_connection_error_tracking',
    up(db) {
      // Adiciona rastreamento de erros nas conexões individuais.
      // Permite que o executor registre a última falha de cada conexão
      // sem interromper as demais.
      try { db.exec('ALTER TABLE connections ADD COLUMN last_error TEXT'); }
      catch { /* coluna já existe — idempotente */ }

      try { db.exec('ALTER TABLE connections ADD COLUMN last_error_at INTEGER'); }
      catch { /* coluna já existe — idempotente */ }

      logger.info('[Migrations] 001: rastreamento de erros adicionado à tabela connections.');
    },
  },
  {
    name: '002_ticket_reopen_support',
    up(db) {
      // Adiciona suporte a reabertura de tickets.
      // reopen_count rastreia quantas vezes o ticket foi reaberto.
      try { db.exec('ALTER TABLE tickets ADD COLUMN reopen_count INTEGER NOT NULL DEFAULT 0'); }
      catch { /* idempotente */ }

      logger.info('[Migrations] 002: suporte a reabertura adicionado à tabela tickets.');
    },
  },
  {
    name: '003_automations',
    up(db) {
      // Etapa 16: sistema de automações visuais.
      // As tabelas são criadas pelo runSchema com CREATE TABLE IF NOT EXISTS;
      // esta migração garante que existam em bancos que não passaram pelo schema novo.
      db.exec(`
        CREATE TABLE IF NOT EXISTS automations (
          id           TEXT    NOT NULL,
          guild_id     TEXT    NOT NULL,
          name         TEXT    NOT NULL,
          trigger_type TEXT    NOT NULL,
          conditions   TEXT    NOT NULL DEFAULT '[]',
          actions      TEXT    NOT NULL DEFAULT '[]',
          enabled      INTEGER NOT NULL DEFAULT 1,
          created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
          PRIMARY KEY (id, guild_id),
          FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id) ON DELETE CASCADE
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS automation_logs (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          automation_id TEXT    NOT NULL,
          guild_id      TEXT    NOT NULL,
          trigger_type  TEXT    NOT NULL,
          result        TEXT    NOT NULL,
          detail        TEXT,
          executed_at   INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);

      logger.info('[Migrations] 003: tabelas automations e automation_logs criadas.');
    },
  },
  {
    name: '004_audit_log',
    up(db) {
      // Etapa 18: sistema centralizado de auditoria.
      // A tabela é criada pelo runSchema com CREATE TABLE IF NOT EXISTS;
      // esta migração garante que exista em bancos mais antigos e adiciona os índices.
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id          TEXT    NOT NULL PRIMARY KEY,
          guild_id    TEXT    NOT NULL,
          actor_id    TEXT,
          module      TEXT    NOT NULL,
          action      TEXT    NOT NULL,
          entity      TEXT,
          entity_id   TEXT,
          before_data TEXT,
          after_data  TEXT,
          result      TEXT    NOT NULL DEFAULT 'success',
          details     TEXT,
          source      TEXT    NOT NULL DEFAULT 'admin',
          created_at  INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);

      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_audit_log_guild_created
            ON audit_log (guild_id, created_at DESC)
        `);
      } catch { /* índice já existe — idempotente */ }

      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_audit_log_guild_module
            ON audit_log (guild_id, module)
        `);
      } catch { /* idempotente */ }

      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_audit_log_guild_actor
            ON audit_log (guild_id, actor_id)
        `);
      } catch { /* idempotente */ }

      logger.info('[Migrations] 004: tabela audit_log e índices criados.');
    },
  },
  {
    name: '005_web_sessions',
    up(db) {
      // Etapa 19A: sessões web para autenticação via Discord OAuth2.
      db.exec(`
        CREATE TABLE IF NOT EXISTS web_sessions (
          token      TEXT    NOT NULL PRIMARY KEY,
          user_id    TEXT    NOT NULL,
          data       TEXT    NOT NULL DEFAULT '{}',
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions (user_id)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions (expires_at)`);
      } catch { /* idempotente */ }

      logger.info('[Migrations] 005: tabela web_sessions criada.');
    },
  },
  {
    name: '006_performance_indexes',
    up(db) {
      // Etapa 19D: índices de performance nas tabelas de alta leitura.
      // Prioriza colunas usadas em filtros, buscas e ordenação frequentes.
      // Todos criados com IF NOT EXISTS — idempotentes e seguros.

      // ── tickets ──────────────────────────────────────────────────────────
      // Consultas mais frequentes: por guild+status, por guild+user, por data
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_guild_status
                   ON tickets (guild_id, status)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_guild_user
                   ON tickets (guild_id, user_id)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_guild_created
                   ON tickets (guild_id, created_at DESC)`);
      } catch { /* idempotente */ }

      // ── orders ────────────────────────────────────────────────────────────
      // Filtros frequentes: por guild+status, por guild+client
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_guild_status
                   ON orders (guild_id, status)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_guild_client
                   ON orders (guild_id, client_id)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_guild_created
                   ON orders (guild_id, created_at DESC)`);
      } catch { /* idempotente */ }

      // ── clients ───────────────────────────────────────────────────────────
      // Consultas: por guild, por guild+discord_id (busca de cliente por ID Discord)
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_clients_guild
                   ON clients (guild_id)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_clients_guild_discord
                   ON clients (guild_id, discord_id)`);
      } catch { /* idempotente */ }

      // ── connections ───────────────────────────────────────────────────────
      // Filtros: por guild+enabled (apenas ativas), por guild+action_name
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_connections_guild_enabled
                   ON connections (guild_id, enabled)`);
      } catch { /* idempotente */ }

      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_connections_guild_action
                   ON connections (guild_id, action_name)`);
      } catch { /* idempotente */ }

      logger.info('[Migrations] 006: índices de performance criados em tickets, orders, clients, connections.');
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

/**
 * Executa todas as migrações pendentes, em ordem.
 *
 * Estratégia de baseline:
 *   Se o banco já existia antes do sistema de migrações ser introduzido,
 *   a migração 000_baseline marca o estado atual como ponto de partida,
 *   sem alterar nenhuma tabela existente.
 *
 * @param {object} [db] - instância do banco (opcional; usa getDb() se omitido)
 */
export function runMigrations(db = null) {
  const database = db ?? getDb();

  ensureMigrationsTable(database);

  let executedCount = 0;

  for (const migration of MIGRATIONS) {
    if (isMigrationExecuted(database, migration.name)) {
      continue; // já executada — pula
    }

    logger.info(`[Migrations] Iniciando: ${migration.name}`);

    try {
      migration.up(database);
      markMigrationExecuted(database, migration.name);
      executedCount++;
      logger.info(`[Migrations] Concluída: ${migration.name}`);
    } catch (err) {
      logger.error(`[Migrations] FALHA na migração '${migration.name}':`, err);
      // Falha fatal: não continuamos com schema potencialmente inconsistente
      throw new Error(`[Migrations] Falha ao executar '${migration.name}': ${err.message}`);
    }
  }

  if (executedCount === 0) {
    logger.info('[Migrations] Schema atualizado — nenhuma migração pendente.');
  } else {
    logger.info(`[Migrations] ${executedCount} migração(ões) executada(s) com sucesso.`);
  }
}

/**
 * Retorna o histórico de migrações executadas.
 * Útil para diagnóstico e para o comando /stats.
 *
 * @param {object} [db]
 * @returns {Array<{ id: number, name: string, executedAt: number }>}
 */
export function listExecutedMigrations(db = null) {
  const database = db ?? getDb();
  try {
    return database
      .prepare('SELECT id, name, executed_at FROM schema_migrations ORDER BY id ASC')
      .all()
      .map(r => ({ id: r.id, name: r.name, executedAt: r.executed_at }));
  } catch {
    return [];
  }
}

/**
 * Retorna os nomes de todas as migrações registradas (aplicadas + pendentes).
 * @returns {string[]}
 */
export function listAllMigrationNames() {
  return MIGRATIONS.map(m => m.name);
}
