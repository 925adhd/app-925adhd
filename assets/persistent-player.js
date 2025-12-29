(function(){
  function isSignedIn(){
    return localStorage.getItem('signedIn') === 'true' || sessionStorage.getItem('signedIn') === 'true';
  }

  const popupUrl = 'assets/music-player.html';
  let popupWin = null;
  let lastUserGesture = false;

  function markUserGesture(){
    lastUserGesture = true;
    clearTimeout(window._ppgTimeout);
    window._ppgTimeout = setTimeout(()=> lastUserGesture = false, 2000);
  }

  document.addEventListener('pointerdown', markUserGesture, {passive:true});
  document.addEventListener('keydown', markUserGesture, {passive:true});

  function openPopup(){
    try {
      if(popupWin && !popupWin.closed) return popupWin;
      // If we recently saw a user gesture, opening a tab is allowed in most browsers
      if(!lastUserGesture) return null;
      // Open in a new tab (omit window features to avoid creating a separate window)
      popupWin = window.open(popupUrl, 'music_player');
      if(popupWin) popupWin.focus();
      return popupWin;
    } catch (e) { return null; }
  }

  function post(msg){
    const win = openPopup();
    if(!win) return;
    try { win.postMessage(msg, '*'); } catch(e){}
  }

  function insertOpenButton(){
    // Intentionally disabled: sticky "Open persistent player" button removed.
    return;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // NOTE: enabling for everyone to make debugging easier. In production
    // you can gate this with `isSignedIn()` again.
    insertOpenButton();

    // Intercept native audio play events and route them to the persistent player
    document.querySelectorAll('audio').forEach(a => {
      a.addEventListener('play', function handler(e){
        try {
          // Try to ensure popup was opened by a recent user gesture
          markUserGesture();
          // remember that user enabled persistent player so other pages enable it too
          try{ localStorage.setItem('persistent_player_enabled','true'); }catch(e){}
          this.pause();
          const src = this.currentSrc || this.querySelector('source')?.src || this.src;
          post({ type: 'play', provider: 'audio', src: src, title: document.title });
        } catch (err) { console.error('persistent-player play error', err); }
      }, { capture: true });
    });

    // Add a small button under SoundCloud iframes to open them in the persistent player
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        if(!iframe.src) return;
        // allow pages to opt-out by setting data-no-persistent or dataNoPersistent
        if (iframe.dataset.noPersistent === 'true' || iframe.hasAttribute('data-no-persistent')) return;
        if(iframe.src.includes('soundcloud.com')){
          const btn = document.createElement('button');
          btn.textContent = 'Open in persistent player';
          btn.style.cssText = 'display:inline-block;margin:8px 0;padding:8px 12px;border-radius:8px;background:#4f46e5;color:#fff;border:none;cursor:pointer;font-weight:600';
          iframe.parentNode.insertBefore(btn, iframe.nextSibling);
          btn.addEventListener('click', ()=>{
            markUserGesture();
            post({ type: 'play', provider: 'soundcloud', embed: iframe.src, title: document.title });
          });
        }
      } catch(e){ console.error('persistent-player iframe error', e); }
    });
  });

})();
