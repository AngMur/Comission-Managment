/**
 * NOVU Header Web Component
 *
 * Uso:
 *   <script src="novu-header.js" defer></script>
 *   <novu-header></novu-header>
 *
 * Atributos opcionales:
 *   home-href    → link del logo  (default: "/selector")
 *   logout-href  → redirección    (default: "/")
 */
class NovuHeader extends HTMLElement {

  get homeHref()   { return this.getAttribute('home-href')   || '/selector'; }
  get logoutHref() { return this.getAttribute('logout-href') || '/'; }

  connectedCallback() {
    this._injectGlobals();
    this._renderHeader();
    this._bindEvents();
    this._loadUser();
  }

  /* ── 1. GLOBALS ─────────────────────────────────────────────────────────── */
  _injectGlobals() {
    if (document.getElementById('novu-global-styles')) return;

    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Space+Mono:wght@700&display=swap';
    document.head.appendChild(font);

    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    const style = document.createElement('style');
    style.id = 'novu-global-styles';
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0f1e1e; min-height: 100vh;
        font-family: 'Nunito', sans-serif; color: #ffffff; overflow-x: hidden;
      }
      body::before {
        content: ''; position: fixed; inset: 0;
        background:
          radial-gradient(circle at 20% 50%, rgba(96,166,30,0.07) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(96,166,30,0.05) 0%, transparent 50%),
          linear-gradient(135deg, #0f1e1e 0%, #162828 50%, #0f1e1e 100%);
        z-index: -1; pointer-events: none;
      }
      #novu-beam {
        position: fixed; top: 0; right: 10%; width: 260px; height: 100vh;
        background: linear-gradient(180deg, rgba(96,166,30,0.07) 0%, transparent 65%);
        transform: skewX(-8deg); pointer-events: none; z-index: 0;
      }
      #novu-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
      .novu-star {
        position: absolute; border-radius: 50%;
        animation: novuTwinkle var(--dur) ease-in-out infinite alternate;
      }
      @keyframes novuTwinkle {
        from { opacity: 0.1; transform: scale(1); }
        to   { opacity: 0.8; transform: scale(1.5); }
      }
      #novu-header {
        position: relative; z-index: 2;
        display: flex; align-items: center; justify-content: space-between;
        padding: 2rem 4rem 1.4rem;
        border-bottom: 1px solid rgba(96,166,30,0.15);
      }
      #novu-logo {
        font-family: 'Space Mono', monospace;
        font-size: clamp(3.5rem, 8vw, 6rem);
        font-weight: 700; line-height: 1; letter-spacing: -3px;
        color: #ffffff; text-shadow: 0 0 60px rgba(96,166,30,0.3);
        display: inline-block; cursor: pointer;
        transition: color 0.2s, text-shadow 0.2s;
        position: relative; text-decoration: none;
      }
      #novu-logo::after {
        content: ''; position: absolute; bottom: 3px; left: 0; right: 0; height: 4px;
        background: linear-gradient(90deg, #60a61e, #7bc42a); border-radius: 2px;
        transform: scaleX(0); transform-origin: left;
        transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      }
      #novu-logo:hover { color: #7bc42a; text-shadow: 0 0 40px rgba(96,166,30,0.4); }
      #novu-logo:hover::after { transform: scaleX(1); }
      #novu-logo .dot { color: #60a61e; }
      #novu-mascot { animation: novuFloat 4s ease-in-out infinite; cursor: pointer; position: relative; }
      #novu-mascot.menu-open { animation: none; }
      #novu-mascot:hover .novu-unicorn-wrap { filter: brightness(1.15); }
      @keyframes novuFloat {
        0%,100% { transform: translateY(0); }
        50%      { transform: translateY(-14px); }
      }
      .novu-unicorn-wrap {
        position: relative;
        width: clamp(75px, 8vw, 110px); height: clamp(75px, 8vw, 110px);
      }
      .novu-glow-bubble {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
        width: 80%; height: 80%; border-radius: 50%;
        background: radial-gradient(circle, rgba(74,133,24,0.5) 0%, transparent 70%);
        filter: blur(12px);
      }
      .novu-svg {
        position: relative; z-index: 1; width: 100%; height: 100%;
        filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
      }
      #novu-user-menu {
        position: absolute; top: calc(100% + 14px); right: 0;
        width: 260px; background: #162828;
        border: 1px solid rgba(96,166,30,0.25); border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,166,30,0.08) inset;
        overflow: hidden; z-index: 100;
        opacity: 0; pointer-events: none;
        transform: translateY(-8px) scale(0.97); transform-origin: top right;
        transition: opacity 0.25s, transform 0.25s;
      }
      #novu-user-menu.open { opacity: 1; pointer-events: all; transform: translateY(0) scale(1); }
      #novu-user-menu::before {
        content: ''; position: absolute; top: -6px; right: 28px;
        width: 12px; height: 12px; background: #162828;
        border-left: 1px solid rgba(96,166,30,0.25); border-top: 1px solid rgba(96,166,30,0.25);
        transform: rotate(45deg);
      }
      .novu-um-info {
        padding: 1.2rem 1.2rem 1rem; display: flex; align-items: center; gap: 0.85rem;
        border-bottom: 1px solid rgba(96,166,30,0.1);
      }
      .novu-um-avatar {
        width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
        background: linear-gradient(135deg, #60a61e, #2a6040);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Space Mono', monospace; font-size: 0.85rem; font-weight: 700; color: #fff;
        border: 2px solid rgba(96,166,30,0.4);
      }
      .novu-um-name  { font-size: 0.88rem; font-weight: 900; color: #fff; line-height: 1.2; }
      .novu-um-email { font-size: 0.72rem; color: #8fada0; margin-top: 2px; word-break: break-all; }
      .novu-um-role  {
        display: inline-block; margin-top: 4px;
        background: rgba(96,166,30,0.12); border: 1px solid rgba(96,166,30,0.28);
        color: #7bc42a; font-size: 0.65rem; font-weight: 800;
        letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 100px;
      }
      .novu-um-items { padding: 0.5rem; }
      .novu-um-item {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.7rem 0.85rem; border-radius: 10px; cursor: pointer;
        transition: background 0.18s; color: #8fada0;
        font-size: 0.85rem; font-weight: 700; font-family: 'Nunito', sans-serif;
        border: none; background: transparent; width: 100%; text-align: left; text-decoration: none;
      }
      .novu-um-item i { width: 16px; text-align: center; font-size: 0.8rem; color: #60a61e; }
      .novu-um-item:hover { background: rgba(96,166,30,0.08); color: #fff; }
      .novu-um-divider { height: 1px; background: rgba(96,166,30,0.08); margin: 0.3rem 0.5rem; }
      .novu-um-logout { color: #f87171; }
      .novu-um-logout i { color: #f87171; }
      .novu-um-logout:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }
      #novu-logout-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
        z-index: 999; display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none; transition: opacity 0.25s;
      }
      #novu-logout-overlay.open { opacity: 1; pointer-events: all; }
      .novu-logout-card {
        background: #162828; border: 1px solid rgba(239,68,68,0.25);
        border-radius: 20px; padding: 2rem 1.8rem 1.6rem; width: 320px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        transform: translateY(20px) scale(0.96);
        transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
        text-align: center;
      }
      #novu-logout-overlay.open .novu-logout-card { transform: translateY(0) scale(1); }
      .novu-logout-icon {
        width: 58px; height: 58px; border-radius: 50%;
        background: rgba(239,68,68,0.1); border: 1.5px solid rgba(239,68,68,0.3);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 1.1rem; font-size: 1.4rem; color: #f87171;
      }
      .novu-logout-title { font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.4rem; }
      .novu-logout-sub   { font-size: 0.82rem; color: #8fada0; line-height: 1.55; margin-bottom: 1.6rem; }
      .novu-logout-btns  { display: flex; gap: 10px; }
      .novu-logout-btn {
        flex: 1; padding: 0.7rem 0; border-radius: 12px;
        font-family: 'Nunito', sans-serif; font-size: 0.88rem; font-weight: 800;
        cursor: pointer; border: none; transition: transform 0.18s, box-shadow 0.18s;
      }
      .novu-logout-btn:hover { transform: translateY(-2px); }
      .novu-logout-cancel  { background: #1c3030; border: 1px solid rgba(255,255,255,0.08); color: #8fada0; }
      .novu-logout-cancel:hover { background: rgba(255,255,255,0.07); color: #fff; }
      .novu-logout-confirm { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; box-shadow: 0 4px 14px rgba(220,38,38,0.35); }
      .novu-logout-confirm:hover { box-shadow: 0 8px 24px rgba(220,38,38,0.5); }
      .container { position: relative; z-index: 1; }
      @media (max-width: 640px) { #novu-header { padding: 1.2rem 1.4rem; } }
    `;
    document.head.appendChild(style);

    // Estrellas
    const starsEl = document.createElement('div');
    starsEl.id = 'novu-stars';
    const colors = ['#ffffff', '#7bc42a', '#c8e88a', '#60a61e'];
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div');
      star.className = 'novu-star';
      const size = Math.random() * 2.4 + 0.5;
      star.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};--dur:${1.5+Math.random()*3}s;animation-delay:${Math.random()*3}s;opacity:${Math.random()*0.45+0.1};`;
      starsEl.appendChild(star);
    }
    document.body.prepend(starsEl);

    const beam = document.createElement('div');
    beam.id = 'novu-beam';
    document.body.prepend(beam);
  }

  /* ── 2. RENDER ───────────────────────────────────────────────────────────── */
  _renderHeader() {
    this.innerHTML = `
      <header id="novu-header">
        <a id="novu-logo" href="${this.homeHref}"><span class="dot">NO</span>VU</a>
        <div id="novu-mascot">
          <div class="novu-unicorn-wrap">
            <div class="novu-glow-bubble"></div>
            <svg class="novu-svg" viewBox="0 0 300 360" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="152" cy="145" rx="88" ry="90" fill="#2a6040" opacity="0.9"/>
              <ellipse cx="152" cy="145" rx="80" ry="82" fill="#d6f0e0"/>
              <ellipse cx="130" cy="110" rx="20" ry="12" fill="white" opacity="0.35" transform="rotate(-20 130 110)"/>
              <polygon points="152,28 144,72 160,72" fill="#38c5f5"/>
              <polygon points="152,28 144,72 148,72" fill="#2aa8d8" opacity="0.6"/>
              <ellipse cx="152" cy="30" rx="7" ry="4" fill="#e74c3c" transform="rotate(-10 152 30)"/>
              <ellipse cx="152" cy="152" rx="52" ry="50" fill="#f8f0dc"/>
              <ellipse cx="135" cy="148" rx="7" ry="7.5" fill="#2c3e50"/>
              <ellipse cx="169" cy="148" rx="7" ry="7.5" fill="#2c3e50"/>
              <circle cx="138" cy="145" r="2.5" fill="white"/>
              <circle cx="172" cy="145" r="2.5" fill="white"/>
              <path d="M127 136 Q135 130 143 136" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <path d="M161 136 Q169 132 177 137" stroke="#8b7355" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <path d="M143 168 Q152 175 161 168" stroke="#8b7355" stroke-width="2" stroke-linecap="round" fill="none"/>
              <ellipse cx="126" cy="162" rx="9" ry="5" fill="#f0a8a8" opacity="0.5"/>
              <ellipse cx="178" cy="162" rx="9" ry="5" fill="#f0a8a8" opacity="0.5"/>
              <ellipse cx="102" cy="130" rx="14" ry="18" fill="#4a8518" transform="rotate(-15 102 130)"/>
              <ellipse cx="202" cy="130" rx="14" ry="18" fill="#4a8518" transform="rotate(15 202 130)"/>
              <rect x="100" y="218" width="104" height="95" rx="30" fill="#dce8dc"/>
              <ellipse cx="152" cy="222" rx="42" ry="14" fill="#b8d8b8"/>
              <circle cx="152" cy="265" r="14" fill="#4a8518" opacity="0.8"/>
              <path d="M146 265 A6 6 0 1 1 146 265.01" stroke="white" stroke-width="3" fill="none" stroke-dasharray="20 5"/>
              <rect x="62" y="228" width="40" height="24" rx="12" fill="#dce8dc" transform="rotate(20 62 228)"/>
              <ellipse cx="60" cy="258" rx="14" ry="14" fill="#7bc42a"/>
              <rect x="200" y="228" width="40" height="24" rx="12" fill="#dce8dc" transform="rotate(-20 240 228)"/>
              <ellipse cx="242" cy="258" rx="14" ry="14" fill="#7bc42a"/>
              <rect x="112" y="305" width="35" height="45" rx="15" fill="#dce8dc"/>
              <rect x="155" y="305" width="35" height="45" rx="15" fill="#dce8dc"/>
              <ellipse cx="129" cy="348" rx="20" ry="11" fill="#7bc42a"/>
              <ellipse cx="172" cy="348" rx="20" ry="11" fill="#7bc42a"/>
            </svg>
          </div>
          <div id="novu-user-menu">
            <div class="novu-um-info">
              <div class="novu-um-avatar" id="novu-um-avatar">…</div>
              <div>
                <div class="novu-um-name"  id="novu-um-name">Cargando...</div>
                <div class="novu-um-email" id="novu-um-email"></div>
                <span class="novu-um-role" id="novu-um-role"></span>
              </div>
            </div>
            <div class="novu-um-items">
              <a href="#" class="novu-um-item"><i class="fas fa-user"></i> Ver perfil</a>
              <a href="#" class="novu-um-item"><i class="fas fa-gear"></i> Configuración</a>
              <div class="novu-um-divider"></div>
              <button class="novu-um-item novu-um-logout" id="novu-logout-btn">
                <i class="fas fa-right-from-bracket"></i> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <div id="novu-logout-overlay">
        <div class="novu-logout-card">
          <div class="novu-logout-icon"><i class="fas fa-right-from-bracket"></i></div>
          <div class="novu-logout-title">¿Cerrar sesión?</div>
          <div class="novu-logout-sub">Tu sesión actual se terminará y serás redirigido al inicio.</div>
          <div class="novu-logout-btns">
            <button class="novu-logout-btn novu-logout-cancel"  id="novu-cancel-logout">Cancelar</button>
            <button class="novu-logout-btn novu-logout-confirm" id="novu-confirm-logout">Sí, salir</button>
          </div>
        </div>
      </div>`;
  }

  /* ── 3. EVENTS ───────────────────────────────────────────────────────────── */
  _bindEvents() {
    const mascot  = document.getElementById('novu-mascot');
    const menu    = document.getElementById('novu-user-menu');
    const overlay = document.getElementById('novu-logout-overlay');

    mascot.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      mascot.classList.toggle('menu-open', open);
    });
    document.addEventListener('click', () => {
      menu.classList.remove('open');
      mascot.classList.remove('menu-open');
    });

    document.getElementById('novu-logout-btn').addEventListener('click', () => {
      menu.classList.remove('open');
      mascot.classList.remove('menu-open');
      overlay.classList.add('open');
    });
    document.getElementById('novu-cancel-logout').addEventListener('click', () => {
      overlay.classList.remove('open');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    // Confirmar logout → llama al endpoint y redirige
    document.getElementById('novu-confirm-logout').addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', {
          method:      'POST',
          credentials: 'include'   // envía la cookie para que el servidor la elimine
        });
      } catch { /* si falla el fetch igual redirigimos */ }
      window.location.href = this.logoutHref;
    });
  }

  /* ── 4. USER INFO ────────────────────────────────────────────────────────── */
  async _loadUser() {
    try {
      // Llama a /api/auth/me con credentials:'include' para que el browser
      // envíe la cookie httpOnly automáticamente
      const res  = await fetch('/api/auth/me', { credentials: 'include' });

      // Si la sesión expiró → redirige al login
      if (res.status === 401 || res.status === 403) {
        window.location.href = this.logoutHref;
        return;
      }

      const json = await res.json();
      const user = json.data?.user || {};

      // El JWT incluye: id, username, name, picture, roleId, roleName, permissions[]
      const name     = user.name     || user.username || 'Usuario';
      const roleName = user.roleName || '';
      const email    = user.email    || user.username  || '';

      // Iniciales para el avatar (máximo 2 letras)
      const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

      document.getElementById('novu-um-avatar').textContent = initials;
      document.getElementById('novu-um-name').textContent   = name;
      document.getElementById('novu-um-email').textContent  = email;
      document.getElementById('novu-um-role').textContent   = roleName;

    } catch {
      // Fallo silencioso — muestra valores neutros
      document.getElementById('novu-um-avatar').textContent = 'NU';
      document.getElementById('novu-um-name').textContent   = 'NOVU User';
      document.getElementById('novu-um-email').textContent  = '';
      document.getElementById('novu-um-role').textContent   = '';
    }
  }
}


customElements.define('novu-header', NovuHeader);
