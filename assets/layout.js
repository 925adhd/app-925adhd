// Inject a uniform header and bottom navigation into pages
(function(){
  const makeHeader = (title)=>{
    const header = document.createElement('header');
    header.className = 'site-header';

    const back = document.createElement('a');
    back.className = 'back-btn';
    back.href = '#';
    back.innerHTML = '←';
    back.addEventListener('click', (e)=>{e.preventDefault(); if(history.length>1) history.back(); else location.href='dashboard.html'});

    const h = document.createElement('div');
    h.className = 'title';
    h.textContent = title || document.title || '925 ADHD';

    header.appendChild(back);
    header.appendChild(h);
    return header;
  };

  const makeNav = ()=>{
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML = `
      <div class="nav-items">
        <a href="dashboard.html" class="nav-item" data-href="/dashboard.html"><span class="icon">🏠</span><span>Home</span></a>
        <a href="guides.html" class="nav-item" data-href="/guides.html"><span class="icon">📖</span><span>Guides</span></a>
        <a href="gigs.html" class="nav-item" data-href="/gigs.html"><span class="icon">💰</span><span>Earn</span></a>
        <a href="apps.html" class="nav-item" data-href="/apps.html"><span class="icon">📱</span><span>Apps</span></a>
        <a href="favorites.html" class="nav-item" data-href="/favorites.html"><span class="icon">❤️</span><span>Saved</span></a>
        <a href="tools.html" class="nav-item" data-href="/tools.html"><span class="icon">🛠️</span><span>Tools</span></a>
      </div>
    `;

    // mark active item reliably (works with file:// and relative paths)
    try{
      const items = nav.querySelectorAll('.nav-item');
      const current = (location.pathname || location.href || '').split('/').pop() || 'dashboard.html';
      items.forEach(a=>{
        const href = (a.getAttribute('href') || '').split('/').pop();
        if(href === current) { a.classList.add('active'); }
        else { a.classList.remove('active'); }
      });
    }catch(e){/* ignore */}

    return nav;
  };

  // Insert header into placeholder or at top of body
  const insertHeader = ()=>{
    const placeholder = document.getElementById('site-header');
    const title = document.body.getAttribute('data-page-title') || document.title;
    const header = makeHeader(title);
    if(placeholder){ placeholder.replaceWith(header); }
    else{ document.body.insertBefore(header, document.body.firstChild); }
  };

  // Insert nav into placeholder or at end of body
  const insertNav = ()=>{
    // remove any per-page bottom navs to avoid duplicate/conflicting navs
    try{
      document.querySelectorAll('nav.bottom-nav, .bottom-nav').forEach(el => el.remove());
    }catch(e){}

    const placeholder = document.getElementById('site-nav');
    const nav = makeNav();
    if(placeholder){ placeholder.replaceWith(nav); }
    else{ document.body.appendChild(nav); }

    // Align nav width/position to the page's main content on larger screens
    const alignNavToContent = () => {
      try {
        const content = document.querySelector('.main-content') || document.querySelector('main');
        const navItems = nav.querySelector('.nav-items');
        // On small screens keep full-bleed width for background and items
        if (!content || window.innerWidth < 600) {
          nav.style.left = '0';
          nav.style.width = '100vw';
          if (navItems) { navItems.style.width = ''; navItems.style.margin = ''; }
          return;
        }

        const rect = content.getBoundingClientRect();
        // Prefer the computed max-width if the page sets one (keeps consistent across pages)
        const cs = window.getComputedStyle(content);
        let targetWidth = rect.width;
        if (cs && cs.maxWidth && cs.maxWidth !== 'none') {
          const parsed = parseFloat(cs.maxWidth);
          if (!Number.isNaN(parsed) && parsed > 0) {
            // use the smaller of the parsed maxWidth and the available rect width
            targetWidth = Math.min(parsed, rect.width);
          }
        }
        // Round to integer to avoid sub-pixel layout shifts between pages
        targetWidth = Math.round(targetWidth);
        // Cap nav items to a consistent max so pages with different content widths
        // (favorites/guides) don't shift the icons. Adjust this value if you want a different max.
        const NAV_MAX = 700;
        let finalWidth = Math.min(targetWidth, NAV_MAX);

        // Force a stable width for favorites which was still moving between pages
        // (some pages set different per-page .nav-items rules). This makes
        // favorites match the capped NAV_MAX so icons don't shift.
        const currentPage = (location.pathname || location.href || '').split('/').pop() || 'dashboard.html';
        if (currentPage.toLowerCase() === 'favorites.html') {
          finalWidth = NAV_MAX;
        }

        // Keep nav background full-bleed but align the inner items container to content
        nav.style.left = '0';
        nav.style.width = '100%';
        if (navItems) {
          navItems.style.width = finalWidth + 'px';
          navItems.style.maxWidth = NAV_MAX + 'px';
          navItems.style.margin = '0 auto';
          navItems.style.boxSizing = 'border-box';
        }
      } catch (e) {
        // ignore
      }
    };

    // Initial align and on resize
    alignNavToContent();
    let resizeTimer;
    window.addEventListener('resize', ()=>{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(alignNavToContent, 120);
    });
  };

  // Ensure core layout CSS is available on pages that don't include assets/layout.css
  const injectCoreCSS = ()=>{
    if (document.getElementById('site-layout-css')) return;
    const css = `
      /* Injected header (top) */
      .site-header{position:sticky;top:0;z-index:100;background:var(--brand,#5BBFB5);padding:10px 16px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
      .site-header .title{font-weight:800;color:#0F0F0F}
      .site-header .back-btn{position:absolute;left:12px;background:none;border:none;color:#0F0F0F !important;font-size:26px !important;padding:10px 14px !important;border-radius:10px;cursor:pointer}
      .site-header .back-btn:hover{background:rgba(0,0,0,0.04)}

      .site-nav{position:fixed;bottom:0;left:0;background:var(--card,#1A1A1A);border-top:1px solid rgba(255,255,255,.1);padding:8px 0;z-index:100;box-sizing:border-box;min-height:56px;padding-top:8px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px) !important;width:100%}

      @media (max-width:599px) {
        .site-nav{width:100vw}
      }
      .site-nav .nav-items{display:flex;justify-content:space-around;align-items:center;max-width:none !important;width:100% !important;padding:0 12px !important;margin:0 !important;box-sizing:border-box}
      .site-nav .nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px !important;color:var(--text-muted,#fff);font-size:11px;font-weight:600;text-decoration:none;margin:0 !important;line-height:1 !important;justify-content:center !important;min-width:48px;box-sizing:border-box;flex:1 !important;max-width:120px;text-align:center}
      .site-nav .nav-item.active{color:var(--brand,#5BBFB5) !important}
      .site-nav .nav-item.active .icon{color:var(--brand) !important;opacity:1 !important}
      .site-nav .nav-item .icon{font-size:20px !important;display:block !important;line-height:1 !important;width:auto !important}
      .site-nav .nav-item span{display:block}
      .site-nav .nav-item:hover{color:var(--text,#fff) !important}
      .bottom-nav{display:none !important}

      /* Ensure non-active nav items are visually muted and active stands out */
      .site-nav .nav-item{color:var(--text-muted) !important;opacity:0.7 !important}
      .site-nav .nav-item *{color:inherit !important}
      .site-nav .nav-item.active{color:var(--brand) !important;opacity:1 !important}
    `;

    const style = document.createElement('style');
    style.id = 'site-layout-css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  };

  // Apply
  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      const current = (location.pathname || location.href || '').split('/').pop() || '';
      // Skip injecting header and nav on the login page entirely
      if (/login\.html$/i.test(current)) {
        return;
      }
      insertHeader();
      insertNav();
    }catch(e){ insertHeader(); insertNav(); }
  });
})();
