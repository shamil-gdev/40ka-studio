/* 40ka — "Как работаем": the line through the four steps starts as a rough pencil sketch
   and becomes a straight, confident line by the time it reaches "Система". Drawn with the scroll. */
(function () {
  var steps = document.getElementById('steps');
  if (!steps) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var holder = steps.querySelector('.steps__line');
  var items = Array.prototype.slice.call(steps.querySelectorAll('.step'));

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  // a hand-drawn wobble whose size is set per x by rough(x) (0 = ruler-straight)
  function linePath(w, rough, ph, amp) {
    var d = '', n = Math.max(24, Math.round(w / 6));
    for (var i = 0; i <= n; i++) {
      var x = w * i / n, r = rough(x / w);
      var y = r * amp * (.6 * Math.sin(x * .045 + ph[0]) + .3 * Math.sin(x * .11 + ph[1]) + .1 * Math.sin(x * .27 + ph[2]));
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(2);
    }
    return d;
  }

  /* ---------- desktop: one line across the four columns ---------- */
  var desk = null;
  function buildDesk() {
    var w = holder.getBoundingClientRect().width;
    if (!w) return;
    holder.innerHTML = '';
    var svg = el('svg', { 'class': 'steps__svg', width: w, height: 24, viewBox: '0 -12 ' + w + ' 24', 'aria-hidden': 'true' }, holder);
    var rough = function (u) { return 1 - sm((u - .18) / .34); };         // sketchy over steps 1–2, straight from step 3
    var main = el('path', { d: linePath(w, rough, [.3, 1.7, 2.9], 4.4), 'class': 'steps__ink' }, svg);
    var ghost = el('path', { d: linePath(w * .56, function (u) { return 1 - sm((u - .3) / .6); }, [2.1, .4, 1.2], 4.2), 'class': 'steps__ghost' }, svg);
    var tip = el('circle', { r: 3, 'class': 'steps__tip' }, svg);
    var L = main.getTotalLength(), Lg = ghost.getTotalLength();
    main.style.strokeDasharray = L; ghost.style.strokeDasharray = Lg;
    desk = { main: main, ghost: ghost, tip: tip, L: L, Lg: Lg, w: w };
    drawDesk();
  }
  function progress() {
    var vh = window.innerHeight, r = steps.getBoundingClientRect();
    return Math.max(0, Math.min(1, (vh * .8 - r.top) / (r.height + vh * .3)));
  }
  function drawDesk() {
    if (!desk) return;
    var p = reduce ? 1 : progress();
    desk.main.style.strokeDashoffset = (desk.L * (1 - p)).toFixed(1);
    var pg = Math.max(0, Math.min(1, p / .56));
    desk.ghost.style.strokeDashoffset = (desk.Lg * (1 - pg)).toFixed(1);
    var pt = desk.main.getPointAtLength(desk.L * p);
    desk.tip.setAttribute('cx', pt.x.toFixed(1)); desk.tip.setAttribute('cy', pt.y.toFixed(2));
    desk.tip.style.opacity = p > .002 && p < .998 ? 1 : 0;
  }

  /* ---------- phones: each step has its own top line, rough for the first two ---------- */
  var mob = [];
  function buildMob() {
    mob = [];
    items.forEach(function (st, i) {
      var old = st.querySelector('.step__line'); if (old) old.remove();
      var w = st.getBoundingClientRect().width; if (!w) return;
      var r0 = [1, .55, 0, 0][i] || 0;
      var svg = el('svg', { 'class': 'step__line', width: w, height: 16, viewBox: '0 -8 ' + w + ' 16', 'aria-hidden': 'true' });
      st.insertBefore(svg, st.firstChild);
      var path = el('path', { d: linePath(w, function () { return r0; }, [i * .9, 1.3 + i, 2.2 + i], 3), 'class': 'steps__ink' }, svg);
      if (r0 > .5) el('path', { d: linePath(w * .7, function (u) { return r0 * (1 - u); }, [1.7 + i, .2, 2.6], 3.6), 'class': 'steps__ghost' }, svg);
      Array.prototype.forEach.call(svg.querySelectorAll('path'), function (p) {
        var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = reduce ? 0 : L;
      });
      mob.push(svg);
    });
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          Array.prototype.forEach.call(e.target.querySelectorAll('path'), function (p) { p.style.strokeDashoffset = 0; });
          io.unobserve(e.target);
        });
      }, { threshold: 1 });
      mob.forEach(function (s) { io.observe(s); });
    } else mob.forEach(function (s) { Array.prototype.forEach.call(s.querySelectorAll('path'), function (p) { p.style.strokeDashoffset = 0; }); });
  }

  /* for the magpie (flight.js): where the line is on screen, so she can stand on it and walk behind the pen */
  window.__steps = {
    mode: function () { return desk ? 'desk' : (mob.length ? 'mob' : null); },
    progress: function () { return reduce ? 1 : progress(); },
    rect: function () { return steps.getBoundingClientRect(); },
    // desktop: a point on the drawn line at fraction p (0..1), in screen px
    at: function (p) {
      if (!desk) return null;
      var r = desk.main.ownerSVGElement.getBoundingClientRect(), pt = desk.main.getPointAtLength(desk.L * Math.max(0, Math.min(1, p)));
      return [r.left + pt.x, r.top + pt.y + 12];
    },
    length: function () { return desk ? desk.w : 0; },
    // phones: a point on the line of step i (fraction f along it)
    stepAt: function (i, f) {
      var s = mob[i]; if (!s) return null;
      var path = s.querySelector('path'), r = s.getBoundingClientRect(), L = path.getTotalLength(), pt = path.getPointAtLength(L * (f == null ? .16 : f));
      return [r.left + pt.x, r.top + pt.y + 8];
    },
    count: function () { return mob.length; }
  };

  var mq = window.matchMedia('(max-width: 900px)');
  function build() {
    if (mq.matches) { holder.innerHTML = ''; desk = null; buildMob(); }
    else { mob.forEach(function (s) { s.remove(); }); mob = []; buildDesk(); }
  }
  var raf = null;
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = null; drawDesk(); }); }, { passive: true });
  var rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build); else build();
  build();
})();
