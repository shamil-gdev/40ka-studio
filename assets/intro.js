/* 40ka — intro: the magpie notices something valuable, lands on her branch, and the page opens from that glint.
   One deterministic timeline: renderAt(t) sets every part from t alone (seconds). */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- math helpers ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }            // 0..1 progress inside [a,b]
  function sm(x) { return x * x * (3 - 2 * x); }                               // smoothstep
  function eio(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } // easeInOutCubic
  function eo(x) { return 1 - Math.pow(1 - x, 3); }                            // easeOutCubic
  function ei(x) { return x * x * x; }
  function backOut(x, k) { k = k || 1.6; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); }
  function bez(p0, p1, p2, p3, u) {
    var v = 1 - u;
    return [
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]
    ];
  }
  /* damped spring response to a step at t=0 (value goes 0 -> 1 with overshoot) */
  function spring(t, freq, damp) {
    if (t <= 0) return 0;
    var w = 2 * Math.PI * freq;
    return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
  }
  /* decaying wobble after an impulse at t=0 (starts 0, swings, returns to 0) */
  function wobble(t, freq, decay) {
    if (t <= 0) return 0;
    return Math.sin(2 * Math.PI * freq * t) * Math.exp(-decay * t);
  }

  /* ---------- wing art (wing-local coordinates: shoulder at 0,0; span points up = -y; front = -x) ---------- */
  function feather(bx, by, angDeg, len, w, tipRound) {
    var a = angDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    var tx = bx + dx * len, ty = by + dy * len, r = w / 2, tr = tipRound || 1;
    var p = function (x, y) { return x.toFixed(1) + ',' + y.toFixed(1); };
    var b1 = p(bx + nx * r * .7, by + ny * r * .7), b2 = p(bx - nx * r * .7, by - ny * r * .7);
    var s1 = p(tx - dx * w * tr + nx * r, ty - dy * w * tr + ny * r);
    var s2 = p(tx - dx * w * tr - nx * r, ty - dy * w * tr - ny * r);
    var c = p(tx + dx * w * .25, ty + dy * w * .25);
    return 'M' + b1 + 'L' + s1 + 'Q' + c + ' ' + s2 + 'L' + b2 + 'Z';
  }
  function primaries(mode) {
    // mode: 'ink' full feathers, 'white' inner panel (overlapping, so it reads as one white patch), 'lines' feather edges
    var d = '';
    for (var i = 0; i < 8; i++) {
      var k = i / 7;
      var bx = lerp(-8, 32, k), by = lerp(-40, 0, k);
      var ang = lerp(-104, -34, k), len = lerp(112, 64, k), w = lerp(20, 18, k);
      if (mode === 'white') d += feather(bx + 1.5, by + 1, ang + 1, len * .66, w * 1.05, .7);
      else if (mode === 'lines') {
        var a = (ang - 2) * Math.PI / 180, r = w * .42;
        var sx = bx - Math.sin(a) * r, sy = by + Math.cos(a) * r;
        d += 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + 'l' + (Math.cos(a) * len * .66).toFixed(1) + ',' + (Math.sin(a) * len * .66).toFixed(1);
      } else d += feather(bx, by, ang, len, w, 1);
    }
    return d;
  }
  function secondaries() {
    var d = '';
    for (var i = 0; i < 7; i++) {
      var k = i / 6;
      var bx = lerp(10, 30, k), by = lerp(-82, -4, k);
      d += feather(bx, by, lerp(-30, 26, k), lerp(64, 50, k), 24, 1);
    }
    return d;
  }
  var WING = {
    arm: 'M-22,10 C-25,-24 -19,-62 -7,-90 L14,-94 C30,-70 36,-34 34,6 C18,20 -6,20 -22,10Z',
    hand: 'M-11,2 C-16,-24 -17,-52 -12,-70 L6,-56 C18,-38 28,-20 34,2 C18,10 2,10 -11,2Z',
    handOutline: '',
    wrist: [6, -86]
  };

  /* ---------- rig ---------- */
  var C = [190, 95];      // body pivot (pitch)
  var NECK = [138, 58];   // head pivot
  var SHOULDER_N = [214, 60], SHOULDER_F = [190, 50];
  var TAIL = [282, 72];
  var HIPS = [186, 152];

  function buildWing(parent, far) {
    var ink = 'var(--ink, #000)';
    var white = far ? '#d9dad5' : '#fff';
    var g = el('g', { 'class': 'w-root' }, parent);
    var arm = el('g', { 'class': 'w-arm' }, g);
    el('path', { d: secondaries(), fill: ink }, arm);
    el('path', { d: WING.arm, fill: ink }, arm);
    var sheen = el('path', { d: WING.arm, fill: 'url(#sheenGrad)', opacity: 0 }, arm);
    var hand = el('g', { 'class': 'w-hand' }, arm);
    el('path', { d: primaries('ink'), fill: ink }, hand);
    el('path', { d: primaries('white'), fill: white }, hand);
    el('path', { d: primaries('lines'), fill: 'none', stroke: ink, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: .55 }, hand);
    el('path', { d: WING.hand, fill: ink }, hand);
    return { g: g, arm: arm, hand: hand, sheen: sheen };
  }

  /* ---------- legs ----------
     Each leg: hip (hidden in the belly) -> heel (bends backwards, towards the tail) -> ankle, plus two toes.
     At rest the heel sits halfway, so the leg is the straight line of the drawing.
     st.legRot (-60 tucked .. 0 .. 22 reaching forward) and st.legS (squash) keep their old meaning;
     st.plant (0..1) keeps the feet where they stand on the branch while the body moves; st.toe curls the toes. */
  var LEGS = [
    { hip: [199.4, 151.6], ankle: [203.5, 200.2], toeB: [14, 5.9], toeF: [-10, 7.9] },
    { hip: [173.5, 151.0], ankle: [167.5, 202.2], toeB: [10, 7.9], toeF: [-14, 5.9] }
  ];
  LEGS.forEach(function (L) { L.len = Math.hypot(L.ankle[0] - L.hip[0], L.ankle[1] - L.hip[1]); });
  function rotP(p, c, deg) {
    var a = deg * Math.PI / 180, x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
  }
  function rotV(v, deg, k) {
    var a = deg * Math.PI / 180;
    return [(v[0] * Math.cos(a) - v[1] * Math.sin(a)) * k, (v[0] * Math.sin(a) + v[1] * Math.cos(a)) * k];
  }
  function legPath(st) {
    var lr = st.legRot || 0, tuck = clamp(-lr / 60, 0, 1), reach = clamp(lr / 22, 0, 1);
    var squash = 1 - (st.legS == null ? 1 : st.legS);
    var plant = st.plant || 0, toe = st.toe == null ? 0 : st.toe;
    var f = (st.toe == null) ? Math.max(tuck, 0) : toe;              // tucked legs curl their toes
    var d = '';
    LEGS.forEach(function (L) {
      var H = L.hip, A0 = L.ankle;
      // where the foot goes when it is free: folded up under the belly, or reaching forward for the perch
      var At = [H[0] + 20, H[1] + 17], Ar = [H[0] - 15, H[1] + L.len * .93];
      var free = [A0[0] + (At[0] - A0[0]) * tuck + (Ar[0] - A0[0]) * reach, A0[1] + (At[1] - A0[1]) * tuck + (Ar[1] - A0[1]) * reach - squash * 30];
      // where it stays when planted: the drawn foot position, seen from inside the moving body
      var P = rotP(A0, C, -(st.rot || 0)); P[1] -= (st.bob || 0);
      var A = [free[0] + (P[0] - free[0]) * plant, free[1] + (P[1] - free[1]) * plant];
      var dx = A[0] - H[0], dy = A[1] - H[1], dd = Math.hypot(dx, dy) || 1, l = L.len / 2;
      if (dd > 2 * l) { A = [H[0] + dx / dd * 2 * l, H[1] + dy / dd * 2 * l]; dx = A[0] - H[0]; dy = A[1] - H[1]; dd = 2 * l; }
      var ca = clamp(dd / (2 * l), -1, 1), sa = Math.sqrt(1 - ca * ca);
      var K = [H[0] + dx / 2 + (dy / dd) * l * sa, H[1] + dy / 2 - (dx / dd) * l * sa];   // heel bends backwards (+x)
      var tb = rotV(L.toeB, 52 * f, 1 - .15 * f), tf = rotV(L.toeF, -48 * f, 1 - .15 * f);
      var p = function (x) { return x[0].toFixed(1) + ',' + x[1].toFixed(1); };
      d += 'M' + p(H) + 'L' + p(K) + 'L' + p(A) + 'M' + p(A) + 'l' + p(tb) + 'M' + p(A) + 'l' + p(tf);
    });
    return d;
  }

  /* source: the hero magpie already on the page, so the intro bird is the same drawing */
  function buildRig(parent, src, opts) {
    opts = opts || {};
    var pre = opts.prefix || 'intro', blurId = opts.blurId || 'introBlur';
    var q = function (s) { return src.querySelector(s); };
    var root = el('g', { 'class': 'rig' }, parent);
    var flipG = el('g', {}, root);              // facing: 1 = beak to the left (as drawn), -1 = mirrored
    var blurWrap = el('g', {}, flipG);           // rotated to the motion direction, carries the blur filter
    var blurInner = el('g', {}, blurWrap);
    var pose = el('g', {}, blurInner);          // pitch around C
    var bob = el('g', {}, pose);                // wingbeat bob

    var farW = buildWing(el('g', {}, bob), true);

    var tailG = el('g', {}, bob);
    var tailD = q('.mp-tail').getAttribute('d');
    var tailFan = [];
    [-9, 9].forEach(function (a) { tailFan.push(el('path', { d: tailD, fill: 'var(--ink,#000)', opacity: 0, 'data-a': a }, tailG)); });
    el('path', { d: tailD, fill: 'var(--ink,#000)' }, tailG);

    var legsG = el('g', {}, bob);
    var legs = el('path', { d: q('.mp-legs').getAttribute('d'), fill: 'none', stroke: 'var(--ink,#000)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, legsG);

    var bodyD = q('.mp-body:not(.mp-tail)').getAttribute('d');
    var bodyClipD = q('clipPath path').getAttribute('d');
    var defs = el('defs', {}, parent);
    var cid = pre + 'BodyClip', hid = pre + 'HeadClip', nid = pre + 'NoHead';
    el('path', { d: bodyClipD }, el('clipPath', { id: cid }, defs));
    el('circle', { cx: 95, cy: 42, r: 55 }, el('clipPath', { id: hid }, defs));
    el('path', { d: 'M-50,-200H600V400H-50Z M95,-5 a47,47 0 1,0 0.1,0Z', 'clip-rule': 'evenodd' }, el('clipPath', { id: nid }, defs));

    var bodyG = el('g', { 'clip-path': 'url(#' + nid + ')' }, bob);
    el('path', { d: bodyD, fill: 'var(--ink,#000)' }, bodyG);
    var whites = el('g', { 'clip-path': 'url(#' + cid + ')', fill: 'var(--bg,#ECECE8)' }, bob);
    var ell = src.querySelectorAll('.mp-white ellipse');
    var belly = ell[0].cloneNode(true); whites.appendChild(belly);
    var patchG = el('g', {}, whites);
    var patch = ell[1].cloneNode(true); patchG.appendChild(patch);
    var line = q('.mp-line');
    el('path', { d: line.getAttribute('d'), fill: 'none', stroke: 'var(--ink,#000)', 'stroke-width': 3, 'stroke-linecap': 'round' }, bob);

    var head = el('g', {}, bob);
    var headBody = el('g', { 'clip-path': 'url(#' + hid + ')' }, head);
    el('path', { d: bodyD, fill: 'var(--ink,#000)' }, headBody);
    el('path', { d: q('.mp-beak').getAttribute('d'), fill: 'var(--ink,#000)' }, head);
    var eyeG = el('g', {}, head);
    el('circle', { cx: 101.5, cy: 34.1, r: 4.5, fill: 'var(--bg,#ECECE8)' }, eyeG);
    var pupil = el('circle', { cx: 102.5, cy: 34.1, r: 2, fill: 'var(--ink,#000)' }, eyeG);
    var lid = el('rect', { x: 96, y: 28.6, width: 11, height: 11, fill: 'var(--ink,#000)', transform: 'scale(1 0)' }, eyeG);

    var nearW = buildWing(el('g', {}, bob), false);

    function setWing(w, S, s) {
      // s: { p: projection (1 up .. -0.6 down), th: sweep deg, flex: wrist deg, op, sheen }
      w.g.setAttribute('transform', 'translate(' + S[0] + ' ' + S[1] + ') rotate(' + s.th.toFixed(2) + ') scale(' + (s.c == null ? 1 : s.c).toFixed(3) + ' ' + s.p.toFixed(3) + ')');
      w.hand.setAttribute('transform', 'translate(' + WING.wrist[0] + ' ' + WING.wrist[1] + ') rotate(' + s.flex.toFixed(2) + ')');
      w.g.setAttribute('opacity', s.op == null ? 1 : s.op.toFixed(3));
      w.sheen.setAttribute('opacity', (s.sheen || 0).toFixed(3));
    }

    return {
      root: root,
      set: function (st) {
        root.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') scale(' + st.s.toFixed(4) + ')');
        root.setAttribute('opacity', st.op == null ? 1 : st.op.toFixed(3));
        var f = st.flip == null ? 1 : st.flip;
        flipG.setAttribute('transform', 'translate(' + C[0] + ' 0) scale(' + f.toFixed(3) + ' 1) translate(' + (-C[0]) + ' 0)');
        // motion blur: rotate wrapper to motion direction, blur along its x, rotate content back
        var ba = st.blurAng || 0;
        blurWrap.setAttribute('transform', 'rotate(' + ba.toFixed(1) + ' ' + C[0] + ' ' + C[1] + ')');
        blurInner.setAttribute('transform', 'rotate(' + (-ba).toFixed(1) + ' ' + C[0] + ' ' + C[1] + ')');
        if (st.blur > .05) { blurWrap.setAttribute('filter', 'url(#' + blurId + ')'); st.blurNode && st.blurNode.setAttribute('stdDeviation', st.blur.toFixed(2) + ' 0'); }
        else blurWrap.removeAttribute('filter');
        pose.setAttribute('transform', 'rotate(' + st.rot.toFixed(2) + ' ' + C[0] + ' ' + C[1] + ')');
        bob.setAttribute('transform', 'translate(0 ' + (st.bob || 0).toFixed(2) + ')');
        // the head keeps still while the body pitches and bobs (headLock 0..1), the way birds hold their gaze
        var lock = st.headLock || 0;
        head.setAttribute('transform', 'translate(0 ' + (-lock * .8 * (st.bob || 0)).toFixed(2) + ') rotate(' + ((st.head || 0) - lock * st.rot).toFixed(2) + ' ' + NECK[0] + ' ' + NECK[1] + ')');
        pupil.setAttribute('cx', (102.5 + (st.pdx || 0)).toFixed(2));
        pupil.setAttribute('cy', (34.1 + (st.pdy || 0)).toFixed(2));
        lid.setAttribute('transform', 'translate(0 ' + (28.6 * (1 - (st.blink || 0))).toFixed(2) + ') scale(1 ' + (st.blink || 0).toFixed(3) + ')');
        tailG.setAttribute('transform', 'rotate(' + (st.tail || 0).toFixed(2) + ' ' + TAIL[0] + ' ' + TAIL[1] + ')');
        tailFan.forEach(function (n) {
          var a = +n.getAttribute('data-a') * (st.fan || 0);
          n.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + TAIL[0] + ' ' + TAIL[1] + ')');
          n.setAttribute('opacity', (st.fan || 0) > .02 ? 1 : 0);
        });
        legs.setAttribute('d', legPath(st));
        legsG.setAttribute('opacity', st.legOp == null ? 1 : st.legOp.toFixed(3));
        var pk = st.patch == null ? 1 : st.patch;
        patchG.setAttribute('opacity', pk > .001 ? 1 : 0);
        patchG.setAttribute('transform', 'translate(284 68) scale(' + (.22 + .78 * pk).toFixed(3) + ' ' + (.5 + .5 * pk).toFixed(3) + ') translate(-284 -68)');
        setWing(nearW, SHOULDER_N, st.wn);
        setWing(farW, SHOULDER_F, st.wf);
      }
    };
  }

  /* ---------- leaves: hang on the branch and follow its bend with a little lag ---------- */
  function cloneLeaves(src, parent) {
    var g = src.querySelector('.mp-leaves');
    if (!g) return [];
    var c = g.cloneNode(true); parent.appendChild(c);
    return leafList(c);
  }
  function leafList(root) {
    return Array.prototype.map.call(root.querySelectorAll('.mp-leaf'), function (n) {
      return { n: n, x: +n.getAttribute('data-x'), y: +n.getAttribute('data-y'), a: +n.getAttribute('data-a'), k: +n.getAttribute('data-k') || 1 };
    });
  }
  // bendAt(t): branch vertical offset (units) as a function of time; leaves swing with it, a beat later
  function swayLeaves(leaves, bendAt, t, dy, scaleIn) {
    leaves.forEach(function (L, i) {
      var lag = .05 + .025 * i;
      var b = bendAt(t - lag), v = (bendAt(t - lag + .02) - bendAt(t - lag - .02)) / .04;
      var rot = L.a + L.k * (b * 2.4 + v * .06) * (Math.cos(L.a * Math.PI / 180) >= 0 ? 1 : -1);
      var sc = scaleIn == null ? 1 : scaleIn(L, i);
      L.n.setAttribute('transform', 'translate(' + L.x + ' ' + (L.y + (dy || 0)).toFixed(2) + ') rotate(' + rot.toFixed(2) + ') scale(' + sc.toFixed(3) + ')');
    });
  }

  /* the hero branch grows in from the right edge of the screen: its base (data-anchor) is off-screen,
     so a bend is a turn about that base. b = how far it dips (units) under the magpie's feet. */
  var FEET_X = 198;
  function branchBend(wrap, b) {
    var a = (wrap.getAttribute('data-anchor') || '').split(' ').map(Number);
    if (a.length !== 2 || isNaN(a[0])) return 'translate(0 ' + b.toFixed(2) + ')';
    var ang = -Math.atan2(b, a[0] - FEET_X) * 180 / Math.PI;
    return 'rotate(' + ang.toFixed(3) + ' ' + a[0] + ' ' + a[1] + ')';
  }
  // how much of the branch (from its base) is off-screen to the right, as a fraction of its length,
  // and where along the branch each leaf sits (0 = base, 1 = tip), so the drawing starts at the screen edge
  function branchReach(wrap, svgRect, scale) {
    var path = wrap.querySelector('.mp-branch');
    if (!path || !path.getTotalLength) return { L: 600, off: 0, at: function () { return 0; } };
    var L = path.getTotalLength(), n = 120, pts = [];
    for (var i = 0; i <= n; i++) { var q = path.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
    var edge = (window.innerWidth - svgRect.left) / scale, off = 0;
    for (var j = 0; j <= n; j++) { if (pts[j][0] <= edge) { off = j / n; break; } }
    return { L: L, off: Math.max(0, off - .02), at: function (x, y) {
      var best = 0, bd = 1e9;
      for (var k = 0; k <= n; k++) { var d = Math.hypot(pts[k][0] - x, pts[k][1] - y); if (d < bd) { bd = d; best = k; } }
      return best / n;
    } };
  }

  /* ---------- wingbeat ----------
     u: phase 0..1 (0 = top of the stroke). The downstroke is quicker and stronger (0..0.44),
     the upstroke slower; the hand trails the arm: still bent back as the arm starts down,
     overshooting at the bottom, folding up during the recovery. i: beat number, so no two beats are identical. */
  function curve(pts, u) {
    // closed Catmull-Rom through (u, value) keys; the last key must equal the first at u = 1
    for (var k = 0; k < pts.length - 1; k++) if (u <= pts[k + 1][0]) break;
    var p1 = pts[k], p2 = pts[k + 1], p0 = pts[k - 1] || [pts[pts.length - 2][0] - 1, pts[pts.length - 2][1]], p3 = pts[k + 2] || [pts[1][0] + 1, pts[1][1]];
    var t = (u - p1[0]) / ((p2[0] - p1[0]) || 1), t2 = t * t, t3 = t2 * t;
    return .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  }
  var FLAP_P = [[0, 1], [.1, .78], [.24, .05], [.36, -.48], [.44, -.58], [.56, -.4], [.72, .25], [.88, .85], [1, 1]];
  var FLAP_TH = [[0, 14], [.22, 0], [.44, -17], [.6, -12], [.8, 4], [1, 14]];
  var FLAP_FLEX = [[0, 16], [.12, 4], [.3, -7], [.44, -14], [.54, 18], [.66, 56], [.84, 42], [1, 16]];
  function flapPose(u, amp, i) {
    amp = amp == null ? 1 : amp;
    u = ((u % 1) + 1) % 1;
    var v = i == null ? 0 : (Math.sin(i * 2.39 + .6) * .5 + Math.sin(i * 5.1) * .5);
    var a = amp * (1 + .07 * v);
    var p = curve(FLAP_P, u), th = curve(FLAP_TH, u) + 2 * v, flex = curve(FLAP_FLEX, u);
    var glideP = .82, glideTh = 6, glideFlex = 8;
    return { p: lerp(glideP, p, Math.min(a, 1.07)), th: lerp(glideTh, th, a), flex: lerp(glideFlex, flex, a) };
  }
  // body bob that goes with the beat: the body rises on the downstroke and sinks during the recovery
  function flapBob(u, amp) {
    u = ((u % 1) + 1) % 1;
    return amp * (u < .44 ? -4.6 * Math.sin(Math.PI * u / .44) : 2.4 * Math.sin(Math.PI * (u - .44) / .56));
  }

  window.MagpieIntro = { buildRig: buildRig, flapPose: flapPose, flapBob: flapBob, el: el, C: C, swayLeaves: swayLeaves, cloneLeaves: cloneLeaves, leafList: leafList, branchBend: branchBend, branchReach: branchReach,
    util: { clamp: clamp, lerp: lerp, seg: seg, sm: sm, eio: eio, eo: eo, ei: ei, backOut: backOut, bez: bez, spring: spring, wobble: wobble } };

  /* =====================================================================
     Controller. Two stagings, picked by where the hero branch sits:
     A (branch on the right, desktop): she crosses the page from the left over the headline, lands facing right,
       the glint lights up behind her, she hops round to face it, the glint opens the page.
     B (branch on the left, phones): she comes in from the right and notices the glint in flight, lands facing it.
     Everything is a function of t (seconds): renderAt(t).
     ===================================================================== */
  var TA = { enter: .12, cruise: .56, glideEnd: .82, brake: 1.02, legs: 1.3, flare: 1.34, contact: 1.5, fold1: 1.64, fold2: 1.84, foldEnd: 2.04,
             glint: 1.86, notice: 1.98, turn: 2.08, turnEnd: 2.3, look: 2.34, burst: 2.62, end: 3.4 };
  var TB = { enter: .15, glint: .72, notice: .82, dive: .9, brake: 1.3, legs: 1.42, flare: 1.6, contact: 1.72,
             fold1: 1.86, fold2: 2.06, foldEnd: 2.28, look: 2.32, burst: 2.52, end: 3.3 };
  var T = TA;

  var body = document.body;
  var intro = document.getElementById('intro');
  var hero = document.getElementById('heroBird');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var force = !!window.INTRO_FORCE || /[?&]intro=(always|hold)\b/.test(location.search);
  var seen = false;
  try { seen = sessionStorage.getItem('40ka-intro') === '1' && !body.classList.contains('reloaded'); } catch (e) {}   // once per visit; a reload shows it again

  function startPage() { body.classList.remove('intro-wait'); body.classList.add('bird-ready'); }
  if (!intro || !hero || reduce || (seen && !force)) {
    if (intro) intro.remove();
    body.classList.add('intro-skip');
    if (body.classList.contains('returning')) body.classList.add('arrived', 'intro-done');
    startPage();
    return;
  }
  try { sessionStorage.setItem('40ka-intro', '1'); } catch (e) {}
  body.style.overflow = 'hidden';

  /* ---------- overlay scene ---------- */
  var svg = intro.querySelector('svg');
  var defs = el('defs', {}, svg);
  var grad = el('linearGradient', { id: 'sheenGrad', x1: 0, y1: 1, x2: 1, y2: 0 }, defs);
  [['0', '#5FD3C4'], ['.55', '#6A7CFF'], ['1', '#B48CFF']].forEach(function (st) { el('stop', { offset: st[0], 'stop-color': st[1] }, grad); });
  var filt = el('filter', { id: 'introBlur', filterUnits: 'userSpaceOnUse', x: -400, y: -400, width: 1300, height: 1000 }, defs);
  var blurNode = el('feGaussianBlur', { stdDeviation: '0 0' }, filt);
  var mask = el('mask', { id: 'introReveal', maskUnits: 'userSpaceOnUse' }, defs);
  var maskRect = el('rect', { x: 0, y: 0, fill: '#fff' }, mask);
  var maskHole = el('circle', { r: 0, fill: '#000' }, mask);

  var bg = el('rect', { x: 0, y: 0, fill: 'var(--bg, #ECECE8)', mask: 'url(#introReveal)' }, svg);
  var ring = el('circle', { r: 0, fill: 'none', stroke: 'var(--ink,#000)', 'stroke-width': 1.5, opacity: 0 }, svg);
  var branchG = el('g', {}, svg);
  // the hero's own branch (wood revealed through a mask that is drawn like a line), copied into the overlay
  var bwrap = hero.querySelector('.mp-branchwrap').cloneNode(true);
  var bmask = bwrap.querySelector('mask');
  bmask.setAttribute('id', 'introBranchMask');
  bwrap.querySelector('.mp-wood').setAttribute('mask', 'url(#introBranchMask)');
  branchG.appendChild(bwrap);
  var branch = bwrap.querySelector('.mp-branch');
  var branchLen = branch.getTotalLength ? branch.getTotalLength() : 420;
  var leaves = leafList(bwrap);
  branch.setAttribute('stroke-dasharray', branchLen);

  var glintG = el('g', { opacity: 0 }, svg);
  var glintRays = el('path', { d: 'M0,-34V-21M0,21V34M-34,0H-21M21,0H34', stroke: 'var(--ink,#000)', 'stroke-width': 1.5, 'stroke-linecap': 'round', fill: 'none' }, glintG);
  var STAR = 'M0,-16C1.6,-4 4,-1.6 16,0C4,1.6 1.6,4 0,16C-1.6,4 -4,1.6 -16,0C-4,-1.6 -1.6,-4 0,-16Z';
  el('path', { d: STAR, fill: 'url(#sheenGrad)' }, glintG);

  var rig = buildRig(svg, hero);
  var hint = document.getElementById('hint');
  intro.style.background = 'transparent';

  /* ---------- layout (recomputed on resize / font load) ---------- */
  var L = {};
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    [maskRect, bg].forEach(function (n) { n.setAttribute('width', vw); n.setAttribute('height', vh); });
    var R0 = hero.getBoundingClientRect();
    var R = { left: Math.round(R0.left), top: Math.round(R0.top), width: R0.width, height: R0.height };
    var s1 = R.width / 477.5, w0 = 477.5 * s1;
    L.vw = vw; L.vh = vh; L.s1 = s1;
    L.P1 = [R.left + C[0] * s1, R.top + C[1] * s1];
    branchG.setAttribute('transform', 'translate(' + R.left.toFixed(2) + ' ' + R.top.toFixed(2) + ') scale(' + s1.toFixed(4) + ')');
    L.reach = branchReach(bwrap, R, s1);
    leaves.forEach(function (Lf) { Lf.f = L.reach.at(Lf.x, Lf.y); });
    // glint: just above the end of the first headline word
    var line = document.querySelector('.hero__title .l'), word = line && line.firstElementChild;
    var lr = line ? line.getBoundingClientRect() : { left: vw * .2, top: vh * .3, height: 60, width: 200 };
    var tw = lr.width || 200;
    if (word && document.createRange) {
      var rg = document.createRange(); rg.selectNodeContents(word);
      var wr = rg.getBoundingClientRect(); if (wr.width) tw = wr.width;
    }
    var lh = lr.height || 60;
    L.G = [lr.left + tw + lh * .16, lr.top + lh * .2];
    L.gs = clamp(lh / 78, .5, 1.3);
    // staging
    L.mode = (R.left + R.width / 2) > vw * .5 ? 'A' : 'B';
    T = L.mode === 'A' ? TA : TB;
    if (L.mode === 'A') {
      L.d0 = .6;
      var minY = 230 * s1 * .85 + 12;                 // keep raised wing tips inside the screen
      L.P0 = [-w0 * .25, L.P1[1] + vh * .04];
      L.c1 = [vw * .32, Math.max(L.P1[1] - vh * .06, minY)];
      L.c2 = [L.P1[0] - w0 * .5, Math.max(L.P1[1] - w0 * .2, minY)];
    } else {
      L.d0 = .42;
      L.P0 = [vw + (477.5 - C[0]) * s1 * L.d0 * .2, Math.max(vh * .1, L.P1[1] - vh * .42)];
      L.c1 = [L.P1[0] + Math.min(vw * .14, w0 * .42), L.P1[1] - w0 * .2];
      L.c2 = [L.P1[0] + w0 * .1, L.P1[1] + w0 * .2];
    }
    L.Rmax = Math.max(Math.hypot(L.G[0], L.G[1]), Math.hypot(vw - L.G[0], L.G[1]), Math.hypot(L.G[0], vh - L.G[1]), Math.hypot(vw - L.G[0], vh - L.G[1])) + 20;
    maskHole.setAttribute('cx', L.G[0]); maskHole.setAttribute('cy', L.G[1]);
    ring.setAttribute('cx', L.G[0]); ring.setAttribute('cy', L.G[1]);
  }

  /* ---------- path timing: q(t) 0..1 along the flight curve ---------- */
  function qAt(t) {
    if (t <= T.enter) return 0;
    if (t >= T.contact) return 1;
    if (L.mode === 'A') {
      if (t < T.brake) { var a = seg(t, T.enter, T.brake); return lerp(0, .72, a * (1.1 - .1 * a)); }
      var c0 = seg(t, T.brake, T.contact); return lerp(.72, 1, 1 - Math.pow(1 - c0, 1.7));
    }
    if (t < T.dive) { var a2 = seg(t, T.enter, T.dive); return lerp(0, .44, a2 * (1.15 - .15 * a2)); }
    if (t < T.brake) { var b = seg(t, T.dive, T.brake); return lerp(.44, .8, b * (.85 + .15 * b)); }
    var c = seg(t, T.brake, T.contact); return lerp(.8, 1, 1 - Math.pow(1 - c, 2.4));
  }
  function posAt(t) { return bez(L.P0, L.c1, L.c2, L.P1, qAt(t)); }

  /* ---------- wingbeat clock ---------- */
  function beatPhase(t) {
    function b(t0, per, base) { var n = Math.max(0, (t - t0) / per); return { u: n % 1, amp: 1, i: base + Math.floor(n) }; }
    if (L.mode === 'A') {
      // steady beats across the page; a short glide at the top of the arc; braking beats into the perch
      // whole cycles only, so the phase never jumps: 2 beats, glide, 1 beat, 2 braking beats
      if (t < T.cruise) return b(T.enter, .22, 0);
      if (t < T.glideEnd) return { u: 0, amp: 0, i: 2 };
      if (t < T.brake) return b(T.glideEnd, .2, 3);
      return b(T.brake, .16, 5);
    }
    if (t < T.dive) return b(T.enter, .19, 0);
    if (t < T.brake) return { u: 0, amp: 0, i: 4 };
    return b(T.brake, .16, 5);
  }
  function ampAt(t) {
    if (L.mode === 'A') {
      return 1 - sm(seg(t, T.cruise - .02, T.cruise + .08)) * (1 - sm(seg(t, T.glideEnd - .06, T.glideEnd + .02)));
    }
    var a = 1;
    if (t >= T.dive - .06 && t < T.brake) a = 1 - sm(seg(t, T.dive - .06, T.dive + .06));
    if (t >= T.brake && t < T.brake + .06) a = sm(seg(t, T.brake, T.brake + .06));
    return a;
  }

  function pitchAt(t) {
    var A = L.mode === 'A';
    var Pb = posAt(t - 1 / 60), Pf = posAt(t + 1 / 60);
    var dx = Pf[0] - Pb[0], dy = Pf[1] - Pb[1], v = Math.hypot(dx, dy) * 30;
    var face = A ? (t >= T.turn && seg(t, T.turn, T.turnEnd) >= .5 ? 1 : -1) : 1;
    var dirAng = v > 1 ? Math.atan2(-dy, -face * dx) * 180 / Math.PI : 0;
    var pitch = clamp(dirAng, -38, 30) * .75;
    pitch = lerp(pitch, 24, sm(seg(t, T.brake + .05, T.contact - .04)));
    if (t >= T.contact) pitch = 24 * (1 - spring(t - T.contact, 2.1, .42));
    if (A && t >= T.turn) pitch += 8 * Math.sin(Math.PI * seg(t, T.turn, T.turnEnd)) + 4 * wobble(t - T.turnEnd, 2.6, 7);
    return pitch;
  }
  function state(t) {
    var st = { s: L.s1, rot: 0, bob: 0, head: 0, tail: 0, fan: 0, legRot: -60, legS: .4, legOp: 0, patch: 0, blink: 0, pdx: 0, pdy: 0, blur: 0, blurAng: 0, blurNode: blurNode, flip: 1, hop: 0 };
    var A = L.mode === 'A';
    var P = posAt(t), Pb = posAt(t - 1 / 60), Pf = posAt(t + 1 / 60);
    var dx = Pf[0] - Pb[0], dy = Pf[1] - Pb[1], v = Math.hypot(dx, dy) * 30;      // px/s
    var tau = qAt(t);
    st.s = L.s1 * lerp(L.d0, 1, eo(clamp(tau / .94, 0, 1)));
    st.x = P[0] - C[0] * st.s; st.y = P[1] - C[1] * st.s;
    st.op = sm(seg(t, T.enter - .04, T.enter + .1));

    // facing: A flies to the right (mirrored) until the hop-turn on the branch
    var face = A ? -1 : 1;
    if (A && t >= T.turn) {
      var tk = seg(t, T.turn, T.turnEnd);
      face = tk < .5 ? -1 : 1;
      st.flip = face * (1 - .42 * Math.sin(Math.PI * tk));
      st.hop = -18 * Math.sin(Math.PI * tk);
    } else st.flip = face;

    // pitch (nose-up +) follows the flight direction, then the flare lifts the nose
    var flare = sm(seg(t, T.brake + .05, T.contact - .04));
    st.rot = pitchAt(t);
    if (t >= T.contact) { var tc = t - T.contact; st.bob = 9 * wobble(tc, 2.4, 5.5) * (tc < .05 ? tc / .05 : 1); }
    st.headLock = t < T.contact ? .6 : .72;

    // wings
    var bp = beatPhase(t), amp = ampAt(t), w;
    if (t < T.flare) {
      w = flapPose(bp.u, amp, bp.i);
      if (!A && t >= T.dive - .06 && t < T.brake + .06) {
        var tuck = sm(seg(t, T.dive - .04, T.dive + .1)) * (1 - sm(seg(t, T.brake - .06, T.brake + .04)));
        w = { p: lerp(w.p, .5, tuck), th: lerp(w.th, 34, tuck), flex: lerp(w.flex, 46, tuck), c: lerp(1, .82, tuck) };
      }
      if (t >= T.brake) {
        var fwd = sm(seg(t, T.brake, T.brake + .2));
        w.th = w.th - 22 * fwd; w.flex = Math.min(w.flex, 30);
      }
      if (amp > .01 && t < T.brake) st.bob += flapBob(bp.u, amp);
    } else if (t < T.contact + .1) {
      var hold = sm(seg(t, T.flare, T.flare + .08));
      var bpF = beatPhase(T.flare), pre = flapPose(bpF.u, 1, bpF.i);
      w = { p: lerp(pre.p, .97, hold), th: lerp(-26, -10, sm(seg(t, T.contact, T.contact + .1))), flex: -6 };
    } else {
      var f1 = eio(seg(t, T.contact + .1, T.fold1 + .06)), f2 = eio(seg(t, T.fold2 - .02, T.foldEnd));
      w = { p: lerp(lerp(.97, .85, f1), .36, f2), th: lerp(lerp(-10, 52, f1), 98, f2), flex: lerp(lerp(-6, 24, f1), 10, f2), c: lerp(lerp(1, .8, f1), .38, f2) };
      // she finds her balance: a quick small flutter of the half-open wings before they fold away
      var bal = wobble(t - T.contact - .06, 6.5, 8) * (1 - f2);
      w.p += .2 * bal; w.th += 9 * bal; w.flex += 8 * bal;
      st.patch = eo(seg(t, T.foldEnd - .1, T.foldEnd + .02));
      w.op = st.patch > .55 ? 0 : 1;
      if (A && t >= T.turn - .04 && t < T.turnEnd + .08) {
        // a flick of the wings carries the hop-turn
        var wk = Math.sin(Math.PI * seg(t, T.turn - .04, T.turnEnd + .08));
        w = { p: lerp(.36, .8, wk), th: lerp(98, 40, wk), flex: lerp(10, 30, wk), c: lerp(.38, .85, wk) };
        st.patch = 1 - sm(clamp(wk * 3, 0, 1));
        w.op = st.patch > .55 ? 0 : 1;
      }
    }
    if (w.op == null) w.op = 1;
    if (w.op > 0) w.op = Math.abs(w.p) < .06 ? 0 : 1;
    st.wn = w;
    st.wf = { p: w.p * .9, th: w.th - 7, flex: w.flex, c: w.c, op: w.op, sheen: 0 };

    // tail: rudder in flight, fanned brake, flicks after landing and after the turn
    var tailFlight = -3.6 * Math.sin(2 * Math.PI * (beatPhase(t).u + .25 - .12)) * (t < T.brake ? amp : 0);
    st.tail = tailFlight + 20 * flare * (t < T.contact ? 1 : 1 - sm(seg(t, T.contact, T.contact + .22)));
    st.fan = t < T.contact ? flare : 1 - sm(seg(t, T.contact + .05, T.contact + .3));
    if (t >= T.contact) st.tail += -14 * wobble(t - T.contact - .04, 2.6, 5) + -11 * wobble(t - (A ? T.turnEnd : T.look), 3.2, 7);
    st.tail += .5 * (pitchAt(t - .09) - st.rot) * (1 - sm(seg(t, T.end - .45, T.end - .15)));   // follow-through: the tail trails the body

    // legs
    st.legOp = sm(seg(t, T.legs - .04, T.legs + .06));
    var lf = sm(seg(t, T.legs, T.contact - .06));
    st.legRot = lerp(-60, 22, lf); st.legS = lerp(.4, 1, lf);
    if (t >= T.contact - .06) { st.legRot = lerp(22, 0, sm(seg(t, T.contact - .06, T.contact + .04))); st.legS = 1; }
    if (t >= T.contact) st.legS = 1 - .06 * wobble(t - T.contact, 2.4, 6) - (A ? .1 * Math.sin(Math.PI * seg(t, T.turn - .05, T.turn + .05)) : 0);
    st.plant = sm(seg(t, T.contact - .03, T.contact + .02));
    if (A && t >= T.turn - .06 && t < T.turnEnd + .06) st.plant *= 1 - Math.sin(Math.PI * seg(t, T.turn - .06, T.turnEnd + .06));
    var spread = sm(seg(t, T.legs, T.contact - .1)) * (1 - sm(seg(t, T.contact - .04, T.contact + .02)));
    var grip = sm(seg(t, T.contact - .02, T.contact + .04)) * (1 - sm(seg(t, T.contact + .25, T.foldEnd)));
    st.toe = t < T.legs ? 1 : (1 - sm(seg(t, T.legs, T.legs + .12))) - .3 * spread + .28 * grip;

    // head & eye: steady in flight, notices the glint, looks at it from the branch
    var exL = C[0] + face * (101 - C[0]);                         // eye x in rig space after facing
    var ex = st.x + exL * st.s, ey = st.y + 34 * st.s;
    var gx = L.G[0] - ex, gy = L.G[1] - ey;
    var gAng = Math.atan2(-gy, -face * gx) * 180 / Math.PI;        // + = target above the beak line
    var facingGlint = (face === 1) === (gx < 0);
    var look = facingGlint ? clamp(gAng - st.rot, -6, 6) : 0;
    var notice = sm(seg(t, T.notice, T.notice + .08));
    var gaze;
    if (A) gaze = sm(seg(t, T.look - .06, T.look + .1));
    else gaze = Math.max(notice * (1 - sm(seg(t, T.brake, T.brake + .15))), sm(seg(t, T.look, T.look + .12)));
    var settle = 1 - sm(seg(t, T.end - .4, T.end - .12));     // back to the hero pose for the hand-off
    gaze *= settle;
    st.head = (clamp(-st.rot * .3, -5, 5) * (1 - gaze) + look * gaze) * settle;
    if (A) st.head += 5 * wobble(t - T.notice, 3, 8);                // startled twitch before turning round
    var gl = Math.hypot(gx, gy) || 1;
    st.pdx = face * (gx / gl) * 1.3 * Math.max(gaze, .25); st.pdy = (gy / gl) * 1.1 * Math.max(gaze, .25);
    if (!facingGlint) { st.pdx = 1.2; st.pdy = 0; }
    st.pdx *= settle; st.pdy *= settle;
    st.blink = Math.max(1 - Math.abs(t - (T.notice + .06)) / .05, 1 - Math.abs(t - (T.look + .2)) / .06, 0);

    // motion blur from on-screen speed
    var blurPx = clamp((v - 900) / 320, 0, 4.5);
    if (blurPx > .05) { st.blur = blurPx / st.s; st.blurAng = Math.atan2(dy, face * dx) * 180 / Math.PI; }
    st.y += st.hop * st.s;
    return st;
  }

  function bendAt(t) {
    var b = t >= T.contact ? 7 * wobble(t - T.contact, 2.2, 4.2) : 0;
    if (L.mode === 'A') b += 3.5 * wobble(t - T.turn, 3, 6) + 4.5 * wobble(t - T.turnEnd, 2.6, 5);
    return b;
  }
  function renderAt(t) {
    var A = L.mode === 'A';
    // the branch grows in from the edge of the screen (the part beyond the edge counts as already there)
    var off = L.reach ? L.reach.off : 0;
    var drawn = off + (1 - off) * eio(seg(t, 0, .42));
    branch.setAttribute('stroke-dashoffset', (branchLen * (1 - drawn)).toFixed(1));
    var bend = bendAt(t);
    bwrap.setAttribute('transform', branchBend(bwrap, bend));
    swayLeaves(leaves, bendAt, t, 0, function (Lf) {
      var x0 = Math.min(Lf.f != null ? Lf.f : Lf.x / 412, .9);   // a leaf unfolds once the line reaches it
      return Math.max(.001, backOut(seg(drawn, x0, x0 + .1), 2));
    });
    var st = state(t);
    if (t >= T.contact && st.hop === 0) st.y += bend * L.s1;
    rig.set(st);
    // glint
    var gOn = eo(seg(t, T.glint, T.glint + .18)), gBurst = seg(t, T.burst - .06, T.burst + .1);
    var twinkle = 1 + .12 * Math.sin((t - T.glint) * 9) * (1 - gBurst);
    var gScale = L.gs * (backOut(gOn, 2.2) * twinkle + 2.2 * eo(gBurst));
    var gRot = 45 * eo(gOn) + 90 * eo(gBurst) + (t - T.glint) * 20;
    glintG.setAttribute('transform', 'translate(' + L.G[0].toFixed(1) + ' ' + L.G[1].toFixed(1) + ') rotate(' + gRot.toFixed(1) + ') scale(' + Math.max(gScale, .001).toFixed(3) + ')');
    glintG.setAttribute('opacity', (gOn * (1 - sm(gBurst))).toFixed(3));
    glintRays.setAttribute('opacity', ((.3 + .7 * Math.max(sm(seg(t, T.notice, T.notice + .1)) * .6, sm(seg(t, T.look, T.burst)))) * (1 - sm(seg(t, T.burst - .04, T.burst + .06)))).toFixed(3));
    // reveal from the glint
    var rv = seg(t, T.burst + .02, T.end - .06), r = L.Rmax * eio(rv) + (rv > 0 ? 40 * L.gs : 0);
    maskHole.setAttribute('r', r.toFixed(1));
    ring.setAttribute('r', r.toFixed(1));
    ring.setAttribute('opacity', (rv > 0 ? (1 - sm(seg(rv, .35, .9))) : 0).toFixed(3));
    if (hint) hint.style.opacity = (.75 * sm(seg(t, 1.0, 1.4)) * (1 - sm(seg(t, T.burst - .2, T.burst)))).toFixed(3);
  }

  /* ---------- playback ---------- */
  var t0 = null, raf = null, done = false, pageOn = false;
  function onPage() {
    if (pageOn) return; pageOn = true;
    body.classList.add('intro-done');
    body.classList.remove('intro-wait');      // headline lines are already rising when the circle reaches them
  }
  var parent = intro.parentNode, next = intro.nextSibling;
  function finish(skipped) {
    if (done) return; done = true;
    if (raf) cancelAnimationFrame(raf);
    onPage();
    body.classList.add('arrived');
    startPage();
    body.style.overflow = '';
    if (skipped) { intro.classList.add('done'); setTimeout(function () { if (done) intro.remove(); }, 400); }
    else intro.remove();
  }
  /* replay in place (used by the preview page): put the page back into its pre-intro state and play again */
  function replay() {
    if (!done) return;
    if (window.__flight) window.__flight.settle('branch');
    window.scrollTo({ top: 0, behavior: 'instant' });
    ['arrived', 'intro-done', 'bird-ready', 'flying'].forEach(function (c) { body.classList.remove(c); });
    body.classList.add('intro-wait');
    document.querySelectorAll('.hero__title .l > span').forEach(function (n) {
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';      // restart their entrance
    });
    intro.classList.remove('done');
    if (!intro.parentNode) parent.insertBefore(intro, next);
    body.style.overflow = 'hidden';
    done = false; pageOn = false; t0 = null;
    layout(); renderAt(0);
    raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (t0 == null) t0 = now;
    var t = (now - t0) / 1000;
    if (t >= T.burst - .3) onPage();
    if (t >= T.end) { renderAt(T.end); finish(false); return; }
    renderAt(t);
    raf = requestAnimationFrame(tick);
  }
  layout();
  renderAt(0);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!done) layout(); });
  window.addEventListener('resize', function () { if (!done) layout(); });
  intro.addEventListener('click', function () { finish(true); });
  // QA hook: ?intro=hold leaves the timeline paused; window.__intro.renderAt(t) draws any moment
  window.__intro = { renderAt: function (t) { layout(); renderAt(t); }, T: function () { return T; }, mode: function () { return L.mode; }, finish: finish, replay: replay };
  if (/[?&]intro=hold\b/.test(location.search)) return;
  raf = requestAnimationFrame(tick);
})();
