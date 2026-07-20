/**
 * API client Ruby FY Dashboard — Etapa 19B.
 * Wrapper para as rotas da API REST do servidor web.
 */

const RubyAPI = (() => {
  const BASE = '';

  async function request(path, opts = {}) {
    const res = await fetch(BASE + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (res.status === 401) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
      return null;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  return {
    /** Retorna dados do usuário autenticado */
    me() { return request('/auth/me'); },

    /** Faz logout */
    async logout() {
      await request('/auth/logout');
      window.location.href = '/login';
    },

    /** Lista servidores acessíveis */
    guilds() { return request('/api/guilds'); },

    /** Dados básicos de um servidor */
    guild(guildId) { return request(`/api/guilds/${guildId}`); },

    /** Estatísticas do servidor */
    stats(guildId) { return request(`/api/guilds/${guildId}/stats`); },

    /** Templates do servidor */
    templates(guildId) { return request(`/api/guilds/${guildId}/templates`); },

    /** Conexões do servidor */
    connections(guildId) { return request(`/api/guilds/${guildId}/connections`); },

    /** Tickets do servidor */
    tickets(guildId, { status = '', page = 1, limit = 20 } = {}) {
      const q = new URLSearchParams({ page, limit });
      if (status) q.set('status', status);
      return request(`/api/guilds/${guildId}/tickets?${q}`);
    },

    /** Pedidos do servidor */
    orders(guildId, { status = '', page = 1, limit = 20 } = {}) {
      const q = new URLSearchParams({ page, limit });
      if (status) q.set('status', status);
      return request(`/api/guilds/${guildId}/orders?${q}`);
    },

    /** Clientes do servidor */
    clients(guildId, { page = 1, limit = 20 } = {}) {
      const q = new URLSearchParams({ page, limit });
      return request(`/api/guilds/${guildId}/clients?${q}`);
    },
  };
})();

// ── Utilidades ─────────────────────────────────────────────────────────────

/**
 * Formata timestamp unix para data legível.
 * @param {number} ts - Timestamp em segundos ou milissegundos
 */
function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formata data+hora.
 */
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * URL do avatar do Discord.
 */
function discordAvatar(userId, avatarHash, size = 64) {
  if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) % 5n)}.png`;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=${size}`;
}

/**
 * URL do ícone do servidor Discord.
 */
function guildIcon(guildId, iconHash, size = 64) {
  if (!iconHash) return null;
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp?size=${size}`;
}

/**
 * Iniciais a partir de um nome.
 */
function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

/**
 * Exibe toast de notificação.
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/**
 * Extrai guildId e section da URL.
 * ex: /servers/123456/tickets → { guildId:'123456', section:'tickets' }
 */
function parseRoute() {
  const parts = window.location.pathname.replace(/^\//, '').split('/');
  // parts[0] = 'servers', parts[1] = guildId, parts[2] = section
  return {
    guildId: parts[1] || null,
    section: parts[2] || 'overview',
  };
}

/**
 * Retorna badge HTML para um status.
 */
function statusBadge(status) {
  const map = {
    open:      ['badge-success', 'Aberto'],
    closed:    ['badge-muted',   'Fechado'],
    pending:   ['badge-warning', 'Pendente'],
    completed: ['badge-success', 'Concluído'],
    cancelled: ['badge-danger',  'Cancelado'],
    active:    ['badge-info',    'Ativo'],
    inactive:  ['badge-muted',   'Inativo'],
  };
  const [cls, label] = map[status] || ['badge-muted', status];
  return `<span class="badge ${cls}">${label}</span>`;
}
