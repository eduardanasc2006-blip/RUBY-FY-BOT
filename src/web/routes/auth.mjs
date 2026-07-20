/**
 * Rotas de autenticação Discord OAuth2 — Etapa 19A.
 *
 * Fluxo:
 *   GET /auth/login    → redireciona para Discord OAuth2
 *   GET /auth/callback → troca o code, cria sessão, redireciona
 *   GET /auth/logout   → invalida sessão
 *   GET /auth/me       → retorna dados do usuário autenticado
 */

import { Router } from 'express';
import {
  createSession,
  deleteSession,
} from '../../database/repositories/Sessions.mjs';
import {
  sessionMiddleware,
  requireAuth,
  COOKIE_NAME,
} from '../middleware/requireAuth.mjs';
import { webConfig } from '../../config/web.mjs';
import { logger } from '../../utils/logger.mjs';

const router = Router();

// ── GET /auth/login ──────────────────────────────────────────────────────────

router.get('/login', (_req, res) => {
  const params = new URLSearchParams({
    client_id:     webConfig.discord.clientId,
    redirect_uri:  webConfig.discord.callbackUrl,
    response_type: 'code',
    scope:         'identify guilds',
  });

  const url = `https://discord.com/api/oauth2/authorize?${params}`;
  res.redirect(url);
});

// ── GET /auth/callback ────────────────────────────────────────────────────────

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    logger.warn(`[Auth] OAuth2 callback com erro: ${error ?? 'sem code'}`);
    return res.redirect(`${webConfig.frontendUrl}?auth_error=access_denied`);
  }

  try {
    // 1. Troca o code por tokens
    const tokenData = await exchangeCode(String(code));
    if (!tokenData?.access_token) {
      return res.redirect(`${webConfig.frontendUrl}?auth_error=token_exchange_failed`);
    }

    // 2. Busca dados do usuário e seus servidores
    const [user, guilds] = await Promise.all([
      fetchDiscordUser(tokenData.access_token),
      fetchDiscordGuilds(tokenData.access_token),
    ]);

    if (!user?.id) {
      return res.redirect(`${webConfig.frontendUrl}?auth_error=user_fetch_failed`);
    }

    // 3. Cria sessão — NÃO armazenamos access_token no servidor por padrão
    //    (armazenamos apenas dados necessários para a sessão web)
    const sessionData = {
      user: {
        id:            user.id,
        username:      user.username,
        discriminator: user.discriminator ?? '0',
        avatar:        user.avatar ?? null,
        globalName:    user.global_name ?? null,
      },
      guilds: (guilds ?? []).map(g => ({
        id:          g.id,
        name:        g.name,
        icon:        g.icon ?? null,
        permissions: g.permissions ?? '0',
        owner:       g.owner ?? false,
      })),
    };

    const { token, expires } = createSession({
      userId: user.id,
      data:   sessionData,
    });

    // 4. Define cookie seguro
    res.setHeader('Set-Cookie', buildCookie(token, expires));

    logger.info(`[Auth] Login bem-sucedido: userId=${user.id} username=${user.username}`);
    res.redirect(`${webConfig.frontendUrl}?auth_success=1`);
  } catch (err) {
    logger.error('[Auth] Erro no callback OAuth2:', err);
    res.redirect(`${webConfig.frontendUrl}?auth_error=internal`);
  }
});

// ── GET /auth/logout ──────────────────────────────────────────────────────────

router.get('/logout', sessionMiddleware, (req, res) => {
  if (req.sessionToken) {
    deleteSession(req.sessionToken);
  }

  // Apaga o cookie
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  res.json({ ok: true, message: 'Logout realizado com sucesso.' });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', sessionMiddleware, requireAuth, (req, res) => {
  const { user, guilds } = req.session.data;
  res.json({
    user,
    guilds: guilds ?? [],
    sessionExpires: req.session.expires,
  });
});

// ── Utilitários internos ──────────────────────────────────────────────────────

/**
 * Troca o authorization code por tokens Discord.
 */
async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id:     webConfig.discord.clientId,
    client_secret: webConfig.discord.clientSecret,
    grant_type:    'authorization_code',
    code,
    redirect_uri:  webConfig.discord.callbackUrl,
  });

  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange falhou: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Busca os dados do usuário autenticado.
 */
async function fetchDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Falha ao buscar usuário Discord: ${res.status}`);
  return res.json();
}

/**
 * Busca a lista de servidores do usuário.
 */
async function fetchDiscordGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Falha ao buscar servidores Discord: ${res.status}`);
  return res.json();
}

/**
 * Constrói o header Set-Cookie seguro.
 */
function buildCookie(token, expires) {
  const maxAge  = expires - Math.floor(Date.now() / 1000);
  const secure  = webConfig.isProduction ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export default router;
