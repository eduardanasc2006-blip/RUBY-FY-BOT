/**
 * Router de páginas web — Etapa 19B.
 *
 * Serve as páginas HTML do Dashboard Web Ruby FY.
 * Integra com o sessionMiddleware da Etapa 19A para proteção de rotas.
 *
 * Rotas:
 *   GET /              → redireciona para /login ou /servers
 *   GET /login         → página de login com Discord OAuth2
 *   GET /servers       → seleção de servidores (requer auth)
 *   GET /servers/:id   → dashboard do servidor (requer auth)
 *   GET /servers/:id/* → subseções do dashboard (requer auth)
 */

import { Router }                   from 'express';
import path                         from 'node:path';
import { fileURLToPath }            from 'node:url';
import { sessionMiddleware }        from '../middleware/requireAuth.mjs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

const router = Router();

// Aplica leitura de sessão em todas as rotas de página
router.use(sessionMiddleware);

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  if (req.session) return res.redirect('/servers');
  res.redirect('/login');
});

// ── GET /login ────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session) return res.redirect('/servers');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// ── GET /servers ──────────────────────────────────────────────────────────────

router.get('/servers', (req, res) => {
  if (!req.session) return res.redirect('/login?next=/servers');
  res.sendFile(path.join(PUBLIC_DIR, 'servers.html'));
});

// ── GET /servers/:guildId ─────────────────────────────────────────────────────

router.get('/servers/:guildId', (req, res) => {
  if (!req.session) return res.redirect(`/login?next=/servers/${req.params.guildId}`);
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

// ── GET /servers/:guildId/:section ────────────────────────────────────────────

router.get('/servers/:guildId/:section', (req, res) => {
  if (!req.session) return res.redirect(`/login?next=/servers/${req.params.guildId}/${req.params.section}`);
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

export default router;
