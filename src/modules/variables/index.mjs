/**
 * Sistema de Variáveis Dinâmicas.
 *
 * Fornece um registry extensível de variáveis substituíveis em qualquer
 * conteúdo textual (modelos, embeds, fields, rodapé, etc.).
 *
 * Uso:
 *   import { resolveVariables, applyVariablesToEmbedData } from '../../modules/variables/index.mjs';
 *
 *   const texto = resolveVariables('Cliente: {cliente}', context);
 *   const data  = applyVariablesToEmbedData(template.data, context);
 *
 * Contexto esperado (todos os campos são opcionais):
 *   {
 *     guild,       // Discord Guild
 *     guildId,     // string
 *     channel,     // Discord Channel
 *     member,      // Discord GuildMember (quem invocou)
 *     user,        // Discord User       (quem invocou)
 *     cliente,     // Discord User | GuildMember | string — o cliente
 *     vendedor,    // Discord User | GuildMember | string — o vendedor
 *     produto,     // string — nome do produto
 *     valor,       // string | number — valor da venda
 *     ticket,      // string — referência do ticket
 *     orderId,     // string — ID do pedido
 *     clientName,  // string — nome textual do cliente (para {client_name})
 *   }
 *
 * Segurança:
 *   - Apenas nomes registrados são resolvidos.
 *   - Variáveis desconhecidas são mantidas como-estão ({nome}).
 *   - Nenhum eval() ou execução de código do conteúdo do modelo.
 *   - Não há encadeamento: o resultado de um resolver nunca é reprocessado.
 */

import { logger } from '../../utils/logger.mjs';

// ── Timezone padrão ───────────────────────────────────────────────────────────

/** Timezone usado em {data} e {hora}. Segue o mesmo padrão do logger.mjs. */
const TZ = 'America/Sao_Paulo';

// ── Registry ──────────────────────────────────────────────────────────────────

/** @type {Map<string, (context: object) => string|null>} */
const variables = new Map();

/**
 * Registra uma variável no sistema.
 * Se um nome já estiver registrado, é substituído (útil para override em testes).
 *
 * @param {string}   name     - Nome da variável sem chaves (ex: 'cliente')
 * @param {Function} resolver - Função (context) => string | null
 */
export function registerVariable(name, resolver) {
  if (typeof resolver !== 'function') throw new Error(`[Variables] Resolver de '${name}' deve ser uma função.`);
  variables.set(name, resolver);
}

/**
 * Retorna os nomes de todas as variáveis registradas.
 * @returns {string[]}
 */
export function listVariables() {
  return [...variables.keys()];
}

// ── Padrão de substituição ────────────────────────────────────────────────────

/**
 * Regex para encontrar placeholders no formato {nome}.
 * Aceita: letras, números, sublinhado. Deve começar com letra ou sublinhado.
 * Não casa: {}, {123}, {var-nome}, {var.nome}.
 */
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

// ── Funções principais ────────────────────────────────────────────────────────

/**
 * Substitui todas as variáveis conhecidas em um texto.
 *
 * - Variáveis desconhecidas são mantidas como-estão.
 * - Erros em resolvers individuais não quebram a substituição.
 * - Não há encadeamento: o resultado de um resolver não é reprocessado.
 *
 * @param {string} text    - Texto com placeholders ({variavel})
 * @param {object} context - Objeto de contexto passado para os resolvers
 * @returns {string}
 */
export function resolveVariables(text, context = {}) {
  if (!text || typeof text !== 'string') return text;

  return text.replace(VARIABLE_PATTERN, (match, name) => {
    if (!variables.has(name)) return match; // desconhecida → mantém original

    try {
      const result = variables.get(name)(context);
      return result != null ? String(result) : match;
    } catch (err) {
      logger.warn(`[Variables] Erro ao resolver '{${name}}':`, err?.message);
      return match; // falha no resolver → mantém original
    }
  });
}

/**
 * Aplica `resolveVariables` em todos os campos textuais de um objeto de dados
 * de embed, sem modificar o original.
 *
 * Campos processados:
 *   titulo, descricao, url_embed, autor_nome, autor_url, autor_icone,
 *   imagem_url, thumbnail_url, rodape_texto, rodape_icone
 *   fields[].name, fields[].value
 *
 * @param {object} data    - Dados do modelo (ex: template.data)
 * @param {object} context - Contexto de variáveis
 * @returns {object} Cópia com variáveis resolvidas (original intacto)
 */
export function applyVariablesToEmbedData(data, context = {}) {
  if (!data || typeof data !== 'object') return data;

  // Deep copy — garante que o original nunca é modificado
  const copy = structuredClone(data);

  // Campos de texto simples
  const TEXT_FIELDS = [
    'titulo', 'descricao', 'url_embed',
    'autor_nome', 'autor_url', 'autor_icone',
    'imagem_url', 'thumbnail_url',
    'rodape_texto', 'rodape_icone',
  ];

  for (const key of TEXT_FIELDS) {
    if (typeof copy[key] === 'string') {
      copy[key] = resolveVariables(copy[key], context);
    }
  }

  // Embed fields (name + value)
  if (Array.isArray(copy.fields)) {
    copy.fields = copy.fields.map(f => ({
      ...f,
      name:  typeof f.name  === 'string' ? resolveVariables(f.name,  context) : f.name,
      value: typeof f.value === 'string' ? resolveVariables(f.value, context) : f.value,
    }));
  }

  return copy;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Resolve a menção de um usuário/membro Discord.
 * Aceita: User, GuildMember (Discord.js) ou string.
 * @param {*} value
 * @returns {string|null}
 */
function toMention(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  // Discord.js User ou GuildMember possuem .id
  if (value?.id) return `<@${value.id}>`;
  return String(value);
}

/**
 * Resolve o nome de exibição de um usuário/membro Discord.
 * GuildMember → displayName; User → globalName ?? username; string → string.
 * @param {*} value
 * @returns {string|null}
 */
function toDisplayName(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  // GuildMember tem displayName
  if (value?.displayName) return value.displayName;
  // User tem global_name e username
  if (value?.globalName) return value.globalName;
  if (value?.username)   return value.username;
  if (value?.id)         return `<@${value.id}>`;
  return String(value);
}

/**
 * Resolve o ID de um usuário/membro Discord.
 * @param {*} value
 * @returns {string|null}
 */
function toUserId(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value?.id) return value.id;
  return null;
}

// ── Registro das variáveis padrão ─────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// PESSOAS — variáveis em português (originais, preservadas)
// ════════════════════════════════════════════════════════════════════════════

/** {cliente} → menção do usuário cliente */
registerVariable('cliente', ctx => toMention(ctx.cliente));

/** {cliente_id} → ID do cliente */
registerVariable('cliente_id', ctx => toUserId(ctx.cliente));

/** {vendedor} → menção do vendedor */
registerVariable('vendedor', ctx => toMention(ctx.vendedor));

/** {vendedor_id} → ID do vendedor */
registerVariable('vendedor_id', ctx => toUserId(ctx.vendedor));

// ════════════════════════════════════════════════════════════════════════════
// VENDA / CONTEXTO — variáveis em português (originais, preservadas)
// ════════════════════════════════════════════════════════════════════════════

/** {produto} → nome do produto */
registerVariable('produto', ctx => ctx.produto != null ? String(ctx.produto) : null);

/** {valor} → valor da venda */
registerVariable('valor', ctx => ctx.valor != null ? String(ctx.valor) : null);

/** {ticket} → referência do ticket */
registerVariable('ticket', ctx => ctx.ticket != null ? String(ctx.ticket) : null);

// ════════════════════════════════════════════════════════════════════════════
// DISCORD — variáveis em português (originais, preservadas)
// ════════════════════════════════════════════════════════════════════════════

/** {canal} → menção do canal atual */
registerVariable('canal', ctx => {
  if (!ctx.channel) return null;
  if (ctx.channel?.id) return `<#${ctx.channel.id}>`;
  if (typeof ctx.channel === 'string') return `<#${ctx.channel}>`;
  return null;
});

/** {servidor} → nome do servidor */
registerVariable('servidor', ctx => {
  if (ctx.guild?.name) return ctx.guild.name;
  return ctx.guildId ? `(${ctx.guildId})` : null;
});

/** {servidor_id} → ID do servidor */
registerVariable('servidor_id', ctx => ctx.guildId ?? ctx.guild?.id ?? null);

// ════════════════════════════════════════════════════════════════════════════
// DATA E HORA — variáveis em português (originais, preservadas)
// ════════════════════════════════════════════════════════════════════════════

/** {data} → data atual no fuso America/Sao_Paulo (DD/MM/YYYY) */
registerVariable('data', () =>
  new Date().toLocaleDateString('pt-BR', { timeZone: TZ }),
);

/** {hora} → horário atual no fuso America/Sao_Paulo (HH:MM:SS) */
registerVariable('hora', () =>
  new Date().toLocaleTimeString('pt-BR', { timeZone: TZ }),
);

// ════════════════════════════════════════════════════════════════════════════
// ETAPA 19D — NOVAS VARIÁVEIS
// ════════════════════════════════════════════════════════════════════════════

// ── Pedidos ───────────────────────────────────────────────────────────────────

/**
 * {order_id} → ID único do pedido (ctx.orderId).
 * Contexto: passado pelos módulos de Orders e Automações.
 */
registerVariable('order_id', ctx =>
  ctx.orderId != null ? String(ctx.orderId) : null,
);

// ── Clientes ──────────────────────────────────────────────────────────────────

/**
 * {client_name} → nome textual do cliente (ctx.clientName).
 * Contexto: passado pelo módulo de Clients ao registrar um novo cliente.
 * Diferente de {cliente} (que é menção Discord): este é o nome cadastrado.
 */
registerVariable('client_name', ctx =>
  ctx.clientName != null ? String(ctx.clientName) : null,
);

// ── Aliases em inglês ─────────────────────────────────────────────────────────

/**
 * {user} → menção do usuário que invocou a ação (ctx.user ou ctx.member).
 * Fallback: ctx.vendedor → ctx.cliente.
 * Compatível com templates que usam nomes de variáveis em inglês.
 */
registerVariable('user', ctx => {
  // Prioridade: quem invocou (member/user) → vendedor → cliente
  const target = ctx.user ?? ctx.member ?? ctx.vendedor ?? ctx.cliente;
  return toMention(target);
});

/**
 * {username} → nome de exibição do usuário que invocou (ctx.user ou ctx.member).
 * Retorna displayName do GuildMember, globalName ou username do User.
 * Fallback: vendedor → cliente.
 */
registerVariable('username', ctx => {
  const target = ctx.user ?? ctx.member ?? ctx.vendedor ?? ctx.cliente;
  return toDisplayName(target);
});

/**
 * {guild} → alias de {servidor} (nome do servidor).
 * Compatível com templates que usam nomes de variáveis em inglês.
 */
registerVariable('guild', ctx => {
  if (ctx.guild?.name) return ctx.guild.name;
  return ctx.guildId ? `(${ctx.guildId})` : null;
});

/**
 * {channel} → alias de {canal} (menção do canal).
 * Compatível com templates que usam nomes de variáveis em inglês.
 */
registerVariable('channel', ctx => {
  if (!ctx.channel) return null;
  if (ctx.channel?.id) return `<#${ctx.channel.id}>`;
  if (typeof ctx.channel === 'string') return `<#${ctx.channel}>`;
  return null;
});
