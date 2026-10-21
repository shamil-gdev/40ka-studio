/* 40ka — the feather in "О студии": its iridescent sheen slides along the vane with the cursor
   (with the scroll on touch screens), and the feather leans a little toward the pointer. */
(function () {
  var root = document.getElementById('feather');
  if (!root) return;
  var sheen = root.querySelector('.feather__sheen');
  var svg = root.querySelector('.feather__svg');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!sheen || reduce) return;

  var visible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(root);
  } else visible = true;

  // the band of colour travels along the feather's length (its own axis, before the CSS tilt)
  function light(k, lean) {
    sheen.style.setProperty('--sx', (k * 14).toFixed(1) + 'px');
    sheen.style.setProperty('--sy', (-k * 190).toFixed(1) + 'px');
    if (lean != null) svg.style.setProperty('--tilt', lean.toFixed(2) + 'deg');
  }
  light(0, 0);
  if (fine) {
    window.addEventListener('pointermove', function (e) {
      if (!visible) return;
      var r = root.getBoundingClientRect();
      var mx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * .45)));
      var my = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight * .5)));
      light(mx * .7 - my * .5, mx * 4);
    }, { passive: true });
  } else {
    window.addEventListener('scroll', function () {
      if (!visible) return;
      var r = root.getBoundingClientRect();
      var k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2)));
      light(-k, -k * 2);
    }, { passive: true });
  }
})();
