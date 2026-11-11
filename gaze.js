/* Tira de puntos: datos dispersos que se ordenan hasta una decisión (se anima una vez al hacer scroll). */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var st = document.createElement('style');
  st.textContent = '.strip{display:block;width:100%;height:56px;margin:0}' +
    '.strip circle{fill:var(--dash)}.strip circle.d{fill:var(--acc)}' +
    '.strip text{font:400 11px var(--mono);fill:var(--soft)}' +
    '.strip-w{padding-top:.4rem;padding-bottom:.4rem}';
  document.head.appendChild(st);
  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function make(k) {
    var w = document.createElement('div'); w.className = 'wrap strip-w';
    var sv = el('svg', { class: 'strip', 'aria-hidden': 'true' }); w.appendChild(sv);
    var N = 34, W = 1000, H = 56, dots = [], seed = k * 7 + 3;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sv.setAttribute('preserveAspectRatio', 'xMinYMid meet');
    for (var i = 0; i < N; i++) {
      var x = 40 + i * (W - 210) / (N - 1), amp = 1 - i / (N - 1), y0 = H / 2 + (rnd() - .5) * H * .95 * Math.pow(amp, .6);
      var c = el('circle', { cx: x, cy: reduce ? H / 2 : y0, r: 3 }); sv.appendChild(c); dots.push([c, y0]);
    }
    var d = el('circle', { cx: W - 120, cy: H / 2, r: 7, class: 'd' }); sv.appendChild(d);
    var lb = el('text', { x: W - 104, y: H / 2 + 4 }); lb.textContent = 'decisión'; sv.appendChild(lb);
    if (!reduce) {
      d.setAttribute('r', 0); lb.style.opacity = 0;
      var done = false;
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) {
        if (en.isIntersecting && !done) {
          done = true; var t0 = performance.now(), T = 1700;
          (function step(t) {
            var p = Math.min((t - t0) / T, 1), e = 1 - Math.pow(1 - p, 3);
            dots.forEach(function (o) { o[0].setAttribute('cy', o[1] + (H / 2 - o[1]) * e); });
            d.setAttribute('r', 7 * Math.max(0, (p - .6) / .4)); lb.style.opacity = Math.max(0, (p - .8) / .2);
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        }
      }); }, { threshold: .6 });
      io.observe(sv);
    }
    return w;
  }
  var hero = document.querySelector('.hero'), main = document.querySelector('main'), foot = document.querySelector('footer');
  if (hero && hero.parentNode) hero.parentNode.insertBefore(make(0), hero.nextSibling);
  if (foot && foot.parentNode && main) foot.parentNode.insertBefore(make(1), foot);
})();

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
