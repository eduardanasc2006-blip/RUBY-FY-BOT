import { DatabaseSync } from 'node:sqlite';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { runSchema } from './schema.mjs';
import { runMigrations } from './migrations.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/bot.mjs';

let db = null;

/**
 * Inicializa a conexão com o banco de dados SQLite (node:sqlite embutido no Node.js 22+).
 * Cria o arquivo e as tabelas automaticamente na primeira execução.
 * Executa as migrações pendentes após o schema base.
 * Deve ser chamado uma única vez, antes do login do bot.
 */
export function initDatabase() {
  const dbPath = config.databasePath;

  // Garante que a pasta existe
  const dbDir = dbPath.startsWith('/')
    ? dirname(dbPath)
    : dirname(new URL(dbPath, `file://${process.cwd()}/`).pathname);
  mkdirSync(dbDir, { recursive: true });

  try {
    db = new DatabaseSync(dbPath);

    // Melhora performance e ativa integridade referencial
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000'); // espera até 5s ao invés de falhar imediatamente

    // 1. Cria tabelas base (idempotente: CREATE TABLE IF NOT EXISTS)
    runSchema(db);

    // 2. Executa migrações pendentes (seguro: não apaga dados existentes)
    runMigrations(db);

    logger.info(`[Database] Banco inicializado em: ${dbPath}`);
  } catch (err) {
    logger.error('[Database] Falha ao inicializar o banco:', err);
    process.exit(1);
  }
}

/**
 * Retorna a instância do banco.
 * Lança erro se o banco não foi inicializado ainda.
 */
export function getDb() {
  if (!db) throw new Error('[Database] Banco não inicializado. Chame initDatabase() primeiro.');
  return db;
}
