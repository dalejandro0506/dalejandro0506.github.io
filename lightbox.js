/* Visor de imágenes: amplía las capturas en la misma página, con anterior/siguiente. */
(function () {
  var css = '' +
    '.lb{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(11,18,38,.92);padding:3.2rem 3.5rem 4rem}' +
    '.lb.open{display:flex}' +
    '.lb figure{margin:0;max-width:100%;max-height:100%;display:flex;flex-direction:column;align-items:center;gap:.8rem}' +
    '.lb img{max-width:100%;max-height:calc(100vh - 11rem);width:auto;height:auto;background:#fff;border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.45)}' +
    '.lb figcaption{color:#E6EAF2;font-size:.9rem;text-align:center;max-width:46rem;line-height:1.4}' +
    '.lb button{position:absolute;border:0;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;border-radius:999px;width:2.8rem;height:2.8rem;font-size:1.5rem;line-height:1;display:flex;align-items:center;justify-content:center}' +
    '.lb button:hover,.lb button:focus-visible{background:rgba(255,255,255,.3);outline:2px solid #fff}' +
    '.lb .lb-x{top:.9rem;right:.9rem}' +
    '.lb .lb-p{left:.8rem;top:50%;transform:translateY(-50%)}' +
    '.lb .lb-n{right:.8rem;top:50%;transform:translateY(-50%)}' +
    '.lb .lb-c{position:absolute;bottom:1rem;left:0;right:0;text-align:center;color:#BFC8D8;font-size:.8rem}' +
    '.lb.one .lb-p,.lb.one .lb-n,.lb.one .lb-c{display:none}' +
    'a.lb-t,.gallery img{cursor:zoom-in}' +
    '@media (max-width:720px){.lb{padding:3.2rem .6rem 4.5rem}.lb .lb-p{top:auto;bottom:.8rem;left:1rem;transform:none}.lb .lb-n{top:auto;bottom:.8rem;right:1rem;transform:none}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var groups = [];
  function add(container, items) {
    if (items.length) groups.push(items);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.thumbs'), function (c) {
    var items = [];
    Array.prototype.forEach.call(c.querySelectorAll('a'), function (a) {
      var im = a.querySelector('img');
      if (!im) return;
      a.classList.add('lb-t');
      items.push({ el: a, src: a.getAttribute('href'), alt: im.getAttribute('alt') || '', cap: im.getAttribute('alt') || '' });
    });
    add(c, items);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.gallery'), function (c) {
    var items = [];
    Array.prototype.forEach.call(c.querySelectorAll('figure'), function (f) {
      var im = f.querySelector('img');
      if (!im) return;
      var fc = f.querySelector('figcaption');
      items.push({ el: im, src: im.getAttribute('src'), alt: im.getAttribute('alt') || '', cap: fc ? fc.textContent : (im.getAttribute('alt') || '') });
    });
    add(c, items);
  });
  if (!groups.length) return;

  var box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Visor de imágenes');
  box.innerHTML = '<button class="lb-x" aria-label="Cerrar">×</button>' +
    '<button class="lb-p" aria-label="Anterior">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-n" aria-label="Siguiente">›</button>' +
    '<div class="lb-c" aria-live="polite"></div>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('figcaption'), cnt = box.querySelector('.lb-c');
  var cur = null, idx = 0, opener = null;

  function show(i) {
    idx = (i + cur.length) % cur.length;
    var it = cur[idx];
    img.src = it.src;
    img.alt = it.alt;
    cap.textContent = it.cap;
    cnt.textContent = (idx + 1) + ' / ' + cur.length;
    var nx = new Image();
    nx.src = cur[(idx + 1) % cur.length].src;
  }
  function open(g, i, from) {
    cur = g; opener = from;
    box.classList.toggle('one', g.length < 2);
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    show(i);
    box.querySelector('.lb-x').focus();
  }
  function close() {
    box.classList.remove('open');
    document.body.style.overflow = '';
    img.removeAttribute('src');
    if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
  }

  groups.forEach(function (g) {
    g.forEach(function (it, i) {
      it.el.addEventListener('click', function (e) {
        e.preventDefault();
        open(g, i, it.el.tagName === 'A' ? it.el : null);
      });
    });
  });
  box.querySelector('.lb-x').addEventListener('click', close);
  box.querySelector('.lb-p').addEventListener('click', function () { show(idx - 1); });
  box.querySelector('.lb-n').addEventListener('click', function () { show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') {
      var f = box.querySelectorAll('button');
      var vis = Array.prototype.filter.call(f, function (b) { return b.offsetParent !== null; });
      if (!vis.length) return;
      var first = vis[0], last = vis[vis.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50 && cur.length > 1) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
