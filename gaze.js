/* Mirada en vivo: el cursor se comporta como un eye-tracker.
   Anillo = punto de mirada; el rastro (sacadas) y las fijaciones se desvanecen solos. */
(function () {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || matchMedia('(pointer:coarse)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';
  var st = document.createElement('style');
  st.textContent = '#gz{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:40}' +
    '#gz .tr{fill:none;stroke:var(--acc);stroke-width:1.2;stroke-linecap:round}' +
    '#gz .fx{fill:var(--acc);fill-opacity:.28;stroke:var(--acc);stroke-width:1.2}' +
    '#gz text{font:400 10px var(--mono);fill:var(--fg);text-anchor:middle;dominant-baseline:central}' +
    '#gzc{position:fixed;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border:1.5px solid var(--acc);border-radius:50%;pointer-events:none;z-index:41;opacity:0;transition:opacity .25s}';
  document.head.appendChild(st);
  var svg = document.createElementNS(NS, 'svg'); svg.id = 'gz'; svg.setAttribute('aria-hidden', 'true');
  var ring = document.createElement('div'); ring.id = 'gzc'; ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(svg); document.body.appendChild(ring);

  var LIFE = 1800, last = null, fix = null, n = 0, segs = [], fixes = [];
  function el(name, attrs) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  function endFix(now) {
    if (!fix) return;
    var dur = now - fix.t0;
    if (dur >= 200) {
      n++;
      var r = Math.min(7 + dur / 90, 24);
      var g = el('g', {});
      g.appendChild(el('circle', { cx: fix.x, cy: fix.y, r: r, class: 'fx' }));
      var t = el('text', { x: fix.x, y: fix.y }); t.textContent = n; g.appendChild(t);
      svg.appendChild(g); fixes.push({ e: g, t: now });
    }
    fix = null;
  }

  addEventListener('mousemove', function (e) {
    var now = performance.now(), x = e.clientX, y = e.clientY;
    ring.style.opacity = 1; ring.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (last) {
      var p = el('line', { x1: last.x, y1: last.y, x2: x, y2: y, class: 'tr' });
      svg.insertBefore(p, svg.firstChild); segs.push({ e: p, t: now });
    }
    if (!fix) fix = { x: x, y: y, t0: now };
    else if (Math.hypot(x - fix.x, y - fix.y) > 26) { endFix(now); fix = { x: x, y: y, t0: now }; }
    last = { x: x, y: y };
  }, { passive: true });
  document.addEventListener('mouseleave', function () { ring.style.opacity = 0; endFix(performance.now()); last = null; });

  (function tick(now) {
    if (fix && now - fix.t0 > 400) { endFix(now); fix = { x: last ? last.x : 0, y: last ? last.y : 0, t0: now + 1e9 }; }
    segs = segs.filter(function (s) { var a = 1 - (now - s.t) / LIFE; if (a <= 0) { s.e.remove(); return false; } s.e.setAttribute('stroke-opacity', a); return true; });
    fixes = fixes.filter(function (f) { var a = 1 - (now - f.t) / (LIFE * 1.8); if (a <= 0) { f.e.remove(); return false; } f.e.setAttribute('opacity', Math.max(a, 0)); return true; });
    requestAnimationFrame(tick);
  })(performance.now());
})();
