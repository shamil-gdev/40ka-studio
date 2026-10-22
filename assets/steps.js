/* 40ka — "Как работаем": the line through the four steps starts as the magpie's branch — a cut end, bent wood,
   leaves — and thins into a straight, confident line. Drawn with the scroll (phones: each step's line as it arrives). */
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
  function f1(v) { return v.toFixed(1); }

  /* The line starts as the magpie's branch: a cut end on the left, wood that is thick and slightly bent,
     a few leaves, and it thins out into the straight line of the process. Drawn with the scroll. */
  // centre line y(x): gentle organic bend that dies out by the end of the branch part (u = woodEnd)
  function centre(w, woodEnd, ph, amp) {
    var n = Math.max(48, Math.round(w / 5)), pts = [];
    for (var i = 0; i <= n; i++) {
      var x = w * i / n, u = x / w, r = 1 - sm(u / woodEnd);
      var y = r * amp * (.65 * Math.sin(x * .011 + ph[0]) + .35 * Math.sin(x * .029 + ph[1]));
      pts.push([x, y]);
    }
    return pts;
  }
  function thick(u, woodEnd, w0) { var k = 1 - sm(u / woodEnd); return 1.5 + (w0 - 1.5) * Math.pow(k, 1.25); }
  function woodPath(pts, w, woodEnd, w0) {
    var L = [], R = [];
    pts.forEach(function (p, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      var t = thick(p[0] / w, woodEnd, w0) / 2;
      L.push(f1(p[0] + nx * t) + ',' + f1(p[1] + ny * t)); R.push(f1(p[0] - nx * t) + ',' + f1(p[1] - ny * t));
    });
    return 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
  }
  function linePath(pts) { return 'M' + pts.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join('L'); }
  function yAt(pts, x) {
    for (var i = 1; i < pts.length; i++) if (pts[i][0] >= x) {
      var a = pts[i - 1], b = pts[i], k = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * k;
    }
    return pts[pts.length - 1][1];
  }
  // one leaf: a short stalk and a blade with a light vein (same drawing as the magpie's branch)
  function leaf(g, x, y, ang, ln, curl) {
    var w = ln * .27, c = curl * ln * .15, s = 3;
    var lg = el('g', { 'class': 'steps__leaf', transform: 'translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + ang + ')' }, g);
    var inner = el('g', {}, lg);
    el('path', { d: 'M0,0L' + (s + 1) + ',0', 'class': 'steps__stalk' }, inner);
    el('path', { d: 'M' + s + ',0C' + f1(s + ln * .25) + ',' + f1(-w - c) + ' ' + f1(s + ln * .7) + ',' + f1(-w * .9 - c) + ' ' + f1(s + ln) + ',' + f1(-c * 1.6) +
      'C' + f1(s + ln * .7) + ',' + f1(w * .9 - c) + ' ' + f1(s + ln * .25) + ',' + f1(w - c) + ' ' + s + ',0Z', 'class': 'steps__blade' }, inner);
    el('path', { d: 'M' + (s + 3) + ',0Q' + f1(s + ln * .45) + ',' + f1(-c * .9) + ' ' + f1(s + ln * .78) + ',' + f1(-c * 1.3), 'class': 'steps__vein' }, inner);
    return { g: inner, u: 0 };
  }
  var uid = 0;
  // builds a branch-into-line inside svg; returns { path (centre, for the pen), maskPath, leaves, L }
  function branch(svg, w, opt) {
    var id = 'stepsWood' + (++uid);
    var pts = centre(w, opt.woodEnd, opt.ph, opt.amp);
    var defs = el('defs', {}, svg);
    var mask = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -20, y: -40, width: w + 40, height: 80 }, defs);
    var reveal = el('path', { d: linePath(pts), fill: 'none', stroke: '#fff', 'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mask);
    var g = el('g', { mask: 'url(#' + id + ')' }, svg);
    el('path', { d: woodPath(pts, w, opt.woodEnd, opt.w0), 'class': 'steps__wood' }, g);
    // the cut end, like the logo's branch
    el('ellipse', { cx: 1.6, cy: f1(pts[0][1]), rx: opt.w0 * .28, ry: opt.w0 * .46, 'class': 'steps__cut' }, g);
    var centreP = el('path', { d: linePath(pts), fill: 'none', stroke: 'none' }, svg);
    var leaves = [];
    (opt.leaves || []).forEach(function (L) {
      var x = L[0] * w, y = yAt(pts, x), lf = leaf(svg, x, y + (L[1] > 0 ? 1 : -1) * thick(L[0], opt.woodEnd, opt.w0) * .3, L[1], L[2], L[3]);
      lf.u = L[0]; leaves.push(lf);
    });
    var Lr = reveal.getTotalLength();
    reveal.style.strokeDasharray = Lr; reveal.style.strokeDashoffset = Lr;
    return { path: centreP, reveal: reveal, Lr: Lr, leaves: leaves, L: centreP.getTotalLength(), pts: pts };
  }
  function grow(b, p) {
    b.reveal.style.strokeDashoffset = (b.Lr * (1 - p)).toFixed(1);
    b.leaves.forEach(function (lf, i) {
      var k = sm((p - lf.u) / .05);                                      // a leaf unfolds just after the pen passes it
      lf.g.setAttribute('transform', 'scale(' + Math.max(.001, k).toFixed(3) + ')');
    });
  }
  // leaves: [u along the line, angle, length, curl]; the first ones cluster near the cut end
  var DESK_LEAVES = [[.03, -42, 24, .8], [.06, 40, 21, -.7], [.11, -56, 19, .6], [.17, 50, 16, -.6], [.24, -38, 13, .5], [.31, 34, 10, -.4]];

  /* ---------- desktop: one line across the four columns ---------- */
  var desk = null;
  function buildDesk() {
    var w = holder.getBoundingClientRect().width;
    if (!w) return;
    holder.innerHTML = '';
    var svg = el('svg', { 'class': 'steps__svg', width: w, height: 60, viewBox: '0 -30 ' + w + ' 60', 'aria-hidden': 'true' }, holder);
    var b = branch(svg, w, { woodEnd: .42, w0: 8.5, amp: 5, ph: [.4, 1.9], leaves: DESK_LEAVES });
    var tip = el('circle', { r: 3, 'class': 'steps__tip' }, svg);
    desk = { b: b, main: b.path, tip: tip, L: b.L, w: w };
    drawDesk();
  }
  function progress() {
    var vh = window.innerHeight, r = steps.getBoundingClientRect();
    return Math.max(0, Math.min(1, (vh * .8 - r.top) / (r.height + vh * .3)));
  }
  function drawDesk() {
    if (!desk) return;
    var p = reduce ? 1 : progress();
    grow(desk.b, p);
    var pt = desk.main.getPointAtLength(desk.L * p);
    desk.tip.setAttribute('cx', pt.x.toFixed(1)); desk.tip.setAttribute('cy', pt.y.toFixed(2));
    desk.tip.style.opacity = p > .3 && p < .998 ? 1 : 0;                 // the pen shows once the wood has become a line
  }

  /* ---------- phones: each step has its own top line; the first one is the branch ---------- */
  var mob = [];
  function buildMob() {
    mob = [];
    items.forEach(function (st, i) {
      var old = st.querySelector('.step__line'); if (old) old.remove();
      var w = st.getBoundingClientRect().width; if (!w) return;
      var svg = el('svg', { 'class': 'step__line', width: w, height: 40, viewBox: '0 -20 ' + w + ' 40', 'aria-hidden': 'true' });
      st.insertBefore(svg, st.firstChild);
      var opt = i === 0 ? { woodEnd: .75, w0: 7, amp: 3.5, ph: [.4, 1.9], leaves: [[.07, -42, 18, .8], [.14, 40, 16, -.7], [.3, -54, 14, .6], [.5, 46, 11, -.5]] }
              : i === 1 ? { woodEnd: .5, w0: 2.6, amp: 1.6, ph: [1.3, .2], leaves: [] }
              : { woodEnd: .01, w0: 1.5, amp: 0, ph: [0, 0], leaves: [] };
      var b = branch(svg, w, opt);
      b.svg = svg;
      if (reduce) grow(b, 1); else grow(b, 0);
      mob.push(b);
    });
    if (reduce) return;
    function run(b) {
      var t0 = null;
      (function f(t) { if (t0 == null) t0 = t; var k = Math.min(1, (t - t0) / 1100); grow(b, 1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(f); })(performance.now());
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          mob.forEach(function (b) { if (b.svg === e.target) run(b); });
          io.unobserve(e.target);
        });
      }, { threshold: 1 });
      mob.forEach(function (b) { io.observe(b.svg); });
    } else mob.forEach(function (b) { grow(b, 1); });
  }

  /* for the magpie (flight.js): where the line is on screen, so she can stand on it and walk behind the pen */
  window.__steps = {
    mode: function () { return desk ? 'desk' : (mob.length ? 'mob' : null); },
    progress: function () { return reduce ? 1 : progress(); },
    rect: function () { return steps.getBoundingClientRect(); },
    // desktop: a point on the drawn line at fraction p (0..1), in screen px
    at: function (p) {
      if (!desk) return null;
      var pt = desk.main.getPointAtLength(desk.L * Math.max(0, Math.min(1, p))), m = desk.main.getScreenCTM();
      return [m.a * pt.x + m.c * pt.y + m.e, m.b * pt.x + m.d * pt.y + m.f];
    },
    // how far the line is drawn right now (0..1)
    drawn: function () { return reduce ? 1 : progress(); },
    length: function () { return desk ? desk.w : 0; },
    // phones: a point on the line of step i (fraction f along it)
    stepAt: function (i, f) {
      var b = mob[i]; if (!b) return null;
      var pt = b.path.getPointAtLength(b.L * (f == null ? .16 : f)), m = b.path.getScreenCTM();
      return [m.a * pt.x + m.c * pt.y + m.e, m.b * pt.x + m.d * pt.y + m.f];
    },
    count: function () { return mob.length; }
  };

  var mq = window.matchMedia('(max-width: 900px)');
  function build() {
    if (mq.matches) { holder.innerHTML = ''; desk = null; buildMob(); }
    else { mob.forEach(function (b) { b.svg.remove(); }); mob = []; buildDesk(); }
  }
  var raf = null;
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = null; drawDesk(); }); }, { passive: true });
  var rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build); else build();
  build();
})();
