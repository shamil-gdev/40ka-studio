/* 40ka — the page reacts to the scroll:
   - soft inertia for the mouse wheel (Lenis; touch screens keep their native scroll)
   - section headings rise line by line from under a mask
   - «О студии» is read with the visitor: words turn from grey to ink as the text passes
   - the photos in «Работы» move a little slower than their frames (depth)
   - the service cards stack: each one slides over the previous, which steps back */
(function () {
  var body = document.body, html = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 1. inertia ---------- */
  var lenis = null;
  // only for a mouse wheel: touch screens keep their own native momentum scroll (and iOS must not be fought)
  var wheel = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduce && wheel && window.Lenis) {
    lenis = new window.Lenis({ lerp: .095, wheelMultiplier: .95, smoothWheel: true, syncTouch: false });
    html.classList.add('wheel-smooth');   // (not a 'lenis…' name: Lenis strips those from <html>)
    var stopped = false;
    (function raf(t) {
      // hold still while the intro plays or the menu is open
      var hold = body.style.overflow === 'hidden' || body.classList.contains('menu-open');
      if (hold !== stopped) { stopped = hold; if (hold) lenis.stop(); else lenis.start(); }
      lenis.raf(t);
      requestAnimationFrame(raf);
    })(performance.now());
    // in-page links glide too (the menu closes first, then the page moves)
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      var id = a.getAttribute('href'), el = id === '#top' || id === '#' ? 0 : document.querySelector(id);
      if (el === null) return;
      e.preventDefault();
      requestAnimationFrame(function () {
        if (stopped) { stopped = false; lenis.start(); }
        lenis.scrollTo(el, { duration: 1.2, force: true });
        if (id !== '#top' && id !== '#') history.replaceState(null, '', id);
      });
    });
    window.__lenis = lenis;
  }
  // «Наверх ↑» in the footer: on touch screens the page glides up too instead of jumping
  if (!lenis) document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.foot__top');
    if (!a) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- 2. headings rise line by line ---------- */
  var heads = Array.prototype.slice.call(document.querySelectorAll('.section__head h2, .nest__side h2, .contact h2'));
  function splitLines(h) {
    if (h.getAttribute('data-split')) return;
    var text = h.textContent.replace(/\s+/g, ' ').trim();
    h.setAttribute('aria-label', text);
    h.textContent = '';
    var words = text.split(' ').map(function (w) { var s = document.createElement('span'); s.textContent = w + ' '; s.style.display = 'inline-block'; h.appendChild(s); return s; });
    var lines = [], top = null;
    words.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });
    h.textContent = '';
    lines.forEach(function (ws, i) {
      var l = document.createElement('span'); l.className = 'hl'; l.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span'); inner.textContent = ws.join('').trim(); inner.style.transitionDelay = (i * .1) + 's';
      l.appendChild(inner); h.appendChild(l);
    });
    h.setAttribute('data-split', '1');
  }
  if (!reduce && 'IntersectionObserver' in window) {
    var ready = function () {
      heads.forEach(splitLines);
      var hio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('h-in'); hio.unobserve(e.target); } });
      }, { threshold: .6 });
      heads.forEach(function (h) { h.classList.add('h-mask'); hio.observe(h); });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready); else ready();
  }

  /* ---------- 3. «О студии»: each paragraph is "read" once as it arrives — the ink runs through its words
     (CSS transitions with staggered delays, nothing runs per frame, and nothing stays grey) ---------- */
  var readBox = document.querySelector('.about__text');
  if (readBox && !reduce && 'IntersectionObserver' in window) {
    var paras = Array.prototype.slice.call(readBox.querySelectorAll('p'));
    paras.forEach(function (p) {
      var parts = p.textContent.split(/(\s+)/), n = 0;
      p.textContent = '';
      parts.forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { p.appendChild(document.createTextNode(w)); return; }
        var sp = document.createElement('span'); sp.className = 'rw'; sp.textContent = w;
        sp.style.transitionDelay = (Math.min(n, 60) * 28) + 'ms'; n++;
        p.appendChild(sp);
      });
    });
    readBox.classList.add('reading');
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('read'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -18% 0px', threshold: .3 });
    paras.forEach(function (p) { rio.observe(p); });
  }

  /* ---------- 4. depth in the work photos ---------- */
  // on touch screens the page scrolls on its own thread: effects moved by script would lag behind it, so they stay still
  var touch = !wheel;
  var photos = reduce || touch ? [] : Array.prototype.slice.call(document.querySelectorAll('.work figure'));
  function depth(vh) {
    photos.forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var k = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
      f.style.setProperty('--pp', k.toFixed(3));
    });
  }

  /* ---------- 5. the cards step back as the next one covers them ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.cards .card'));
  cards.forEach(function (c, i) { c.style.setProperty('--i', i); });
  function stack() {
    if (reduce || touch) return;
    for (var i = 0; i < cards.length - 1; i++) {
      var a = cards[i].getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
      var k = clamp(1 - (b.top - a.top) / Math.max(1, a.height), 0, 1);
      cards[i].style.setProperty('--cover', k.toFixed(3));
    }
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    depth(vh); stack();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
})();
