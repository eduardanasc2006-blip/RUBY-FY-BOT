/**
 * Rate Limiter para o servidor web — Etapa 20A.2.
 *
 * Implementação em memória usando sliding window.
 * Limpa automaticamente entradas antigas para evitar memory leak.
 *
 * Limites:
 *   - GET:    100 req/min por IP
 *   - POST:   20  req/min por IP
 *   - PATCH:  20  req/min por IP
 *   - DELETE: 20  req/min por IP
 *   - Auth:   10  req/min por IP (mais restritivo)
 */

const WINDOW_MS = 60_000; // 1 minuto em ms

const LIMITS = {
  GET:    100,
  POST:   20,
  PATCH:  20,
  PUT:    20,
  DELETE: 20,
  AUTH:   10, // para /auth/login e /auth/callback
};

const AUTH_PATHS = ['/auth/login', '/auth/callback'];

// Armazena: Map<ip, { count, resetAt }>
const store = new Map();

/**
 * Retorna o IP do cliente a partir da requisição.
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? 'unknown';
}

/**
 * Middleware de rate limiting.
 * Retorna 429 Too Many Requests se o limite for excedido.
 */
export function rateLimitMiddleware(req, res, next) {
  const ip    = getClientIp(req);
  const now   = Date.now();
  const method = req.method.toUpperCase();
  const path  = req.path;

  // Determina o limite baseado no método e caminho
  const isAuth    = AUTH_PATHS.some(p => path.startsWith(p));
  const limitKey  = isAuth ? 'AUTH' : method;
  const limit     = LIMITS[limitKey] ?? 100;

  // Limpa entradas antigas a cada 100 requisições (evita memory leak)
  if (Math.random() < 0.01) {
    cleanup();
  }

  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    // Nova janela
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter,
    });
  }

  entry.count++;
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', limit - entry.count);
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
  next();
}

/**
 * Remove entradas expiradas do store.
 */
function cleanup() {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(ip);
    }
  }
}

/**
 * Reseta o rate limiter (para testes).
 */
export function resetRateLimiter() {
  store.clear();
}

/**
 * Retorna estatísticas do rate limiter (para testes/debug).
 */
export function getRateLimiterStats() {
  return {
    entries: store.size,
    limits: { ...LIMITS },
    windowMs: WINDOW_MS,
  };
}
