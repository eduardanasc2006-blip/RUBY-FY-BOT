/**
 * Dashboard Ruby FY — Etapa 19C.
 * Gerenciamento avançado: automações, painéis, produtos, provas, configurações.
 * Estende dashboard.js via window.Ruby19C sem modificar o arquivo original.
 */

(function () {
  'use strict';

  // ── Utilitário: escape HTML ─────────────────────────────────────────────────
  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function shortId(id) { return String(id ?? '').slice(0, 8); }

  // ── RubyModal ───────────────────────────────────────────────────────────────
  const RubyModal = {
    el:      null,
    titleEl: null,
    bodyEl:  null,
    footerEl:null,

    _init() {
      if (this.el) return;
      this.el       = document.getElementById('ruby-modal');
      this.titleEl  = document.getElementById('modal-title');
      this.bodyEl   = document.getElementById('modal-body');
      this.footerEl = document.getElementById('modal-footer');
      if (!this.el) return;
      document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.close());
      this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    },

    open({ title = '', body = '', footer = '', large = false } = {}) {
      this._init();
      if (!this.el) return;
      this.titleEl.textContent = title;
      this.bodyEl.innerHTML    = body;
      this.footerEl.innerHTML  = footer;
      this.el.querySelector('.modal-box').classList.toggle('modal-lg', large);
      this.el.style.display = 'flex';
      // Focus first input
      setTimeout(() => this.bodyEl.querySelector('input,textarea,select')?.focus(), 50);
    },

    close() {
      this._init();
      if (!this.el) return;
      this.el.style.display = 'none';
      this.bodyEl.innerHTML = '';
      this.footerEl.innerHTML = '';
    },

    confirm({ title, message, confirmLabel = 'Confirmar', dangerBtn = true, onConfirm }) {
      const btnClass = dangerBtn ? 'btn-danger' : 'btn-accent';
      this.open({
        title,
        body: `<p style="color:var(--text-secondary)">${esc(message)}</p>`,
        footer: `
          <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
          <button class="btn ${btnClass} btn-sm" id="modalConfirmBtn">${esc(confirmLabel)}</button>
        `,
      });
      this.footerEl.querySelector('#modalCancelBtn').addEventListener('click',  () => this.close());
      this.footerEl.querySelector('#modalConfirmBtn').addEventListener('click', () => {
        this.close();
        onConfirm?.();
      });
    },
  };

  // ── API helpers ─────────────────────────────────────────────────────────────
  async function apiCall(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function guildPath(guildId, sub) {
    return `/guilds/${guildId}/${sub}`;
  }

  // ── Pagination component ───────────────────────────────────────────────────
  function buildPager(current, total, onPage) {
    if (total <= 1) return '';
    let btns = '';
    for (let i = 1; i <= total; i++) {
      btns += `<button class="btn btn-sm ${i === current ? 'btn-accent' : 'btn-secondary'}" data-page="${i}">${i}</button>`;
    }
    return `<div class="pagination" style="display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-top:16px">${btns}</div>`;
  }

  function bindPager(container, onPage) {
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => onPage(Number(btn.dataset.page)));
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOMATIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function renderAutomations(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `automations?page=${page}&limit=20`));
      const items = d.automations ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">⚙️ Automações <span class="badge badge-secondary">${d.total}</span></span>
          <button class="btn btn-accent btn-sm" id="btnCreateAuto">+ Nova Automação</button>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">⚙️</div><p>Nenhuma automação criada ainda.</p></div>` : `
          <div class="autos-grid">
            ${items.map(a => `
              <div class="auto-card">
                <div class="auto-status-dot ${a.enabled ? 'on' : 'off'}"></div>
                <div class="auto-info">
                  <div class="auto-name">${esc(a.name)}</div>
                  <div class="auto-trigger">Gatilho: ${esc(a.trigger)}</div>
                  <div class="auto-trigger">${a.conditions?.length ?? 0} condições · ${a.actions?.length ?? 0} ações</div>
                </div>
                <div class="row-actions">
                  <button class="btn-icon ${a.enabled ? 'toggle-on' : 'toggle-off'}" data-toggle="${esc(a.id)}" title="${a.enabled ? 'Desativar' : 'Ativar'}">${a.enabled ? '🟡' : '🟢'}</button>
                  <button class="btn-icon delete" data-delete="${esc(a.id)}" data-name="${esc(a.name)}" title="Excluir">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      container.querySelector('#btnCreateAuto')?.addEventListener('click', () => openAutoForm(guildId, null, load));
      container.querySelectorAll('[data-toggle]').forEach(btn =>
        btn.addEventListener('click', async () => {
          await apiCall('POST', guildPath(guildId, `automations/${btn.dataset.toggle}/toggle`));
          showToast('Automação alterada!', 'success');
          load();
        })
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Excluir automação',
          message: `Excluir "${btn.dataset.name}"? Esta ação é irreversível.`,
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `automations/${btn.dataset.delete}`));
            showToast('Automação excluída.', 'success');
            load();
          },
        }))
      );
      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  async function openAutoForm(guildId, existing, onDone) {
    const meta = await apiCall('GET', guildPath(guildId, 'automations/meta'));
    const triggers = meta.triggers ?? [];

    RubyModal.open({
      title: existing ? 'Editar Automação' : 'Nova Automação',
      body: `
        <div class="form-group">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="autoName" maxlength="100" value="${esc(existing?.name ?? '')}" placeholder="Nome da automação" />
        </div>
        <div class="form-group">
          <label class="form-label">Gatilho <span class="required">*</span></label>
          <select class="form-select" id="autoTrigger">
            ${triggers.map(t => `<option value="${esc(t.value)}" ${(existing?.trigger ?? '') === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="toggle-group">
            <label class="toggle-switch">
              <input type="checkbox" id="autoEnabled" ${(existing?.enabled ?? true) ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
            <span class="toggle-label">Ativa</span>
          </div>
        </div>
        <p class="form-hint">Condições e ações avançadas podem ser configuradas pelo bot Discord.</p>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const name    = document.getElementById('autoName').value.trim();
      const trigger = document.getElementById('autoTrigger').value;
      const enabled = document.getElementById('autoEnabled').checked;
      if (!name) { showToast('Nome é obrigatório.', 'error'); return; }
      try {
        if (existing) {
          await apiCall('PATCH', guildPath(guildId, `automations/${existing.id}`), { name, trigger });
          if (enabled !== existing.enabled)
            await apiCall('POST', guildPath(guildId, `automations/${existing.id}/toggle`));
        } else {
          const res = await apiCall('POST', guildPath(guildId, 'automations'), { name, trigger });
          if (!enabled)
            await apiCall('POST', guildPath(guildId, `automations/${res.automation.id}/toggle`));
        }
        RubyModal.close();
        showToast('Automação salva!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PANELS
  // ══════════════════════════════════════════════════════════════════════════

  async function renderPanels(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `panels?page=${page}&limit=20`));
      const items = d.panels ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">🎛️ Painéis <span class="badge badge-secondary">${d.total}</span></span>
          <button class="btn btn-accent btn-sm" id="btnCreatePanel">+ Novo Painel</button>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎛️</div><p>Nenhum painel criado ainda.</p></div>` : `
          <div class="panels-grid">
            ${items.map(p => `
              <div class="panel-card">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                  <div>
                    <div class="panel-name">${esc(p.name)}</div>
                    <div class="panel-status">${p.status === 'published' ? '✅ Publicado' : '📝 Rascunho'}</div>
                    ${p.channelId ? `<div class="panel-buttons" style="margin-top:4px">Canal: <code>${esc(p.channelId)}</code></div>` : ''}
                  </div>
                  <div class="row-actions">
                    <button class="btn-icon edit" data-edit="${esc(p.id)}" title="Editar">✏️</button>
                    <button class="btn-icon delete" data-delete="${esc(p.id)}" data-name="${esc(p.name)}" title="Excluir">🗑️</button>
                  </div>
                </div>
                ${p.embedTitle ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:6px">${esc(p.embedTitle)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      container.querySelector('#btnCreatePanel')?.addEventListener('click', () => openPanelForm(guildId, null, load));
      container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const d2 = await apiCall('GET', guildPath(guildId, `panels/${btn.dataset.edit}`));
          openPanelForm(guildId, d2.panel, load);
        })
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Excluir painel',
          message: `Excluir "${btn.dataset.name}"? Esta ação é irreversível.`,
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `panels/${btn.dataset.delete}`));
            showToast('Painel excluído.', 'success');
            load();
          },
        }))
      );
      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  function openPanelForm(guildId, existing, onDone) {
    RubyModal.open({
      title: existing ? 'Editar Painel' : 'Novo Painel',
      large: true,
      body: `
        <div class="form-group">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="panelName" maxlength="100" value="${esc(existing?.name ?? '')}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Título do embed</label>
            <input class="form-input" id="panelEmbedTitle" value="${esc(existing?.embedTitle ?? '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Cor do embed</label>
            <input class="form-input" id="panelEmbedColor" value="${esc(existing?.embedColor ?? '#5865F2')}" placeholder="#5865F2" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição do embed</label>
          <textarea class="form-textarea" id="panelEmbedDesc">${esc(existing?.embedDescription ?? '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Rodapé do embed</label>
          <input class="form-input" id="panelEmbedFooter" value="${esc(existing?.embedFooter ?? '')}" />
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const name = document.getElementById('panelName').value.trim();
      if (!name) { showToast('Nome é obrigatório.', 'error'); return; }
      const body = {
        name,
        embedTitle:       document.getElementById('panelEmbedTitle').value.trim()   || null,
        embedDescription: document.getElementById('panelEmbedDesc').value.trim()    || null,
        embedColor:       document.getElementById('panelEmbedColor').value.trim()   || '#5865F2',
        embedFooter:      document.getElementById('panelEmbedFooter').value.trim()  || null,
      };
      try {
        if (existing) {
          await apiCall('PATCH', guildPath(guildId, `panels/${existing.id}`), body);
        } else {
          await apiCall('POST', guildPath(guildId, 'panels'), body);
        }
        RubyModal.close();
        showToast('Painel salvo!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ══════════════════════════════════════════════════════════════════════════

  async function renderProducts(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `products?page=${page}&limit=20`));
      const items = d.products ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">🛒 Produtos <span class="badge badge-secondary">${d.total}</span></span>
          <button class="btn btn-accent btn-sm" id="btnCreateProduct">+ Novo Produto</button>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">🛒</div><p>Nenhum produto cadastrado.</p></div>` : `
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr>
                <th>Produto</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th></th>
              </tr></thead>
              <tbody>
                ${items.map(p => `
                  <tr>
                    <td>
                      <div style="font-weight:600">${esc(p.name)}</div>
                      ${p.description ? `<div style="font-size:.75rem;color:var(--text-muted)">${esc(p.description.slice(0,60))}</div>` : ''}
                    </td>
                    <td class="product-price">${p.price ? esc(p.price) : '—'}</td>
                    <td class="product-stock" data-stock="${p.stock}">${p.stock}</td>
                    <td><span class="badge-stock ${p.status}">${esc(p.status)}</span></td>
                    <td class="row-actions">
                      <button class="btn-icon" data-stock-edit="${esc(p.id)}" data-stock-val="${p.stock}" title="Editar estoque">📦</button>
                      <button class="btn-icon edit" data-edit="${esc(p.id)}" title="Editar">✏️</button>
                      <button class="btn-icon delete" data-delete="${esc(p.id)}" data-name="${esc(p.name)}" title="Excluir">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      container.querySelector('#btnCreateProduct')?.addEventListener('click', () => openProductForm(guildId, null, load));
      container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const d2 = await apiCall('GET', guildPath(guildId, `products/${btn.dataset.edit}`));
          openProductForm(guildId, d2.product, load);
        })
      );
      container.querySelectorAll('[data-stock-edit]').forEach(btn =>
        btn.addEventListener('click', () => openStockModal(guildId, btn.dataset.stockEdit, Number(btn.dataset.stockVal), load))
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Excluir produto',
          message: `Excluir "${btn.dataset.name}"? Esta ação é irreversível.`,
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `products/${btn.dataset.delete}`));
            showToast('Produto excluído.', 'success');
            load();
          },
        }))
      );
      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  function openProductForm(guildId, existing, onDone) {
    RubyModal.open({
      title: existing ? 'Editar Produto' : 'Novo Produto',
      body: `
        <div class="form-group">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="prodName" maxlength="200" value="${esc(existing?.name ?? '')}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Preço</label>
            <input class="form-input" id="prodPrice" value="${esc(existing?.price ?? '')}" placeholder="R$ 50,00" />
          </div>
          <div class="form-group">
            <label class="form-label">Estoque inicial</label>
            <input class="form-input" id="prodStock" type="number" min="0" value="${existing?.stock ?? 0}" ${existing ? 'disabled' : ''} />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <textarea class="form-textarea" id="prodDesc" maxlength="500">${esc(existing?.description ?? '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">URL da imagem</label>
          <input class="form-input" id="prodImage" value="${esc(existing?.imageUrl ?? '')}" placeholder="https://..." />
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const name = document.getElementById('prodName').value.trim();
      if (!name) { showToast('Nome é obrigatório.', 'error'); return; }
      const body = {
        name,
        price:       document.getElementById('prodPrice').value.trim()   || null,
        description: document.getElementById('prodDesc').value.trim()    || null,
        imageUrl:    document.getElementById('prodImage').value.trim()   || null,
      };
      if (!existing) body.stock = Number(document.getElementById('prodStock').value) || 0;
      try {
        if (existing) {
          await apiCall('PATCH', guildPath(guildId, `products/${existing.id}`), body);
        } else {
          await apiCall('POST', guildPath(guildId, 'products'), body);
        }
        RubyModal.close();
        showToast('Produto salvo!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  function openStockModal(guildId, productId, current, onDone) {
    RubyModal.open({
      title: 'Editar Estoque',
      body: `
        <div class="form-group">
          <label class="form-label">Estoque atual: <strong>${current}</strong></label>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantidade absoluta (qty)</label>
            <input class="form-input" id="stockQty" type="number" min="0" placeholder="ex: 10" />
            <span class="form-hint">Define o estoque direto</span>
          </div>
          <div class="form-group">
            <label class="form-label">Variação (delta)</label>
            <input class="form-input" id="stockDelta" type="number" placeholder="ex: +5 ou -2" />
            <span class="form-hint">Incrementa ou decrementa</span>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar Estoque</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const qtyVal   = document.getElementById('stockQty').value;
      const deltaVal = document.getElementById('stockDelta').value;
      const body = {};
      if (qtyVal !== '')   body.qty   = Number(qtyVal);
      if (deltaVal !== '') body.delta = Number(deltaVal);
      if (Object.keys(body).length === 0) { showToast('Informe qty ou delta.', 'error'); return; }
      try {
        await apiCall('PATCH', guildPath(guildId, `products/${productId}/stock`), body);
        RubyModal.close();
        showToast('Estoque atualizado!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROOFS
  // ══════════════════════════════════════════════════════════════════════════

  async function renderProofs(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `proofs?page=${page}&limit=20`));
      const items = d.proofs ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">📸 Provas de Venda <span class="badge badge-secondary">${d.total}</span></span>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">📸</div><p>Nenhuma prova registrada.</p></div>` : `
          <div class="proofs-grid">
            ${items.map(p => `
              <div class="proof-card">
                <div>
                  <div class="proof-product">${esc(p.produto ?? '—')}</div>
                  <div class="proof-meta">Por <code>${esc(p.vendorId)}</code></div>
                  ${p.clienteRaw || p.clientId
                    ? `<div class="proof-meta">Cliente: ${esc(p.clientId ? `<@${p.clientId}>` : p.clienteRaw)}</div>`
                    : ''}
                  ${p.notas ? `<div class="proof-meta">${esc(p.notas.slice(0,80))}</div>` : ''}
                  <div class="proof-meta">${formatDate(p.createdAt)}</div>
                </div>
                <div class="proof-valor">${p.valor ? esc(p.valor) : '—'}</div>
              </div>
            `).join('')}
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════

  async function renderSettings(container, guildId) {
    const d = await apiCall('GET', guildPath(guildId, 'settings/tickets'));
    const cfg = d.tickets ?? {};

    container.innerHTML = `
      <div class="section-header">
        <span class="section-title">⚙️ Configurações do Servidor</span>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Sistema de Tickets</div>
        <div class="settings-card">
          <form id="ticketsConfigForm">
            <div class="form-group">
              <label class="form-label">Ativar sistema de tickets</label>
              <div class="toggle-group">
                <label class="toggle-switch">
                  <input type="checkbox" id="cfgTicketsEnabled" ${cfg.enabled ? 'checked' : ''} />
                  <span class="toggle-track"></span>
                </label>
                <span class="toggle-label">Tickets ${cfg.enabled ? 'ativados' : 'desativados'}</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">ID da categoria</label>
                <input class="form-input" id="cfgCategoryId" value="${esc(cfg.category_id ?? '')}" placeholder="ID da categoria Discord" />
              </div>
              <div class="form-group">
                <label class="form-label">Canal de log</label>
                <input class="form-input" id="cfgLogChannel" value="${esc(cfg.log_channel_id ?? '')}" placeholder="ID do canal de log" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cargo de suporte</label>
              <input class="form-input" id="cfgSupportRole" value="${esc(cfg.support_role_id ?? '')}" placeholder="ID do cargo de suporte" />
            </div>
            <div class="form-group">
              <label class="form-label">Mensagem de boas-vindas</label>
              <textarea class="form-textarea" id="cfgIntroMsg" maxlength="1000">${esc(cfg.intro_message ?? '')}</textarea>
              <span class="form-hint">Mensagem enviada ao abrir um ticket.</span>
            </div>
            <div style="margin-top:16px">
              <button type="submit" class="btn btn-accent btn-sm">💾 Salvar Configurações</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#ticketsConfigForm').addEventListener('submit', async e => {
      e.preventDefault();
      const patch = {
        enabled:         document.getElementById('cfgTicketsEnabled').checked,
        category_id:     document.getElementById('cfgCategoryId').value.trim()   || null,
        log_channel_id:  document.getElementById('cfgLogChannel').value.trim()   || null,
        support_role_id: document.getElementById('cfgSupportRole').value.trim()  || null,
        intro_message:   document.getElementById('cfgIntroMsg').value.trim()     || null,
      };
      try {
        await apiCall('PATCH', guildPath(guildId, 'settings/tickets'), patch);
        showToast('Configurações salvas!', 'success');
      } catch (e2) { showToast(e2.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATES — CRUD additions to 19B read-only view
  // ══════════════════════════════════════════════════════════════════════════

  async function renderTemplates19C(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `templates`));
      const items = d.templates ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">📝 Modelos <span class="badge badge-secondary">${items.length}</span></span>
          <button class="btn btn-accent btn-sm" id="btnCreateTmpl">+ Novo Modelo</button>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhum modelo criado.</p></div>` : `
          <div class="tmpls-grid">
            ${items.map(t => `
              <div class="tmpl-card">
                <div class="tmpl-icon">📝</div>
                <div class="tmpl-info">
                  <div class="tmpl-name">${esc(t.name)}</div>
                  ${t.description ? `<div class="tmpl-desc">${esc(t.description.slice(0,80))}</div>` : ''}
                  <div class="tmpl-desc" style="margin-top:4px"><span class="badge badge-secondary">${esc(t.type)}</span></div>
                </div>
                <div class="row-actions">
                  <button class="btn-icon edit" data-edit="${esc(t.id)}" title="Editar">✏️</button>
                  <button class="btn-icon delete" data-delete="${esc(t.id)}" data-name="${esc(t.name)}" title="Excluir">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;

      container.querySelector('#btnCreateTmpl')?.addEventListener('click', () => openTmplForm(guildId, null, load));
      container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const d2 = await apiCall('GET', guildPath(guildId, `templates/${btn.dataset.edit}`));
          openTmplForm(guildId, d2.template, load);
        })
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Excluir modelo',
          message: `Excluir "${btn.dataset.name}"?`,
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `templates/${btn.dataset.delete}`));
            showToast('Modelo excluído.', 'success');
            load();
          },
        }))
      );
    }

    await load();
  }

  function openTmplForm(guildId, existing, onDone) {
    RubyModal.open({
      title: existing ? 'Editar Modelo' : 'Novo Modelo',
      body: `
        <div class="form-group">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input class="form-input" id="tmplName" maxlength="100" value="${esc(existing?.name ?? '')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input class="form-input" id="tmplDesc" maxlength="300" value="${esc(existing?.description ?? '')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="tmplType">
            <option value="embed" ${(existing?.type ?? 'embed') === 'embed' ? 'selected' : ''}>embed</option>
            <option value="message" ${existing?.type === 'message' ? 'selected' : ''}>message</option>
          </select>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const name = document.getElementById('tmplName').value.trim();
      if (!name) { showToast('Nome é obrigatório.', 'error'); return; }
      const body = {
        name,
        description: document.getElementById('tmplDesc').value.trim() || null,
        type:        document.getElementById('tmplType').value,
      };
      try {
        if (existing) {
          await apiCall('PATCH', guildPath(guildId, `templates/${existing.id}`), body);
        } else {
          await apiCall('POST', guildPath(guildId, 'templates'), body);
        }
        RubyModal.close();
        showToast('Modelo salvo!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONNECTIONS — CRUD additions to 19B read-only view
  // ══════════════════════════════════════════════════════════════════════════

  async function renderConnections19C(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `connections`));
      const items = d.connections ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">🔗 Conexões <span class="badge badge-secondary">${items.length}</span></span>
          <button class="btn btn-accent btn-sm" id="btnCreateConn">+ Nova Conexão</button>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">🔗</div><p>Nenhuma conexão configurada.</p></div>` : `
          <div class="conns-grid">
            ${items.map(c => `
              <div class="conn-card" style="background:var(--bg-card);border:1px solid var(--border-soft);border-radius:var(--radius-lg);padding:14px 16px;display:flex;align-items:flex-start;gap:10px">
                <div class="conn-dot ${c.enabled ? 'on' : 'off'}"></div>
                <div class="conn-info">
                  <div class="conn-name">${esc(c.action)}</div>
                  <div class="conn-sub">Modelo: <code>${esc(c.templateId.slice(0,8))}</code></div>
                  ${c.lastError ? `<div class="conn-sub" style="color:var(--danger)" title="${esc(c.lastError)}">⚠️ ${esc(c.lastError.slice(0,60))}</div>` : ''}
                </div>
                <div class="row-actions">
                  <button class="btn-icon ${c.enabled ? 'toggle-on' : 'toggle-off'}" data-toggle="${esc(c.id)}" title="${c.enabled ? 'Desativar' : 'Ativar'}">${c.enabled ? '🟡' : '🟢'}</button>
                  ${c.lastError ? `<button class="btn-icon" data-clearerr="${esc(c.id)}" title="Limpar erro">🔧</button>` : ''}
                  <button class="btn-icon edit" data-edit="${esc(c.id)}" title="Editar">✏️</button>
                  <button class="btn-icon delete" data-delete="${esc(c.id)}" data-name="${esc(c.action)}" title="Excluir">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;

      container.querySelector('#btnCreateConn')?.addEventListener('click', () => openConnForm(guildId, null, load));
      container.querySelectorAll('[data-toggle]').forEach(btn =>
        btn.addEventListener('click', async () => {
          await apiCall('POST', guildPath(guildId, `connections/${btn.dataset.toggle}/toggle`));
          showToast('Conexão alterada!', 'success');
          load();
        })
      );
      container.querySelectorAll('[data-clearerr]').forEach(btn =>
        btn.addEventListener('click', async () => {
          await apiCall('POST', guildPath(guildId, `connections/${btn.dataset.clearerr}/clear-error`));
          showToast('Erro limpo!', 'success');
          load();
        })
      );
      container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const d2 = await apiCall('GET', guildPath(guildId, `connections/${btn.dataset.edit}`));
          openConnForm(guildId, d2.connection, load);
        })
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Excluir conexão',
          message: `Excluir conexão "${btn.dataset.name}"?`,
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `connections/${btn.dataset.delete}`));
            showToast('Conexão excluída.', 'success');
            load();
          },
        }))
      );
    }

    await load();
  }

  function openConnForm(guildId, existing, onDone) {
    RubyModal.open({
      title: existing ? 'Editar Conexão' : 'Nova Conexão',
      body: `
        <div class="form-group">
          <label class="form-label">Ação <span class="required">*</span></label>
          <input class="form-input" id="connAction" value="${esc(existing?.action ?? '')}" placeholder="ex: order_paid" />
        </div>
        <div class="form-group">
          <label class="form-label">ID do Modelo <span class="required">*</span></label>
          <input class="form-input" id="connTemplate" value="${esc(existing?.templateId ?? '')}" placeholder="UUID do template" />
        </div>
        <div class="form-group">
          <label class="form-label">ID do Canal de destino <span class="required">*</span></label>
          <input class="form-input" id="connChannel" value="${esc(existing?.targetChannelId ?? '')}" placeholder="ID do canal Discord" />
        </div>
        <div class="form-group">
          <div class="toggle-group">
            <label class="toggle-switch">
              <input type="checkbox" id="connEnabled" ${(existing?.enabled ?? true) ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
            <span class="toggle-label">Ativa</span>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const action          = document.getElementById('connAction').value.trim();
      const templateId      = document.getElementById('connTemplate').value.trim();
      const targetChannelId = document.getElementById('connChannel').value.trim();
      const enabled         = document.getElementById('connEnabled').checked;
      if (!action || !templateId || !targetChannelId) {
        showToast('Todos os campos marcados são obrigatórios.', 'error');
        return;
      }
      try {
        if (existing) {
          await apiCall('PATCH', guildPath(guildId, `connections/${existing.id}`), { action, templateId, targetChannelId, enabled });
        } else {
          await apiCall('POST', guildPath(guildId, 'connections'), { action, templateId, targetChannelId, enabled });
        }
        RubyModal.close();
        showToast('Conexão salva!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORDERS — status update addition
  // ══════════════════════════════════════════════════════════════════════════

  async function renderOrders19C(container, guildId) {
    // Status labels for orders
    const STATUS_LABELS = {
      pending:          '⏳ Pendente',
      awaiting_payment: '💳 Ag. Pagamento',
      paid:             '✅ Pago',
      processing:       '⚙️ Em Processamento',
      delivered:        '📦 Entregue',
      completed:        '🏆 Concluído',
      cancelled:        '❌ Cancelado',
    };
    const VALID_TRANSITIONS = {
      pending:          ['awaiting_payment', 'paid', 'processing', 'cancelled'],
      awaiting_payment: ['paid', 'cancelled'],
      paid:             ['processing', 'delivered', 'completed', 'cancelled'],
      processing:       ['delivered', 'completed', 'cancelled'],
      delivered:        ['completed', 'cancelled'],
      completed:        [],
      cancelled:        [],
    };

    let page = 1, statusFilter = '';

    async function load() {
      const qs = `page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`;
      const d = await apiCall('GET', guildPath(guildId, `orders?${qs}`));
      const items = d.orders ?? [];

      const statuses = Object.keys(STATUS_LABELS);

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">📦 Pedidos <span class="badge badge-secondary">${d.total}</span></span>
        </div>
        <div class="filter-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn btn-sm ${!statusFilter ? 'btn-accent' : 'btn-secondary'}" data-status="">Todos</button>
          ${statuses.map(s => `<button class="btn btn-sm ${statusFilter === s ? 'btn-accent' : 'btn-secondary'}" data-status="${s}">${STATUS_LABELS[s]}</button>`).join('')}
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">📦</div><p>Nenhum pedido encontrado.</p></div>` : `
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Produto</th><th>Cliente</th><th>Valor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${items.map(o => `
                  <tr>
                    <td><code>#${shortId(o.id)}</code></td>
                    <td>${esc(o.produto ?? '—')}</td>
                    <td>${esc(o.clienteRaw || o.clientId || '—')}</td>
                    <td>${o.valor ? esc(o.valor) : '—'}</td>
                    <td><span class="badge badge-secondary">${STATUS_LABELS[o.status] ?? esc(o.status)}</span></td>
                    <td class="row-actions">
                      ${(VALID_TRANSITIONS[o.status]?.length ?? 0) > 0
                        ? `<button class="btn-icon" data-status-edit="${esc(o.id)}" data-current="${esc(o.status)}" title="Alterar status">🔄</button>`
                        : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      container.querySelectorAll('[data-status]').forEach(btn =>
        btn.addEventListener('click', () => { statusFilter = btn.dataset.status; page = 1; load(); })
      );
      container.querySelectorAll('[data-status-edit]').forEach(btn =>
        btn.addEventListener('click', () => {
          const current = btn.dataset.current;
          const next = VALID_TRANSITIONS[current] ?? [];
          openOrderStatusModal(guildId, btn.dataset.statusEdit, current, next, STATUS_LABELS, load);
        })
      );
      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  function openOrderStatusModal(guildId, orderId, current, nextStatuses, labels, onDone) {
    RubyModal.open({
      title: `Alterar Status — #${shortId(orderId)}`,
      body: `
        <p style="color:var(--text-secondary);margin-bottom:12px">Status atual: <strong>${esc(labels[current] ?? current)}</strong></p>
        <div class="form-group">
          <label class="form-label">Novo status <span class="required">*</span></label>
          <select class="form-select" id="orderNewStatus">
            ${nextStatuses.map(s => `<option value="${s}">${esc(labels[s] ?? s)}</option>`).join('')}
          </select>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Atualizar Status</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const status = document.getElementById('orderNewStatus').value;
      try {
        await apiCall('PATCH', guildPath(guildId, `orders/${orderId}/status`), { status });
        RubyModal.close();
        showToast('Status atualizado!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENTS — edit + delete addition
  // ══════════════════════════════════════════════════════════════════════════

  async function renderClients19C(container, guildId) {
    let page = 1;

    async function load() {
      const d = await apiCall('GET', guildPath(guildId, `clients?page=${page}&limit=20`));
      const items = d.clients ?? [];

      container.innerHTML = `
        <div class="section-header">
          <span class="section-title">👥 Clientes <span class="badge badge-secondary">${d.total}</span></span>
        </div>

        ${items.length === 0 ? `<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum cliente cadastrado.</p></div>` : `
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Nome</th><th>Discord</th><th>E-mail</th><th>Cadastro</th><th></th></tr></thead>
              <tbody>
                ${items.map(c => `
                  <tr>
                    <td>${esc(c.displayName)}</td>
                    <td>${c.discordId ? `<code>${esc(c.discordId)}</code>` : '—'}</td>
                    <td>${c.email ? esc(c.email) : '—'}</td>
                    <td>${formatDate(c.createdAt)}</td>
                    <td class="row-actions">
                      <button class="btn-icon edit" data-edit="${esc(c.id)}" title="Editar">✏️</button>
                      <button class="btn-icon delete" data-delete="${esc(c.id)}" data-name="${esc(c.displayName)}" title="Excluir">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        ${buildPager(page, d.totalPages, p => { page = p; load(); })}
      `;

      container.querySelectorAll('[data-edit]').forEach(btn =>
        btn.addEventListener('click', async () => {
          const d2 = await apiCall('GET', guildPath(guildId, `clients/${btn.dataset.edit}`));
          openClientForm(guildId, d2.client, load);
        })
      );
      container.querySelectorAll('[data-delete]').forEach(btn =>
        btn.addEventListener('click', () => RubyModal.confirm({
          title: 'Remover cliente',
          message: `Remover "${btn.dataset.name}"? Esta ação é irreversível.`,
          confirmLabel: 'Remover',
          onConfirm: async () => {
            await apiCall('DELETE', guildPath(guildId, `clients/${btn.dataset.delete}`));
            showToast('Cliente removido.', 'success');
            load();
          },
        }))
      );
      bindPager(container, p => { page = p; load(); });
    }

    await load();
  }

  function openClientForm(guildId, existing, onDone) {
    RubyModal.open({
      title: 'Editar Cliente',
      body: `
        <div class="form-group">
          <label class="form-label">Nome de exibição <span class="required">*</span></label>
          <input class="form-input" id="clientName" maxlength="100" value="${esc(existing?.displayName ?? '')}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Discord ID</label>
            <input class="form-input" id="clientDiscord" value="${esc(existing?.discordId ?? '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input class="form-input" id="clientEmail" type="email" value="${esc(existing?.email ?? '')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input class="form-input" id="clientPhone" value="${esc(existing?.phone ?? '')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" id="clientNotas">${esc(existing?.notas ?? '')}</textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">Cancelar</button>
        <button class="btn btn-accent btn-sm" id="modalSaveBtn">Salvar</button>
      `,
    });

    document.getElementById('modalCancelBtn').addEventListener('click', () => RubyModal.close());
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      const displayName = document.getElementById('clientName').value.trim();
      if (!displayName) { showToast('Nome é obrigatório.', 'error'); return; }
      try {
        await apiCall('PATCH', guildPath(guildId, `clients/${existing.id}`), {
          displayName,
          discordId: document.getElementById('clientDiscord').value.trim() || null,
          email:     document.getElementById('clientEmail').value.trim()   || null,
          phone:     document.getElementById('clientPhone').value.trim()   || null,
          notas:     document.getElementById('clientNotas').value.trim()   || null,
        });
        RubyModal.close();
        showToast('Cliente salvo!', 'success');
        onDone?.();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Register Ruby19C extension
  // ══════════════════════════════════════════════════════════════════════════

  window.Ruby19C = {
    titles: {
      automations: 'Automações',
      panels:      'Painéis',
      products:    'Produtos',
      proofs:      'Provas de Venda',
      settings:    'Configurações',
      templates:   'Modelos',
      connections: 'Conexões',
      orders:      'Pedidos',
      clients:     'Clientes',
    },
    sections: {
      automations: renderAutomations,
      panels:      renderPanels,
      products:    renderProducts,
      proofs:      renderProofs,
      settings:    renderSettings,
      templates:   renderTemplates19C,
      connections: renderConnections19C,
      orders:      renderOrders19C,
      clients:     renderClients19C,
    },
    modal: RubyModal,
  };
})();
