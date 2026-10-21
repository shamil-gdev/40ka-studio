/* 40ka — "О студии": when the headline arrives, the magpie-feather sheen runs into the word «ценное»
   from the left and stays in it; the hand-drawn line under «заметным» is drawn a beat later.
   Afterwards the sheen follows the cursor a little (the scroll on touch screens). */
(function () {
  var word = document.getElementById('shine');
  var sec = document.getElementById('about');
  if (!word || !sec) return;
  var head = word.closest('h2') || word;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;     // CSS default: sheen at rest, line drawn

  var REST = 38, OUT = 100;                                     // background-position %: OUT = the word is plain ink
  var cur = OUT, target = OUT, raf = null, arrived = false, visible = false;
  function set(p) { word.style.backgroundPosition = p.toFixed(2) + '% 0'; }
  function tick() {
    raf = null;
    cur += (target - cur) * (arrived ? .06 : .045);
    set(cur);
    if (Math.abs(target - cur) > .03) raf = requestAnimationFrame(tick);
  }
  function go(p) { target = p; if (!raf) raf = requestAnimationFrame(tick); }

  sec.classList.add('about-anim');
  set(OUT);
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible && !arrived && es[0].intersectionRatio >= .6) {
      arrived = true;
      sec.classList.add('about-in');
      go(REST);
    }
  }, { threshold: [0, .6] }).observe(head);

  if (fine) {
    window.addEventListener('pointermove', function (e) {
      if (!arrived || !visible) return;
      var r = word.getBoundingClientRect();
      var mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * .45)));
      go(REST - mx * 16);
    }, { passive: true });
  } else {
    window.addEventListener('scroll', function () {
      if (!arrived || !visible) return;
      var r = word.getBoundingClientRect();
      var k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2)));
      go(REST + k * 14);
    }, { passive: true });
  }
})();
