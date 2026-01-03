// layout.js (single source of truth)
(function () {
  // Internal guards to prevent duplicate global listeners
  let __layout_global_keydown_added = false;
  let __layout_resize_timeout = null;
  let __layout_global_click_added = false;
  let __layout_more_click_added = false;
  const PAGES_TO_SKIP = [/^login\.html$/i];

  // Prevent flash of legacy back/menu buttons before this script runs.
  // We inject a tiny stylesheet that hides common per-page back/menu
  // selectors immediately. It will be removed once injectLayout() has
  // finished so our injected controls can appear normally.
  (function preventFlash() {
    if (document.getElementById('layout-temp-style')) return;
    const css = `
      /* Prevent flash-of-unstyled-content: hide legacy headers/navs and
         back/menu buttons until this script adds .has-site-layout */
      body:not(.has-site-layout) .top-header,
      body:not(.has-site-layout) .header,
      body:not(.has-site-layout) .bottom-nav,
      body:not(.has-site-layout) .page-nav,
      body:not(.has-site-layout) header:not(.site-header),
      body:not(.has-site-layout) nav:not(.site-nav),
      /* legacy back/menu buttons and stray glyphs (but keep .back-arrow-btn for our new back button) */
      .back-btn, .back-button, button.back, a.back, .btn-back, .back, .back-arrow, .page-back, button[aria-label="Back"], .menu-btn { display: none !important; }
    `;
    try {
      const style = document.createElement('style');
      style.id = 'layout-temp-style';
      style.appendChild(document.createTextNode(css));
      (document.head || document.documentElement).appendChild(style);
    } catch (e) { /* ignore */ }
  })();
  function currentPage() {
    const p = (location.pathname || location.href || "").split("/").pop() || "dashboard.html";
    return p.split("?")[0].split("#")[0];
  }

  function shouldSkip() {
    const page = currentPage();
    return PAGES_TO_SKIP.some((re) => re.test(page));
  }

  function makeHeader(title) {
    const header = document.createElement("header");
    header.className = "site-header";

    // Pages where back button should NOT appear
    const noBackPages = ['dashboard.html', 'home.html', 'guides.html', 'earn.html', 'apps.html', 'saved.html', 'tools.html'];
    const page = currentPage();
    const showBackBtn = !noBackPages.includes(page);

    // Back button (right side, mobile only) - only on certain pages
    if (showBackBtn) {
      const backBtn = document.createElement('button');
      backBtn.className = 'back-arrow-btn';
      backBtn.setAttribute('aria-label', 'Go back');
      backBtn.type = 'button';
      backBtn.textContent = '←';
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          location.href = 'dashboard.html';
        }
      });
      header.appendChild(backBtn);
    }

    // Brand (logo + name). It will be shown/hidden via CSS media queries.
    let brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'dashboard.html';
    brand.setAttribute('aria-label', 'Home');
    const logoUrl = 'https://img1.wsimg.com/isteam/ip/e5c52ac6-7189-421d-9701-bbc6d6a027fc/SmartSelect_20241218_055052_Gallery.png';
    // Add inline width/height and border-radius so the image is small immediately
    brand.innerHTML = `<img src="${logoUrl}" alt="logo" class="brand-logo" width="28" height="28" style="width:28px;height:28px;border-radius:50%;object-fit:cover"><span class="brand-name">925 ADHD</span>`;
    brand.addEventListener('click', (e) => { e.preventDefault(); location.href = 'dashboard.html'; });

    header.appendChild(brand);
    // Add a flexible spacer so the menu button sits on the right side
    // of the header (CSS controls visibility per breakpoint).
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    spacer.style.minWidth = '8px';
    header.appendChild(spacer);
    // The mobile menu button will be appended by `injectLayout` when
    // needed. Do not append it here to avoid duplicate controls on
    // desktop.
    return header;
  }

  function createMenuButton() {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.id = 'menuBtn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.type = 'button';
    btn.textContent = '☰';
    return btn;
  }

  function makeHamburgerOverlay() {
    // Create overlay and panel for mobile hamburger menu if not present
    if (document.getElementById('hamburgerOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'hamburgerOverlay';
    overlay.className = 'hamburger-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'hamburger-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Menu');

    // Build panel content by cloning the primary nav links so menus stay in sync
    // Top header inside the panel: brand (logo + name) and a close X
    const headerRow = document.createElement('div');
    headerRow.className = 'hamburger-header';

    // Clone site brand if available so branding stays consistent
    const siteBrand = document.querySelector('.site-header .brand');
    if (siteBrand) {
      try {
        const brandClone = siteBrand.cloneNode(true);
        brandClone.classList.add('hamburger-brand');
        headerRow.appendChild(brandClone);
      } catch (e) { /* ignore clone errors */ }
    } else {
      const brandEl = document.createElement('a');
      brandEl.className = 'hamburger-brand';
      brandEl.href = 'dashboard.html';
      brandEl.setAttribute('aria-label', 'Home');
      const logoUrl = 'https://img1.wsimg.com/isteam/ip/e5c52ac6-7189-421d-9701-bbc6d6a027fc/SmartSelect_20241218_055052_Gallery.png';
      brandEl.innerHTML = `<img src="${logoUrl}" alt="logo" class="brand-logo" width="28" height="28" style="width:28px;height:28px;border-radius:50%;object-fit:cover"><span class="brand-name">925 ADHD</span>`;
      headerRow.appendChild(brandEl);
    }

    const topCloseBtn = document.createElement('button');
    topCloseBtn.id = 'topCloseMenuBtn';
    topCloseBtn.className = 'top-close-btn';
    topCloseBtn.setAttribute('aria-label', 'Close menu');
    topCloseBtn.type = 'button';
    topCloseBtn.textContent = '✕';
    headerRow.appendChild(topCloseBtn);

    panel.appendChild(headerRow);

    const heading = document.createElement('h3');
    heading.textContent = 'Menu';
    heading.style.display = 'none';
    panel.appendChild(heading);

    // Build a focused menu with only the requested items
    const menuItems = [
      { href: 'beginnerlist.html', text: '🚀 Beginner List' },
      { href: 'adhdhacks.html', text: '🧠 ADHD Hacks' },
      { href: 'ai-playground.html', text: '🤖 AI Playground' },
      { href: 'aimadesimple.html', text: '✨ AI Made Simple' },
      { href: 'crypto-made-simple.html', text: '🪙 Crypto Made Simple' },
      { href: 'playlist.html', text: '🎵 Motivation Playlist' },
      { href: 'feedback.html', text: '💬 Feedback' }
    ];

    menuItems.forEach((mi) => {
      const a = document.createElement('a');
      a.href = mi.href;
      a.className = 'nav-item';
      // Create label span only (no emoji/icon)
      const label = document.createElement('span');
      label.textContent = mi.text;
      a.appendChild(label);
      a.style.display = 'flex';
      a.style.alignItems = 'center';
      a.style.gap = '12px';
      a.style.padding = '12px 8px';
      a.style.marginBottom = '8px';
      a.style.borderRadius = '8px';
      a.style.width = '100%';
      panel.appendChild(a);
    });

    panel.insertAdjacentHTML('beforeend', '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:10px 0">');
    const closeBtn = document.createElement('button');
    closeBtn.id = 'closeMenuBtn';
    closeBtn.className = 'logout-btn';
    closeBtn.style.display = 'block';
    closeBtn.style.width = '100%';
    closeBtn.setAttribute('aria-label', 'Logout');
    closeBtn.textContent = 'Logout';
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Wire up open/close handlers
    const menuBtn = document.getElementById('menuBtn');
    function openMenu() { overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); }
    function closeMenu() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.classList.remove('menu-open'); }
    if (menuBtn) menuBtn.addEventListener('click', (e) => { e.preventDefault(); openMenu(); });
    // Bottom logout button: best-effort logout flow.
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        // Close the menu UI first
        closeMenu();
        // If a global logout handler exists, prefer that
        if (typeof window.performLogout === 'function') {
          window.performLogout();
          return;
        }
        // If there's a logout form on the page, submit it
        const logoutForm = document.querySelector('form#logout');
        if (logoutForm) {
          logoutForm.submit();
          return;
        }
        // Clear common auth keys (best-effort, non-destructive)
        ['authToken','token','accessToken','user','session','auth'].forEach(k => {
          try { localStorage.removeItem(k); } catch (er) {}
          try { sessionStorage.removeItem(k); } catch (er) {}
        });
        // Redirect to login page as fallback
        location.href = 'login.html';
      } catch (err) { /* ignore */ }
    });
    // top-close button (in header) should also close
    const topClose = document.getElementById('topCloseMenuBtn');
    if (topClose) topClose.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });

    // Add a single global Escape handler once that will close any open overlay.
    if (!__layout_global_keydown_added) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const ov = document.getElementById('hamburgerOverlay');
          if (ov && ov.classList.contains('open')) {
            ov.classList.remove('open');
            ov.setAttribute('aria-hidden','true');
            document.body.classList.remove('menu-open');
          }
        }
      });
      __layout_global_keydown_added = true;
    }

    // Add a single global click handler that opens the overlay when any
    // `.menu-btn` is clicked. This handles timing issues where the per-button
    // listener might not have been attached yet.
    if (!__layout_global_click_added) {
      document.addEventListener('click', (e) => {
        try {
          const mb = e.target && e.target.closest && e.target.closest('.menu-btn');
          if (mb) {
            const ov = document.getElementById('hamburgerOverlay');
            if (ov) {
              ov.classList.add('open');
              ov.setAttribute('aria-hidden','false');
              document.body.classList.add('menu-open');
            }
          }
        } catch (er) { /* ignore */ }
      });
      __layout_global_click_added = true;
    }
  }

  function makeNav() {
    const nav = document.createElement("nav");
    nav.className = "site-nav";
    // Only include the 'More' tab on larger (desktop) widths. On small
    // screens the header hamburger/overlay is used instead to avoid
    // duplicate controls in the bottom nav.
    const includeMore = (typeof window !== 'undefined' && window.innerWidth >= 900);
    nav.innerHTML = `
      <div class="nav-items">
        <a href="dashboard.html" class="nav-item"><span class="icon">🏠</span><span>Home</span></a>
        <a href="guides.html" class="nav-item"><span class="icon">📖</span><span>Guides</span></a>
        <a href="earn.html" class="nav-item"><span class="icon">💰</span><span>Earn</span></a>
        <a href="apps.html" class="nav-item"><span class="icon">📱</span><span>Apps</span></a>
        <a href="favorites.html" class="nav-item"><span class="icon">❤️</span><span>Saved</span></a>
        <a href="tools.html" class="nav-item"><span class="icon">🛠️</span><span>Tools</span></a>
        ${includeMore ? `<!-- 'More' opens a dropdown on desktop (falls back to side panel on mobile) -->
        <a href="#" class="nav-item nav-more"><span class="icon"><svg width="18" height="14" viewBox="0 0 18 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect x="0" y="1" width="18" height="2" rx="1" fill="#fff"></rect><rect x="0" y="6" width="18" height="2" rx="1" fill="#fff"></rect><rect x="0" y="11" width="18" height="2" rx="1" fill="#fff"></rect></svg></span><span>More ▾</span></a>` : ''}
      </div>
    `;
    return nav;
  }

  function markActive(nav) {
    const page = currentPage().toLowerCase();
    nav.querySelectorAll(".nav-item").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
      a.classList.toggle("active", href === page);
    });
    // Remove any stray menu glyphs that accidentally ended up inside the nav
    // (some pages included a literal '☰' button or element). Clean them so
    // the nav shows only the intended items.
    try {
      // Remove literal '☰' nodes and stray .menu-btn elements
      nav.querySelectorAll('*').forEach((el) => {
        if (!el) return;
        const text = (el.textContent || '').trim();
        if (text === '☰' && !el.closest('.site-header')) el.remove();
        if (el.classList && el.classList.contains('menu-btn') && !el.closest('.site-header')) el.remove();
      });

      // Remove any images or inline svgs accidentally placed inside nav items
      nav.querySelectorAll('.nav-item img, .nav-item svg').forEach((n) => n.remove());

      // Remove any unexpected direct children inside .nav-items (keep only .nav-item)
      const container = nav.querySelector('.nav-items');
      if (container) {
        Array.from(container.children).forEach((child) => {
          if (!child.classList || !child.classList.contains('nav-item')) {
            // remove stray element
            child.remove();
          }
        });
      }

      // Remove any element inside the nav that has a background-image set
      nav.querySelectorAll('.nav-item *').forEach((el) => {
        try {
          const bg = window.getComputedStyle(el).backgroundImage || '';
          if (bg && bg !== 'none' && !el.closest('.site-header')) el.remove();
        } catch (e) {}
      });
    } catch (e) { /* ignore */ }
  }

  function removeDuplicates() {
    // Remove any existing injected headers/navs to prevent stacking
    document.querySelectorAll(".site-header").forEach((el, idx) => { if (idx > 0) el.remove(); });
    document.querySelectorAll(".site-nav").forEach((el, idx) => { if (idx > 0) el.remove(); });

    // If pages had old placeholders, remove them cleanly
    const oldHeaderPlaceholder = document.getElementById("site-header");
    if (oldHeaderPlaceholder && !oldHeaderPlaceholder.classList.contains("site-header")) oldHeaderPlaceholder.remove();

    const oldNavPlaceholder = document.getElementById("site-nav");
    if (oldNavPlaceholder && !oldNavPlaceholder.classList.contains("site-nav")) oldNavPlaceholder.remove();

    // Remove or hide common per-page header/bottom-nav elements that conflict
    const pageHeaderSelectors = ['header.header', '.header', '.top-header', '.page-header'];
    const pageNavSelectors = ['nav.bottom-nav', '.bottom-nav', '.page-nav'];

    pageHeaderSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
    pageNavSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Clear any leftover menu-open class to ensure header shows correctly
    document.body.classList.remove('menu-open');

    // Remove stray `.menu-btn` instances that live outside the injected
    // header (these came from page-specific markup and caused icons inside
    // the nav). Keep the header's menu button intact.
    document.querySelectorAll('.menu-btn').forEach((b) => {
      if (!b.closest('.site-header')) b.remove();
    });
  }

  function ensureLayoutCSS() {
    // If the shared layout stylesheet isn't linked, add it so styles match across pages
    const href = 'assets/layout.css';
    const found = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(l => (l.getAttribute('href')||'').endsWith(href));
    if (!found) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  function findPageTitle() {
    // Prefer explicit data attribute, then page-specific title elements, then document.title
    const data = document.body.getAttribute('data-page-title');
    if (data) return data;
    const selectors = ['.page-title', 'header h1', 'header h2', 'h1', 'h2', '.title'];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return document.title || '925 ADHD';
  }

  function injectLayout() {
    if (shouldSkip()) return;

    removeDuplicates();
    // Ensure shared layout stylesheet is present so the injected elements look consistent
    ensureLayoutCSS();

    // Clear any stale mobile menu state (keep DOM elements present; CSS controls visibility)
    document.body.classList.remove('menu-open');

    // Header
    if (!document.querySelector(".site-header")) {
      const title = findPageTitle();
      document.body.insertBefore(makeHeader(title), document.body.firstChild);
    }

    // Ensure the header contains a menu button only on small screens.
    // On desktop we remove the button so 'More' in the nav is the only
    // control for additional items.
    const header = document.querySelector('.site-header');
    if (header) {
      try {
        const hasBtn = !!header.querySelector('.menu-btn');
        if (window.innerWidth < 900) {
          if (!hasBtn) header.insertBefore(createMenuButton(), header.firstChild);
        } else {
          // Remove any header menu button on desktop widths
          const existingBtn = header.querySelector('.menu-btn');
          if (existingBtn) existingBtn.remove();
        }
      } catch (e) { /* ignore */ }
    }

    // Nav
    if (!document.querySelector(".site-nav")) {
      const nav = makeNav();
      document.body.appendChild(nav);
      markActive(nav);
      // Wire the nav 'More' button (placed with tabs) to open the hamburger overlay
      try {
        const more = document.querySelector('.site-nav .nav-more');
        if (more) {
          // On small screens the bottom nav appears; remove the 'More'
          // tab there to avoid a duplicate control (mobile uses the
          // header menu button / overlay). On desktop keep and wire it.
          if (window.innerWidth < 900) {
            more.remove();
          } else {
            // Create an anchored dropdown for desktop. On small screens
            // fall back to opening the full hamburger overlay/panel.
            more.addEventListener('click', (e) => {
              e.preventDefault();
              const ov = document.getElementById('hamburgerOverlay');
              // Mobile / small screens: use overlay panel
              if (window.innerWidth < 900 && ov) {
                ov.classList.add('open');
                ov.setAttribute('aria-hidden','false');
                document.body.classList.add('menu-open');
                return;
              }

              // Desktop: toggle an anchored dropdown under the 'More' tab
              const existing = document.querySelector('.more-dropdown');
              if (existing) { existing.remove(); return; }

              const rect = more.getBoundingClientRect();
              const dd = document.createElement('div');
              dd.className = 'more-dropdown';
              dd.setAttribute('role','menu');
              // Inline minimal styling so it appears anchored below the tab.
              dd.style.position = 'absolute';
              dd.style.minWidth = '220px';
              dd.style.left = (rect.left + window.scrollX) + 'px';
              dd.style.top = (rect.bottom + window.scrollY + 8) + 'px';
              // Use the same background/text/shadow as the mobile hamburger
              // panel when available so the desktop dropdown matches mobile.
              try {
                const panelEl = document.querySelector('.hamburger-panel');
                if (panelEl) {
                  const cs = window.getComputedStyle(panelEl);
                  dd.style.background = cs.backgroundColor || 'white';
                  dd.style.color = cs.color || '#111';
                  dd.style.boxShadow = cs.boxShadow || '0 6px 18px rgba(0,0,0,0.12)';
                } else {
                  dd.style.background = 'white';
                  dd.style.color = '#111';
                  dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
                }
              } catch (e) {
                dd.style.background = 'white';
                dd.style.color = '#111';
                dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
              }
              dd.style.borderRadius = '8px';
              dd.style.padding = '8px';
              dd.style.zIndex = 99999;

              // Menu items (same curated list as overlay)
              const items = [
                { href: 'beginnerlist.html', text: '🚀 Beginner List' },
                { href: 'adhdhacks.html', text: '🧠 ADHD Hacks' },
                { href: 'ai-playground.html', text: '🤖 AI Playground' },
                { href: 'aimadesimple.html', text: '✨ AI Made Simple' },
                { href: 'crypto-made-simple.html', text: '🪙 Crypto Made Simple' },
                { href: 'playlist.html', text: '🎵 Motivation Playlist' },
                { href: 'feedback.html', text: '💬 Feedback' }
              ];
              items.forEach(mi => {
                const a = document.createElement('a');
                a.href = mi.href;
                a.textContent = mi.text;
                a.style.display = 'block';
                a.style.padding = '8px 10px';
                a.style.borderRadius = '6px';
                a.style.color = 'inherit';
                a.style.textDecoration = 'none';
                a.addEventListener('mouseenter', () => a.style.background = 'rgba(0,0,0,0.04)');
                a.addEventListener('mouseleave', () => a.style.background = 'transparent');
                dd.appendChild(a);
              });

              // Divider + Logout action at bottom
              const hr = document.createElement('hr');
              hr.style.border = 'none';
              hr.style.borderTop = '1px solid rgba(0,0,0,0.06)';
              hr.style.margin = '8px 0';
              dd.appendChild(hr);

              const logout = document.createElement('button');
              logout.type = 'button';
              logout.textContent = 'Logout';
              logout.style.display = 'block';
              logout.style.width = '100%';
              logout.style.padding = '8px 10px';
              logout.style.border = 'none';
              // Make the logout pill use the brand teal and white text
              logout.style.background = '#56C3AE';
              logout.style.color = '#ffffff';
              logout.style.borderRadius = '8px';
              logout.style.textAlign = 'left';
              logout.style.cursor = 'pointer';
              logout.style.fontWeight = '600';
              logout.style.boxSizing = 'border-box';
              logout.style.marginTop = '4px';
              // subtle hover effect
              logout.addEventListener('mouseenter', () => { logout.style.filter = 'brightness(0.95)'; });
              logout.addEventListener('mouseleave', () => { logout.style.filter = 'none'; });
              logout.addEventListener('click', (evt) => {
                evt.preventDefault();
                dd.remove();
                try {
                  if (typeof window.performLogout === 'function') { window.performLogout(); return; }
                  const logoutForm = document.querySelector('form#logout');
                  if (logoutForm) { logoutForm.submit(); return; }
                  ['authToken','token','accessToken','user','session','auth'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} try{ sessionStorage.removeItem(k);}catch(e){} });
                  location.href = 'login.html';
                } catch (er) {}
              });
              dd.appendChild(logout);

              document.body.appendChild(dd);

              // Close dropdown on outside click or Escape
              const onDocClick = (ev) => {
                if (!dd.contains(ev.target) && !more.contains(ev.target)) { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey);
                }
              };
              const onKey = (ev) => { if (ev.key === 'Escape') { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); } };
              setTimeout(() => document.addEventListener('click', onDocClick), 0);
              document.addEventListener('keydown', onKey);
            });
          }
        }
      } catch (e) { /* ignore */ }
    } else {
      markActive(document.querySelector(".site-nav"));
    }

    // Ensure the 'More' tab exists and is wired correctly on desktop
    // even if the nav was created earlier (handles resize/hard-refresh).
    try {
      const navEl = document.querySelector('.site-nav');
      if (navEl) {
        let more = navEl.querySelector('.nav-more');
        // If on small screens, ensure 'More' is removed (mobile uses header hamburger)
        if (window.innerWidth < 900) {
          if (more) more.remove();
        } else {
          // Create the 'More' tab if missing
          if (!more) {
            const svg = '<svg width="18" height="14" viewBox="0 0 18 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect x="0" y="1" width="18" height="2" rx="1" fill="#fff"></rect><rect x="0" y="6" width="18" height="2" rx="1" fill="#fff"></rect><rect x="0" y="11" width="18" height="2" rx="1" fill="#fff"></rect></svg>';
            more = document.createElement('a');
            more.href = '#';
            more.className = 'nav-item nav-more';
            more.innerHTML = '<span class="icon">' + svg + '</span><span>More ▾</span>';
            const container = navEl.querySelector('.nav-items') || navEl;
            container.appendChild(more);
          }

          // Wire click handler once
          if (!more.dataset.moreWired) {
            more.addEventListener('click', (e) => {
              e.preventDefault();
              const ov = document.getElementById('hamburgerOverlay');
              if (window.innerWidth < 900 && ov) {
                ov.classList.add('open');
                ov.setAttribute('aria-hidden','false');
                document.body.classList.add('menu-open');
                return;
              }

              const existing = document.querySelector('.more-dropdown');
              if (existing) { existing.remove(); return; }

              const rect = more.getBoundingClientRect();
              const dd = document.createElement('div');
              dd.className = 'more-dropdown';
              dd.setAttribute('role','menu');
              dd.style.position = 'absolute';
              dd.style.minWidth = '220px';
              dd.style.left = (rect.left + window.scrollX) + 'px';
              dd.style.top = (rect.bottom + window.scrollY + 8) + 'px';
              try {
                const panelEl = document.querySelector('.hamburger-panel');
                if (panelEl) {
                  const cs = window.getComputedStyle(panelEl);
                  dd.style.background = cs.backgroundColor || 'white';
                  dd.style.color = cs.color || '#111';
                  dd.style.boxShadow = cs.boxShadow || '0 6px 18px rgba(0,0,0,0.12)';
                } else {
                  dd.style.background = 'white';
                  dd.style.color = '#111';
                  dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
                }
              } catch (e) {
                dd.style.background = 'white';
                dd.style.color = '#111';
                dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
              }
              dd.style.borderRadius = '8px';
              dd.style.padding = '8px';
              dd.style.zIndex = 99999;

              const items = [
                  { href: 'beginnerlist.html', text: '🚀 Beginner List' },
                  { href: 'adhdhacks.html', text: '🧠 ADHD Hacks' },
                  { href: 'aimadesimple.html', text: '✨ AI Made Simple' },
                  { href: 'crypto-made-simple.html', text: '🪙 Crypto Made Simple' },
                  { href: 'playlist.html', text: '🎵 Motivation Playlist' },
                  { href: 'feedback.html', text: '💬 Feedback' }
                ];
              items.forEach(mi => {
                const a = document.createElement('a');
                a.href = mi.href;
                a.textContent = mi.text;
                a.style.display = 'block';
                a.style.padding = '8px 10px';
                a.style.borderRadius = '6px';
                a.style.color = 'inherit';
                a.style.textDecoration = 'none';
                a.addEventListener('mouseenter', () => a.style.background = 'rgba(0,0,0,0.04)');
                a.addEventListener('mouseleave', () => a.style.background = 'transparent');
                dd.appendChild(a);
              });

              const hr = document.createElement('hr');
              hr.style.border = 'none';
              hr.style.borderTop = '1px solid rgba(0,0,0,0.06)';
              hr.style.margin = '8px 0';
              dd.appendChild(hr);

              const logout = document.createElement('button');
              logout.type = 'button';
              logout.textContent = 'Logout';
              logout.style.display = 'block';
              logout.style.width = '100%';
              logout.style.padding = '8px 10px';
              logout.style.border = 'none';
              logout.style.background = '#56C3AE';
              logout.style.color = '#ffffff';
              logout.style.borderRadius = '8px';
              logout.style.textAlign = 'left';
              logout.style.cursor = 'pointer';
              logout.style.fontWeight = '600';
              logout.style.boxSizing = 'border-box';
              logout.style.marginTop = '4px';
              logout.addEventListener('mouseenter', () => { logout.style.filter = 'brightness(0.95)'; });
              logout.addEventListener('mouseleave', () => { logout.style.filter = 'none'; });
              logout.addEventListener('click', (evt) => {
                evt.preventDefault();
                dd.remove();
                try {
                  if (typeof window.performLogout === 'function') { window.performLogout(); return; }
                  const logoutForm = document.querySelector('form#logout');
                  if (logoutForm) { logoutForm.submit(); return; }
                  ['authToken','token','accessToken','user','session','auth'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} try{ sessionStorage.removeItem(k);}catch(e){} });
                  location.href = 'login.html';
                } catch (er) {}
              });
              dd.appendChild(logout);

              document.body.appendChild(dd);

              const onDocClick = (ev) => {
                if (!dd.contains(ev.target) && !more.contains(ev.target)) { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey);
                }
              };
              const onKey = (ev) => { if (ev.key === 'Escape') { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); } };
              setTimeout(() => document.addEventListener('click', onDocClick), 0);
              document.addEventListener('keydown', onKey);
            });
            more.dataset.moreWired = '1';
          }
        }
      }
    } catch (e) { /* ignore wiring errors */ }

    // Add a delegated click handler for `.nav-more` as a robust fallback
    // in case per-element listeners don't attach due to timing or DOM swaps.
    try {
      if (!__layout_more_click_added) {
        document.addEventListener('click', (ev) => {
          try {
            const more = ev.target && ev.target.closest && ev.target.closest('.nav-more');
            if (!more) return;
            ev.preventDefault();
            // If mobile width, open overlay
            const ov = document.getElementById('hamburgerOverlay');
            if (window.innerWidth < 900 && ov) {
              ov.classList.add('open');
              ov.setAttribute('aria-hidden','false');
              document.body.classList.add('menu-open');
              return;
            }

            // Toggle desktop anchored dropdown (same behavior as inline handler)
            const existing = document.querySelector('.more-dropdown');
            if (existing) { existing.remove(); return; }

            const rect = more.getBoundingClientRect();
            const dd = document.createElement('div');
            dd.className = 'more-dropdown';
            dd.setAttribute('role','menu');
            dd.style.position = 'absolute';
            dd.style.minWidth = '220px';
            dd.style.left = (rect.left + window.scrollX) + 'px';
            dd.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            try {
              const panelEl = document.querySelector('.hamburger-panel');
              if (panelEl) {
                const cs = window.getComputedStyle(panelEl);
                dd.style.background = cs.backgroundColor || 'white';
                dd.style.color = cs.color || '#111';
                dd.style.boxShadow = cs.boxShadow || '0 6px 18px rgba(0,0,0,0.12)';
              } else {
                dd.style.background = 'white';
                dd.style.color = '#111';
                dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
              }
            } catch (e) {
              dd.style.background = 'white';
              dd.style.color = '#111';
              dd.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            }
            dd.style.borderRadius = '8px';
            dd.style.padding = '8px';
            dd.style.zIndex = 99999;

            const items = [
              { href: 'beginnerlist.html', text: '🚀 Beginner List' },
              { href: 'adhdhacks.html', text: '🧠 ADHD Hacks' },
              { href: 'aimadesimple.html', text: '✨ AI Made Simple' },
              { href: 'crypto-made-simple.html', text: '🪙 Crypto Made Simple' },
              { href: 'playlist.html', text: '🎵 Motivation Playlist' },
              { href: 'feedback.html', text: '💬 Feedback' }
            ];
            items.forEach(mi => {
              const a = document.createElement('a');
              a.href = mi.href;
              a.textContent = mi.text;
              a.style.display = 'block';
              a.style.padding = '8px 10px';
              a.style.borderRadius = '6px';
              a.style.color = 'inherit';
              a.style.textDecoration = 'none';
              a.addEventListener('mouseenter', () => a.style.background = 'rgba(0,0,0,0.04)');
              a.addEventListener('mouseleave', () => a.style.background = 'transparent');
              dd.appendChild(a);
            });

            const hr = document.createElement('hr');
            hr.style.border = 'none';
            hr.style.borderTop = '1px solid rgba(0,0,0,0.06)';
            hr.style.margin = '8px 0';
            dd.appendChild(hr);

            const logout = document.createElement('button');
            logout.type = 'button';
            logout.textContent = 'Logout';
            logout.style.display = 'block';
            logout.style.width = '100%';
            logout.style.padding = '8px 10px';
            logout.style.border = 'none';
            logout.style.background = '#56C3AE';
            logout.style.color = '#ffffff';
            logout.style.borderRadius = '8px';
            logout.style.textAlign = 'left';
            logout.style.cursor = 'pointer';
            logout.style.fontWeight = '600';
            logout.style.boxSizing = 'border-box';
            logout.style.marginTop = '4px';
            logout.addEventListener('mouseenter', () => { logout.style.filter = 'brightness(0.95)'; });
            logout.addEventListener('mouseleave', () => { logout.style.filter = 'none'; });
            logout.addEventListener('click', (evt) => {
              evt.preventDefault();
              dd.remove();
              try {
                if (typeof window.performLogout === 'function') { window.performLogout(); return; }
                const logoutForm = document.querySelector('form#logout');
                if (logoutForm) { logoutForm.submit(); return; }
                ['authToken','token','accessToken','user','session','auth'].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} try{ sessionStorage.removeItem(k);}catch(e){} });
                location.href = 'login.html';
              } catch (er) {}
            });
            dd.appendChild(logout);

            document.body.appendChild(dd);

            const onDocClick = (ev2) => {
              if (!dd.contains(ev2.target) && !more.contains(ev2.target)) { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey);
              }
            };
            const onKey = (ev2) => { if (ev2.key === 'Escape') { dd.remove(); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); } };
            setTimeout(() => document.addEventListener('click', onDocClick), 0);
            document.addEventListener('keydown', onKey);
          } catch (er) { /* swallow delegated handler errors */ }
        });
        __layout_more_click_added = true;
      }
    } catch (e) { /* ignore */ }

    // No-op: header menu button visibility is managed above (we remove
    // it on desktop and append it only on small screens).

    // Ensure hamburger overlay exists (it's safe to create it; CSS will
    // keep it hidden on desktop). This guarantees the menu works after
    // resizes without DOM-removal race conditions.
    makeHamburgerOverlay();
    document.body.classList.add('has-site-layout');
    // Add a page-specific class (e.g. `page-guides`) so we can apply
    // per-page layout tweaks from CSS without altering page HTML.
    try {
      const p = currentPage();
      const name = (p || '').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
      if (name) document.body.classList.add('page-' + name);
    } catch (e) { /* ignore */ }

    // Remove the temporary flash-hiding stylesheet so injected controls
    // (menu button, etc.) can appear where intended after initialization.
    try {
      const temp = document.getElementById('layout-temp-style');
      if (temp) temp.remove();
    } catch (e) { /* ignore */ }
  }

  document.addEventListener("DOMContentLoaded", injectLayout);
  // Re-run layout injection on resize (debounced) so hamburger/brand update
  window.addEventListener('resize', () => {
    clearTimeout(__layout_resize_timeout);
    __layout_resize_timeout = setTimeout(() => {
      try { injectLayout(); } catch (e) { /* swallow */ }
    }, 140);
  });
})();
