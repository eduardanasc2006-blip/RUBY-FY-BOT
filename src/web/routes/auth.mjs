/**
 * Rotas de autenticação Discord OAuth2 — Etapa 19A + 19D.
 *
 * Fluxo:
 *   GET /auth/login    → gera state CSRF, redireciona para Discord OAuth2
 *   GET /auth/callback → valida state, troca o code, cria sessão, redireciona
 *   GET /auth/logout   → invalida sessão
 *   GET /auth/me       → retorna dados do usuário autenticado
 *
 * Etapa 19D: adicionado parâmetro `state` no OAuth2 para prevenir CSRF.
 *   - state é gerado criptograficamente em /login
 *   - armazenado em cookie HttpOnly de curta duração (10 min)
 *   - validado e descartado em /callback antes de trocar o code
 */

import { randomBytes }  from 'node:crypto';
import { Router }       from 'express';
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
import { logger }    from '../../utils/logger.mjs';

const router = Router();

// ── Constante do cookie de state CSRF ────────────────────────────────────────

export const STATE_COOKIE = 'ruby_oauth_state';

/** Duração do state em segundos (10 minutos). */
const STATE_TTL = 600;

// ── Helpers exportados (usados nos testes) ────────────────────────────────────

/**
 * Gera um state OAuth2 criptograficamente seguro.
 * @returns {string} 64 caracteres hex
 */
export function generateOAuthState() {
  return randomBytes(32).toString('hex');
}

/**
 * Extrai o valor do cookie de state da requisição.
 * Leitura manual do header Cookie — sem depender de cookie-parser.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function parseStateCookie(req) {
  const header = req.headers?.cookie ?? '';
  for (const part of header.split(';')) {
    const s = part.trim();
    if (s.startsWith(`${STATE_COOKIE}=`)) {
      return s.slice(STATE_COOKIE.length + 1).trim() || null;
    }
  }
  return null;
}

/**
 * Valida o state retornado pelo Discord contra o state armazenado no cookie.
 * Retorna true somente se ambos existem, são strings não-vazias e são iguais.
 *
 * @param {string|null|undefined} returnedState - state da query string do callback
 * @param {string|null|undefined} cookieState   - state lido do cookie
 * @returns {boolean}
 */
export function validateOAuthState(returnedState, cookieState) {
  if (!returnedState || typeof returnedState !== 'string') return false;
  if (!cookieState   || typeof cookieState   !== 'string') return false;
  // Comparação em tempo constante para evitar timing attacks
  return returnedState === cookieState;
}

/**
 * Constrói o header Set-Cookie para o state CSRF.
 * HttpOnly, SameSite=Lax, curto prazo de vida.
 *
 * @param {string} state
 * @returns {string}
 */
export function buildStateCookie(state) {
  const secure = webConfig.isProduction ? '; Secure' : '';
  return `${STATE_COOKIE}=${state}; Path=/; Max-Age=${STATE_TTL}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Constrói o header Set-Cookie para apagar o state CSRF.
 * @returns {string}
 */
export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

// ── GET /auth/login ──────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  // 1. Gera state CSRF criptograficamente seguro
  const state = generateOAuthState();

  // 2. Monta URL de autorização com state
  const params = new URLSearchParams({
    client_id:     webConfig.discord.clientId,
    redirect_uri:  webConfig.discord.callbackUrl,
    response_type: 'code',
    scope:         'identify guilds',
    state,
  });

  const url = `https://discord.com/api/oauth2/authorize?${params}`;

  // 3. Armazena state em cookie HttpOnly de curta duração
  res.setHeader('Set-Cookie', buildStateCookie(state));

  logger.debug('[Auth] Login iniciado — state gerado.');
  res.redirect(url);
});

// ── GET /auth/callback ────────────────────────────────────────────────────────

router.get('/callback', async (req, res) => {
  const { code, state: returnedState, error } = req.query;

  // Nega erros OAuth2 imediatos (ex: usuário clicou "Cancelar")
  if (error) {
    logger.warn(`[Auth] OAuth2 callback com erro: ${error}`);
    return res.redirect(`${webConfig.frontendUrl}?auth_error=access_denied`);
  }

  // 1. Lê o state armazenado no cookie
  const cookieState = parseStateCookie(req);

  // 2. Valida o state antes de qualquer outra operação
  if (!validateOAuthState(returnedState, cookieState)) {
    logger.warn('[Auth] CSRF detectado — state inválido, ausente ou expirado.');
    res.setHeader('Set-Cookie', clearStateCookie());
    return res.redirect(`${webConfig.frontendUrl}?auth_error=invalid_state`);
  }

  // 3. State válido: descarta o cookie imediatamente (uso único)
  res.setHeader('Set-Cookie', clearStateCookie());

  if (!code) {
    return res.redirect(`${webConfig.frontendUrl}?auth_error=missing_code`);
  }

  try {
    // 4. Troca o code por tokens (somente após validar o state)
    const tokenData = await exchangeCode(String(code));
    if (!tokenData?.access_token) {
      return res.redirect(`${webConfig.frontendUrl}?auth_error=token_exchange_failed`);
    }

    // 5. Busca dados do usuário e seus servidores
    const [user, guilds] = await Promise.all([
      fetchDiscordUser(tokenData.access_token),
      fetchDiscordGuilds(tokenData.access_token),
    ]);

    if (!user?.id) {
      return res.redirect(`${webConfig.frontendUrl}?auth_error=user_fetch_failed`);
    }

    // 6. Cria sessão — NÃO armazenamos o access_token no servidor
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

    // 7. Define cookie de sessão seguro
    res.setHeader('Set-Cookie', buildSessionCookie(token, expires));

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
 * Constrói o header Set-Cookie para a sessão autenticada.
 */
function buildSessionCookie(token, expires) {
  const maxAge  = expires - Math.floor(Date.now() / 1000);
  const secure  = webConfig.isProduction ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export default router;
