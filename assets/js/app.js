/* Gilmour Stellini — site behaviour. Works as a multi-page site (GS_MODE="site") and as a single-file preview (GS_MODE="preview"). */
(function(){
  'use strict';
  var MODE = window.GS_MODE || 'site';
  var CONTACT_EMAIL = 'gilmourstellini@icloud.com';
  document.documentElement.classList.add('js');
  /* ---------- loader: shows once per visit ---------- */
  var loader = document.querySelector('.loader');
  if (loader) {
    var seen = false;
    try { seen = sessionStorage.getItem('gs-loader') === '1'; sessionStorage.setItem('gs-loader','1'); } catch(e) {}
    if (seen) loader.remove(); else setTimeout(function(){ loader.remove(); }, 1800);
  }
  /* ---------- live project screens ---------- */
  function fit(screen){
    var f = screen.querySelector('iframe'); if (!f) return;
    var w = +screen.dataset.w, s = screen.clientWidth / w;
    if (!s) return;
    f.style.width = w + 'px';
    f.style.height = (screen.clientHeight / s) + 'px';
    f.style.transform = 'scale(' + s + ')';
  }
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(function(es){ es.forEach(function(e){ fit(e.target); }); }) : null;
  function projectSrc(id){ return (window.GS_BASE || '/') + 'projects/' + id + '/'; }
  function load(screen){
    if (screen.dataset.loaded) return;
    screen.dataset.loaded = '1';
    var f = document.createElement('iframe');
    f.setAttribute('title', (screen.dataset.name || 'Project') + ' live preview');
    f.setAttribute('sandbox', 'allow-scripts');
    if (screen.classList.contains('static')) { f.setAttribute('tabindex','-1'); f.setAttribute('aria-hidden','true'); f.setAttribute('scrolling','no'); }
    f.addEventListener('load', function(){
      screen.classList.add('loaded');
      if (screen.dataset.scroll) {
        var msg = { gsScroll: screen.dataset.scroll };
        try { f.contentWindow.postMessage(msg, '*'); setTimeout(function(){ f.contentWindow.postMessage(msg, '*'); }, 400); } catch(e) {}
      }
    });
    screen.appendChild(f);
    fit(screen);
    if (MODE === 'preview' && window.GS_PROJECTS) f.srcdoc = window.GS_PROJECTS[screen.dataset.p];
    else f.src = projectSrc(screen.dataset.p);
  }
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '400px' }) : null;
  function wire(root){
    root.querySelectorAll('.screen[data-p]').forEach(function(s){
      if (s.dataset.wired) return; s.dataset.wired = '1';
      if (ro) ro.observe(s);
      if (io && !s.hasAttribute('data-eager')) io.observe(s); else load(s);
    });
  }
  window.addEventListener('resize', function(){ document.querySelectorAll('.screen[data-p]').forEach(fit); });
  /* ---------- full preview modal ---------- */
  var modal = document.getElementById('modal');
  if (modal) {
    var frame = document.getElementById('frame'), mf = document.getElementById('modalFrame'), stage = document.getElementById('stage');
    var devW = 1280, lastFocus = null;
    var sizeModal = function(){
      var sw = stage.clientWidth, sh = stage.clientHeight, s = Math.min(1, sw / devW);
      frame.style.width = (devW * s) + 'px';
      mf.style.width = devW + 'px'; mf.style.height = (sh / s) + 'px'; mf.style.transform = 'scale(' + s + ')';
    };
    var openModal = function(id, name){
      lastFocus = document.activeElement;
      document.getElementById('modalTitle').textContent = name;
      if (MODE === 'preview' && window.GS_PROJECTS) mf.srcdoc = window.GS_PROJECTS[id]; else mf.src = projectSrc(id);
      modal.hidden = false; document.body.style.overflow = 'hidden'; sizeModal();
      document.getElementById('closeModal').focus();
    };
    var closeModal = function(){
      modal.hidden = true; mf.removeAttribute('srcdoc'); mf.src = 'about:blank'; document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    modal.querySelectorAll('.seg button').forEach(function(b){
      b.addEventListener('click', function(){
        devW = +b.dataset.w;
        modal.querySelectorAll('.seg button').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
        sizeModal();
      });
    });
    window.addEventListener('resize', function(){ if (!modal.hidden) sizeModal(); });
    document.addEventListener('click', function(e){
      var b = e.target.closest('[data-open]'); if (!b) return;
      e.preventDefault(); openModal(b.dataset.open, b.dataset.name || '');
    });
  }
  /* ---------- portfolio filters ---------- */
  document.querySelectorAll('.filters').forEach(function(bar){
    var grid = document.getElementById(bar.dataset.for);
    bar.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      bar.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      var cat = b.dataset.cat;
      grid.querySelectorAll('[data-cat]').forEach(function(card){
        card.hidden = !(cat === 'all' || card.dataset.cat.split(' ').indexOf(cat) > -1);
      });
      grid.querySelectorAll('.screen[data-p]').forEach(fit);
    });
  });
  /* close hover menus after a click */
  document.addEventListener('click', function(e){ var a = e.target.closest('.dd-panel a'); if (a && document.activeElement) document.activeElement.blur(); });
  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById('menuBtn'), navLinks = document.getElementById('navLinks');
  if (menuBtn) menuBtn.addEventListener('click', function(){
    var o = navLinks.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(o));
  });
  /* ---------- copy buttons ---------- */
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var t = b.textContent;
    var done = function(label){ b.textContent = label; setTimeout(function(){ b.textContent = t; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(b.dataset.copy).then(function(){ done('Copied'); }, function(){ selectNear(b); done('Selected'); });
    } else { selectNear(b); done('Selected'); }
  });
  function selectNear(b){
    var v = b.closest('.ditem') && b.closest('.ditem').querySelector('.v'); if (!v) return;
    var r = document.createRange(); r.selectNodeContents(v); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  /* ---------- contact form ---------- */
  /* ---------- 30-second cooldown after a successful form send ----------
     Stores only the time the cooldown ends (no personal data), so it carries on after a refresh or in a new tab.
     Shared by the contact form (here) and the order form (review.js). */
  var COOLDOWN_MS = 30000, cdMem = {}, cdTimers = {};
  var CD = window.GSCooldown = {
    remaining: function (key) {
      var until = cdMem[key] || 0;
      try { until = Number(localStorage.getItem('gs-cooldown-' + key)) || until; } catch (e) {}
      var left = Math.min(COOLDOWN_MS, Math.max(0, until - Date.now()));
      if (!left && until) { delete cdMem[key]; try { localStorage.removeItem('gs-cooldown-' + key); } catch (e) {} } /* tidy up an expired timer */
      return left;
    },
    start: function (key) {
      cdMem[key] = Date.now() + COOLDOWN_MS;
      try { localStorage.setItem('gs-cooldown-' + key, String(cdMem[key])); } catch (e) {}
    },
    /* keeps btn disabled with a visible countdown, then restores its label and calls onEnd */
    run: function (key, btn, label, onEnd) {
      clearTimeout(cdTimers[key]);
      (function tick() {
        var left = CD.remaining(key);
        if (!left) {
          btn.textContent = label; btn.disabled = false; if (onEnd) onEnd(); return;
        }
        btn.disabled = true; btn.textContent = 'Please wait ' + Math.ceil(left / 1000) + 's';
        cdTimers[key] = setTimeout(tick, (left % 1000) || 1000);
      })();
    }
  };

  var form = document.getElementById('enquiry');
  if (form) {
    var formBtn = form.querySelector('button[type="submit"]');
    if (CD.remaining('contact')) CD.run('contact', formBtn, 'Send enquiry');
    var q = new URLSearchParams(location.search);
    if (q.get('service')) { var opt = form.service.querySelector('option[value="' + q.get('service') + '"]'); if (opt) form.service.value = q.get('service'); }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (CD.remaining('contact')) { CD.run('contact', formBtn, 'Send enquiry'); return; } /* still cooling down */
      var v = function(n){ return (form[n] && form[n].value || '').trim(); };
      var errs = {
        name: v('name') ? '' : 'Please add your name.',
        email: /^\S+@\S+\.\S+$/.test(v('email')) ? '' : 'Please add an email address I can reply to.',
        message: v('message').length >= 10 ? '' : 'Please add a few words about your project.',
        phone: (!v('phone') || /^\+?[0-9 ()./-]{6,25}$/.test(v('phone'))) ? '' : 'Please check the phone number (digits, spaces and + only).'
      };
      if (!errs.name && v('name').length > 60) errs.name = 'Please keep your name under 60 characters.';
      if (!errs.email && v('email').length > 254) errs.email = 'Please check the email address.';
      if (!errs.message && v('message').length > 5000) errs.message = 'Please keep your message under 5,000 characters.';
      ['name','email','phone','message'].forEach(function(k){ var el = document.getElementById('e-' + k); if (el) el.textContent = errs[k]; });
      var first = ['name','email','phone','message'].filter(function(k){ return errs[k]; })[0];
      if (first) { form[first].focus(); return; }
      if (v('website') || (form.botcheck && form.botcheck.checked)) return; /* honeypots: left empty by people, filled by bots */
      var sent = document.getElementById('sent');
      var method = (form.querySelector('input[name="contact_method"]:checked') || {}).value || 'Email';
      var lines = [
        'Name: ' + v('name'), 'Email: ' + v('email'), 'Business: ' + (v('business') || '-'),
        'Service: ' + v('service'), 'Budget: ' + (v('budget') || 'Prefer to discuss'),
        'Preferred contact: ' + method + (v('phone') ? ' (' + v('phone') + ')' : ''), '', v('message')
      ];
      var safeName = v('name').replace(/[<>&"]/g, '');
      var endpoint = window.GS_FORM_ENDPOINT || (window.GS_WEB3FORMS_KEY ? 'https://api.web3forms.com/submit' : '');
      var btn = form.querySelector('button[type="submit"]');
      if (endpoint && MODE !== 'preview') {
        btn.disabled = true; btn.textContent = 'Sending...';
        fetch(endpoint, { method: 'POST', body: (function(){ var fd = new FormData(form); if (window.GS_WEB3FORMS_KEY) { fd.append('access_key', window.GS_WEB3FORMS_KEY); fd.append('subject', 'New website enquiry from ' + (fd.get('name') || 'the website')); fd.append('from_name', 'gilmourstellini.com'); } return fd; })(), headers: { 'Accept': 'application/json' } })
          .then(function(r){ if (!r.ok) throw new Error(r.status); })
          .then(function(){
            sent.innerHTML = '<h3>Thanks, ' + safeName + '. Your enquiry has been sent.</h3><p class="muted">I reply to every enquiry within one working day, by ' + method.toLowerCase() + ' as you asked.</p>';
            sent.hidden = false; form.reset();
            CD.start('contact'); CD.run('contact', btn, 'Send enquiry');
          })
          .catch(function(){
            btn.disabled = false; btn.textContent = 'Send enquiry';
            sent.innerHTML = '<h3>That didn\'t go through.</h3><p class="muted">Please try again, or email ' + CONTACT_EMAIL + ' directly.</p>';
            sent.hidden = false;
          });
        return;
      }
      var body = encodeURIComponent(lines.join('\n'));
      var subject = encodeURIComponent('Website enquiry from ' + v('name') + (v('business') ? ' (' + v('business') + ')' : ''));
      var mailto = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
      if (MODE === 'preview') {
        sent.innerHTML = '<h3>Thanks, ' + safeName + '.</h3><p class="muted">This is the preview, so nothing was sent. On the live site this form delivers straight to ' + CONTACT_EMAIL + ' once the form service is connected (see README).</p>';
      } else {
        sent.innerHTML = '<h3>Almost done, ' + safeName + '.</h3><p class="muted">Your email app should open with the message ready to send. If it doesn\'t, <a class="textlink" href="' + mailto + '">open it here</a> or email ' + CONTACT_EMAIL + '.</p>';
        window.location.href = mailto;
      }
      sent.hidden = false;
    });
  }
  /* ================= EFFECTS ================= */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;
  /* scroll progress line */
  var bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
  var onScroll = function(){ var h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')'; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  /* headline decode: letters resolve from code glyphs */
  var GLY = '<>/{}[]=;01#$%&*+';
  function scramble(el){
    /* Each letter is measured and locked to its own width before it is swapped for code glyphs,
       so the heading keeps exactly the same line breaks and height while it animates (no layout shift). */
    if (reduce || el.dataset.scrd) return; el.dataset.scrd = '1';
    var original = el.innerHTML, cells = [];
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), texts = [];
    while (walk.nextNode()) if (walk.currentNode.nodeValue.trim()) texts.push(walk.currentNode);
    texts.forEach(function(tn){
      var frag = document.createDocumentFragment();
      tn.nodeValue.split(/(\s+)/).forEach(function(part){
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span'); w.className = 'scr-w';
        for (var i = 0; i < part.length; i++) { var s = document.createElement('span'); s.className = 'scr-c'; s.textContent = part[i]; w.appendChild(s); cells.push(s); }
        frag.appendChild(w);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
    cells.forEach(function(s){ s.dataset.c = s.textContent; s.style.width = s.getBoundingClientRect().width + 'px'; });
    var total = cells.length, start = performance.now(), dur = Math.min(1400, 500 + total * 18);
    (function tick(now){
      var p = Math.min(1, (now - start) / dur);
      for (var i = 0; i < total; i++) cells[i].textContent = (i / total < p * 1.15 - 0.15) ? cells[i].dataset.c : GLY[(Math.random() * GLY.length) | 0];
      if (p < 1) requestAnimationFrame(tick); else el.innerHTML = original;
    })(start);
  }
  window.GS_SCRAMBLE = scramble;
  /* signal pulses travelling along the hero grid */
  function pulses(host){
    if (reduce || host.dataset.pulsed) return; host.dataset.pulsed = '1';
    var cv = document.createElement('canvas'); cv.className = 'pulse-canvas'; host.insertBefore(cv, host.firstChild);
    var ctx = cv.getContext('2d'), G = 32, dpr = Math.min(2, devicePixelRatio || 1), W, H, ps = [], run = true;
    var col = function(){ return getComputedStyle(document.documentElement).getPropertyValue('--cobalt').trim() || '#2343D6'; };
    var size = function(){ W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    var spawn = function(){ var hz = Math.random() < .5; return { hz: hz, x: hz ? 0 : Math.floor(Math.random() * W / G) * G, y: hz ? Math.floor(Math.random() * H / G) * G : 0, d: 1, v: 1.2 + Math.random() * 1.8, l: 60 + Math.random() * 90, turn: 0 }; };
    for (var i = 0; i < 9; i++) { var p = spawn(); p.hz ? p.x = Math.random() * W : p.y = Math.random() * H; ps.push(p); }
    new IntersectionObserver(function(e){ run = e[0].isIntersecting; if (run) requestAnimationFrame(loop); }).observe(host);
    function loop(){
      if (!run) return;
      ctx.clearRect(0, 0, W, H); var c = col();
      ps.forEach(function(p, i){
        if (p.hz) p.x += p.v; else p.y += p.v;
        if (Math.random() < .004 && ((p.hz ? p.x : p.y) % G) < p.v) { p.hz = !p.hz; p.x = Math.round(p.x / G) * G; p.y = Math.round(p.y / G) * G; }
        var gx = p.hz ? p.x - p.l : p.x, gy = p.hz ? p.y : p.y - p.l;
        var gr = ctx.createLinearGradient(gx, gy, p.x, p.y); gr.addColorStop(0, 'transparent'); gr.addColorStop(1, c);
        ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
        if (p.x > W + p.l || p.y > H + p.l) ps[i] = spawn();
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  /* 3D tilt toward the pointer */
  function tilt(el, max){
    if (reduce || !fine || el.dataset.tilt) return; el.dataset.tilt = '1'; el.classList.add('tilt');
    var host = el.parentElement;
    host.addEventListener('pointermove', function(e){
      var r = host.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(1100px) rotateY(' + (x * max) + 'deg) rotateX(' + (-y * max) + 'deg)';
    });
    host.addEventListener('pointerleave', function(){ el.style.transform = ''; });
  }
  /* spotlight that follows the pointer inside cards */
  document.addEventListener('pointermove', function(e){
    var c = e.target.closest && e.target.closest('.spot'); if (!c) return;
    var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  /* timeline draws itself when it scrolls into view */
  function drawFlow(f){
    if (f.dataset.drawn) return; f.dataset.drawn = '1'; f.classList.add('drawn');
    var bs = f.querySelectorAll('b'), n = bs.length;
    if (reduce) { f.style.setProperty('--fp', '100%'); bs.forEach(function(b){ b.classList.add('lit'); }); return; }
    var t0 = performance.now();
    (function step(now){ var p = Math.min(1, (now - t0) / 1800); f.style.setProperty('--fp', (p * 100) + '%'); bs.forEach(function(b, i){ if (p >= i / (n - 1 || 1) - .02) b.classList.add('lit'); }); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  var fxIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if (!e.isIntersecting) return; var t = e.target;
      if (t.classList.contains('flow')) drawFlow(t);
      if (t.hasAttribute('data-wipe')) t.querySelectorAll('.wipe').forEach(function(w){ w.classList.add('in'); });
      if (t.hasAttribute('data-scramble')) scramble(t);
      if (t.hasAttribute('data-livecode')) startLive(t);
      fxIO.unobserve(t);
    });
  }, { threshold: .08 }) : null;
  function applyFx(root){
    root.querySelectorAll('.svc-card,.tile,.hl,.work-card,.cmp,.cbox,.fr-vis').forEach(function(c){ c.classList.add('spot'); });
    root.querySelectorAll('.comp .grid-bg').forEach(function(g){ pulses(g.parentElement); });
    root.querySelectorAll('.comp .laptop').forEach(function(l){ tilt(l.closest('.comp').querySelector('.laptop'), 7); });
    root.querySelectorAll('.work-card .stagebox .browser,.proj-stage .browser').forEach(function(b){ tilt(b, 5); });
    root.querySelectorAll('.page-head h1,.hero h1').forEach(function(h){ h.setAttribute('data-scramble', ''); });
    root.querySelectorAll('.sec-head h2').forEach(function(h){ var r = h.getBoundingClientRect(); if (r.top > innerHeight && fxIO) { h.classList.add('wipe'); h.closest('.sec-head').setAttribute('data-wipe', ''); } });
    root.querySelectorAll('.flow,[data-wipe],[data-scramble],[data-livecode]').forEach(function(el){ if (fxIO) fxIO.observe(el); else { el.classList.add('in'); } });
  }
  /* ================= LIVE CODE ================= */
  var SNIPS = [
    { f: 0, step: 1, code: [
      ['t-com','<!-- Hero section for Saltline Watersports -->\n'],
      ['t-tag','<section'],['t-att',' class'],['t-p','='],['t-str','"hero"'],['t-tag','>\n'],
      ['','  '],['t-tag','<h1>'],['','Book your ride today'],['t-tag','</h1>\n'],
      ['','  '],['t-tag','<p>'],['','Jet skis & boat trips from the bay'],['t-tag','</p>\n'],
      ['','  '],['t-tag','<a'],['t-att',' class'],['t-p','='],['t-str','"btn"'],['t-att',' href'],['t-p','='],['t-str','"#book"'],['t-tag','>'],['','Check availability'],['t-tag','</a>\n'],
      ['t-tag','</section>']] },
    { f: 1, step: 2, code: [
      ['t-com','/* Brand styles */\n'],
      ['t-sel','.hero'],['t-p',' {\n'],
      ['t-prop','  background'],['t-p',': '],['','linear-gradient('],['t-num','160deg'],['',', '],['t-num','#0E2A3D'],['',', '],['t-num','#16405C'],['',')'],['t-p',';\n'],
      ['t-prop','  color'],['t-p',': '],['t-num','#fff'],['t-p',';\n'],
      ['t-prop','  font-family'],['t-p',': '],['t-str','"League Spartan"'],['t-p',';\n}\n'],
      ['t-sel','.btn'],['t-p',' {\n'],
      ['t-prop','  background'],['t-p',': '],['t-num','#FF6B35'],['t-p',';\n'],
      ['t-prop','  border-radius'],['t-p',': '],['t-num','999px'],['t-p',';\n}']] },
    { f: 2, step: 3, code: [
      ['t-com','// One tap opens WhatsApp with the message ready\n'],
      ['t-kw','const'],['',' btn '],['t-p','= '],['','document.'],['t-fn','querySelector'],['t-p','('],['t-str',"'.btn'"],['t-p',');\n'],
      ['','btn.'],['t-fn','addEventListener'],['t-p','('],['t-str',"'click'"],['t-p',', () '],['t-kw','=>'],['t-p',' {\n'],
      ['','  '],['t-fn','openWhatsApp'],['t-p','('],['t-str',"'Hi! Is Saturday free?'"],['t-p',');\n'],
      ['t-p','});']] }
  ];
  var TERM = [['cmd','$ npm run build'],['dim','  compiling 12 pages…'],['ok','✓ pages built'],['ok','✓ images converted to webp'],['ok','✓ accessibility checks passed'],['cmd','$ deploy --production'],['ok','✓ live · concept preview']];
  var escH = function(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  function startLive(root){
    if (root.dataset.started) return; root.dataset.started = '1';
    var code = root.querySelector('.lc-code code'), gut = root.querySelector('.lc-gutter'), tabs = root.querySelectorAll('.lc-tab'),
        out = root.querySelector('.lc-out'), stage = root.querySelector('.lc-stage'), st = root.querySelector('.lc-status'), stt = root.querySelector('.lc-st-txt');
    var visible = true; new IntersectionObserver(function(e){ visible = e[0].isIntersecting; }).observe(root);
    var wait = function(ms){ return new Promise(function(r){ var t0 = Date.now(); (function w(){ if (Date.now() - t0 >= ms && visible) r(); else setTimeout(w, 60); })(); }); };
    var render = function(snip, n){
      var html = '', left = n;
      for (var i = 0; i < snip.code.length && left > 0; i++) { var tk = snip.code[i], t = tk[1].slice(0, left); left -= t.length; html += tk[0] ? '<span class="' + tk[0] + '">' + escH(t) + '</span>' : escH(t); }
      code.innerHTML = html;
      var lines = (code.textContent.match(/\n/g) || []).length + 1; var g = ''; for (var k = 1; k <= Math.max(lines, 9); k++) g += k + '\n'; gut.textContent = g;
    };
    var full = function(s){ return s.code.reduce(function(a, t){ return a + t[1].length; }, 0); };
    (async function loop(){
      for (;;) {
        stage.dataset.step = '0'; out.innerHTML = '<span class="dim">$ waiting…</span>'; st.classList.remove('ok'); stt.textContent = 'Writing code…';
        for (var s = 0; s < SNIPS.length; s++) {
          var sn = SNIPS[s]; tabs.forEach(function(t, i){ t.classList.toggle('on', i === sn.f); });
          var tot = full(sn);
          if (reduce) { render(sn, tot); }
          else for (var n = 0; n <= tot; n += (Math.random() < .15 ? 3 : 1)) { render(sn, n); await wait(18 + Math.random() * 28); }
          render(sn, tot);
          stage.dataset.step = String(sn.step); stt.textContent = ['', 'HTML rendered', 'Styles applied', 'Interaction added'][sn.step];
          await wait(1500);
        }
        out.innerHTML = ''; stt.textContent = 'Building…';
        for (var j = 0; j < TERM.length; j++) { out.innerHTML += '<span class="' + TERM[j][0] + '">' + escH(TERM[j][1]) + '</span>\n'; await wait(TERM[j][0] === 'dim' ? 700 : 420); }
        stage.dataset.step = '4'; st.classList.add('ok'); stt.textContent = 'Deployed · all checks passed';
        await wait(4200);
      }
    })();
  }
  /* marquee duplicates its own content for a seamless loop */
  document.querySelectorAll('.marquee-track,.rib-track').forEach(function(t){ if (!t.dataset.dup) { t.dataset.dup = '1'; t.innerHTML += t.innerHTML; } });
  /* ---------- preview router (single-file preview only) ---------- */
  if (MODE === 'preview') {
    var pages = {};
    document.querySelectorAll('[data-page]').forEach(function(p){ pages[p.dataset.page] = p; });
    var current = null;
    var show = function(key){
      if (current === key) return false;
      Object.keys(pages).forEach(function(k){ pages[k].hidden = k !== key; });
      current = key;
      var p = pages[key];
      document.title = p.dataset.title || 'Gilmour Stellini';
      document.querySelectorAll('.nav-links a').forEach(function(a){
        var nav = (a.getAttribute('data-nav') || '');
        if (nav && nav === (p.dataset.nav || '')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
      });
      wire(p); applyFx(p);
      p.querySelectorAll('.screen[data-p]').forEach(fit);
      return true;
    };
    /* Navigation: page switches always land at the top instantly; only in-page section links scroll smoothly.
       Links are handled here (not by the browser's own hash jump) so the page never scrolls twice. */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var go = function(h, smooth){
      if (navLinks) { navLinks.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded','false'); }
      if (pages[h]) { show(h); window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); return; }
      var el = h && document.getElementById(h);
      if (el) {
        var pg = el.closest('[data-page]');
        var changed = pg ? show(pg.dataset.page) : false;
        el.scrollIntoView({ behavior: (changed || !smooth || reduce) ? 'instant' : 'smooth', block: 'start' });
        return;
      }
      show('home'); window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    var route = function(){ var h = decodeURIComponent(location.hash.slice(1)); if (h === 'navLinks') h = ''; go(h || 'home', false); };
    /* pages are visible to CSS-only viewers (e.g. iPhone file previews, which don't run JavaScript); hide them for the JS router */
    Object.keys(pages).forEach(function(k){ pages[k].hidden = true; });
    document.documentElement.classList.add('js');
    window.addEventListener('hashchange', route);
    document.addEventListener('click', function(e){
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var a = e.target.closest('a[href^="#"]'); if (!a) return;
      var h = decodeURIComponent(a.getAttribute('href').slice(1)); if (!h) return;
      e.preventDefault();
      if (location.hash.slice(1) !== h) history.pushState(null, '', '#' + h);
      go(h, true);
    });
    window.addEventListener('popstate', route);
    route();
  } else {
    wire(document); applyFx(document);
    if (location.hash && document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView({ behavior: 'instant', block: 'start' }); });
    document.addEventListener('click', function(e){ var a = e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented) return; var t = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (!t) return; e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); t.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' }); });
  }
})();
