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
    var lb = el('text', { x: W - 104, y: H / 2 + 4 }); lb.textContent = 'decision'; sv.appendChild(lb);
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
   Anillo = punto de mirada; las sacadas (líneas rectas entre fijaciones) y las fijaciones se desvanecen solas. */
(function () {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || matchMedia('(pointer:coarse)').matches) return;
  var NS = 'http://www.w3.org/2000/svg';
  var st = document.createElement('style');
  st.textContent = '#gz{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:40}' +
    '#gz .tr{stroke:var(--acc);stroke-width:1.2;stroke-linecap:round}' +
    '#gz .fx{fill:var(--acc);fill-opacity:.28;stroke:var(--acc);stroke-width:1.2}' +
    '#gz text{font:400 10px var(--mono);fill:var(--fg);text-anchor:middle;dominant-baseline:central}' +
    '#gzc{position:fixed;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border:1.5px solid var(--acc);border-radius:50%;background:color-mix(in srgb,var(--acc) 16%,transparent);pointer-events:none;z-index:41;opacity:0;transition:opacity .25s}';
  document.head.appendChild(st);
  var svg = document.createElementNS(NS, 'svg'); svg.id = 'gz'; svg.setAttribute('aria-hidden', 'true');
  var ring = document.createElement('div'); ring.id = 'gzc'; ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(svg); document.body.appendChild(ring);

  var LIFE = 1800, fix = null, prev = null, n = 0, saccs = [], fixes = [], lastMove = 0, cur = null;
  function el(name, attrs) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  var live = el('line', { class: 'tr', 'stroke-opacity': 0 }); svg.appendChild(live);

  function endFix(now) {
    if (!fix) return;
    var dur = now - fix.t0;
    if (dur >= 200) {
      n++;
      if (prev) {
        var l = el('line', { x1: prev.x, y1: prev.y, x2: fix.x, y2: fix.y, class: 'tr' });
        svg.insertBefore(l, svg.firstChild); saccs.push({ e: l, t: now });
      }
      var r = Math.min(7 + dur / 90, 24);
      var g = el('g', {});
      g.appendChild(el('circle', { cx: fix.x, cy: fix.y, r: r, class: 'fx' }));
      var tx = el('text', { x: fix.x, y: fix.y }); tx.textContent = n; g.appendChild(tx);
      svg.appendChild(g); fixes.push({ e: g, t: now });
      prev = { x: fix.x, y: fix.y };
      onFixation(n);
    }
    fix = null;
  }

  var off = false;
  try { off = localStorage.getItem('gz-off') === '1'; } catch (e) {}

  function clearTrace() {
    saccs.concat(fixes).forEach(function (o) { o.e.remove(); });
    saccs = []; fixes = []; fix = prev = cur = null;
    ring.style.opacity = 0; live.setAttribute('stroke-opacity', 0);
  }

  addEventListener('mousemove', function (e) {
    if (off) return;
    var now = performance.now(), x = e.clientX, y = e.clientY;
    cur = { x: x, y: y }; lastMove = now;
    ring.style.opacity = 1; ring.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (!fix) fix = { x: x, y: y, t0: now };
    else if (Math.hypot(x - fix.x, y - fix.y) > 26) { endFix(now); fix = { x: x, y: y, t0: now }; }
    if (prev) { live.setAttribute('x1', prev.x); live.setAttribute('y1', prev.y); live.setAttribute('x2', x); live.setAttribute('y2', y); }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { ring.style.opacity = 0; endFix(performance.now()); live.setAttribute('stroke-opacity', 0); cur = null; });

  /* Explicación del efecto: tarjeta no modal. Se abre sola una vez, tras las primeras fijaciones del visitante. */
  var pst = document.createElement('style');
  pst.textContent =
    '#gzb{position:fixed;right:1rem;bottom:1rem;z-index:42;display:flex;align-items:center;gap:.5rem;padding:.5rem .8rem;background:var(--card);color:var(--fg);border:1px solid var(--dash);font:400 .75rem var(--mono);cursor:pointer}' +
    '#gzb::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--acc)}' +
    '#gzb:hover{border-color:var(--acc)}' +
    '#gzp{position:fixed;right:1rem;bottom:4rem;z-index:45;width:min(23rem,calc(100vw - 2rem));max-height:calc(100vh - 9.5rem);overflow:auto;padding:1rem 1.15rem;background:var(--card);color:var(--muted);border:1px dashed var(--acc);box-shadow:0 14px 40px rgba(6,11,24,.25);font-size:.84rem;line-height:1.5}' +
    '#gzp[hidden]{display:none}' +
    '#gzp h2{font-size:1.2rem;margin:0 2rem .5rem 0}#gzp .label{margin-right:2rem}' +
    '#gzp p{margin:.5rem 0}#gzp dl{margin:.5rem 0 0}' +
    '#gzp dt{font:400 .74rem var(--mono);color:var(--acc2)}#gzp dd{margin:0 0 .45rem}' +
    '#gzp .x{position:absolute;top:.6rem;right:.6rem;width:2rem;height:2rem;border:0;background:transparent;color:var(--fg);font-size:1.3rem;cursor:pointer}' +
    '#gzp .act{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.9rem}' +
    '#gzp .btn{cursor:pointer;padding:.45rem .8rem;font-size:.82rem}';
  document.head.appendChild(pst);

  var opener = document.createElement('button');
  opener.id = 'gzb'; opener.type = 'button'; opener.textContent = 'Why does the cursor leave a trace?';
  opener.setAttribute('aria-expanded', 'false'); opener.setAttribute('aria-controls', 'gzp');

  var pop = document.createElement('div');
  pop.id = 'gzp'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'gzp-t');
  pop.innerHTML =
    '<button type="button" class="x" aria-label="Close">×</button>' +
    '<p class="label">Eye tracking · part of my research</p>' +
    '<h2 id="gzp-t">This is what eye tracking looks like</h2>' +
    '<p>Here, your cursor plays the role of your eyes. <b>The longer you rest it in one spot, the bigger the circle grows</b>, just as eye-tracking plots show where attention lingers. Lines connect one stop to the next.</p>' +
    '<p><b>Try it:</b> hold your cursor still on something that catches your eye.</p>' +
    '<div class="act"><button type="button" class="btn tgl"></button></div>';
  document.body.appendChild(pop); document.body.appendChild(opener);

  var tgl = pop.querySelector('.tgl');
  function label() { tgl.textContent = off ? 'Turn trace on' : 'Turn trace off'; }
  function seen() { try { localStorage.setItem('gz-seen', '1'); } catch (e) {} }
  function wasSeen() { try { return localStorage.getItem('gz-seen') === '1'; } catch (e) { return false; } }
  var shown = wasSeen();
  function show(focus) {
    pop.hidden = false; shown = true; opener.setAttribute('aria-expanded', 'true');
    if (focus) pop.querySelector('.x').focus();
  }
  function hide() {
    var inside = pop.contains(document.activeElement);
    pop.hidden = true; seen(); opener.setAttribute('aria-expanded', 'false');
    if (inside) opener.focus();
  }
  function onFixation(count) { if (!shown && count >= 3) show(false); }
  opener.addEventListener('click', function () { if (pop.hidden) show(true); else hide(); });
  pop.querySelector('.x').addEventListener('click', hide);
  tgl.addEventListener('click', function () {
    off = !off; label();
    try { localStorage.setItem('gz-off', off ? '1' : '0'); } catch (e) {}
    if (off) clearTrace();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) hide(); });
  label();

  (function tick(now) {
    var d = fix && cur ? Math.max(0, now - fix.t0 - 200) : 0;
    var size = Math.min(16 + d / 45, 48);
    ring.style.width = ring.style.height = size + 'px';
    ring.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
    var idle = now - lastMove;
    live.setAttribute('stroke-opacity', prev && cur ? Math.max(0, .55 * (1 - idle / 900)) : 0);
    if (prev && idle > 4000) prev = null;
    saccs = saccs.filter(function (s) { var a = 1 - (now - s.t) / LIFE; if (a <= 0) { s.e.remove(); return false; } s.e.setAttribute('stroke-opacity', a * .7); return true; });
    fixes = fixes.filter(function (f) { var a = 1 - (now - f.t) / (LIFE * 1.8); if (a <= 0) { f.e.remove(); return false; } f.e.setAttribute('opacity', a); return true; });
    requestAnimationFrame(tick);
  })(performance.now());
})();
