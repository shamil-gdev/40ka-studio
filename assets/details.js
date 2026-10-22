/* 40ka — «Детали»: the nest. Small things from the projects lie in a pile of prints, like a magpie's finds.
   - when the pile comes into view the prints drop onto it one by one, the bottom one first
   - a tap (or click, Enter, →) flicks the top print off to the side; it slides back in under the pile
   - a sideways swipe carries the top print with the finger and throws it; vertical swipes scroll the page as usual
   - on wide screens the list beside the pile pulls any print out from under it (← brings back the previous one)
   - left alone and in view, the pile turns over by itself every few seconds; the first touch stops that for good
   Nothing is tied to the scroll position: on phones there is nothing that could lag behind the finger. */
(function () {
  var sec = document.getElementById('details');
  var pile = sec && sec.querySelector('.nest__pile');
  if (!pile) return;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = [].slice.call(pile.querySelectorAll('figure')), n = cards.length;
  var btns = [].slice.call(sec.querySelectorAll('.nest__list button'));
  var nameEl = sec.querySelector('.nest__name'), numEl = sec.querySelector('.nest__n'), live = sec.querySelector('[aria-live]');
  var order = cards.map(function (_, i) { return i; });        // order[0] is the print on top
  var busy = false, touched = false, timer = null, visible = false, drag = null;
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }

  function layout() {
    order.forEach(function (ci, pos) { cards[ci].style.zIndex = n - pos; });
    var t = order[0], name = cards[t].getAttribute('data-name');
    if (nameEl) nameEl.textContent = name;
    if (numEl) numEl.textContent = pad(t) + ' / ' + pad(n - 1);
    btns.forEach(function (b, i) { b.classList.toggle('on', i === t); });
    if (touched && live) live.textContent = name;
  }
  function later(fn, ms) { setTimeout(fn, reduce ? 0 : ms); }
  // the top print goes off to one side, then slides back in under the pile
  function next(dir) {
    if (busy) return; busy = true;
    var c = cards[order[0]];
    c.style.setProperty('--dx', dir); c.style.transform = ''; c.classList.remove('drag'); c.classList.add('out');
    later(function () {
      order.push(order.shift()); layout();
      c.classList.remove('out');
      later(function () { busy = false; }, 140);
    }, 340);
  }
  // a print comes out from under the pile and lands on top
  function bring(i, dir) {
    if (busy || order[0] === i) return; busy = true;
    var c = cards[i];
    c.style.setProperty('--dx', dir || -1); c.classList.add('out');
    later(function () {
      order.splice(order.indexOf(i), 1); order.unshift(i); layout();
      c.classList.remove('out');
      later(function () { busy = false; }, 140);
    }, 340);
  }
  function user() { touched = true; stopAuto(); }
  function startAuto() {
    if (reduce || touched || timer) return;
    timer = setInterval(function () { if (visible && !document.hidden && !body.classList.contains('menu-open')) next(1); }, 3400);
  }
  function stopAuto() { clearInterval(timer); timer = null; }

  btns.forEach(function (b) { b.addEventListener('click', function () { user(); bring(+b.getAttribute('data-i'), -1); }); });
  pile.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); user(); next(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); user(); bring(order[n - 1], -1); }
  });
  // tap = next; a sideways drag carries the top print and throws it past a short distance
  pile.addEventListener('pointerdown', function (e) {
    if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, on: false };
  });
  pile.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y, c = cards[order[0]];
    if (!drag.on) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag.on = true; user(); try { pile.setPointerCapture(e.pointerId); } catch (_) {} c.classList.add('drag'); }
      else if (Math.abs(dy) > 10) { drag = null; return; }
      else return;
    }
    drag.dx = dx;
    c.style.transform = 'translate(-50%, -50%) translate(calc(var(--x) + ' + dx.toFixed(1) + 'px), var(--y)) rotate(calc(var(--r) + ' + (dx * .045).toFixed(2) + 'deg))';
  });
  function end(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    var c = cards[order[0]];
    if (d.on) {
      c.classList.remove('drag');
      if (!cancel && Math.abs(d.dx) > 64) next(d.dx > 0 ? 1 : -1);
      else c.style.transform = '';
    } else if (!cancel) { user(); next(1); }
  }
  pile.addEventListener('pointerup', function (e) { end(e, false); });
  pile.addEventListener('pointercancel', function (e) { end(e, true); });

  layout();
  if (!('IntersectionObserver' in window)) { sec.classList.add('in'); return; }
  // the drop-in is a first-visit entrance: coming back from a case, the pile is simply there
  if (reduce || body.classList.contains('returning')) sec.classList.add('in');
  else {
    sec.classList.add('nest--js');
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      order.forEach(function (ci, pos) { cards[ci].style.setProperty('--d', ((n - 1 - pos) * .085).toFixed(3) + 's'); });
      sec.classList.add('in');
      setTimeout(function () { cards.forEach(function (c) { c.style.removeProperty('--d'); }); }, 1400);
    }, { threshold: .3 }).observe(pile);
  }
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) setTimeout(startAuto, 1600); else stopAuto();
  }, { threshold: .6 }).observe(pile);
})();
