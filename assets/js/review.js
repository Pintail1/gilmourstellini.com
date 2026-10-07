/* Gilmour Stellini: Google review product customiser (static, browser-only).
   - Generates a real QR code from the customer's own Google review link (vendor/gsqr.js).
   - Verifies the finished artwork by scanning it back (decodes the rendered image) before an order can be sent.
   - Sends each order request (nothing is stored in the browser) with its review link to
     window.GS_ORDER_ENDPOINT when configured (no backend required now; one can be connected later). */
(function () {
  'use strict';
  var MODE = window.GS_MODE || 'site';
  var QR_LEVEL = 'Q';           // ~25% error correction: robust for print and scuffed table stands
  var QUIET = 4;                // quiet zone in modules (QR spec minimum)

  /* ---------- QR rendering ---------- */
  function matrix(text) { return window.GSQR.make(unescape(encodeURIComponent(text)), QR_LEVEL); }
  function pathFor(q, offset) {
    var d = '';
    for (var r = 0; r < q.size; r++) {
      var c = 0;
      while (c < q.size) {
        if (!q.isDark(r, c)) { c++; continue; }
        var start = c; while (c < q.size && q.isDark(r, c)) c++;
        d += 'M' + (start + offset) + ' ' + (r + offset) + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
      }
    }
    return d;
  }
  /* Print-ready vector artwork: black modules on white, 4-module quiet zone */
  function svgArtwork(text, title) {
    var q = matrix(text), n = q.size + QUIET * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" width="' + n * 10 + '" height="' + n * 10 + '" shape-rendering="crispEdges">' +
      '<title>' + esc(title || 'Google review QR code') + '</title><desc>' + esc(text) + '</desc>' +
      '<rect width="' + n + '" height="' + n + '" fill="#ffffff"/><path fill="#000000" d="' + pathFor(q, QUIET) + '"/></svg>';
  }
  /* Inline QR drawn into an existing <svg> element (mock-ups and previews) */
  function drawInto(svg, text) {
    if (!window.GSQR || !svg) return false;
    try {
      var q = matrix(text);
      svg.setAttribute('viewBox', '0 0 ' + q.size + ' ' + q.size);
      svg.setAttribute('shape-rendering', 'crispEdges');
      svg.innerHTML = '<path fill="currentColor" d="' + pathFor(q, 0) + '"/>';
      svg.dataset.qrDone = text;
      return true;
    } catch (e) { return false; }
  }
  function renderQRs(root) {
    (root || document).querySelectorAll('svg[data-qr]').forEach(function (s) { if (s.dataset.qrDone !== s.dataset.qr) drawInto(s, s.dataset.qr); });
  }
  window.GS_RENDER_QRS = renderQRs;

  /* Scan the finished artwork back: render the SVG to pixels and decode it */
  function verify(svgText, expected) {
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      img.onload = function () {
        try {
          var size = 900, cv = document.createElement('canvas'); cv.width = cv.height = size;
          var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          var got = window.GSQR.decodeImage(ctx.getImageData(0, 0, size, size));
          resolve({ ok: got === expected, decoded: got });
        } catch (e) { resolve({ ok: false, decoded: null, error: e.message }); }
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ ok: false, decoded: null, error: 'render' }); };
      img.src = url;
    });
  }

  /* ---------- Google review link validation ---------- */
  function checkLink(raw) {
    var v = (raw || '').trim();
    if (!v) return { state: 'empty', msg: 'Paste your review link to create your QR code.' };
    if (/^ChIJ[0-9A-Za-z_-]{10,}$/.test(v)) return { state: 'ok', url: 'https://search.google.com/local/writereview?placeid=' + v, msg: 'Place ID recognised. Your direct review link has been built from it.' };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
    var u; try { u = new URL(v); } catch (e) { return { state: 'bad', msg: 'That doesn\'t look like a web link. Paste the full link, starting with https://' }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { state: 'bad', msg: 'Only web links (https://) can be used.' };
    if (u.protocol === 'http:') { u.protocol = 'https:'; }
    var host = u.hostname.toLowerCase().replace(/^www\./, ''), path = u.pathname;
    var url = u.href;
    if (host === 'g.page' && /\/review\/?$/.test(path)) return { state: 'ok', url: url, msg: 'Google review link recognised.' };
    if (host === 'search.google.com' && /\/local\/writereview/.test(path) && u.searchParams.get('placeid')) return { state: 'ok', url: url, msg: 'Google review link recognised.' };
    if (host === 'g.page' || host === 'g.co' || host === 'maps.app.goo.gl' || (host === 'goo.gl' && /^\/maps/.test(path)) || /(^|\.)google\.[a-z.]+$/.test(host) && (/^\/maps/.test(path) || /^maps\./.test(host)))
      return { state: 'warn', url: url, msg: 'This is a Google link, but it may open your listing rather than the review form. A direct review link (g.page/r/…/review) works best.' };
    return { state: 'bad', msg: 'This isn\'t a Google link. Use the review link from your Google Business Profile.' };
  }

  /* ---------- helpers ---------- */
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slug(t) { return (t || 'business').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'business'; }
  function save(name, blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  var NFC_ICON = '<svg class="nfc-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a8.5 8.5 0 0 1 0 12M13 3.5a12 12 0 0 1 0 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var STARS = '<span class="stars5">★★★★★</span>';
  var STAR_BADGE = '<span class="pc-badge" aria-hidden="true">★</span>';
  var HAND = '<svg class="hand-ic" viewBox="0 0 64 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="22" cy="20" rx="20" ry="17"/><path d="M13 14a7 7 0 0 1 0 12M17 11a11 11 0 0 1 0 18M21 8a15 15 0 0 1 0 24"/><rect x="34" y="4" width="13" height="23" rx="2.5"/><path d="M36 27v4c0 3 2 5 5 5h5l8 3M47 14l4-2c2-1 4 1 3 3l-4 6M47 20l5-1"/></g></svg>';
  var SIGNAL = '<svg class="sig-ic" viewBox="0 0 24 18" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 6.5a14 14 0 0 1 20 0M5.5 10a9 9 0 0 1 13 0M9 13.5a4 4 0 0 1 6 0"/></g><circle cx="12" cy="16.5" r="1.3" fill="currentColor"/></svg>';

  /* ---------- customiser ---------- */
  function initCustomiser() {
    var form = document.getElementById('rqForm'); if (!form || form.dataset.ready) return; form.dataset.ready = '1';
    var $ = function (id) { return document.getElementById(id); };
    /* Nothing from the customiser or order form is kept in the browser. Remove anything an earlier version saved. */
    try { localStorage.removeItem('gs-review-design'); localStorage.removeItem('gs-review-orders'); } catch (e) {}
    var saved = {};
    var st = { product: saved.product || 'stand', style: saved.style || 'dark', name: saved.name || '', link: saved.link || '', line: saved.line != null ? saved.line : 'Enjoyed your visit?', qty: saved.qty || 5, logo: null, logoName: '' };
    var res = { state: 'empty' }, verified = null, artwork = '', token = 0;
    $('rq-name').value = st.name; $('rq-link').value = st.link; $('rq-line').value = st.line; $('rq-qty').value = st.qty;
    form.querySelectorAll('.rq-seg').forEach(function (seg) {
      var k = seg.dataset.k;
      seg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === st[k])); });
      seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st[k] = b.dataset.v; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); update(); });
    });
    ['rq-name', 'rq-link', 'rq-line', 'rq-qty'].forEach(function (id) { $(id).addEventListener('input', update); });
    document.addEventListener('click', function (e) {
      var p = e.target.closest('[data-preset]'); if (!p) return;
      st.product = p.dataset.preset; form.querySelectorAll('.rq-seg[data-k="product"] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === st.product)); }); update();
    });
    /* logo upload */
    $('rq-logo').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { $('rqLogoName').textContent = 'Please choose a PNG, JPG, WebP or SVG file.'; return; }
      if (f.size > 2 * 1024 * 1024) { $('rqLogoName').textContent = 'That file is over 2 MB. Please use a smaller logo.'; return; }
      var r = new FileReader(); r.onload = function () { st.logo = r.result; st.logoName = f.name; $('rqLogoName').textContent = f.name; $('rqLogoClear').hidden = false; update(); }; r.readAsDataURL(f);
    });
    $('rqLogoClear').addEventListener('click', function () { st.logo = null; st.logoName = ''; $('rq-logo').value = ''; $('rqLogoName').textContent = 'No logo added'; this.hidden = true; update(); });

    function logoHTML(dark) {
      if (st.logo) return '<img class="rq-logoimg" src="' + st.logo + '" alt="' + esc(st.name || 'Business') + ' logo">';
      var ini = (st.name || 'Your business').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
      return '<span class="rq-ini" style="background:' + (dark ? '#fff' : '#111214') + ';color:' + (dark ? '#111214' : '#fff') + '">' + esc(ini) + '</span>';
    }
    function preview() {
      var name = esc(st.name || 'Your business'), line = esc(st.line), dark = st.style === 'dark', html;
      if (st.product === 'card') {
        var d = st.style === 'light' ? 'white' : st.style === 'blue' ? 'blue' : 'black';
        var brand = (st.logo || st.name) ? '<div class="pc-brand">' + (st.logo ? logoHTML(d !== 'white') : '') + (st.name ? '<span>' + name + '</span>' : '') + '</div>' : '';
        var top = line ? '<span class="pc-line">' + line + '</span>' : '';
        if (d === 'white') html = '<div class="nfc-card pc pc-white rq-card">' + brand + STAR_BADGE + top + '<div class="pc-txt"><span class="pc-a">review us</span><b class="pc-b">on Google</b></div>' + STARS + '<div class="pc-tap">' + HAND + '<span>hold phone here</span></div></div>';
        else if (d === 'black') html = '<div class="nfc-card pc pc-black rq-card">' + brand + '<div class="pc-sig">' + SIGNAL + '</div>' + STAR_BADGE + top + '<div class="pc-txt"><b class="pc-caps">TAP TO REVIEW US</b></div>' + STARS + '</div>';
        else html = '<div class="nfc-card pc pc-blue rq-card"><div class="pc-top">' + brand + STAR_BADGE + top + '<div class="pc-txt"><b class="pc-caps"><span>LEAVE US</span> YOUR REVIEW<br>ON <span>GOOGLE</span></b></div></div><div class="pc-bot"><span class="pc-tp"><b>TAP</b> YOUR PHONE</span>' + HAND + '</div></div>';
      } else {
        var qrInner = (res.url ? '<svg class="qr" data-live="1" role="img" aria-label="QR code for your review link"></svg>' : '<span class="rq-qrph">Your QR code</span>');
        html = '<div class="nfc-stand rq-standv' + (dark ? ' dark' : '') + '"><div class="ns-face"><div class="ns-in"><span class="nc-biz">' + logoHTML(dark) + '<span>' + name + '</span></span>' +
          (line ? '<span class="ns-q">' + line + '</span>' : '') + '<b class="ns-g">Review us on Google</b>' + STARS +
          '<div class="ns-qr">' + qrInner + '</div><div class="ns-tap">Scan with your phone camera</div></div></div><div class="ns-base"></div></div>';
      }
      var stage = $('rqStage'); stage.innerHTML = html;
      var live = stage.querySelector('svg[data-live]'); if (live) drawInto(live, res.url);
    }
    function orderCooling() { return !!(window.GSCooldown && window.GSCooldown.remaining('order')); }
    function setVerify(cls, text) { var v = $('rqVerify'); v.className = 'rq-verify ' + cls; v.textContent = text; }
    function gate() {
      var ok = verified && verified.ok;
      $('rqSend').disabled = !ok || orderCooling();
      $('rqGate').textContent = ok ? 'Your QR code is verified and ready to send.' : (res.state === 'empty' ? 'Add and verify your review link to continue.' : res.state === 'bad' ? 'Fix your review link to continue.' : 'Checking your QR code…');
      ['rqSvg', 'rqPng', 'rqCopy'].forEach(function (id) { $(id).disabled = !ok; });
      $('rqTest').setAttribute('aria-disabled', String(!ok)); $('rqTest').href = ok ? res.url : '#';
    }
    function syncDesigns() {
      var blue = form.querySelector('.rq-seg[data-k="style"] button[data-v="blue"]');
      if (blue) blue.hidden = st.product !== 'card';
      if (st.product !== 'card' && st.style === 'blue') st.style = 'dark';
      form.querySelectorAll('.rq-seg[data-k="style"] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === st.style)); });
    }
    function update() {
      syncDesigns();
      st.name = $('rq-name').value.trim(); st.link = $('rq-link').value; st.line = $('rq-line').value.trim();
      st.qty = Math.max(1, Math.min(1000, parseInt($('rq-qty').value, 10) || 1));
      res = checkLink(st.link);
      var chk = $('rqCheck'); chk.textContent = res.msg; chk.className = 'rq-check ' + res.state;
      $('rqSummary').textContent = st.qty + ' × ' + ({ dark: 'black', light: 'white', blue: 'blue' }[st.style]) + ' ' + (st.product === 'card' ? 'Google Review NFC Card' : 'Google Review QR Table Stand') + (st.qty > 1 ? 's' : '') + (st.name ? ' for ' + st.name : '');
      preview();
      verified = null; artwork = '';
      var box = $('rqQR');
      if (!res.url) { box.innerHTML = '<span class="rq-qrph">Your QR code</span>'; $('rqUrl').textContent = 'Add your review link'; setVerify('', 'Not generated yet'); gate(); return; }
      $('rqUrl').textContent = res.url;
      artwork = svgArtwork(res.url, (st.name || 'Business') + ': Google review QR code');
      box.innerHTML = artwork;
      setVerify('busy', 'Scanning your QR code to check it…'); gate();
      var my = ++token, url = res.url, art = artwork;
      verify(art, url).then(function (v) {
        if (my !== token) return;
        verified = v;
        if (v.ok) setVerify('ok', '✓ Verified: scans to exactly this link');
        else setVerify('bad', 'The QR code could not be verified. Please check the link, or contact me.');
        gate();
      });
    }
    /* downloads */
    $('rqSvg').addEventListener('click', function () { save(slug(st.name) + '-google-review-qr.svg', new Blob([artwork], { type: 'image/svg+xml' })); });
    $('rqPng').addEventListener('click', function () {
      var img = new Image(), u = URL.createObjectURL(new Blob([artwork], { type: 'image/svg+xml' }));
      img.onload = function () { var cv = document.createElement('canvas'); cv.width = cv.height = 2048; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0, 2048, 2048); URL.revokeObjectURL(u); cv.toBlob(function (b) { save(slug(st.name) + '-google-review-qr.png', b); }, 'image/png'); };
      img.src = u;
    });
    $('rqCopy').addEventListener('click', function () {
      var b = this, t = b.textContent;
      var done = function (m) { b.textContent = m; setTimeout(function () { b.textContent = t; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(res.url).then(function () { done('Copied'); }, function () { done('Copy failed'); }); else done('Copy failed');
    });
    $('rqTest').addEventListener('click', function (e) { if (this.getAttribute('aria-disabled') === 'true') e.preventDefault(); });

    /* order request: stored with the review link and print-ready QR artwork */
    /* 30-second cooldown after a sent order (shared helper in app.js; survives a refresh) */
    var restoreOrderCooldown = function () { if (window.GSCooldown) window.GSCooldown.run('order', $('rqSend'), 'Send order request', gate); };
    try { sessionStorage.removeItem('gs_order_cooldown'); } catch (e) {} /* replaced by the shared cooldown */
    if (orderCooling()) restoreOrderCooldown();
    $('rqOrder').addEventListener('submit', function (e) {
      e.preventDefault();
      if (orderCooling()) { restoreOrderCooldown(); return; }
      var v = function (id) { return $(id).value.trim(); };
      var errs = { name: v('ro-name') ? (v('ro-name').length > 60 ? 'Please keep your name under 60 characters.' : '') : 'Please add your name.',
        email: (/^\S+@\S+\.\S+$/.test(v('ro-email')) && v('ro-email').length <= 254) ? '' : 'Please add an email address.',
        phone: (!v('ro-phone') || /^\+?[0-9 ()./-]{6,25}$/.test(v('ro-phone'))) ? '' : 'Please check the phone number (digits, spaces and + only).' };
      $('ro-e-name').textContent = errs.name; $('ro-e-email').textContent = errs.email; $('ro-e-phone').textContent = errs.phone;
      if (errs.name || errs.email || errs.phone) { $(errs.name ? 'ro-name' : errs.email ? 'ro-email' : 'ro-phone').focus(); return; }
      if (!$('ro-consent').checked) { $('rqGate').textContent = 'Please agree to the terms and privacy notice.'; $('ro-consent').focus(); return; }
      if (!verified || !verified.ok) { gate(); return; }
      if ($('ro-website') && $('ro-website').value) return; /* honeypot: left empty by people, filled by bots */
      var ref = 'GS-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      var order = {
        reference: ref, createdAt: new Date().toISOString(),
        product: st.product === 'card' ? 'Google Review NFC Card' : 'Google Review QR Table Stand', design: { dark: 'Black', light: 'White', blue: 'Blue' }[st.style],
        quantity: st.qty, businessName: st.name, wording: st.line, reviewUrl: res.url,
        qr: { verified: true, decodedUrl: verified.decoded, errorCorrection: QR_LEVEL, svg: artwork },
        logo: st.logo ? { fileName: st.logoName, dataUrl: st.logo } : null,
        contact: { name: v('ro-name'), email: v('ro-email'), phone: v('ro-phone') }, notes: v('ro-notes')
      };
      var done = $('rqDone'), btn = $('rqSend');
      var finish = function (sentOnline) {
        var pay = window.GS_CHECKOUT_URL ? '<p style="margin-top:10px"><a class="btn btn-primary" href="' + esc(window.GS_CHECKOUT_URL + (window.GS_CHECKOUT_URL.indexOf('?') > -1 ? '&' : '?') + 'client_reference_id=' + ref) + '" target="_blank" rel="noopener">Pay now</a></p>' : '';
        done.innerHTML = '<h3>Order request ' + ref + ' ' + (sentOnline ? 'sent' : 'ready') + '.</h3><p class="muted">' +
          (sentOnline ? 'I\'ll reply with a proof and quote within one working day.' + (order.logo && !window.GS_ORDER_FILES ? ' Please reply to that email with your logo file so it can go on the print.' : '') : MODE === 'preview' ? 'This is the preview, so nothing was sent. On the live site this request is delivered with your review link and QR artwork.' : 'Your email app should open with the details. If it doesn\'t, email gilmourstellini@icloud.com quoting ' + ref + '.') +
          '</p><p style="margin-top:10px"><button type="button" class="chipbtn" id="rqJson">Download order details</button></p>' + pay;
        done.hidden = false; restoreOrderCooldown();
        if (sentOnline) { ['ro-name', 'ro-email', 'ro-phone', 'ro-notes'].forEach(function (id) { $(id).value = ''; }); $('ro-consent').checked = false; } /* clear contact details once sent */
        $('rqJson').addEventListener('click', function () { save(ref + '.json', new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' })); });
      };
      var ORDER_URL = window.GS_ORDER_ENDPOINT || (window.GS_WEB3FORMS_KEY ? 'https://api.web3forms.com/submit' : '');
      if (ORDER_URL && MODE !== 'preview') {
        btn.disabled = true; btn.textContent = 'Sending...';
        /* Sent as an ordinary form submission, so form services (Formspree, Web3Forms, Basin…) deliver it as a readable email. */
        var fd = new FormData();
        if (window.GS_WEB3FORMS_KEY && !window.GS_ORDER_ENDPOINT) { fd.append('access_key', window.GS_WEB3FORMS_KEY); fd.append('from_name', 'gilmourstellini.com orders'); }
        var add = function (k, val) { fd.append(k, val == null || val === '' ? '-' : String(val)); };
        add('_subject', 'New order ' + ref + ': ' + order.product + ' x ' + order.quantity + ' for ' + (order.businessName || 'a business'));
        add('subject', 'New order ' + ref + ': ' + order.product + ' x ' + order.quantity + ' for ' + (order.businessName || 'a business'));
        add('name', order.contact.name); add('email', order.contact.email); add('Phone / WhatsApp', order.contact.phone);
        add('Order reference', ref);
        add('Product', order.product); add('Design', order.design); add('Quantity', order.quantity);
        add('Business name', order.businessName); add('Wording', order.wording);
        add('Google review link', order.reviewUrl);
        add('QR code check', 'Verified: the QR artwork was scanned in the browser and opens exactly the link above');
        add('Logo', order.logo ? 'Uploaded (' + order.logo.fileName + ')' + (window.GS_ORDER_FILES ? ', attached' : '. Ask the customer to reply with the file') : 'No logo');
        add('Notes', order.notes);
        add('Submitted', new Date().toLocaleString('en-GB'));
        if (window.GS_ORDER_FILES) {
          fd.append('qr_artwork', new Blob([artwork], { type: 'image/svg+xml' }), ref + '-qr-artwork.svg');
          if (order.logo) { try { var parts = order.logo.dataUrl.split(','), mime = parts[0].split(':')[1].split(';')[0], bin = atob(parts[1]), arr = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); fd.append('logo', new Blob([arr], { type: mime }), order.logo.fileName); } catch (er) {} }
        }
        fetch(ORDER_URL, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
          .then(function (r) { if (!r.ok) throw new Error(r.status); if (window.GSCooldown) window.GSCooldown.start('order'); finish(true); })
          .catch(function () { btn.disabled = false; btn.textContent = 'Send order request'; done.hidden = false; done.innerHTML = '<h3>That didn\'t go through.</h3><p class="muted">Please try again, or email gilmourstellini@icloud.com quoting ' + ref + '.</p>'; });
        return;
      }
      if (MODE !== 'preview') {
        var body = ['Order ' + ref, order.product + ' · ' + order.design + ' · qty ' + order.quantity, 'Business: ' + order.businessName, 'Wording: ' + order.wording, 'Google review link: ' + order.reviewUrl, 'QR verified: yes', '', 'Contact: ' + order.contact.name + ' · ' + order.contact.email + ' · ' + order.contact.phone, 'Notes: ' + order.notes, '', '(Logo and QR artwork: attach the downloaded order details file.)'].join('\n');
        location.href = 'mailto:gilmourstellini@icloud.com?subject=' + encodeURIComponent('Review product order ' + ref) + '&body=' + encodeURIComponent(body);
      }
      finish(false);
    });
    update();
  }

  /* product photo galleries: thumbnails swap the main image (fixed width/height, so no layout shift) */
  function initGalleries() {
    document.querySelectorAll('[data-gallery]').forEach(function (g) {
      if (g.dataset.ready) return; g.dataset.ready = '1';
      var main = g.querySelector('.prod-media'), first = main.innerHTML;
      g.addEventListener('click', function (e) {
        var b = e.target.closest('.prod-thumbs button'); if (!b) return;
        g.querySelectorAll('.prod-thumbs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (b.dataset.src) main.innerHTML = '<img src="' + b.dataset.src + '" width="' + b.dataset.w + '" height="' + b.dataset.h + '" alt="' + esc(b.dataset.alt) + '" decoding="async">';
        else main.innerHTML = '<div class="prod-render">' + b.querySelector('.nfc-card').outerHTML + '</div><span class="prod-tag">Blue design · preview</span>';
      });
    });
  }
  function boot() { renderQRs(document); initGalleries(); initCustomiser(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.GS_REVIEW_BOOT = boot;
})();



