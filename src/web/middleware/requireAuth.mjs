/**
 * Middleware de autenticação web — Etapa 19A.
 *
 * Lê o token de sessão do cookie (ou header Authorization)
 * e popula req.session com os dados do usuário.
 * Rejeita rotas protegidas se o token estiver ausente ou expirado.
 */

import { getSession } from '../../database/repositories/Sessions.mjs';

const COOKIE_NAME = 'ruby_session';

/**
 * Middleware que lê e valida a sessão.
 * Sempre chama next() — não rejeita aqui, só popula req.session.
 */
export function sessionMiddleware(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const session = getSession(token);
    if (session) {
      req.session = session;
      req.sessionToken = token;
    } else {
      req.session = null;
      req.sessionToken = null;
    }
  } else {
    req.session = null;
    req.sessionToken = null;
  }
  next();
}

/**
 * Middleware guard: rejeita com 401 se a sessão não estiver autenticada.
 */
export function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Não autenticado. Faça login com sua conta Discord.' });
  }
  next();
}

/**
 * Middleware guard: valida se o usuário tem acesso ao guildId da rota.
 * Deve ser usado APÓS requireAuth.
 *
 * Regras:
 *   1. O guildId deve estar na lista de guilds autorizados da sessão.
 *   2. O usuário deve ter permissão de ManageGuild no servidor.
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
export function requireGuildAccess(req, res, next) {
  // Sem sessão → 401 (não autenticado)
  if (!req.session) {
    return res.status(401).json({ error: 'Não autenticado. Faça login com sua conta Discord.' });
  }

  const { guildId } = req.params;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId é obrigatório.' });
  }

  const guilds = req.session?.data?.guilds ?? [];
  const guild  = guilds.find(g => g.id === guildId);

  if (!guild) {
    return res.status(403).json({
      error: 'Acesso negado. Você não tem acesso a este servidor.',
    });
  }

  // Verifica permissão ManageGuild (bit 0x20)
  const perms     = BigInt(guild.permissions ?? '0');
  const MANAGE    = BigInt(0x20);
  const ADMIN     = BigInt(0x8);
  const hasAccess = (perms & MANAGE) === MANAGE || (perms & ADMIN) === ADMIN;

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Acesso negado. Você precisa da permissão "Gerenciar Servidor" neste servidor.',
    });
  }

  req.targetGuild = guild;
  next();
}

// ── Utilitário interno ────────────────────────────────────────────────────────

/**
 * Extrai o token de sessão do cookie ou do header Authorization.
 */
function extractToken(req) {
  // 1. Cookie
  const cookieHeader = req.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === COOKIE_NAME) {
      return rest.join('=').trim();
    }
  }

  // 2. Header Authorization: Bearer <token>
  const auth = req.headers.authorization ?? '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }

  return null;
}

export { COOKIE_NAME };
