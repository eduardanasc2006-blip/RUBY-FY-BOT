/**
 * Dashboard principal Ruby FY — Etapa 19B.
 * Renderiza as seções: overview, tickets, orders, clients, templates, connections.
 */

(async function () {
  const { guildId, section: initialSection } = parseRoute();
  if (!guildId) { window.location.href = '/servers'; return; }

  // ── Auth + dados iniciais ──────────────────────────────────────────────────
  let me, guildData;
  try {
    [me, guildData] = await Promise.all([RubyAPI.me(), RubyAPI.guild(guildId)]);
    if (!me || !guildData) return;
  } catch {
    window.location.href = '/servers';
    return;
  }

  const guild = guildData.guild;

  // ── Preenche sidebar ───────────────────────────────────────────────────────
  const iconUrl = guildIcon(guild.id, guild.icon, 64);
  const sidebarGuildIconEl = document.getElementById('sidebarGuildIcon');
  if (sidebarGuildIconEl) {
    sidebarGuildIconEl.innerHTML = iconUrl
      ? `<img src="${iconUrl}" alt="${escHtml(guild.name)}" loading="lazy" />`
      : `<span aria-hidden="true">${initials(guild.name)}</span>`;
  }
  const sidebarGuildNameEl = document.getElementById('sidebarGuildName');
  if (sidebarGuildNameEl) sidebarGuildNameEl.textContent = guild.name;

  // Avatar do usuário na sidebar
  const sidebarUserNameEl = document.getElementById('sidebarUserName');
  const sidebarAvatarImg  = document.getElementById('sidebarAvatarImg');
  if (sidebarUserNameEl) sidebarUserNameEl.textContent = me.user.globalName || me.user.username;
  if (sidebarAvatarImg && me.user.avatar) {
    sidebarAvatarImg.src = discordAvatar(me.user.id, me.user.avatar, 64);
    sidebarAvatarImg.style.display = 'block';
  }

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => RubyAPI.logout());

  // ── Navegação ──────────────────────────────────────────────────────────────
  let currentSection = initialSection || 'overview';

  function setActiveNav(section) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const sec = item.dataset.section;
      if (sec && sec !== currentSection) {
        currentSection = sec;
        history.pushState({}, '', `/servers/${guildId}/${sec === 'overview' ? '' : sec}`);
        setActiveNav(sec);
        renderSection(sec);
      }
    });
  });

  window.addEventListener('popstate', () => {
    const { section } = parseRoute();
    currentSection = section || 'overview';
    setActiveNav(currentSection);
    renderSection(currentSection);
  });

  setActiveNav(currentSection);
  renderSection(currentSection);

  // ── Renderizadores ─────────────────────────────────────────────────────────

  async function renderSection(section) {
    const pageBody = document.getElementById('pageBody');
    const topbarTitle = document.getElementById('topbarTitle');

    const sectionTitles = {
      overview:    'Dashboard',
      tickets:     'Tickets',
      orders:      'Pedidos',
      clients:     'Clientes',
      templates:   'Modelos',
      connections: 'Conexões',
      // Etapa 19C (preenchidos pelo dashboard19c.js)
      ...( window.Ruby19C?.titles ?? {} ),
    };
    if (topbarTitle) topbarTitle.textContent = sectionTitles[section] || 'Dashboard';

    pageBody.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Carregando...</span></div>`;

    // Expõe guildId globalmente para dashboard19c.js poder usar
    window._dashGuildId = guildId;

    try {
      // Seções registradas pela Etapa 19C têm prioridade sobre o default
      if (window.Ruby19C?.sections?.[section]) {
        await window.Ruby19C.sections[section](pageBody, guildId);
      } else {
        switch (section) {
          case 'tickets':     await renderTickets(pageBody); break;
          case 'orders':      await renderOrders(pageBody);  break;
          case 'clients':     await renderClients(pageBody); break;
          case 'templates':   await renderTemplates(pageBody); break;
          case 'connections': await renderConnections(pageBody); break;
          default:            await renderOverview(pageBody); break;
        }
      }
    } catch (err) {
      pageBody.innerHTML = `<div class="empty-state" role="alert">
        <div class="empty-icon">⚠️</div>
        <p>Erro ao carregar: ${escHtml(err.message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="location.reload()" style="margin-top:16px">Tentar novamente</button>
      </div>`;
    }
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  async function renderOverview(container) {
    const stats = await RubyAPI.stats(guildId);

    container.innerHTML = `
      <div class="stats-grid" id="statsGrid" aria-label="Estatísticas do servidor">
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">🎫</div>
          <div class="stat-label">Tickets Abertos</div>
          <div class="stat-value">${stats.tickets.open}</div>
          <div class="stat-detail">${stats.tickets.closed} fechados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">📦</div>
          <div class="stat-label">Pedidos Ativos</div>
          <div class="stat-value">${stats.orders.active}</div>
          <div class="stat-detail">${stats.orders.completed} concluídos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">👥</div>
          <div class="stat-label">Clientes</div>
          <div class="stat-value">${stats.clients}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">🔗</div>
          <div class="stat-label">Conexões Ativas</div>
          <div class="stat-value">${stats.connections.active}</div>
          <div class="stat-detail">${stats.connections.total} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">📝</div>
          <div class="stat-label">Modelos</div>
          <div class="stat-value">${stats.templates}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">✅</div>
          <div class="stat-label">Proofs</div>
          <div class="stat-value">${stats.proofs}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">📋</div>
          <div class="stat-label">Auditoria (24h)</div>
          <div class="stat-value">${stats.audit.last24h}</div>
          <div class="stat-detail">${stats.audit.total} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" aria-hidden="true">🛒</div>
          <div class="stat-label">Pedidos Total</div>
          <div class="stat-value">${stats.orders.total}</div>
          <div class="stat-detail">${stats.orders.cancelled} cancelados</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Navegação rápida</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        ${['tickets','orders','clients','templates','connections'].map(sec => `
          <button class="card" onclick="navigateTo('${sec}')" style="cursor:pointer;text-align:left;background:var(--bg-card)" aria-label="Ir para ${sec}">
            <div style="font-size:1.4rem;margin-bottom:6px">${{tickets:'🎫',orders:'📦',clients:'👥',templates:'📝',connections:'🔗'}[sec]}</div>
            <div style="font-weight:600;font-size:.9rem">${{tickets:'Tickets',orders:'Pedidos',clients:'Clientes',templates:'Modelos',connections:'Conexões'}[sec]}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  window.navigateTo = (sec) => {
    currentSection = sec;
    history.pushState({}, '', `/servers/${guildId}/${sec}`);
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.section === sec));
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle) topbarTitle.textContent = {tickets:'Tickets',orders:'Pedidos',clients:'Clientes',templates:'Modelos',connections:'Conexões'}[sec];
    renderSection(sec);
  };

  // ── Tickets ────────────────────────────────────────────────────────────────

  async function renderTickets(container) {
    let statusFilter = '';
    let page = 1;

    async function load() {
      container.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Carregando...</span></div>`;
      const data = await RubyAPI.tickets(guildId, { status: statusFilter, page });
      const { tickets, total, totalPages } = data;

      container.innerHTML = `
        <div class="section-header">
          <div class="section-title">Tickets (${total})</div>
        </div>
        <div class="filters" role="group" aria-label="Filtros de status">
          ${[['','Todos'],['open','Abertos'],['closed','Fechados']].map(([val, label]) =>
            `<button class="filter-btn${statusFilter === val ? ' active' : ''}" data-status="${val}" aria-pressed="${statusFilter === val}">${label}</button>`
          ).join('')}
        </div>
        ${tickets.length ? `
          <div class="card" style="padding:0">
            <div class="table-wrap">
              <table aria-label="Tabela de tickets">
                <thead>
                  <tr>
                    <th>ID</th><th>Usuário</th><th>Status</th><th>Abertura</th><th>Fechamento</th>
                  </tr>
                </thead>
                <tbody>
                  ${tickets.map(t => `
                    <tr>
                      <td><code style="font-size:.78rem;color:var(--accent-light)">${escHtml(t.id)}</code></td>
                      <td class="td-muted">${escHtml(t.user_id || t.userId || '—')}</td>
                      <td>${statusBadge(t.status)}</td>
                      <td class="td-muted">${formatDateTime(t.created_at || t.createdAt)}</td>
                      <td class="td-muted">${t.closed_at || t.closedAt ? formatDateTime(t.closed_at || t.closedAt) : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="pagination" aria-label="Paginação">
            <button ${page <= 1 ? 'disabled' : ''} id="prevPage" aria-label="Página anterior">← Anterior</button>
            <span>Página ${page} de ${totalPages}</span>
            <button ${page >= totalPages ? 'disabled' : ''} id="nextPage" aria-label="Próxima página">Próxima →</button>
          </div>
        ` : `<div class="empty-state"><div class="empty-icon">🎫</div><p>Nenhum ticket encontrado.</p></div>`}
      `;

      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => { statusFilter = btn.dataset.status; page = 1; load(); });
      });
      container.querySelector('#prevPage')?.addEventListener('click', () => { page--; load(); });
      container.querySelector('#nextPage')?.addEventListener('click', () => { page++; load(); });
    }

    await load();
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async function renderOrders(container) {
    let statusFilter = '';
    let page = 1;

    async function load() {
      container.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Carregando...</span></div>`;
      const data = await RubyAPI.orders(guildId, { status: statusFilter, page });
      const { orders, total, totalPages } = data;

      container.innerHTML = `
        <div class="section-header">
          <div class="section-title">Pedidos (${total})</div>
        </div>
        <div class="filters" role="group" aria-label="Filtros de status">
          ${[['','Todos'],['pending','Pendentes'],['completed','Concluídos'],['cancelled','Cancelados']].map(([val, label]) =>
            `<button class="filter-btn${statusFilter === val ? ' active' : ''}" data-status="${val}" aria-pressed="${statusFilter === val}">${label}</button>`
          ).join('')}
        </div>
        ${orders.length ? `
          <div class="card" style="padding:0">
            <div class="table-wrap">
              <table aria-label="Tabela de pedidos">
                <thead>
                  <tr>
                    <th>ID</th><th>Cliente</th><th>Produto</th><th>Status</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map(o => `
                    <tr>
                      <td><code style="font-size:.78rem;color:var(--accent-light)">${escHtml(o.id)}</code></td>
                      <td class="td-muted">${escHtml(o.client_id || o.clientId || '—')}</td>
                      <td>${escHtml(o.product_name || o.productName || o.description || '—')}</td>
                      <td>${statusBadge(o.status)}</td>
                      <td class="td-muted">${formatDateTime(o.created_at || o.createdAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="pagination" aria-label="Paginação">
            <button ${page <= 1 ? 'disabled' : ''} id="prevPage" aria-label="Página anterior">← Anterior</button>
            <span>Página ${page} de ${totalPages}</span>
            <button ${page >= totalPages ? 'disabled' : ''} id="nextPage" aria-label="Próxima página">Próxima →</button>
          </div>
        ` : `<div class="empty-state"><div class="empty-icon">📦</div><p>Nenhum pedido encontrado.</p></div>`}
      `;

      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => { statusFilter = btn.dataset.status; page = 1; load(); });
      });
      container.querySelector('#prevPage')?.addEventListener('click', () => { page--; load(); });
      container.querySelector('#nextPage')?.addEventListener('click', () => { page++; load(); });
    }

    await load();
  }

  // ── Clients ────────────────────────────────────────────────────────────────

  async function renderClients(container) {
    let page = 1;

    async function load() {
      container.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Carregando...</span></div>`;
      const data = await RubyAPI.clients(guildId, { page });
      const { clients, total, totalPages } = data;

      container.innerHTML = `
        <div class="section-header">
          <div class="section-title">Clientes (${total})</div>
        </div>
        ${clients.length ? `
          <div class="card" style="padding:0">
            <div class="table-wrap">
              <table aria-label="Tabela de clientes">
                <thead>
                  <tr>
                    <th>Nome</th><th>Discord</th><th>Email</th><th>Telefone</th><th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  ${clients.map(c => `
                    <tr>
                      <td>${escHtml(c.display_name || c.displayName || '—')}</td>
                      <td class="td-muted">${c.discord_id || c.discordId ? `<code style="font-size:.78rem">${escHtml(c.discord_id || c.discordId)}</code>` : '—'}</td>
                      <td class="td-muted">${escHtml(c.email || '—')}</td>
                      <td class="td-muted">${escHtml(c.phone || '—')}</td>
                      <td class="td-muted">${formatDate(c.created_at || c.createdAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="pagination" aria-label="Paginação">
            <button ${page <= 1 ? 'disabled' : ''} id="prevPage" aria-label="Página anterior">← Anterior</button>
            <span>Página ${page} de ${totalPages}</span>
            <button ${page >= totalPages ? 'disabled' : ''} id="nextPage" aria-label="Próxima página">Próxima →</button>
          </div>
        ` : `<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum cliente cadastrado.</p></div>`}
      `;

      container.querySelector('#prevPage')?.addEventListener('click', () => { page--; load(); });
      container.querySelector('#nextPage')?.addEventListener('click', () => { page++; load(); });
    }

    await load();
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async function renderTemplates(container) {
    const data      = await RubyAPI.templates(guildId);
    const templates = data?.templates ?? [];

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">Modelos (${templates.length})</div>
      </div>
      ${templates.length ? `
        <div class="tmpls-grid" aria-label="Lista de modelos">
          ${templates.map(t => `
            <div class="tmpl-card">
              <div class="tmpl-icon" aria-hidden="true">📝</div>
              <div class="tmpl-info">
                <div class="tmpl-name">${escHtml(t.name)}</div>
                ${t.description ? `<div class="tmpl-desc">${escHtml(t.description)}</div>` : ''}
                <div style="margin-top:4px"><span class="badge badge-muted">${escHtml(t.type || 'embed')}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhum modelo cadastrado.</p></div>`}
    `;
  }

  // ── Connections ────────────────────────────────────────────────────────────

  async function renderConnections(container) {
    const data        = await RubyAPI.connections(guildId);
    const connections = data?.connections ?? [];
    const active      = connections.filter(c => c.enabled).length;

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">Conexões (${connections.length})</div>
        <span class="badge badge-success">${active} ativas</span>
      </div>
      ${connections.length ? `
        <div class="conns-grid" aria-label="Lista de conexões">
          ${connections.map(c => `
            <div class="conn-card">
              <div class="conn-dot ${c.enabled ? 'on' : 'off'}" aria-label="${c.enabled ? 'Ativa' : 'Inativa'}"></div>
              <div class="conn-info">
                <div class="conn-name">${escHtml(c.action || c.id)}</div>
                <div class="conn-sub">Canal: <code style="font-size:.75rem">${escHtml(c.target_channel_id || c.targetChannelId || '—')}</code></div>
              </div>
              <span class="badge ${c.enabled ? 'badge-success' : 'badge-muted'}">${c.enabled ? 'On' : 'Off'}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="empty-state"><div class="empty-icon">🔗</div><p>Nenhuma conexão configurada.</p></div>`}
    `;
  }

})();

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
