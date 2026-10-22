(function () {
  var body = document.body;
  var html = document.documentElement;
  html.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- second and later pages of a visit: no grand entrances, everything is already in place.
     A reload is a fresh start: the visitor asked to see the page again, so it arrives in full (intro included). ---- */
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var reloaded = nav ? nav.type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
  if (reloaded) body.classList.add('reloaded');
  var returning = false;
  try { returning = sessionStorage.getItem('40ka-visited') === '1' && !reloaded; sessionStorage.setItem('40ka-visited', '1'); } catch (e) {}
  if (returning) body.classList.add('returning');

  /* ---- the hero branch comes in from the right edge: its CSS draw-in starts where it enters the screen ---- */
  (function () {
    var hb = document.getElementById('heroBird'), mp = hb && hb.querySelector('.mp-branch');
    if (!mp || !mp.getTotalLength) return;
    function measure() {
      var L = mp.getTotalLength(), r = hb.getBoundingClientRect(), s = r.width / 477.5 || 1;
      var edge = (window.innerWidth - r.left) / s, n = 100, off = 0;
      for (var i = 0; i <= n; i++) { if (mp.getPointAtLength(L * i / n).x <= edge) { off = i / n; break; } }
      hb.style.setProperty('--bl', L.toFixed(0));
      hb.style.setProperty('--b0', (L * (1 - Math.max(0, off - .02))).toFixed(0));
    }
    measure();
  })();

  /* ---- intro: see assets/intro.js (pages without an intro start right away) ---- */
  if (!document.getElementById('intro')) { body.classList.remove('intro-wait'); body.classList.add('intro-skip', 'bird-ready'); }

  /* ---- page transitions into a case and back: name the photo that should morph ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="cases/"], .case-next a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var img = a.querySelector('img');
    document.querySelectorAll('[style*="view-transition-name"]').forEach(function (n) { n.style.viewTransitionName = ''; });
    if (img) img.style.viewTransitionName = 'case-cover';
  }, true);
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition || !window.navigation || !navigation.activation || !navigation.activation.from) return;
    var m = (navigation.activation.from.url || '').match(/cases\/([a-z]+)\.html/);
    if (!m || /cases\//.test(location.pathname)) return;
    // back from a case: its cover returns into the photo it came from
    var sel = '.work[href$="' + m[1] + '.html"]';
    var a = document.querySelector(sel) || document.querySelector('a[href$="cases/' + m[1] + '.html"]');
    var img = a && a.querySelector('img');
    if (!img) return;
    var fig = img.closest('[data-reveal]'); if (fig) fig.classList.add('in');
    img.style.viewTransitionName = 'case-cover';
    e.viewTransition.finished.finally(function () { img.style.viewTransitionName = ''; });
  });

  /* ---- cursor ---- */
  var cur = document.querySelector('.cursor');
  if (cur && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !(navigator.maxTouchPoints > 0) && !reduce) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf, curLabel = '';
    var curText = document.createElement('span'); cur.appendChild(curText);
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!body.classList.contains('cursor-on')) { cx = tx; cy = ty; body.classList.add('cursor-on'); }
      var t = e.target.closest && e.target.closest('a, button');
      // a label inside the cursor says what a click will do: data-cursor, or "Смотреть" over a picture link
      var lab = t && (t.getAttribute('data-cursor') || (t.querySelector('img') ? 'Смотреть' : ''));
      if (lab !== curLabel) { curLabel = lab; curText.textContent = lab || ''; }
      body.classList.toggle('cursor-label', !!lab);
      body.classList.toggle('cursor-link', !!t && !lab);
      body.classList.toggle('cursor-img', false);
      if (!raf) raf = requestAnimationFrame(tick);
    });
    document.addEventListener('mouseleave', function () { body.classList.remove('cursor-on'); });
    // the page scrolls under a still mouse: re-check what is under the cursor so the label stays true
    window.addEventListener('scroll', function () {
      if (!body.classList.contains('cursor-on')) return;
      var el = document.elementFromPoint(tx, ty);
      var t = el && el.closest && el.closest('a, button');
      var lab = t && (t.getAttribute('data-cursor') || (t.querySelector('img') ? 'Смотреть' : ''));
      if (lab !== curLabel) { curLabel = lab; curText.textContent = lab || ''; }
      body.classList.toggle('cursor-label', !!lab);
      body.classList.toggle('cursor-link', !!t && !lab);
    }, { passive: true });
    function tick() {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      raf = (Math.abs(tx - cx) > .2 || Math.abs(ty - cy) > .2) ? requestAnimationFrame(tick) : null;
    }
  }

  /* ---- works: the rules of each label draw themselves as the label arrives ---- */
  var works = document.querySelectorAll('.work');
  if (works.length && 'IntersectionObserver' in window && !reduce) {
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.closest('.work').classList.add('line-in'); wio.unobserve(e.target); } });
    }, { threshold: .6 });
    works.forEach(function (w) { wio.observe(w.querySelector('.work__cap') || w); });
  } else works.forEach(function (w) { w.classList.add('line-in'); });

  /* ---- reveal on scroll ---- */
  var rev = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && rev.length) {
    /* a fully clipped element reports no intersection, so watch its parent */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('[data-reveal]').forEach(function (f) { f.classList.add('in'); });
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .02 });
    rev.forEach(function (el) { io.observe(el.parentElement); });
  } else { rev.forEach(function (el) { el.classList.add('in'); }); }

  /* ---- count-up numbers ---- */
  var nums = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && nums.length && !reduce) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, end = +el.getAttribute('data-count'), t0 = performance.now();
        (function step(t) {
          var p = Math.min(1, (t - t0) / 1200); p = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * p);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        io2.unobserve(el);
      });
    }, { threshold: .6 });
    nums.forEach(function (el) { el.textContent = '0'; io2.observe(el); });
  }

  /* ---- scroll-driven bits: nav hide, steps line, parallax ---- */
  var bar = document.getElementById('bar');
  var steps = document.getElementById('steps');
  var para = document.querySelectorAll('[data-parallax]');
  var cover = document.querySelector('.case-cover img');
  var heroBird = document.getElementById('heroBird');
  var heroBirdG = heroBird && heroBird.querySelector('.mp-bird');
  var shelfItems = document.querySelectorAll('[data-drift]');
  var lastY = window.scrollY, ticking = false;
  var darkBands = document.querySelectorAll('.band--dark, .contact');
  var detSec = document.getElementById('details'), detTrack = detSec && detSec.querySelector('.details__track');
  // touch screens swipe the strip themselves (no scroll-linked transform, which iOS paints badly); a mouse gets the drift
  var fineMouse = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (detSec && !fineMouse) { detSec.classList.add('details--swipe'); detTrack = null; }
  if (detSec && 'IntersectionObserver' in window) {
    // load the strip's photos a little before it arrives (lazy loading and moving strips don't mix well in Safari)
    var dio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      Array.prototype.forEach.call(detSec.querySelectorAll('img[loading="lazy"]'), function (im) { im.loading = 'eager'; });
      dio.disconnect();
    }, { rootMargin: '900px 0px' });
    dio.observe(detSec);
  }
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;
    body.classList.toggle('scrolled', y > 260);
    if (bar) {
      // the bar always stays; over the dark bands it turns dark
      var mid = bar.getBoundingClientRect().height / 2, dark = false;
      for (var di = 0; di < darkBands.length; di++) {
        var dr = darkBands[di].getBoundingClientRect();
        if (dr.top <= mid && dr.bottom >= mid) { dark = true; break; }
      }
      bar.classList.toggle('on-dark', dark && !body.classList.contains('menu-open'));
    }
    if (steps) {
      var r = steps.getBoundingClientRect();
      var p = (vh * .8 - r.top) / (r.height + vh * .3);
      steps.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
    }
    if (!reduce) {
      shelfItems.forEach(function (el) {
        var rr = el.getBoundingClientRect();
        var off = (rr.top + rr.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-drift'));
        el.style.setProperty('--drift', off.toFixed(1) + 'px');
      });
      para.forEach(function (el) {
        var rr = el.getBoundingClientRect();
        var off = (rr.top + rr.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-parallax'));
        var lim = rr.height * .12; off = Math.max(-lim, Math.min(lim, off));
        el.style.transform = 'translateY(' + off.toFixed(1) + 'px)';
      });
      if (detTrack) {
        // the strip travels from its start to its end while the section crosses the screen
        // (from the moment the strip shows at the bottom of the screen until it leaves at the top)
        var dr2 = detTrack.getBoundingClientRect();
        if (dr2.bottom > -100 && dr2.top < vh + 100) {
          var span = Math.max(0, detTrack.scrollWidth - detSec.clientWidth);
          var k = Math.max(0, Math.min(1, (vh - dr2.top) / (vh + dr2.height)));
          detTrack.style.transform = 'translate3d(' + (-span * k).toFixed(1) + 'px,0,0)';
        }
      }
      if (cover) {
        var cr = cover.parentNode.getBoundingClientRect();
        var o = Math.max(-1, Math.min(1, (cr.top + cr.height / 2 - vh / 2) / vh));
        cover.style.transform = 'translateY(' + (o * -40).toFixed(1) + 'px) scale(1.08)';
      }
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- hero magpie: arrives on the branch; flights to the logo live in assets/flight.js ---- */
  if (heroBirdG) { heroBirdG.addEventListener('animationend', function () { body.classList.add('arrived'); }); }

  /* ---- landing: about-bird drops onto its branch ---- */
  var aboutBird = document.getElementById('aboutBird');
  if (aboutBird && 'IntersectionObserver' in window) {
    var io3 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { aboutBird.classList.add('landed'); io3.disconnect(); } });
    }, { threshold: .5 });
    io3.observe(aboutBird);
  } else if (aboutBird) { aboutBird.classList.add('landed'); }

  /* ---- tilt toward the cursor ---- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.classList.add('tilting');
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg) translateY(var(--drift, 0px))';
      });
      el.addEventListener('mouseleave', function () {
        el.classList.remove('tilting');
        el.style.transform = 'translateY(var(--drift, 0px))';
      });
    });
  }

  /* ---- mobile menu ---- */
  var burger = document.querySelector('[data-menu]');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    function setMenu(open) {
      body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open && bar) bar.classList.remove('hide');
    }
    burger.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) setMenu(false); });
  }

  /* ---- copy email ---- */
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () {
        copyBtn.textContent = 'Скопировано'; copyBtn.setAttribute('data-cursor', 'Готово');
        var c = document.querySelector('.cursor span'); if (c && body.classList.contains('cursor-label')) c.textContent = 'Готово';
        setTimeout(function () { copyBtn.textContent = 'Скопировать'; copyBtn.setAttribute('data-cursor', 'Скопировать'); }, 1800);
      };
      function select() {
        var a = document.querySelector('.mail a'); if (!a) return;
        var r = document.createRange(); r.selectNodeContents(a);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, select);
      else select();
    });
  }
})();
