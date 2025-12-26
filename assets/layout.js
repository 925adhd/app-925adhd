// layout.js (single source of truth)
(function () {
  const PAGES_TO_SKIP = [/^login\.html$/i];

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

    const back = document.createElement("a");
    back.className = "back-btn";
    back.href = "#";
    back.setAttribute("aria-label", "Back");
    back.textContent = "←";
    back.addEventListener("click", (e) => {
      e.preventDefault();
      if (history.length > 1) history.back();
      else location.href = "dashboard.html";
    });

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = title || document.title || "925 ADHD";

    header.appendChild(back);
    header.appendChild(t);
    return header;
  }

  function makeNav() {
    const nav = document.createElement("nav");
    nav.className = "site-nav";
    nav.innerHTML = `
      <div class="nav-items">
        <a href="dashboard.html" class="nav-item"><span class="icon">🏠</span><span>Home</span></a>
        <a href="guides.html" class="nav-item"><span class="icon">📖</span><span>Guides</span></a>
        <a href="earn.html" class="nav-item"><span class="icon">💰</span><span>Earn</span></a>
        <a href="apps.html" class="nav-item"><span class="icon">📱</span><span>Apps</span></a>
        <a href="favorites.html" class="nav-item"><span class="icon">❤️</span><span>Saved</span></a>
        <a href="tools.html" class="nav-item"><span class="icon">🛠️</span><span>Tools</span></a>
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

    // Header
    if (!document.querySelector(".site-header")) {
      const title = findPageTitle();
      document.body.insertBefore(makeHeader(title), document.body.firstChild);
    }

    // Nav
    if (!document.querySelector(".site-nav")) {
      const nav = makeNav();
      document.body.appendChild(nav);
      markActive(nav);
    } else {
      markActive(document.querySelector(".site-nav"));
    }

    // Add a body marker class for any CSS that reserves space
    document.body.classList.add('has-site-layout');
  }

  document.addEventListener("DOMContentLoaded", injectLayout);
})();
