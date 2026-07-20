/**
 * Configuração do servidor web — Etapa 19A.
 *
 * Lê exclusivamente de variáveis de ambiente.
 * Nunca coloque valores sensíveis diretamente aqui.
 */

const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
const baseUrl      = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

export const webConfig = {
  // ── Servidor ───────────────────────────────────────────────────────────────
  /** Porta onde o servidor web escutará */
  port: parseInt(process.env.WEB_PORT ?? '3000', 10),

  /** Se está em produção */
  isProduction,

  /** URL pública base da aplicação web */
  baseUrl,

  /** URL pública do frontend (para redirects OAuth2) */
  frontendUrl: process.env.WEB_FRONTEND_URL ?? baseUrl,

  // ── Discord OAuth2 ─────────────────────────────────────────────────────────
  discord: {
    /** Client ID da aplicação Discord */
    clientId: process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID ?? '',

    /** Client Secret da aplicação Discord */
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',

    /** URL de callback (deve estar cadastrada no portal Discord) */
    callbackUrl: process.env.DISCORD_CALLBACK_URL
      ?? `${baseUrl}/auth/callback`,
  },

  // ── Sessões ────────────────────────────────────────────────────────────────
  // Nota: session.secret é lazy — validado apenas quando acessado via getSessionSecret()
  session: {
    /** TTL da sessão em segundos (padrão: 7 dias) */
    ttl: parseInt(process.env.SESSION_TTL_SECONDS ?? String(7 * 24 * 60 * 60), 10),
  },

  // ── CORS ───────────────────────────────────────────────────────────────────
  /** Origens permitidas para CORS (separadas por vírgula no .env) */
  corsOrigins: (process.env.CORS_ORIGINS ?? baseUrl).split(',').map(s => s.trim()),
};

/**
 * Retorna o SESSION_SECRET validado.
 * Deve ser chamado pelo servidor web antes de iniciar.
 *
 * @returns {string} O secret configurado
 * @throws {Error} Se SESSION_SECRET não estiver definido ou vazio
 */
export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'SESSION_SECRET não configurado. Defina SESSION_SECRET no arquivo .env.\n' +
      'Gere um valor seguro com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return secret;
}
