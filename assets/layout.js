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
  };

  // Ensure core layout CSS is available on pages that don't include assets/layout.css
  const injectCoreCSS = ()=>{
    if (document.getElementById('site-layout-css')) return;
    const css = `
      .site-nav{position:fixed;bottom:0;left:0;right:0;background:var(--card,#1A1A1A);border-top:1px solid rgba(255,255,255,.1);padding:8px 0;z-index:100;box-sizing:border-box;min-height:56px;padding-top:8px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px) !important}
      .site-nav .nav-items{display:flex;justify-content:space-around;align-items:center;max-width:600px;margin:0 auto;height:100%;justify-content:space-around !important}
      .site-nav .nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 10px !important;color:var(--text-muted,#fff);font-size:11px;font-weight:600;text-decoration:none;margin:0 !important;line-height:1 !important;justify-content:center !important;min-width:48px;box-sizing:border-box}
      .site-nav .nav-item.active{color:var(--brand,#5BBFB5) !important}
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
  document.addEventListener('DOMContentLoaded', ()=>{ insertHeader(); insertNav(); });
})();
