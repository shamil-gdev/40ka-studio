/* 40ka — the magpie stays with the visitor.
   Scroll down: she takes off from the hero branch and flies into the logo in the header.
   Scroll back to the top: she leaves the logo, flies down and lands on her branch again.
   Flights are time-based (never scrubbed by the scroll), so she always flies beak-first at her own pace.
   Uses the rig from intro.js (window.MagpieIntro). */
(function () {
  var M = window.MagpieIntro;
  var body = document.body;
  var hero = document.getElementById('heroBird');
  var markSvg = document.querySelector('.mark__bird');
  var markLink = document.querySelector('.mark');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || !hero || !markSvg || !markLink || reduce) return;   // CSS fallback: .scrolled shows the logo bird

  var U = M.util, el = M.el, C = M.C;
  var clamp = U.clamp, lerp = U.lerp, seg = U.seg, sm = U.sm, eo = U.eo, eio = U.eio, bez = U.bez, spring = U.spring, wobble = U.wobble;
  var VB_W = 477.5, VB_H = 214.6, LOGO_W = 84;
  var DOWN_AT = 120, UP_AT = 40;           // scroll thresholds (px) with hysteresis

  body.classList.add('flight-on');

  /* ---------- overlay above the header ---------- */
  var layer = document.createElement('div');
  layer.className = 'flight-layer'; layer.setAttribute('aria-hidden', 'true');
  var svg = el('svg', { xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: 'none' }, layer);
  body.appendChild(layer);
  var defs = el('defs', {}, svg);
  var filt = el('filter', { id: 'flightBlur', filterUnits: 'userSpaceOnUse', x: -400, y: -400, width: 1300, height: 1000 }, defs);
  var blurNode = el('feGaussianBlur', { stdDeviation: '0 0' }, filt);
  var rig = M.buildRig(svg, hero, { prefix: 'flight', blurId: 'flightBlur' });

  var heroBranch = hero.querySelector('.mp-branchwrap');
  var heroLeaves = M.leafList(hero);
  var FOLDED = { p: .36, th: 98, flex: 10, c: .38, op: 0 };

  /* ---------- live geometry ---------- */
  function heroFrame() {
    var R = hero.getBoundingClientRect(), s = R.width / VB_W;
    return { s: s, P: [R.left + C[0] * s, R.top + C[1] * s] };
  }
  function logoFrame() {
    // where the logo bird sits once its slot is open (the slot is the first item of the .mark link)
    var R = markLink.getBoundingClientRect(), s = LOGO_W / VB_W;
    var top = R.top + (R.height - VB_H * s) / 2;
    return { s: s, P: [R.left + C[0] * s, top + C[1] * s] };
  }
  function size() {
    svg.setAttribute('viewBox', '0 0 ' + window.innerWidth + ' ' + window.innerHeight);
  }

  /* ---------- flight timelines ---------- */
  var TL = { crouch: .14, flare: .94, contact: 1.1, end: 1.24, slotOpen: .38 };       // branch -> logo
  var TB = { turn: .18, flare: .98, legs: .9, contact: 1.2, fold: 1.42, turn2: 1.5, turn2End: 1.7, end: 1.95, slotClose: .46 }; // logo -> branch

  function base() {
    return { rot: 0, bob: 0, head: 0, tail: 0, fan: 0, legRot: 0, legS: 1, legOp: 1, patch: 1, blink: 0, pdx: 0, pdy: 0, blur: 0, blurAng: 0, blurNode: blurNode, flip: 1, hop: 0, op: 1,
             wn: Object.assign({}, FOLDED), wf: Object.assign({}, FOLDED) };
  }
  // the last moments of a flight ease every part back to the drawn pose, so the hand-off is exact
  function rest(st, k) {
    if (k <= 0) return st;
    ['rot', 'bob', 'head', 'tail', 'fan', 'legRot', 'pdx', 'pdy', 'blur'].forEach(function (n) { st[n] = (st[n] || 0) * (1 - k); });
    st.legS = lerp(st.legS == null ? 1 : st.legS, 1, k);
    return st;
  }
  function place(st, P, s) { st.s = s; st.x = P[0] - C[0] * s; st.y = P[1] - C[1] * s; }
  function wingsFrom(st, w) { st.wn = w; st.wf = { p: w.p * .9, th: w.th - 7, flex: w.flex, c: w.c, op: w.op }; }
  function heading(dx, dy, face) { return Math.hypot(dx, dy) > .5 ? Math.atan2(-dy, -face * dx) * 180 / Math.PI : 0; }

  // branch -> logo. f.L0: launch point (screen) captured when she leaves the branch.
  function toLogo(t, f) {
    var st = base(), H = heroFrame(), G = logoFrame();
    if (t < TL.crouch) {
      // anticipation on the branch: crouch, tail up, wings lift
      var k = sm(t / TL.crouch);
      place(st, H.P, H.s);
      st.bob = 7 * k; st.rot = -7 * k; st.tail = -10 * k; st.legS = 1 - .12 * k;
      var w = { p: lerp(.36, .62, k), th: lerp(98, 58, k), flex: lerp(10, 26, k), c: lerp(.38, .72, k), op: k > .3 ? 1 : 0 };
      wingsFrom(st, w); st.patch = 1 - sm(clamp(k * 2, 0, 1));
      f.L0 = H.P; f.s0 = H.s;
      return st;
    }
    var L0 = f.L0 || H.P, s0 = f.s0 || H.s, L1 = G.P;
    var dx = L1[0] - L0[0], dy = L1[1] - L0[1];
    var c1 = [L0[0] + dx * .3, L0[1] + dy * .15 - 30];
    var c2 = [L0[0] + dx * .75, L1[1] + Math.abs(dy) * .25 + 10];   // she rises into the logo at the end
    var tau = seg(t, TL.crouch, TL.contact);
    var q = .35 * tau + .65 * sm(tau);
    var P = bez(L0, c1, c2, L1, q), Pa = bez(L0, c1, c2, L1, clamp(q - .01, 0, 1)), Pb = bez(L0, c1, c2, L1, clamp(q + .01, 0, 1));
    var s = s0 * Math.pow(G.s / s0, Math.pow(q, 1.5));
    place(st, P, s);
    var flare = sm(seg(t, TL.flare, TL.contact - .02));
    st.rot = clamp(heading(Pb[0] - Pa[0], Pb[1] - Pa[1], 1), -30, 28) * .6 * (1 - flare) + 18 * flare;
    if (t >= TL.contact) st.rot = 18 * (1 - spring(t - TL.contact, 3, .45));
    // launch push, then legs tucked; forward again for the landing on the logo branch
    var tl = t - TL.crouch;
    st.legS = tl < .06 ? 1.06 : 1;
    st.legOp = 1 - sm(seg(tl, .04, .14)) + sm(seg(t, TL.flare - .04, TL.flare + .06));
    st.legRot = lerp(0, -60, sm(seg(tl, .02, .14))) * (1 - sm(seg(t, TL.flare - .04, TL.contact - .02))) + 18 * sm(seg(t, TL.flare - .04, TL.contact - .06)) * (1 - sm(seg(t, TL.contact - .04, TL.contact + .04)));
    if (st.legOp > 1) st.legOp = 1;
    // wings: strong beats, a short glide, the flare, then folded
    var w2;
    if (t < TL.flare) {
      var u = (tl / .17) % 1, amp = 1 - .7 * sm(seg(t, .62, .7)) * (1 - sm(seg(t, .78, .84)));
      w2 = M.flapPose(u, amp); w2.op = 1;
      st.bob = amp * (u < .55 ? -4 * Math.sin(Math.PI * u / .55) : 2.4 * Math.sin(Math.PI * (u - .55) / .45));
      st.tail = -3 * Math.sin(2 * Math.PI * (u + .25));
      st.patch = 0;
    } else if (t < TL.contact + .02) {
      var h = sm(seg(t, TL.flare, TL.flare + .08));
      w2 = { p: lerp(.8, .96, h), th: lerp(6, -24, h), flex: -4, op: 1 };
      st.tail = 16 * flare; st.fan = flare; st.patch = 0;
    } else {
      var fk = eio(seg(t, TL.contact + .02, TL.end - .02));
      w2 = { p: lerp(.96, .36, fk), th: lerp(-24, 98, fk), flex: lerp(-4, 10, fk), c: lerp(1, .38, fk) };
      st.patch = eo(seg(fk, .75, 1)); w2.op = st.patch > .55 ? 0 : 1;
      st.tail = 16 * (1 - fk) - 8 * wobble(t - TL.contact, 4, 9);
      st.fan = 1 - fk;
    }
    if (w2.op && Math.abs(w2.p) < .06) w2.op = 0;
    wingsFrom(st, w2);
    st.head = clamp(-st.rot * .3, -5, 5);
    var v = Math.hypot(Pb[0] - Pa[0], Pb[1] - Pa[1]) / .02 / (TL.contact - TL.crouch) * (tau < 1 ? 1 : 0);
    var bl = clamp((v - 1100) / 360, 0, 3.5);
    if (bl > .05) { st.blur = bl / st.s; st.blurAng = Math.atan2(Pb[1] - Pa[1], Pb[0] - Pa[0]) * 180 / Math.PI; }
    return rest(st, sm(seg(t, TL.end - .1, TL.end)));
  }
  function bendToLogo(t) {
    // pressed down by the crouch, flung up by the take-off, then rings out
    if (t < TL.crouch) return 3.5 * sm(t / TL.crouch);
    var b = 3.5 * (1 - sm(seg(t, TL.crouch, TL.crouch + .05))) - 6 * wobble(t - TL.crouch, 2.3, 3.6);
    return b * (1 - sm(seg(t, TL.end - .2, TL.end)));
  }

  // logo -> branch. f.L1: launch point at the logo.
  function toBranch(t, f) {
    var st = base(), H = heroFrame(), G = logoFrame();
    if (f.ox || f.oy) G.P = [G.P[0] + (f.ox || 0), G.P[1] + (f.oy || 0)];
    if (t < TB.turn) {
      // decide the staging: a long sideways trip (desktop) turns round to fly beak-first;
      // a mostly vertical drop (phones) just steps off the logo facing the page as drawn
      var ddx = H.P[0] - G.P[0], ddy = H.P[1] - G.P[1];
      f.turns = ddx > 0 && Math.abs(ddx) > .6 * Math.abs(ddy);
      var from = f.startFace || 1, to = f.turns ? -1 : 1;
      var k = seg(t, 0, TB.turn), face = from === to ? from : (k < .5 ? from : to);
      place(st, G.P, G.s);
      st.flip = from === to ? from : face * (1 - .42 * Math.sin(Math.PI * k)); st.hop = -16 * Math.sin(Math.PI * k);
      var wk = Math.sin(Math.PI * k);
      wingsFrom(st, { p: lerp(.36, .8, wk), th: lerp(98, 40, wk), flex: lerp(10, 30, wk), c: lerp(.38, .85, wk), op: wk > .25 ? 1 : 0 });
      st.patch = wk > .25 ? 0 : 1;
      st.y += st.hop * st.s;
      f.L1 = G.P; f.sL = G.s;
      return st;
    }
    var L1 = f.L1 || G.P, sL = f.sL || G.s, Lh = H.P, w0 = VB_W * H.s;
    var dx = Lh[0] - L1[0], dy = Lh[1] - L1[1];
    var c1 = [L1[0] + dx * .25, L1[1] + Math.max(dy * .15, 24)];
    var c2 = f.turns === false ? [Lh[0] - dx * .15, Lh[1] - Math.max(dy * .45, 40)]
                               : [Math.max(Lh[0] - w0 * .5, L1[0] + dx * .5), Lh[1] - Math.min(w0 * .2, Math.max(dy * .5, 40))];
    var tau = seg(t, TB.turn, TB.contact);
    var q = 1 - Math.pow(1 - sm(tau) * .3 - tau * .7, 1.6);
    q = clamp(q, 0, 1);
    var P = bez(L1, c1, c2, Lh, q), Pa = bez(L1, c1, c2, Lh, clamp(q - .01, 0, 1)), Pb = bez(L1, c1, c2, Lh, clamp(q + .01, 0, 1));
    var s = sL * Math.pow(H.s / sL, Math.pow(q, 1.2));
    place(st, P, s);
    var turns = f.turns !== false;
    var face = turns && t < TB.turn2 ? -1 : 1;
    if (turns && t >= TB.turn2) {
      var tk = seg(t, TB.turn2, TB.turn2End);
      face = tk < .5 ? -1 : 1;
      st.flip = face * (1 - .42 * Math.sin(Math.PI * tk)); st.hop = -18 * Math.sin(Math.PI * tk);
    } else st.flip = face;
    var flare = sm(seg(t, TB.flare, TB.contact - .02));
    st.rot = clamp(heading(Pb[0] - Pa[0], Pb[1] - Pa[1], face), -32, 26) * .7 * (1 - flare) + 22 * flare;
    if (t >= TB.contact) st.rot = 22 * (1 - spring(t - TB.contact, 2.1, .42)) + (turns ? 8 * Math.sin(Math.PI * seg(t, TB.turn2, TB.turn2End)) : 0);
    if (t >= TB.contact) st.bob = 8 * wobble(t - TB.contact, 2.4, 5.5);
    // legs
    st.legOp = t < TB.turn + .08 ? 1 - sm(seg(t, TB.turn, TB.turn + .08)) : sm(seg(t, TB.legs - .04, TB.legs + .06));
    st.legRot = t < TB.legs ? -60 : lerp(22, 0, sm(seg(t, TB.contact - .06, TB.contact + .04)));
    st.legS = t < TB.legs ? .4 : 1;
    if (t >= TB.legs && t < TB.contact - .06) st.legRot = lerp(-60, 22, sm(seg(t, TB.legs, TB.contact - .1)));
    // wings
    var w2;
    if (t < TB.flare) {
      var u = ((t - TB.turn) / .19) % 1, amp = 1 - .8 * sm(seg(t, .5, .58)) * (1 - sm(seg(t, .74, .8)));
      w2 = M.flapPose(u, amp); w2.op = 1;
      st.bob = amp * (u < .55 ? -4 * Math.sin(Math.PI * u / .55) : 2.4 * Math.sin(Math.PI * (u - .55) / .45));
      st.tail = -3 * Math.sin(2 * Math.PI * (u + .25)); st.patch = 0;
    } else if (t < TB.contact + .1) {
      var h = sm(seg(t, TB.flare, TB.flare + .08));
      w2 = { p: lerp(.8, .97, h), th: lerp(6, -26, h) + 16 * sm(seg(t, TB.contact, TB.contact + .1)), flex: -6, op: 1 };
      st.tail = 20 * flare * (t < TB.contact ? 1 : 1 - sm(seg(t, TB.contact, TB.contact + .2))); st.fan = flare; st.patch = 0;
    } else {
      var fk = eio(seg(t, TB.contact + .1, TB.fold));
      w2 = { p: lerp(.97, .36, fk), th: lerp(-10, 98, fk), flex: lerp(-6, 10, fk), c: lerp(1, .38, fk) };
      st.patch = eo(seg(fk, .75, 1)); w2.op = st.patch > .55 ? 0 : 1;
      if (turns && t >= TB.turn2 - .04 && t < TB.turn2End + .08) {
        var wk2 = Math.sin(Math.PI * seg(t, TB.turn2 - .04, TB.turn2End + .08));
        w2 = { p: lerp(.36, .8, wk2), th: lerp(98, 40, wk2), flex: lerp(10, 30, wk2), c: lerp(.38, .85, wk2) };
        st.patch = 1 - sm(clamp(wk2 * 3, 0, 1)); w2.op = st.patch > .55 ? 0 : 1;
      }
      st.tail = -14 * wobble(t - TB.contact - .04, 2.6, 5) - 11 * wobble(t - (turns ? TB.turn2End : TB.turn2), 3.2, 7);
      st.fan = 1 - sm(seg(t, TB.contact + .05, TB.contact + .3));
    }
    if (w2.op && Math.abs(w2.p) < .06) w2.op = 0;
    wingsFrom(st, w2);
    st.head = clamp(-st.rot * .3, -5, 5) * (1 - sm(seg(t, TB.end - .3, TB.end - .1)));
    st.pdx = 0;
    var v = Math.hypot(Pb[0] - Pa[0], Pb[1] - Pa[1]) / .02 / (TB.contact - TB.turn) * (tau < 1 ? 1 : 0);
    var bl = clamp((v - 1100) / 360, 0, 3.5);
    if (bl > .05) { st.blur = bl / st.s; st.blurAng = Math.atan2(Pb[1] - Pa[1], face * (Pb[0] - Pa[0])) * 180 / Math.PI; }
    st.y += st.hop * st.s;
    // ride the branch once she is on it
    if (t >= TB.contact && st.hop === 0) st.y += bendToBranch(t) * H.s * (1 - sm(seg(t, TB.end - .1, TB.end)));
    return rest(st, sm(seg(t, TB.end - .1, TB.end)));
  }
  function bendToBranch(t) {
    if (t < TB.contact) return 0;
    var b = 7 * wobble(t - TB.contact, 2.2, 4.2) + 3.5 * wobble(t - TB.turn2, 3, 6) + 4.5 * wobble(t - TB.turn2End, 2.6, 5);
    return b * (1 - sm(seg(t, TB.end - .16, TB.end)));
  }

  /* ---------- branch and leaves on the page ---------- */
  function setBranch(bendAt, t) {
    var b = bendAt(t);
    heroBranch.setAttribute('transform', 'translate(0 ' + b.toFixed(2) + ')');
    M.swayLeaves(heroLeaves, bendAt, t, 0);
  }
  function restBranch() {
    heroBranch.removeAttribute('transform');
    M.swayLeaves(heroLeaves, function () { return 0; }, 0, 0);
  }

  /* ---------- state machine ---------- */
  var state = 'branch', flight = null, raf = null, enabled = false;
  function setClasses(name, on) { body.classList.toggle(name, !!on); }

  var barEl = document.getElementById('bar');
  function ink(st) {
    // over the dark version of the bar the magpie is drawn light, like the logo there
    var cy = st.y + C[1] * st.s, b = barEl ? barEl.getBoundingClientRect() : null;
    var dark = b && barEl.classList.contains('on-dark') && cy < b.bottom;
    if (dark) { svg.style.setProperty('--ink', '#fff'); svg.style.setProperty('--bg', '#000'); }
    else { svg.style.removeProperty('--ink'); svg.style.removeProperty('--bg'); }
  }
  function frame(kind, t, f) {
    size();
    if (kind === 'toLogo') {
      var sl = toLogo(t, f); rig.set(sl); ink(sl);
      setBranch(bendToLogo, t);
      setClasses('bird-away', true);
      setClasses('bird-logo', t >= TL.slotOpen);
      setClasses('bird-inbound', true);
    } else {
      var sb = toBranch(t, f); rig.set(sb); ink(sb);
      setBranch(bendToBranch, t);
      setClasses('bird-away', true);
      setClasses('bird-logo', t < TB.slotClose);
      setClasses('bird-inbound', true);
    }
  }
  function settle(where) {
    state = where; flight = null;
    layer.classList.remove('on');
    setClasses('bird-flying', false);
    setClasses('bird-inbound', false);
    setClasses('bird-away', where === 'logo');
    setClasses('bird-logo', where === 'logo');
    restBranch();
  }
  function start(kind) {
    var o = kind === 'toBranch' ? alive.offset() : [0, 0];
    flight = { kind: kind, t0: null, f: { startFace: kind === 'toBranch' ? alive.face() : 1, ox: o[0], oy: o[1] } };
    alive.reset();
    if (kind === 'toBranch') alive.launch();
    state = kind;
    layer.classList.add('on');
    setClasses('bird-flying', true);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = null;
    if (!flight) return;
    if (flight.t0 == null) flight.t0 = now;
    var t = (now - flight.t0) / 1000, dur = flight.kind === 'toLogo' ? TL.end : TB.end;
    if (t >= dur) {
      frame(flight.kind, dur, flight.f);
      var landed = flight.kind === 'toLogo';
      settle(landed ? 'logo' : 'branch');
      if (landed) alive.land();
      check();                                   // the visitor may already want the other place
      return;
    }
    frame(flight.kind, t, flight.f);
    raf = requestAnimationFrame(tick);
  }
  function wanted() {
    var y = window.scrollY;
    if (y > DOWN_AT) return 'logo';
    if (y < UP_AT) return 'branch';
    return null;                                 // between the thresholds: stay where she is
  }
  function check() {
    if (!enabled || flight || body.classList.contains('menu-open') || document.getElementById('intro')) return;
    var w = wanted();
    if (w === 'logo' && state === 'branch') start('toLogo');
    else if (w === 'branch' && state === 'logo') start('toBranch');
  }

  function enable() {
    if (enabled) return; enabled = true;
    if (window.scrollY > DOWN_AT) settle('logo'); else settle('branch');
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', size);
    size();
  }
  // wait until she has arrived on the branch (after the intro or the short arrival)
  (function waitReady() {
    if (body.classList.contains('arrived')) { enable(); return; }
    if (body.classList.contains('intro-skip') && body.classList.contains('bird-ready')) { setTimeout(enable, 2300); return; }
    setTimeout(waitReady, 120);
  })();


  /* ---------- the magpie in the logo is alive ----------
     A small procedural character: she pumps her tail like a real magpie, pecks at the branch,
     shuffles along it, shakes her feathers, glances back, leans into the scroll and settles when it stops,
     turns toward whatever the visitor points at (shiny pictures excite her) and is pleased by a click.
     The logo branch is a spring: it dips under her hops, she rides it, the leaves swing a beat later. */
  var alive = (function () {
    var stub = { face: function () { return 1; }, offset: function () { return [0, 0]; }, reset: function () {}, land: function () {}, launch: function () {} };
    var bird = markSvg.querySelector('.mp-bird'), tailPath = markSvg.querySelector('.mp-tail');
    var branch = markSvg.querySelector('.mp-branchwrap'), bar = document.getElementById('bar');
    if (!bird) return stub;
    var tail = null;
    if (tailPath) { tail = el('g', { 'class': 'mp-tailpivot' }); tailPath.parentNode.insertBefore(tail, tailPath); tail.appendChild(tailPath); }
    var leaves = M.leafList(markSvg).map(function (L) { L.s = 0; L.v = 0; return L; });
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var FX = 198, FY = 207, TX = 296, TY = 78, BX = 3, BY = 213, SLOPE = -.044, PX = LOGO_W / VB_W;
    var POS = [-34, -18, 0, 12, 22];

    var S = { pos: 0, face: 1, tilt: 0, tiltT: 0, tiltV: 0, lean: 0, leanV: 0, tl: 0, tlV: 0, dip: 0, dipV: 0 };
    var G = null, Q = [], last = '', idleT = null, backT = null, raf = null, prev = null, manual = false, clock = 0;
    var sv = 0, lastY = window.scrollY, lastST = 0, travel = 0, stopT = null, seen = new WeakMap();

    function on() { return enabled && state === 'logo' && !flight && !document.hidden; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pulse(t, a, d, u) { return t < a ? 0 : t < a + d ? sm((t - a) / d) : 1 - sm(clamp((t - a - d) / u, 0, 1)); }   // up over d, back over u
    function hit(g, t, at, amount) { if (t >= at && !g['h' + at]) { g['h' + at] = 1; S.dipV += amount; } }

    /* ---- gestures: fn(t, g) -> offsets {x, y, r, sx, sy, tail, flip} ---- */
    function hop(dx, turn, h) {
      h = h == null ? 24 + Math.abs(dx) * .3 : h;
      return { name: 'hop', dur: .5, end: function () { S.pos += dx; if (turn) S.face = -S.face; },
        fn: function (t, g) {
          var o = { x: 0, y: 0, r: 0, sx: 1, sy: 1, tail: 0 };
          if (t < .08) { var c = sm(t / .08); o.sy = 1 - .1 * c; o.tail = -6 * c; o.r = -3 * c; }
          else if (t < .36) {
            var k = (t - .08) / .28, a = Math.sin(Math.PI * k);
            o.x = dx * eio(k); o.y = -h * a; o.sy = 1 + .05 * (1 - k) - .02 * k; o.r = -5 * a; o.tail = -10 * a;
            if (turn) o.flip = (k < .5 ? 1 : -1) * (1 - .42 * a);
          } else {
            o.x = dx; hit(g, t, .36, 26);
            var w = wobble(t - .36, 4, 11); o.sy = 1 - .08 * Math.abs(w); o.tail = 8 * w; o.r = 2 * w;
            if (turn) o.flip = -1;
          }
          return o;
        } };
    }
    var GEST = {
      pump: function () { return { name: 'pump', dur: 1.05, fn: function (t, g) {
        hit(g, t, .06, 6);
        var p = Math.exp(-2.4 * t) * (.5 - .5 * Math.cos(2 * Math.PI * 2.5 * t));
        return { tail: -30 * p, r: 2 * p, sy: 1 - .025 * p }; } }; },
      peck: function () { var n = Math.random() < .35 ? 3 : 2; return { name: 'peck', dur: .2 + n * .3, fn: function (t, g) {
        var p = 0;
        for (var i = 0; i < n; i++) { var at = .08 + i * .3; p = Math.max(p, pulse(t, at, .07, .16)); hit(g, t, at + .07, 10); }
        return { r: -16 * p, y: 1.5 * p, tail: 5 * p }; } }; },
      shake: function () { return { name: 'shake', dur: .9, fn: function (t, g) {
        var e = t < .6 ? Math.pow(Math.sin(Math.PI * t / .6), 2) : 0, w = Math.sin(2 * Math.PI * 12 * t);
        var after = t > .6 ? Math.exp(-6 * (t - .6)) * Math.sin(2 * Math.PI * 3 * (t - .6)) : 0;
        if (t > .6) hit(g, t, .6, 8);
        return { r: 5 * e * w, sx: 1 + .07 * e * Math.sin(2 * Math.PI * 12 * t + 1.2), sy: 1 + .07 * e - .05 * e * Math.sin(2 * Math.PI * 12 * t + 1.2), tail: 9 * e * Math.sin(2 * Math.PI * 12 * t + 2) - 10 * after, y: -2 * e }; } }; },
      glance: function () { return { name: 'glance', dur: 1.45, fn: function (t, g) {
        var o = { y: 0, flip: 1, r: 0 };
        var k1 = seg(t, 0, .2), k2 = seg(t, 1.05, 1.25);
        if (t < .2) { o.flip = (k1 < .5 ? 1 : -1) * (1 - .42 * Math.sin(Math.PI * k1)); o.y = -12 * Math.sin(Math.PI * k1); }
        else if (t < 1.05) { o.flip = -1; o.r = 4 * sm(seg(t, .3, .45)) * (1 - sm(seg(t, .75, .95))); }
        else if (t < 1.25) { o.flip = (k2 < .5 ? -1 : 1) * (1 - .42 * Math.sin(Math.PI * k2)); o.y = -12 * Math.sin(Math.PI * k2); }
        hit(g, t, .2, 9); hit(g, t, 1.25, 9);
        return o; } }; },
      alert: function () { return { name: 'alert', dur: 1.6, fn: function (t, g) {
        var k = sm(seg(t, 0, .18)) * (1 - sm(seg(t, 1.05, 1.3)));
        var f = t > 1.25 ? -12 * wobble(t - 1.25, 3, 7) : 0;
        return { sy: 1 + .08 * k, y: -3 * k, r: 7 * k - 3 * sm(seg(t, .55, .7)) * k, tail: 6 * k + f }; } }; },
      look: function () { return { name: 'look', dur: 1.8, fn: function (t, g) {
        var k = sm(seg(t, 0, .22)) * (1 - sm(seg(t, 1.35, 1.65)));
        return { r: -10 * k, y: 1 * k, tail: 3 * k }; } }; },
      shuffle: function () {
        var c = POS.filter(function (p) { return Math.abs(p - S.pos) > 6; });
        if (Math.abs(S.pos) > 20) c = c.filter(function (p) { return Math.abs(p) < Math.abs(S.pos); });
        var to = c[Math.floor(Math.random() * c.length)], dx = to - S.pos;
        return hop(dx, dx * S.face > 14);                                   // a long step backwards: turn round
      },
      happy: function () { return { name: 'happy', dur: .9, fn: function (t, g) {
        var a = t < .3 ? Math.sin(Math.PI * t / .3) : t < .6 ? .7 * Math.sin(Math.PI * (t - .3) / .3) : 0;
        hit(g, t, .3, 22); hit(g, t, .6, 18);
        var p = t > .6 ? Math.exp(-3 * (t - .6)) * (.5 - .5 * Math.cos(2 * Math.PI * 2.5 * (t - .6))) : 0;
        return { y: -30 * a, r: -4 * a, sy: 1 + .04 * a, tail: -12 * a - 16 * p }; } }; },
      duck: function () { return { name: 'duck', dur: 1.1, fn: function (t, g) {
        var k = sm(seg(t, 0, .1)) * (1 - sm(seg(t, .55, .8)));
        var p = t > .7 ? Math.exp(-3 * (t - .7)) * (.5 - .5 * Math.cos(2 * Math.PI * 2.5 * (t - .7))) : 0;
        hit(g, t, .05, -10);
        return { sy: 1 - .12 * k, sx: 1 + .04 * k, y: 3 * k, r: -4 * k, tail: -14 * k - 14 * p }; } }; }
    };
    var WEIGHTS = [['pump', .22], ['peck', .2], ['shuffle', .2], ['glance', .12], ['shake', .1], ['alert', .08], ['look', .08]];
    function pick() {
      var tot = 0, list = WEIGHTS.filter(function (w) { return w[0] !== last; });
      list.forEach(function (w) { tot += w[1]; });
      var r = Math.random() * tot;
      for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
      return 'pump';
    }
    function play(g, front) {
      if (!g) return;
      if (G) { if (front) Q.unshift(g); else Q.push(g); if (Q.length > 2) Q.length = 2; }
      else { G = g; G.t = 0; }
      wake();
    }
    function act(name) { last = name; play(GEST[name]()); }
    function idle() {
      clearTimeout(idleT);
      idleT = setTimeout(function () { if (on() && !G) act(pick()); idle(); }, rnd(2200, 5200));
    }
    idle();

    // turn to look at something; tilt < 0 looks down at the page
    function turnTo(f, a) {
      S.tiltT = a;
      if (f !== S.face) play(hop(0, true, 14), true);
      wake();
    }

    /* ---- physics + render ---- */
    function springStep(x, v, target, f, z, dt) {
      var w = 2 * Math.PI * f, acc = -w * w * (x - target) - 2 * z * w * v;
      v += acc * dt; x += v * dt; return [x, v];
    }
    function step(dt) {
      sv *= Math.exp(-7 * dt);
      var lt = clamp(-sv / 1800, -1, 1) * 6.5;                        // scrolling down: lean into it, tail up
      var r = springStep(S.lean, S.leanV, lt, 1.6, .38, dt); S.lean = r[0]; S.leanV = r[1];
      r = springStep(S.tl, S.tlV, lt * 1.5, 2.2, .3, dt); S.tl = r[0]; S.tlV = r[1];
      r = springStep(S.tilt, S.tiltV, S.tiltT, 2.4, .6, dt); S.tilt = r[0]; S.tiltV = r[1];
      r = springStep(S.dip, S.dipV, 0, 3.1, .16, dt); S.dip = r[0]; S.dipV = r[1];
      leaves.forEach(function (L, i) {
        var q = springStep(L.s, L.v, S.dip * L.k * 4, 1.7 + .25 * i, .22, dt); L.s = q[0]; L.v = q[1];
      });
      if (G) {
        G.t += dt;
        if (G.t >= G.dur) { if (G.end) G.end(); G = Q.shift() || null; if (G) G.t = 0; }
      }
    }
    function render() {
      var o = G ? G.fn(G.t, G) : {};
      var x = S.pos + (o.x || 0), xb = FX + x;
      var ride = Math.sin(S.dip * Math.PI / 180) * (xb - BX);
      var y = x * SLOPE + (o.y || 0) + ride;
      var rot = S.lean + S.tilt + (o.r || 0) + S.dip * .6;
      var sx = S.face * (o.flip == null ? 1 : o.flip) * (o.sx || 1), sy = o.sy || 1;
      bird.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + rot.toFixed(2) + ' ' + FX + ' ' + FY + ') translate(' + FX + ' ' + FY + ') scale(' + sx.toFixed(3) + ' ' + sy.toFixed(3) + ') translate(' + (-FX) + ' ' + (-FY) + ')');
      if (tail) tail.setAttribute('transform', 'rotate(' + ((o.tail || 0) + S.tl).toFixed(2) + ' ' + TX + ' ' + TY + ')');
      if (branch) branch.setAttribute('transform', 'rotate(' + S.dip.toFixed(3) + ' ' + BX + ' ' + BY + ')');
      leaves.forEach(function (L) {
        var sg = Math.cos(L.a * Math.PI / 180) >= 0 ? 1 : -1;
        L.n.setAttribute('transform', 'translate(' + L.x + ' ' + L.y + ') rotate(' + (L.a + sg * L.s).toFixed(2) + ')');
      });
    }
    function calm() {
      return !G && !Q.length && Math.abs(sv) < 2 && Math.abs(S.lean) + Math.abs(S.leanV) + Math.abs(S.tl) + Math.abs(S.tlV) < .02 &&
        Math.abs(S.dip) + Math.abs(S.dipV) < .004 && Math.abs(S.tilt - S.tiltT) + Math.abs(S.tiltV) < .01 &&
        leaves.every(function (L) { return Math.abs(L.s) + Math.abs(L.v) < .01; });
    }
    function loop(now) {
      raf = null;
      if (manual) return;
      var dt = prev == null ? 1 / 60 : Math.min(.05, (now - prev) / 1000); prev = now;
      var n = Math.ceil(dt / (1 / 120));
      for (var i = 0; i < n; i++) step(dt / n);
      render();
      if (!calm()) raf = requestAnimationFrame(loop); else prev = null;
    }
    function wake() { if (!raf && !manual) { prev = null; raf = requestAnimationFrame(loop); } }

    /* ---- the visitor ---- */
    window.addEventListener('scroll', function () {
      var now = performance.now(), y = window.scrollY, dt = Math.max(8, now - (lastST || now - 16)) / 1000;
      if (state === 'logo' && !flight) {
        sv = sv * .6 + ((y - lastY) / dt) * .4; travel += Math.abs(y - lastY);
        wake();
        clearTimeout(stopT);
        stopT = setTimeout(function () {                                 // the page came to rest: so does she
          if (on() && !G && travel > 900) act(Math.random() < .5 ? 'look' : 'pump');
          travel = 0;
        }, 260);
      }
      lastY = y; lastST = now;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(function () { if (on()) { last = 'shake'; play(GEST.shake()); } }, 500);   // back to the tab: she wakes up
    });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-copy], .chat__btn');
      if (t && on()) { last = 'happy'; play(GEST.happy()); }
    });
    if (fine) {
      markLink.addEventListener('pointerenter', function () { if (on() && !G) { last = 'duck'; play(GEST.duck()); } });
      document.addEventListener('pointerover', function (e) {
        if (!on()) return;
        var t = e.target.closest && e.target.closest('a, button, [data-cursor]');
        if (!t || t.closest('.mark')) return;
        clearTimeout(backT);
        var r = t.getBoundingClientRect(), b = markSvg.getBoundingClientRect();
        var right = r.left + r.width / 2 > b.left + b.width / 2 + 30;
        turnTo(right ? -1 : 1, r.top > b.bottom + 40 ? -7 : 0);
        // pictures shine: she gets excited, once in a while per picture
        if (t.querySelector('img') || t.classList.contains('glint')) {
          var at = seen.get(t) || 0, now = performance.now();
          if (now - at > 6000) { seen.set(t, now); play({ name: 'eager', dur: .65, fn: GEST.happy().fn }); }
        }
      });
      document.addEventListener('pointerout', function (e) {
        var t = e.target.closest && e.target.closest('a, button, [data-cursor]');
        if (!t) return;
        clearTimeout(backT);
        backT = setTimeout(function () { if (on()) turnTo(1, 0); }, 1400);
      });
    }

    function clear() {
      G = null; Q.length = 0; clearTimeout(backT);
      S.pos = 0; S.face = 1; S.tilt = S.tiltT = S.tiltV = 0; S.lean = S.leanV = S.tl = S.tlV = 0; sv = 0;
      bird.removeAttribute('transform'); if (tail) tail.removeAttribute('transform');
    }
    window.__alive = {
      play: function (name) { last = name; play(GEST[name]()); },
      manual: function (m) { manual = !!m; if (m && raf) { cancelAnimationFrame(raf); raf = null; } },
      advance: function (ms) { var n = Math.round(ms / (1000 / 120)); for (var i = 0; i < n; i++) step(1 / 120); render(); },
      state: function () { return { pos: S.pos, face: S.face, dip: S.dip, g: G && G.name, sv: Math.round(sv), lean: +S.lean.toFixed(2) }; },
      clear: clear, idleOff: function () { clearTimeout(idleT); }
    };
    return {
      face: function () { return S.face; },
      offset: function () { return [S.pos * PX, S.pos * SLOPE * PX]; },
      reset: clear,
      land: function () { S.dipV += 34; setTimeout(function () { if (on() && !G) { last = 'pump'; play(GEST.pump()); } }, 350); wake(); },
      launch: function () { S.dipV -= 30; wake(); }
    };
  })();

  // QA hook: draw any moment of a flight without timers
  window.__flight = {
    renderAt: function (kind, t) {
      var f = {};
      // replay the launch capture so endpoints match a real run
      if (kind === 'toLogo') toLogo(Math.min(t, TL.crouch - 1e-3), f); else toBranch(Math.min(t, TB.turn - 1e-3), f);
      layer.classList.add('on');
      frame(kind, t, f);
    },
    settle: settle, T: { toLogo: TL, toBranch: TB }, state: function () { return state; }
  };
})();
