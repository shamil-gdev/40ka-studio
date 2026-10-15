(function () {
  var body = document.body;
  var html = document.documentElement;
  html.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- intro: the magpie lands, then the page starts ---- */
  var intro = document.getElementById('intro');
  var seen = false;
  try { seen = sessionStorage.getItem('40ka-intro') === '1'; } catch (e) {}
  function start() {
    body.classList.remove('intro-wait');
    body.classList.add('bird-ready');
  }
  if (!intro || reduce || seen) {
    if (intro) intro.remove();
    body.classList.add('intro-skip');
    start();
  } else {
    body.classList.add('intro-wait');
    body.style.overflow = 'hidden';
    ['branch', 'smear'].forEach(function (id) {
      var p = document.getElementById(id);
      if (p && p.getTotalLength) p.style.setProperty('--len', p.getTotalLength());
    });
    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      intro.classList.add('done');
      body.style.overflow = '';
      body.classList.add('arrived');        /* the bird already landed in the intro: sit her on the hero branch at once */
      body.classList.add('intro-done');
      start();
      try { sessionStorage.setItem('40ka-intro', '1'); } catch (e) {}
      setTimeout(function () { intro.remove(); }, 800);
    }
    intro.addEventListener('click', finish);
    setTimeout(finish, 4000);
  }

  /* ---- cursor ---- */
  var cur = document.querySelector('.cursor');
  if (cur && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!body.classList.contains('cursor-on')) { cx = tx; cy = ty; body.classList.add('cursor-on'); }
      var t = e.target.closest && e.target.closest('a, button');
      body.classList.toggle('cursor-link', !!t && !t.querySelector('img'));
      body.classList.toggle('cursor-img', !!t && !!t.querySelector('img'));
      if (!raf) raf = requestAnimationFrame(tick);
    });
    document.addEventListener('mouseleave', function () { body.classList.remove('cursor-on'); });
    function tick() {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      raf = (Math.abs(tx - cx) > .2 || Math.abs(ty - cy) > .2) ? requestAnimationFrame(tick) : null;
    }
  }

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
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;
    if (bar) {
      if (y > 120 && y > lastY + 4) bar.classList.add('hide');
      else if (y < lastY - 4) bar.classList.remove('hide');
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
        el.style.transform = 'translateY(' + off.toFixed(1) + 'px)';
      });
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

  /* ---- take-off: damped, forward (toward the beak), on an arc ---- */
  if (heroBirdG) { heroBirdG.addEventListener('animationend', function () { body.classList.add('arrived'); }); }
  if (heroBirdG && !reduce) {
    var fp = 0, ft = 0, flyRaf = null, wasFlying = false;
    function flyTarget() {
      var vh = window.innerHeight;
      return Math.max(0, Math.min(1, (window.scrollY - 30) / (vh * .85)));
    }
    function flyTick() {
      fp += (ft - fp) * .085;
      var e = fp * fp * (3 - 2 * fp);              /* smoothstep */
      var lift = Math.sin(Math.min(1, fp * 1.6) * Math.PI) * 90;   /* hop up at take-off */
      var x = -e * 1500;                            /* forward: the bird faces left */
      var yy = -e * 520 - lift;
      var rot = -14 * Math.sin(e * Math.PI) - 6 * e + Math.sin(fp * 22) * 2.2 * (1 - e); /* bank, then level; faint wingbeat */
      var sc = 1 + .12 * Math.sin(e * Math.PI) - .35 * e;
      heroBirdG.style.transform = 'translate(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      heroBirdG.style.opacity = e > .96 ? String(Math.max(0, 1 - (e - .96) * 25)) : '1';
      var flying = fp > .015;
      if (flying !== wasFlying) { body.classList.toggle('flying', flying); wasFlying = flying; }
      if (Math.abs(ft - fp) > .0005) flyRaf = requestAnimationFrame(flyTick); else flyRaf = null;
    }
    window.addEventListener('scroll', function () { ft = flyTarget(); if (!flyRaf) flyRaf = requestAnimationFrame(flyTick); }, { passive: true });
  }

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

  /* ---- copy email ---- */
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () { copyBtn.textContent = 'Скопировано'; setTimeout(function () { copyBtn.textContent = 'Скопировать'; }, 1800); };
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
