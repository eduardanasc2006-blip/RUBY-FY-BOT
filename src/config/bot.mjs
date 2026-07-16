/**
 * Configurações centrais do bot.
 *
 * Regras deste arquivo:
 *  - Nunca colocar tokens, senhas ou chaves secretas aqui.
 *  - Configs que variam por ambiente leem de process.env com um fallback seguro.
 *  - Todos os outros arquivos do projeto importam daqui — não duplicar valores.
 */

export const config = {
  // ── Identidade ─────────────────────────────────────────────────────────────
  /** Nome de exibição do bot (usado em mensagens e embeds) */
  botName: 'Ruby-FY',

  // ── Comandos ───────────────────────────────────────────────────────────────
  /** Prefixo para comandos de texto (ex: !ping) */
  prefix: '!',

  // ── Aparência ──────────────────────────────────────────────────────────────
  /** Cor padrão dos embeds (hexadecimal como número) */
  embedColor: 0x5865F2,

  /** Emoji padrão de sucesso */
  emojiOk:    '✅',

  /** Emoji padrão de erro */
  emojiErro:  '❌',

  /** Emoji padrão de aviso */
  emojiAviso: '⚠️',

  // ── Comportamento ──────────────────────────────────────────────────────────
  /** Cooldown padrão entre usos do mesmo comando (ms) */
  defaultCooldown: 3000,

  /** Apagar resposta de erro após N ms (0 = não apagar) */
  deleteErrorAfter: 5000,

  // ── Ambiente ───────────────────────────────────────────────────────────────
  /**
   * ID do servidor de testes — lido do .env.
   * Usado pelo deploy-commands.mjs para registrar slash commands
   * instantaneamente durante o desenvolvimento.
   * Em produção deixe GUILD_ID vazio para deploy global.
   */
  guildId: process.env.GUILD_ID || null,

  /**
   * IDs dos donos do bot — lido do .env como lista separada por vírgula.
   * Ex: OWNER_IDS=123456789,987654321
   * Usado futuramente para comandos e permissões restritas ao dono.
   */
  ownerIds: (process.env.OWNER_IDS || '').split(',').filter(Boolean),

  // ── Banco de dados (preparado para o futuro) ───────────────────────────────
  /**
   * URL de conexão com o banco — lida do .env.
   * Deixe vazio enquanto o banco não for configurado.
   */
  databaseUrl: process.env.DATABASE_URL || null,
};
