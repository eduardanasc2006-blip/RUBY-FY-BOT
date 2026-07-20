/**
 * Servidor web Express — Etapa 19A.
 *
 * Inicia o servidor HTTP junto ao bot Discord.
 * Falha silenciosa: se o servidor web falhar ao iniciar, o bot continua rodando.
 *
 * Rotas:
 *   GET  /healthz           — health check
 *   GET  /auth/login        — redireciona para Discord OAuth2
 *   GET  /auth/callback     — callback OAuth2, cria sessão
 *   GET  /auth/logout       — invalida sessão
 *   GET  /auth/me           — dados do usuário autenticado
 *   GET  /api/guilds        — servidores do usuário com bot presente
 *   GET  /api/guilds/:id    — dados do servidor
 *   GET  /api/guilds/:id/stats
 *   GET  /api/guilds/:id/templates
 *   GET  /api/guilds/:id/connections
 *   GET  /api/guilds/:id/tickets
 *   GET  /api/guilds/:id/orders
 *   GET  /api/guilds/:id/clients
 */

import express               from 'express';
import { webConfig }         from '../config/web.mjs';
import authRouter            from './routes/auth.mjs';
import apiRouter             from './routes/api.mjs';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.mjs';
import { pruneExpiredSessions }          from '../database/repositories/Sessions.mjs';
import { logger }            from '../utils/logger.mjs';

// ── App principal ─────────────────────────────────────────────────────────────

export function createApp() {
  const app = express();

  // ── Middlewares globais ───────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // CORS básico
  app.use((req, res, next) => {
    const origin  = req.headers.origin ?? '';
    const allowed = webConfig.corsOrigins;
    if (allowed.includes(origin) || allowed.includes('*') || !origin) {
      res.setHeader('Access-Control-Allow-Origin',  origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Segurança básica: remove header X-Powered-By
  app.disable('x-powered-by');

  // ── Health check (sem autenticação) ──────────────────────────────────────
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'ruby-fy-web', timestamp: Date.now() });
  });

  // ── Rotas de autenticação ────────────────────────────────────────────────
  app.use('/auth', authRouter);

  // ── Rotas da API ──────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── 404 e tratamento de erros ─────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// ── Inicialização ─────────────────────────────────────────────────────────────

let httpServer = null;

/**
 * Inicia o servidor web.
 * Nunca lança exceção — falha silenciosa para não interromper o bot.
 *
 * @returns {Promise<boolean>} true se iniciado com sucesso
 */
export async function startWebServer() {
  try {
    if (!webConfig.discord.clientId || !webConfig.discord.clientSecret) {
      logger.warn('[WebServer] DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET não configurados — servidor web não iniciado.');
      return false;
    }

    const app = createApp();

    httpServer = await new Promise((resolve, reject) => {
      const server = app.listen(webConfig.port, () => resolve(server));
      server.once('error', reject);
    });

    logger.info(`[WebServer] Servidor web iniciado na porta ${webConfig.port}`);
    logger.info(`[WebServer] Login Discord: ${webConfig.baseUrl}/auth/login`);

    // Limpeza periódica de sessões expiradas (a cada 1 hora)
    setInterval(() => {
      try {
        const removed = pruneExpiredSessions();
        if (removed > 0) logger.info(`[WebServer] ${removed} sessão(ões) expirada(s) removida(s).`);
      } catch { /* silencioso */ }
    }, 60 * 60 * 1000).unref();

    return true;
  } catch (err) {
    logger.error('[WebServer] Falha ao iniciar servidor web (bot continua funcionando):', err);
    return false;
  }
}

/**
 * Para o servidor web graciosamente.
 * @returns {Promise<void>}
 */
export async function stopWebServer() {
  if (!httpServer) return;
  await new Promise(resolve => httpServer.close(resolve));
  httpServer = null;
  logger.info('[WebServer] Servidor web encerrado.');
}

/**
 * Retorna o servidor HTTP, se estiver rodando.
 * @returns {object|null}
 */
export function getHttpServer() {
  return httpServer;
}
