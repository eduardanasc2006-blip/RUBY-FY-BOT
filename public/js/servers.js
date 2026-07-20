/**
 * Página de seleção de servidores — Etapa 19B.
 */

(async function () {
  // ── Carrega dados do usuário ─────────────────────────────────────────────
  let me;
  try {
    me = await RubyAPI.me();
    if (!me) return;
  } catch {
    window.location.href = '/login';
    return;
  }

  // Preenche cabeçalho
  const userNameEl  = document.getElementById('userName');
  const avatarImg   = document.getElementById('userAvatarImg');
  if (userNameEl) userNameEl.textContent = me.user.globalName || me.user.username;
  if (avatarImg && me.user.avatar) {
    avatarImg.src  = discordAvatar(me.user.id, me.user.avatar, 64);
    avatarImg.style.display = 'block';
  }

  // Botão de logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => RubyAPI.logout());

  // ── Carrega servidores ───────────────────────────────────────────────────
  const grid = document.getElementById('serversGrid');

  let data;
  try {
    data = await RubyAPI.guilds();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" role="alert">
      <div class="empty-icon">⚠️</div>
      <p>Erro ao carregar servidores: ${err.message}</p>
    </div>`;
    return;
  }

  const guilds = data?.guilds ?? [];

  if (!guilds.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏰</div>
      <p>Nenhum servidor encontrado.<br>Você precisa ter a permissão <strong>Gerenciar Servidor</strong> e o Ruby FY deve estar no servidor.</p>
    </div>`;
    return;
  }

  grid.innerHTML = '';
  grid.setAttribute('role', 'list');

  for (const guild of guilds) {
    const iconUrl = guildIcon(guild.id, guild.icon, 64);
    const card    = document.createElement('div');
    card.className = `server-card${guild.botPresent ? '' : ' no-bot'}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', guild.botPresent ? '0' : '-1');
    card.setAttribute('aria-label', guild.name);

    card.innerHTML = `
      <div class="server-icon">
        ${iconUrl
          ? `<img src="${iconUrl}" alt="${guild.name}" loading="lazy" />`
          : `<span aria-hidden="true">${initials(guild.name)}</span>`}
      </div>
      <div class="server-name">${escHtml(guild.name)}</div>
      ${guild.botPresent
        ? `<span class="badge badge-accent server-tag">Ruby FY ✓</span>`
        : `<span class="no-bot-notice">Ruby FY não está neste servidor</span>`}
    `;

    if (guild.botPresent) {
      const go = () => { window.location.href = `/servers/${guild.id}`; };
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(); });
    }

    grid.appendChild(card);
  }
})();

// ── Helpers ─────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
