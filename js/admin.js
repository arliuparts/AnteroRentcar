/* =====================================================================
   NUSANTARA RENTAL — admin.js (Dashboard Admin)
   ---------------------------------------------------------------------
   Berisi: Login, Dashboard, CRUD kendaraan, CRUD lokasi, Pengaturan
   website, WhatsApp, Export & Import data.

   ⚠ CATATAN KEAMANAN
   Login di halaman ini adalah AUTENTIKASI FRONTEND untuk prototype.
   Password disimpan sebagai hash SHA-256 (tidak terlihat sebagai teks
   asli), tetapi semua logika berjalan di browser sehingga dapat dilewati
   oleh orang yang paham teknis. Untuk PRODUCTION wajib menggunakan
   backend authentication (server-side session/JWT, bcrypt/argon2,
   HTTPS, rate limiting, dan database server).
   ===================================================================== */
(function () {
  'use strict';

  const NR = window.NR;
  if (!NR || !NR.store) { console.warn('data.js belum dimuat.'); return; }
  const U = NR.util;
  const S = NR.store;
  const esc = U.escapeHtml;
  const icon = NR.icon;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const SESSION_KEY = 'nusantaraRentalAdminSession';
  const CL = NR.cloud || {};
  const CLOUD = () => !!(CL && CL.enabled); // true = mode online (Supabase)
  const STORAGE_LIMIT = 5 * 1024 * 1024; // perkiraan kuota LocalStorage (±5 MB)
  const CURRENT_YEAR = new Date().getFullYear();
  const LOGO_SVG = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c983"/><stop offset="1" stop-color="#b08a33"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="#0b1f3a"/><path d="M14 34V14l20 20V14" fill="none" stroke="url(#lgA)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* -------------------------------------------------------------------
     SHA-256 (murni JavaScript — berjalan juga di file:///)
     ------------------------------------------------------------------- */
  function sha256(input) {
    const ascii = unescape(encodeURIComponent(String(input))); // UTF-8 → byte string
    const rr = (v, a) => (v >>> a) | (v << (32 - a));
    const maxWord = Math.pow(2, 32);
    const hash = [], k = [], isComposite = {};
    let primeCounter = 0;
    for (let c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (let i = 0; i < 313; i += c) isComposite[i] = c;
        if (primeCounter < 8) hash[primeCounter] = (Math.pow(c, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    let msg = ascii + '\x80';
    while (msg.length % 64 - 56) msg += '\x00';
    const words = [];
    for (let i = 0; i < msg.length; i++) words[i >> 2] |= msg.charCodeAt(i) << ((3 - i) % 4) * 8;
    const bitLen = ascii.length * 8;
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;
    let H = hash.slice(0, 8);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const old = H;
      H = H.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = H[0], e = H[4];
        const t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ ((~e) & H[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H);
        H[4] = (H[4] + t1) | 0;
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }
  NR.sha256 = sha256;

  /* -------------------------------------------------------------------
     SESSION
     ------------------------------------------------------------------- */
  let memSession = null;
  function getSession() {
    let s = memSession;
    try { s = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null') || memSession; } catch (e) { /* abaikan */ }
    if (CLOUD() && !CL.user) return null;
    return s && s.exp > Date.now() ? s : null;
  }
  function setSession(user) {
    const hours = S.getAdmin().sessionHours || 8;
    memSession = { user: user, exp: Date.now() + hours * 3600 * 1000 };
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(memSession)); } catch (e) { /* abaikan */ }
  }
  function clearSession() {
    memSession = null;
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* abaikan */ }
  }

  /* -------------------------------------------------------------------
     UI HELPERS
     ------------------------------------------------------------------- */
  function hydrateIcons(root) {
    $$('[data-icon]', root).forEach(el => {
      if (el.getAttribute('data-icon-done')) return;
      el.innerHTML = icon(el.getAttribute('data-icon'));
      el.setAttribute('data-icon-done', '1');
    });
  }

  function toast(msg, type) {
    type = type || 'success';
    const stack = $('#toastStack');
    const ic = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast__icon">${icon(ic)}</span><span>${esc(msg)}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 320); }, 3400);
  }

  function safeUrl(u) {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s) || /^blob:/i.test(s)) return s;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
    return s;
  }

  function isHttpUrl(s) { return /^https?:\/\/[^\s]+\.[^\s]+/i.test(String(s || '').trim()); }
  function isImageSource(s) {
    s = String(s || '').trim();
    return !s || isHttpUrl(s) || /^data:image\//i.test(s) || /^[\w./-]+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(s);
  }

  const locName = id => { const l = S.getLocation(id); return l ? l.name : null; };

  function applyBrand() {
    const st = S.getSettings();
    $$('[data-site-name]').forEach(el => { el.textContent = st.siteName || 'Nusantara Rental'; });
    const logo = safeUrl(st.logoUrl);
    $$('[data-logo-mark]').forEach(mark => {
      if (!logo) { mark.innerHTML = LOGO_SVG; return; }
      const img = document.createElement('img');
      img.alt = '';
      img.onerror = () => { mark.innerHTML = LOGO_SVG; };
      img.src = logo;
      mark.innerHTML = '';
      mark.appendChild(img);
    });
    document.title = 'Admin · ' + (st.siteName || 'Nusantara Rental');
  }

  /* ---------- Modal ---------- */
  let modalOnClose = null;
  function openModal(opt) {
    const m = $('#formModal');
    $('#formModalTitle').textContent = opt.title || '';
    $('#formModalSub').textContent = opt.sub || '';
    $('#formModalBody').innerHTML = opt.body || '';
    $('#formModalFoot').innerHTML = opt.foot || '';
    $('.modal__dialog', m).classList.toggle('modal__dialog--sm', opt.size === 'sm');
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    $('#formModalBody').scrollTop = 0;
    modalOnClose = opt.onClose || null;
    hydrateIcons(m);
    setTimeout(() => { const f = $('#formModalBody input:not([type=hidden]):not([readonly]), #formModalBody select'); if (f) f.focus({ preventScroll: true }); }, 80);
  }
  function closeModal() {
    const m = $('#formModal');
    if (!m.classList.contains('is-open')) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('#confirmModal').classList.contains('is-open')) document.body.classList.remove('no-scroll');
    if (modalOnClose) { const fn = modalOnClose; modalOnClose = null; fn(); }
  }

  /* ---------- Confirm ---------- */
  let confirmResolver = null;
  function confirmDialog(opt) {
    opt = opt || {};
    const m = $('#confirmModal');
    $('#confirmTitle').textContent = opt.title || 'Yakin?';
    $('#confirmText').textContent = opt.text || '';
    const yes = $('#confirmYes');
    yes.textContent = opt.confirmText || 'Hapus';
    yes.className = 'btn ' + (opt.danger === false ? 'btn--primary' : 'btn--danger');
    const ic = $('#confirmIcon');
    ic.className = 'confirm__icon' + (opt.danger === false ? ' is-info' : '');
    ic.innerHTML = icon(opt.icon || (opt.danger === false ? 'info' : 'trash'));
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(() => yes.focus(), 60);
    return new Promise(resolve => { confirmResolver = resolve; });
  }
  function resolveConfirm(val) {
    const m = $('#confirmModal');
    if (!m.classList.contains('is-open')) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('#formModal').classList.contains('is-open')) document.body.classList.remove('no-scroll');
    if (confirmResolver) { const r = confirmResolver; confirmResolver = null; r(val); }
  }

  /* ---------- Validation helpers ---------- */
  function clearErrors(root) {
    $$('.field.has-error', root).forEach(f => f.classList.remove('has-error'));
  }
  function setError(inputId, msg) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const field = input.closest('.field');
    if (!field) return;
    field.classList.add('has-error');
    let er = $('.error', field);
    if (!er) { er = document.createElement('span'); er.className = 'error'; field.appendChild(er); }
    er.textContent = msg;
  }
  function firstErrorFocus(root) {
    const f = $('.field.has-error input, .field.has-error select, .field.has-error textarea', root);
    if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  /* ---------- Rupiah input ---------- */
  function bindMoneyInputs(root) {
    $$('[data-money]', root).forEach(input => {
      const preview = document.getElementById(input.id + 'Preview');
      const fmt = () => {
        const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        input.value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
        if (preview) preview.textContent = digits ? 'Tampil di website: ' + U.rupiah(+digits) : '';
      };
      input.addEventListener('input', fmt);
      fmt();
    });
  }
  const moneyValue = id => { const v = U.parseNumber(document.getElementById(id).value); return isNaN(v) ? 0 : v; };
  const moneyDisplay = n => n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';

  /* ---------- Kompresi gambar ---------- */
  function compressImage(file, opt) {
    opt = opt || {};
    const maxDim = opt.maxDim || 1280;
    const target = opt.targetBytes || 350 * 1024;
    const format = opt.format || 'image/jpeg';
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('File harus berupa gambar (JPG, PNG, WEBP).')); return; }
      if (file.size > 15 * 1024 * 1024) { reject(new Error('Ukuran file terlalu besar (maksimal 15 MB sebelum kompresi).')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format gambar tidak didukung browser.'));
        img.onload = () => {
          let scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
          let w, h, url, bytes, q;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          for (let attempt = 0; attempt < 6; attempt++) {
            w = Math.max(1, Math.round((img.width || maxDim) * scale));
            h = Math.max(1, Math.round((img.height || maxDim) * scale));
            canvas.width = w; canvas.height = h;
            if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); } else ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            q = 0.86;
            do {
              url = canvas.toDataURL(format, q);
              bytes = Math.round((url.length - url.indexOf(',') - 1) * 3 / 4);
              q -= 0.1;
            } while (format === 'image/jpeg' && bytes > target && q > 0.45);
            if (bytes <= target) break;
            scale *= 0.8;
          }
          resolve({ dataUrl: url, bytes: bytes, width: w, height: h, originalBytes: file.size });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFile(file, opt) {
    if (file && file.size > 2 * 1024 * 1024) toast(`Ukuran file ${U.formatBytes(file.size)} melebihi 2 MB — gambar akan dikompres otomatis.`, 'info');
    const res = await compressImage(file, opt);
    if (CLOUD()) {
      // Mode online: foto langsung di-upload ke Supabase Storage → URL publik
      if (!CL.canWrite) throw new Error('Tidak terhubung ke database online. Login ulang lalu coba lagi.');
      toast('Mengupload foto ke server…', 'info');
      const url = await CL.uploadImage(res.dataUrl, (opt && opt.folder) || 'kendaraan');
      toast(`Foto terupload (${U.formatBytes(res.originalBytes)} → ${U.formatBytes(res.bytes)})`, 'success');
      return url;
    }
    const after = S.usage() + res.dataUrl.length * 2;
    if (after > STORAGE_LIMIT * 0.9) toast('Peringatan: penyimpanan browser hampir penuh. Pertimbangkan memakai URL gambar.', 'error');
    toast(`Foto dikompres: ${U.formatBytes(res.originalBytes)} → ${U.formatBytes(res.bytes)}`, 'success');
    return res.dataUrl;
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  function openSite(hash) {
    const w = window.open('index.html' + (hash || ''), '_blank');
    if (!w) window.location.href = 'index.html' + (hash || '');
  }

  /* =====================================================================
     LOGIN
     ===================================================================== */
  let failCount = 0, lockUntil = 0;

  function showLogin() {
    $('#app').hidden = true;
    $('#loginScreen').hidden = false;
    if (CLOUD()) {
      const lbl = $('label[for="lUser"]');
      if (lbl) lbl.textContent = 'Email Admin';
      $('#lUser').type = 'email';
      $('#lUser').setAttribute('autocomplete', 'email');
      $('#lUser').placeholder = 'Email akun admin Supabase';
      const note = $('.login__note');
      if (note) note.innerHTML = `${icon('shield')} Mode online: login memakai akun admin Supabase. Perubahan langsung tampil di website untuk semua pengunjung.`;
    }
    $('#loginCar').src = NR.art.carOnly('SUV', 'Silver');
    setTimeout(() => $('#lUser').focus(), 50);
  }

  function showApp() {
    $('#loginScreen').hidden = true;
    $('#app').hidden = false;
    const s = getSession();
    $('#profileUser').textContent = s ? s.user : 'admin';
    route();
  }

  function onLogin(e) {
    e.preventDefault();
    const err = $('#loginError');
    const card = $('#loginForm');
    const fail = msg => {
      err.textContent = msg; err.hidden = false;
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    };
    if (Date.now() < lockUntil) return fail(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((lockUntil - Date.now()) / 1000)} detik.`);
    const user = $('#lUser').value.trim();
    const pass = $('#lPass').value;
    if (!user || !pass) return fail(CLOUD() ? 'Email dan password wajib diisi.' : 'Username dan password wajib diisi.');
    if (CLOUD()) { cloudLogin(user, pass, fail); return; }
    const admin = S.getAdmin();
    if (user === admin.username && sha256(pass) === admin.passwordHash) {
      failCount = 0;
      err.hidden = true;
      setSession(user);
      $('#lPass').value = '';
      showApp();
      toast('Selamat datang, Administrator!', 'success');
    } else {
      failCount++;
      if (failCount >= 5) { lockUntil = Date.now() + 30000; failCount = 0; }
      fail('Username atau password salah.');
    }
  }

  async function cloudLogin(email, pass, fail) {
    const btn = $('#loginForm button[type=submit]');
    if (btn.disabled) return;
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = 'Memeriksa…';
    try {
      await CL.signIn(email, pass);
      if (!CL.canWrite) throw new Error(CL.lastError || 'Database online belum siap.');
      $('#loginError').hidden = true;
      setSession(CL.user.email || email);
      $('#lPass').value = '';
      showApp();
      toast('Selamat datang, Administrator!', 'success');
      const seeded = await CL.seedIfEmpty();
      if (seeded) { toast('Data awal berhasil diunggah ke database online.', 'success'); refreshCurrent(); }
    } catch (err) {
      fail(err.message || 'Login gagal.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  let loggingOut = false;
  async function logout() {
    if (loggingOut) return;
    loggingOut = true;
    if (CLOUD()) {
      if (CL.hasPending()) toast('Menyelesaikan penyimpanan sebelum logout…', 'info');
      await CL.signOut();
    }
    loggingOut = false;
    clearSession();
    closeModal();
    showLogin();
    toast('Anda telah logout.', 'info');
  }

  /* ---------- Status sinkron online (topbar) ---------- */
  function renderCloudStatus() {
    const actions = $('.topbar__actions');
    if (!actions) return;
    let pill = $('#cloudPill');
    if (!pill) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.id = 'cloudPill';
      pill.className = 'btn btn--ghost btn--sm';
      pill.style.cssText = 'gap:6px;white-space:nowrap';
      pill.addEventListener('click', () => {
        if (CL.status === 'error') { CL.flush(); toast('Mencoba menyimpan ulang ke database online…', 'info'); }
      });
      actions.insertBefore(pill, actions.firstChild);
    }
    if (!CLOUD()) {
      pill.innerHTML = `${icon('database')} <span class="cloud-pill__text">Mode lokal</span>`;
      pill.title = 'Supabase belum diatur (js/supabase-config.js). Perubahan hanya tersimpan di browser ini.';
      pill.style.color = '#b45309';
      return;
    }
    const map = {
      loading: ['refresh', 'Menghubungkan…', '#64748b'],
      saving: ['refresh', 'Menyimpan online…', '#2563eb'],
      synced: ['check', 'Tersimpan online', '#16a34a'],
      error: ['alert', 'Gagal sinkron · ulangi', '#dc2626']
    };
    const m = map[CL.status] || map.synced;
    pill.innerHTML = `${icon(m[0])} <span class="cloud-pill__text">${m[1]}</span>`;
    pill.style.color = m[2];
    pill.title = CL.status === 'error' ? (CL.lastError || '') + ' — klik untuk mencoba lagi.' : 'Perubahan otomatis tersimpan ke database online (Supabase).';
  }

  function onCloudEvent(e) {
    const d = e.detail || {};
    if (d.type === 'status') renderCloudStatus();
    else if (d.type === 'push-error') toast('Gagal menyimpan ke database online: ' + d.message, 'error');
    else if (d.type === 'data') {
      if (getSession() && !$('#formModal').classList.contains('is-open')) { refreshCurrent(); applyBrand(); }
    } else if (d.type === 'auth' && d.event === 'SIGNED_OUT' && !loggingOut && !$('#app').hidden) {
      clearSession(); closeModal(); showLogin();
      toast('Sesi login berakhir. Silakan login kembali.', 'info');
    }
  }

  /* ---------- Layar memuat (mode online) ---------- */
  function setBusy(msg, isError) {
    let el = $('#cloudBusy');
    if (!msg) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'cloudBusy';
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(11,31,58,.97);color:#fff;font-family:inherit;padding:24px;text-align:center';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="max-width:420px">
      <div style="font-size:40px;line-height:1;margin:0 auto 14px;color:${isError ? '#fca5a5' : '#e3c983'}">${icon(isError ? 'alert' : 'database')}</div>
      <p style="font-weight:700;font-size:1.05rem;margin:0 0 6px">${esc(msg)}</p>
      ${isError ? `<p style="opacity:.8;font-size:.9rem;margin:0 0 16px">${esc(CL.lastError || '')}</p><button type="button" class="btn btn--gold" onclick="location.reload()">Coba Lagi</button>` : '<p style="opacity:.7;font-size:.9rem;margin:0">Mohon tunggu sebentar…</p>'}
    </div>`;
  }

  /* =====================================================================
     ROUTER
     ===================================================================== */
  const PAGES = {
    dashboard: { title: 'Dashboard', render: renderDashboard },
    units: { title: 'Manajemen Unit', render: renderUnits },
    locations: { title: 'Manajemen Lokasi', render: renderLocations },
    whatsapp: { title: 'WhatsApp Settings', render: renderWhatsapp },
    settings: { title: 'Website Settings', render: renderSettings },
    backup: { title: 'Backup & Restore', render: renderBackup }
  };
  let currentPage = 'dashboard';

  function route() {
    if (!getSession()) { showLogin(); return; }
    let page = (location.hash || '#dashboard').slice(1).split('?')[0];
    if (!PAGES[page]) page = 'dashboard';
    currentPage = page;
    $$('.sidebar__nav a').forEach(a => a.classList.toggle('is-active', a.getAttribute('data-page') === page));
    $('#pageTitle').textContent = PAGES[page].title;
    closeSidebar();
    $('#profile').classList.remove('is-open');
    applyBrand();
    $('#navUnitCount').textContent = S.getVehicles().length;
    PAGES[page].render($('#content'));
    hydrateIcons($('#content'));
    window.scrollTo(0, 0);
  }

  function refreshCurrent() {
    $('#navUnitCount').textContent = S.getVehicles().length;
    PAGES[currentPage].render($('#content'));
    hydrateIcons($('#content'));
  }

  function openSidebar() { $('#sidebar').classList.add('is-open'); $('#sidebarBackdrop').classList.add('is-open'); }
  function closeSidebar() { $('#sidebar').classList.remove('is-open'); $('#sidebarBackdrop').classList.remove('is-open'); }

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  function renderDashboard(root) {
    const vs = S.getVehicles();
    const locs = S.getLocations();
    const activeVs = vs.filter(v => v.status !== 'Inactive');
    const totalDaily = activeVs.reduce((a, v) => a + v.priceDay, 0);
    const avg = activeVs.length ? Math.round(totalDaily / activeVs.length) : 0;
    const byStatus = {};
    NR.STATUSES.forEach(s => { byStatus[s] = vs.filter(v => v.status === s).length; });
    const statusColor = { Available: '#16a34a', Booked: '#d97706', Maintenance: '#dc2626', Inactive: '#94a3b8' };
    let acc = 0;
    const stops = NR.STATUSES.map(s => {
      const pct = vs.length ? byStatus[s] / vs.length * 100 : 0;
      const seg = `${statusColor[s]} ${acc}% ${acc + pct}%`;
      acc += pct;
      return seg;
    }).join(', ');
    const maxLoc = Math.max(1, ...locs.map(l => vs.filter(v => v.location === l.id).length));
    const typeAvg = NR.VEHICLE_TYPES.map(t => {
      const list = activeVs.filter(v => v.type === t);
      return { t, n: list.length, avg: list.length ? Math.round(list.reduce((a, v) => a + v.priceDay, 0) / list.length) : 0 };
    }).filter(x => x.n);
    const maxAvg = Math.max(1, ...typeAvg.map(x => x.avg));
    const recent = vs.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 5);
    const meta = S.getMeta();

    root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h2>Selamat datang kembali 👋</h2>
            <p>Ringkasan armada ${esc(S.getSettings().siteName)}${meta.updatedAt ? ' · update terakhir ' + new Date(meta.updatedAt).toLocaleString('id-ID') : ''}</p>
          </div>
          <div class="page-head__actions">
            <button type="button" class="btn btn--ghost" data-go="backup">${icon('download')} Backup</button>
            <button type="button" class="btn btn--gold" data-add-unit>${icon('plus')} Tambah Unit</button>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card stat-card--primary" style="--d:0ms">
            <div class="stat-card__top"><span class="stat-card__label">Total Mobil</span><span class="stat-card__icon">${icon('car')}</span></div>
            <div class="stat-card__value">${vs.length}<small>Unit</small></div>
            <div class="stat-card__meta">${byStatus.Available} tersedia · ${byStatus.Inactive} nonaktif</div>
          </div>
          ${locs.map((l, i) => {
            const n = vs.filter(v => v.location === l.id).length;
            return `<div class="stat-card" style="--d:${(i + 1) * 50}ms">
              <div class="stat-card__top"><span class="stat-card__label">${esc(l.name)}</span><span class="stat-card__icon">${icon('pin')}</span></div>
              <div class="stat-card__value">${n}<small>Unit</small></div>
              <div class="stat-card__meta">${l.active ? 'Lokasi aktif' : 'Lokasi nonaktif'}</div>
            </div>`;
          }).join('')}
          <div class="stat-card stat-card--gold stat-card--wide" style="--d:${(locs.length + 1) * 50}ms;--span4:${4 - ((1 + locs.length) % 4)};--span3:${3 - ((1 + locs.length) % 3)}">
            <div class="stat-card__top"><span class="stat-card__label">Total Harga Rental (per hari)</span><span class="stat-card__icon">${icon('wallet')}</span></div>
            <div class="stat-card__value">${U.rupiah(totalDaily)}</div>
            <div class="stat-card__meta">Akumulasi harga harian ${activeVs.length} unit aktif · rata-rata ${U.rupiah(avg)} / unit</div>
          </div>
        </div>

        <div class="dash-grid">
          <div class="card">
            <div class="card__head"><div><h3>${icon('map')} Unit per Lokasi</h3><p>Distribusi armada di setiap kota</p></div></div>
            <div class="card__body bars">
              ${locs.length ? locs.map(l => {
                const n = vs.filter(v => v.location === l.id).length;
                return `<div><div class="bar__row"><span>${esc(l.name)}</span><span>${n} unit</span></div>
                  <div class="bar__track"><div class="bar__fill" data-w="${(n / maxLoc * 100).toFixed(1)}"></div></div></div>`;
              }).join('') : '<p class="muted">Belum ada lokasi.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="card__head"><div><h3>${icon('dashboard')} Status Unit</h3><p>Kondisi armada saat ini</p></div></div>
            <div class="card__body donut-wrap">
              <div class="donut" style="background:${vs.length ? `conic-gradient(${stops})` : '#eef2f7'}">
                <div class="donut__center"><div><strong>${vs.length}</strong><small>unit</small></div></div>
              </div>
              <div class="legend">
                ${NR.STATUSES.map(s => `<div><i style="background:${statusColor[s]}"></i>${esc(NR.STATUS_LABEL[s])}<b>${byStatus[s]}</b></div>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="dash-grid">
          <div class="card">
            <div class="card__head"><div><h3>${icon('refresh')} Unit Terakhir Diperbarui</h3><p>5 perubahan terbaru</p></div>
              <a href="#units" class="btn btn--ghost btn--sm">Lihat semua</a></div>
            <div class="mini-list">
              ${recent.length ? recent.map(v => `
                <div class="mini-item">
                  <img src="${esc(safeUrl(NR.vehicleImage(v)))}" alt="" loading="lazy">
                  <div class="mini-item__text"><strong>${esc(v.name)} ${v.year}</strong><small>${esc(locName(v.location) || '-')} · ${U.rupiah(v.priceDay)}/hari</small></div>
                  <span class="pill pill--${esc(v.status)}">${esc(NR.STATUS_LABEL[v.status])}</span>
                  <button type="button" class="icon-btn" data-edit-unit="${esc(v.id)}" data-tip="Edit" aria-label="Edit ${esc(v.name)}">${icon('edit')}</button>
                </div>`).join('') : '<div class="empty-state"><p>Belum ada unit.</p></div>'}
            </div>
          </div>
          <div class="card">
            <div class="card__head"><div><h3>${icon('tag')} Rata-rata Harga per Tipe</h3><p>Harga harian unit aktif</p></div></div>
            <div class="card__body bars">
              ${typeAvg.length ? typeAvg.map(x => `<div><div class="bar__row"><span>${esc(x.t)} <small class="muted">(${x.n})</small></span><span>${U.rupiah(x.avg)}</span></div>
                <div class="bar__track"><div class="bar__fill bar__fill--gold" data-w="${(x.avg / maxAvg * 100).toFixed(1)}"></div></div></div>`).join('') : '<p class="muted">Belum ada data.</p>'}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>${icon('sparkle')} Aksi Cepat</h3></div></div>
          <div class="card__body quick-actions">
            <button type="button" class="quick" data-add-unit>${icon('plus')} Tambah Unit Baru</button>
            <button type="button" class="quick" data-go="locations">${icon('map')} Kelola Lokasi</button>
            <button type="button" class="quick" data-go="whatsapp">${icon('whatsapp')} Ubah Nomor WhatsApp</button>
            <button type="button" class="quick" data-open-site>${icon('globe')} Lihat Website</button>
          </div>
        </div>
      </div>`;

    requestAnimationFrame(() => setTimeout(() => {
      $$('.bar__fill', root).forEach(b => { b.style.width = b.getAttribute('data-w') + '%'; });
    }, 60));
  }

  /* =====================================================================
     UNITS (Manajemen Unit)
     ===================================================================== */
  const unitFilter = { q: '', location: '', status: '', type: '' };

  function renderUnits(root) {
    const locs = S.getLocations();
    root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h2>Unit Kendaraan</h2><p>Tambah, ubah harga, ubah lokasi, dan atur status setiap unit.</p></div>
          <div class="page-head__actions">
            <button type="button" class="btn btn--ghost" data-open-site>${icon('globe')} Lihat Website</button>
            <button type="button" class="btn btn--gold" data-add-unit>${icon('plus')} Tambah Unit</button>
          </div>
        </div>
        <div class="card">
          <div class="toolbar">
            <label class="search"><span class="sr-only">Cari unit</span>${icon('search')}<input type="search" id="uSearch" placeholder="Cari nama, brand, ID…" value="${esc(unitFilter.q)}"></label>
            <div class="toolbar__filters">
              <select class="select" id="uFilterLoc" aria-label="Filter lokasi"><option value="">Semua Lokasi</option>${locs.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}</select>
              <select class="select" id="uFilterType" aria-label="Filter tipe"><option value="">Semua Tipe</option>${NR.VEHICLE_TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select>
              <select class="select" id="uFilterStatus" aria-label="Filter status"><option value="">Semua Status</option>${NR.STATUSES.map(s => `<option value="${s}">${esc(NR.STATUS_LABEL[s])}</option>`).join('')}</select>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Unit</th><th>Lokasi</th><th>Tipe</th><th>Tahun</th><th>Harga</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>
              <tbody id="unitRows"></tbody>
            </table>
          </div>
          <div class="table-foot" id="unitFoot"></div>
        </div>
      </div>`;
    $('#uFilterLoc').value = unitFilter.location;
    $('#uFilterType').value = unitFilter.type;
    $('#uFilterStatus').value = unitFilter.status;
    $('#uSearch').addEventListener('input', U.debounce(e => { unitFilter.q = e.target.value; renderUnitRows(); }, 150));
    $('#uFilterLoc').addEventListener('change', e => { unitFilter.location = e.target.value; renderUnitRows(); });
    $('#uFilterType').addEventListener('change', e => { unitFilter.type = e.target.value; renderUnitRows(); });
    $('#uFilterStatus').addEventListener('change', e => { unitFilter.status = e.target.value; renderUnitRows(); });
    renderUnitRows();
  }

  function renderUnitRows() {
    const tbody = $('#unitRows');
    if (!tbody) return;
    const all = S.getVehicles();
    const q = unitFilter.q.toLowerCase().trim();
    const list = all.filter(v => {
      if (unitFilter.location && v.location !== unitFilter.location) return false;
      if (unitFilter.type && v.type !== unitFilter.type) return false;
      if (unitFilter.status && v.status !== unitFilter.status) return false;
      if (q && [v.id, v.name, v.brand, v.model, v.year, v.color].join(' ').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <div class="empty-state__icon">${icon('car')}</div>
        <h3>${all.length ? 'Unit tidak ditemukan' : 'Belum ada unit kendaraan'}</h3>
        <p>${all.length ? 'Coba ubah kata kunci atau filter.' : 'Tambahkan unit pertama Anda agar tampil di website.'}</p>
        <button type="button" class="btn btn--gold" data-add-unit>${icon('plus')} Tambah Unit</button></div></td></tr>`;
    } else {
      tbody.innerHTML = list.map((v, i) => {
        const ln = locName(v.location);
        const inactive = v.status === 'Inactive';
        return `<tr class="${inactive ? 'is-inactive' : ''}" style="animation-delay:${Math.min(i, 12) * 25}ms">
          <td><div class="unit-cell"><img src="${esc(safeUrl(NR.vehicleImage(v)))}" alt="" loading="lazy"><div><strong>${esc(v.name)}</strong><small>${esc(v.id)}</small></div></div></td>
          <td>${ln ? esc(ln) : '<span class="pill pill--Maintenance">Lokasi tidak ditemukan</span>'}</td>
          <td><span class="tag">${esc(v.type)}</span></td>
          <td>${v.year}</td>
          <td class="price-cell"><strong>${U.rupiah(v.priceDay)}</strong><small>${v.priceWeek ? U.rupiah(v.priceWeek) + '/mgg' : '—'} · ${v.priceMonth ? U.rupiah(v.priceMonth) + '/bln' : '—'}</small></td>
          <td><span class="pill pill--${esc(v.status)}">${esc(NR.STATUS_LABEL[v.status])}</span></td>
          <td><div class="actions">
            <button type="button" class="icon-btn" data-preview-unit="${esc(v.id)}" data-tip="Preview" aria-label="Preview">${icon('eye')}</button>
            <button type="button" class="icon-btn" data-edit-unit="${esc(v.id)}" data-tip="Edit" aria-label="Edit">${icon('edit')}</button>
            <button type="button" class="icon-btn" data-dup-unit="${esc(v.id)}" data-tip="Duplikat" aria-label="Duplikat">${icon('copy')}</button>
            <button type="button" class="icon-btn icon-btn--success" data-toggle-unit="${esc(v.id)}" data-tip="${inactive ? 'Aktifkan' : 'Nonaktifkan'}" aria-label="${inactive ? 'Aktifkan' : 'Nonaktifkan'}">${icon('power')}</button>
            <button type="button" class="icon-btn icon-btn--danger" data-del-unit="${esc(v.id)}" data-tip="Hapus" aria-label="Hapus">${icon('trash')}</button>
          </div></td>
        </tr>`;
      }).join('');
    }
    $('#unitFoot').innerHTML = `<span>Menampilkan <strong>${list.length}</strong> dari ${all.length} unit</span><span>Harga diinput sebagai angka, otomatis tampil format Rupiah.</span>`;
  }

  function nextUnitId(locId) {
    const code = (String(locId || 'UNIT').replace(/[^a-z]/gi, '').slice(0, 3) || 'UNT').toUpperCase();
    const map = { JAK: 'JKT', BAN: 'BDG', JOG: 'JOG', SUR: 'SBY', BAL: 'BLI', SEM: 'SMG', MAL: 'MLG', MED: 'MDN', MAK: 'MKS' };
    const prefix = 'NR-' + (map[code] || code) + '-';
    const ids = S.getVehicles().map(v => v.id);
    let n = 1;
    while (ids.indexOf(prefix + String(n).padStart(3, '0')) > -1) n++;
    return prefix + String(n).padStart(3, '0');
  }

  function openUnitForm(id, opt) {
    opt = opt || {};
    const locs = S.getLocations();
    const existing = id ? S.getVehicle(id) : null;
    if (id && !existing) { toast('Unit tidak ditemukan.', 'error'); return; }
    const isNew = !existing;
    const v = existing ? U.clone(existing) : S.normalizeVehicle({
      id: nextUnitId(locs[0] && locs[0].id), location: locs[0] ? locs[0].id : '', type: 'MPV',
      year: CURRENT_YEAR, transmission: 'Automatic', seats: 7, fuel: 'Bensin', status: 'Available',
      features: ['AC', 'Power Steering']
    });
    if (isNew) { v.name = ''; v.priceDay = 0; }
    const work = { image: v.image, gallery: v.gallery.slice(), features: v.features.slice(), idTouched: !isNew, imgTab: v.image && /^data:/.test(v.image) ? 'upload' : 'url' };
    const allFeatures = Array.from(new Set(NR.COMMON_FEATURES.concat(work.features)));

    const body = `
      <form id="unitForm" novalidate>
        <div class="form-section">
          <h4><span class="step">1</span> Informasi Dasar</h4>
          <div class="form-grid form-grid--4">
            <div class="field"><label for="fId">ID Unit <span class="req">*</span></label><input id="fId" value="${esc(v.id)}" maxlength="30"><span class="hint">Kode unik, mis. NR-JKT-005</span><span class="error"></span></div>
            <div class="field span-2"><label for="fName">Nama Mobil <span class="req">*</span></label><input id="fName" value="${esc(v.name)}" placeholder="mis. Toyota Innova Reborn" maxlength="80"><span class="error"></span></div>
            <div class="field"><label for="fStatus">Status</label><select id="fStatus">${NR.STATUSES.map(s => `<option value="${s}" ${v.status === s ? 'selected' : ''}>${s} — ${esc(NR.STATUS_LABEL[s])}</option>`).join('')}</select></div>
            <div class="field"><label for="fBrand">Brand <span class="req">*</span></label><input id="fBrand" value="${esc(v.brand)}" placeholder="mis. Toyota" list="brandList" maxlength="40"><span class="error"></span></div>
            <div class="field"><label for="fModel">Model</label><input id="fModel" value="${esc(v.model)}" placeholder="mis. 2.4 V AT" maxlength="60"></div>
            <div class="field"><label for="fYear">Tahun <span class="req">*</span></label><input id="fYear" type="number" min="1990" max="${CURRENT_YEAR + 1}" value="${v.year}"><span class="error"></span></div>
            <div class="field"><label for="fType">Tipe <span class="req">*</span></label><select id="fType">${NR.VEHICLE_TYPES.map(t => `<option ${v.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
            <div class="field span-2"><label for="fLocation">Lokasi <span class="req">*</span></label>
              <select id="fLocation"><option value="">— Pilih lokasi —</option>${locs.map(l => `<option value="${esc(l.id)}" ${v.location === l.id ? 'selected' : ''}>${esc(l.name)}${l.active ? '' : ' (nonaktif)'}</option>`).join('')}</select><span class="error"></span></div>
          </div>
          <datalist id="brandList">${Array.from(new Set(S.getVehicles().map(x => x.brand).concat(['Toyota', 'Honda', 'Mitsubishi', 'Daihatsu', 'Suzuki', 'Hyundai', 'Nissan', 'Mazda', 'Wuling', 'Mercedes-Benz', 'BMW']))).map(b => `<option value="${esc(b)}">`).join('')}</datalist>
        </div>

        <div class="form-section">
          <h4><span class="step">2</span> Harga Sewa</h4>
          <div class="form-grid form-grid--3">
            <div class="field"><label for="fPriceDay">Harga per Hari <span class="req">*</span></label><div class="input-prefix"><span>Rp</span><input id="fPriceDay" data-money inputmode="numeric" value="${moneyDisplay(v.priceDay)}" placeholder="650000"></div><span class="price-preview" id="fPriceDayPreview"></span><span class="error"></span></div>
            <div class="field"><label for="fPriceWeek">Harga per Minggu</label><div class="input-prefix"><span>Rp</span><input id="fPriceWeek" data-money inputmode="numeric" value="${moneyDisplay(v.priceWeek)}" placeholder="opsional"></div><span class="price-preview" id="fPriceWeekPreview"></span><span class="error"></span></div>
            <div class="field"><label for="fPriceMonth">Harga per Bulan</label><div class="input-prefix"><span>Rp</span><input id="fPriceMonth" data-money inputmode="numeric" value="${moneyDisplay(v.priceMonth)}" placeholder="opsional"></div><span class="price-preview" id="fPriceMonthPreview"></span><span class="error"></span></div>
          </div>
          <p class="note">${icon('info')} <span>Cukup ketik angka, mis. <strong>1250000</strong>. Website otomatis menampilkan <strong>Rp 1.250.000</strong>. Kosongkan harga mingguan/bulanan jika tidak tersedia.</span></p>
        </div>

        <div class="form-section">
          <h4><span class="step">3</span> Spesifikasi</h4>
          <div class="form-grid form-grid--4">
            <div class="field"><label for="fTrans">Transmisi</label><select id="fTrans">${NR.TRANSMISSIONS.map(t => `<option ${v.transmission === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="field"><label for="fSeats">Kapasitas (penumpang)</label><input id="fSeats" type="number" min="1" max="60" value="${v.seats || ''}"><span class="error"></span></div>
            <div class="field"><label for="fFuel">Bahan Bakar</label><select id="fFuel">${NR.FUELS.map(t => `<option ${v.fuel === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="field"><label for="fColor">Warna</label><input id="fColor" value="${esc(v.color)}" placeholder="mis. Hitam" list="colorList" maxlength="30"></div>
          </div>
          <datalist id="colorList">${['Putih', 'Hitam', 'Silver', 'Abu-abu', 'Merah', 'Biru', 'Navy', 'Coklat', 'Hijau', 'Kuning', 'Oranye', 'Champagne'].map(c => `<option value="${c}">`).join('')}</datalist>
          <div class="field"><label for="fDesc">Deskripsi</label><textarea id="fDesc" rows="4" maxlength="800" placeholder="Ceritakan keunggulan kendaraan ini…">${esc(v.description)}</textarea></div>
          <div class="field"><span class="label">Fasilitas</span>
            <div class="check-chips" id="featureChips">${allFeatures.map(f => featureChip(f, work.features.indexOf(f) > -1)).join('')}</div>
            <div class="tag-input" style="margin-top:6px"><input class="input" id="fFeatureNew" placeholder="Tambah fasilitas lain, mis. 7 Seat" maxlength="30"><button type="button" class="btn btn--soft" id="fFeatureAdd">${icon('plus')} Tambah</button></div>
          </div>
        </div>

        <div class="form-section">
          <h4><span class="step">4</span> Foto Kendaraan</h4>
          <div class="img-main">
            <div class="img-preview" id="mainPreview"></div>
            <div style="display:grid;gap:10px">
              <div class="img-tabs" role="tablist">
                <button type="button" data-imgtab="url" class="${work.imgTab === 'url' ? 'is-active' : ''}">${icon('link')} URL Gambar</button>
                <button type="button" data-imgtab="upload" class="${work.imgTab === 'upload' ? 'is-active' : ''}">${icon('upload')} Upload</button>
              </div>
              <div id="imgTabUrl" ${work.imgTab === 'url' ? '' : 'hidden'}>
                <div class="field"><label for="fImageUrl">URL foto utama</label>
                  <div class="tag-input"><input class="input" id="fImageUrl" placeholder="https://… atau assets/cars/nama-file.jpg" value="${esc(/^data:/.test(work.image) ? '' : work.image)}"><button type="button" class="btn btn--soft" id="fImageApply">Pakai</button></div>
                  <span class="error"></span>
                  <span class="hint">Bisa URL internet atau file di folder <code>assets/cars/</code>.</span></div>
              </div>
              <div id="imgTabUpload" ${work.imgTab === 'upload' ? '' : 'hidden'}>
                <label class="dropzone" id="mainDrop">${icon('upload')}<strong>Klik atau seret foto ke sini</strong><span>JPG/PNG/WEBP · otomatis dikompres (target &lt; 2 MB)</span>
                  <input type="file" id="fImageFile" accept="image/*" hidden></label>
              </div>
              <p class="hint muted" style="font-size:.78rem">Jika foto dikosongkan, website menampilkan ilustrasi kendaraan otomatis sesuai tipe &amp; warna.</p>
            </div>
          </div>
          <div class="field"><span class="label">Gallery foto <span class="muted" style="font-weight:600">(opsional, maks. 8)</span></span>
            <div class="gallery-grid" id="galleryGrid"></div>
            <div class="form-grid form-grid--2" style="margin-top:6px">
              <div class="tag-input"><input class="input" id="fGalleryUrl" placeholder="Tambah via URL gambar"><button type="button" class="btn btn--soft" id="fGalleryAdd">${icon('plus')}</button></div>
              <label class="btn btn--ghost" style="cursor:pointer">${icon('upload')} Upload ke Gallery<input type="file" id="fGalleryFile" accept="image/*" multiple hidden></label>
            </div>
          </div>
          <div class="storage-meter" id="storageMeter"></div>
        </div>
      </form>`;

    const foot = `
      <button type="button" class="btn btn--ghost" data-close-modal>Batal</button>
      ${!isNew ? `<button type="button" class="btn btn--soft" data-preview-unit="${esc(v.id)}">${icon('eye')} Preview</button>` : ''}
      <button type="button" class="btn btn--primary" id="unitSave">${icon('check')} ${isNew ? 'Tambah Unit' : 'Simpan Perubahan'}</button>`;

    openModal({
      title: isNew ? (opt.title || 'Tambah Unit Baru') : 'Edit Unit',
      sub: isNew ? 'Lengkapi data kendaraan. Kolom bertanda * wajib diisi.' : `${v.name} · ${v.id}`,
      body, foot
    });

    const form = $('#unitForm');
    bindMoneyInputs(form);

    // auto ID untuk unit baru mengikuti lokasi
    $('#fId').addEventListener('input', () => { work.idTouched = true; });
    $('#fLocation').addEventListener('change', e => { if (!work.idTouched) $('#fId').value = nextUnitId(e.target.value); });

    // fasilitas
    $('#fFeatureAdd').addEventListener('click', addFeature);
    $('#fFeatureNew').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } });
    function addFeature() {
      const input = $('#fFeatureNew');
      const val = input.value.trim();
      if (!val) return;
      const exists = $$('#featureChips input').find(i => i.value.toLowerCase() === val.toLowerCase());
      if (exists) exists.checked = true;
      else $('#featureChips').insertAdjacentHTML('beforeend', featureChip(val, true));
      input.value = '';
      input.focus();
    }

    // foto utama
    const drawMain = () => {
      const src = work.image ? safeUrl(work.image) : NR.art.car({ type: $('#fType').value, color: $('#fColor').value, brand: $('#fBrand').value }, 0);
      $('#mainPreview').innerHTML = `<img src="${esc(src)}" alt="Preview foto utama">
        <span class="img-preview__badge">${work.image ? (/^data:/.test(work.image) ? 'Upload · ' + U.formatBytes(Math.round(work.image.length * 0.75)) : (CLOUD() && CL.isCloudUrl(work.image) ? 'Tersimpan di server' : 'URL')) : 'Ilustrasi otomatis'}</span>
        ${work.image ? `<button type="button" class="icon-btn icon-btn--danger img-preview__remove" id="mainRemove" aria-label="Hapus foto" data-tip="Hapus foto">${icon('trash')}</button>` : ''}`;
      const img = $('#mainPreview img');
      img.onerror = () => { $('.img-preview__badge', $('#mainPreview')).textContent = '⚠ Gambar gagal dimuat'; };
      const rm = $('#mainRemove');
      if (rm) rm.addEventListener('click', () => { work.image = ''; $('#fImageUrl').value = ''; drawMain(); drawMeter(); });
    };
    const drawGallery = () => {
      $('#galleryGrid').innerHTML = work.gallery.length ? work.gallery.map((g, i) => `
        <div class="gallery-item"><img src="${esc(safeUrl(g))}" alt="Gallery ${i + 1}"><button type="button" data-gal-remove="${i}" aria-label="Hapus foto gallery">${icon('x')}</button></div>`).join('')
        : '<p class="muted" style="font-size:.84rem;grid-column:1/-1">Belum ada foto gallery. Website akan menampilkan variasi ilustrasi.</p>';
    };
    const drawMeter = () => {
      if (CLOUD()) { $('#storageMeter').hidden = true; return; }
      const est = S.usage() + (JSON.stringify(work).length * 2) - (existing ? JSON.stringify(existing).length * 2 : 0);
      const pct = Math.min(100, est / STORAGE_LIMIT * 100);
      $('#storageMeter').innerHTML = `<small>Perkiraan penggunaan penyimpanan browser: <strong>${U.formatBytes(Math.max(0, est))}</strong> dari ±5 MB</small>
        <div class="storage-meter__track"><div class="storage-meter__fill" style="width:${pct.toFixed(1)}%;${pct > 85 ? 'background:var(--danger)' : ''}"></div></div>`;
    };
    drawMain(); drawGallery(); drawMeter();
    ['#fType', '#fColor', '#fBrand'].forEach(s => $(s).addEventListener('change', () => { if (!work.image) drawMain(); }));

    $$('[data-imgtab]', form).forEach(b => b.addEventListener('click', () => {
      work.imgTab = b.getAttribute('data-imgtab');
      $$('[data-imgtab]', form).forEach(x => x.classList.toggle('is-active', x === b));
      $('#imgTabUrl').hidden = work.imgTab !== 'url';
      $('#imgTabUpload').hidden = work.imgTab !== 'upload';
    }));
    const applyUrl = () => {
      const val = $('#fImageUrl').value.trim();
      clearErrors($('#imgTabUrl'));
      if (val && !isImageSource(val)) { setError('fImageUrl', 'URL gambar tidak valid. Gunakan http(s):// atau path file gambar.'); return; }
      work.image = val;
      drawMain(); drawMeter();
    };
    $('#fImageApply').addEventListener('click', applyUrl);
    $('#fImageUrl').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } });

    const uploadMain = async file => {
      try {
        work.image = await handleImageFile(file, { maxDim: 1280, targetBytes: 350 * 1024, folder: 'kendaraan' });
        drawMain(); drawMeter();
      } catch (err) { toast(err.message, 'error'); }
    };
    $('#fImageFile').addEventListener('change', e => { if (e.target.files[0]) uploadMain(e.target.files[0]); e.target.value = ''; });
    const drop = $('#mainDrop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) uploadMain(f); });

    // gallery
    $('#fGalleryAdd').addEventListener('click', () => {
      const val = $('#fGalleryUrl').value.trim();
      if (!val) return;
      if (!isImageSource(val)) { toast('URL gambar gallery tidak valid.', 'error'); return; }
      if (work.gallery.length >= 8) { toast('Maksimal 8 foto gallery.', 'error'); return; }
      work.gallery.push(val);
      $('#fGalleryUrl').value = '';
      drawGallery(); drawMeter();
    });
    $('#fGalleryFile').addEventListener('change', async e => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      for (const f of files) {
        if (work.gallery.length >= 8) { toast('Maksimal 8 foto gallery.', 'error'); break; }
        try { work.gallery.push(await handleImageFile(f, { maxDim: 1100, targetBytes: 220 * 1024, folder: 'kendaraan' })); }
        catch (err) { toast(err.message, 'error'); }
      }
      drawGallery(); drawMeter();
    });
    $('#galleryGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-gal-remove]');
      if (!b) return;
      work.gallery.splice(+b.getAttribute('data-gal-remove'), 1);
      drawGallery(); drawMeter();
    });

    $('#unitSave').addEventListener('click', () => saveUnit(existing, work));
    form.addEventListener('submit', e => { e.preventDefault(); saveUnit(existing, work); });
  }

  function featureChip(f, checked) {
    return `<label class="check-chip"><input type="checkbox" value="${esc(f)}" ${checked ? 'checked' : ''}><span>${esc(f)}</span></label>`;
  }

  function saveUnit(existing, work) {
    const form = $('#unitForm');
    clearErrors(form);
    const val = id => document.getElementById(id).value.trim();
    const data = {
      id: val('fId').toUpperCase(),
      name: val('fName'),
      brand: val('fBrand'),
      model: val('fModel'),
      year: parseInt(val('fYear'), 10),
      location: val('fLocation'),
      type: val('fType'),
      priceDay: moneyValue('fPriceDay'),
      priceWeek: moneyValue('fPriceWeek'),
      priceMonth: moneyValue('fPriceMonth'),
      transmission: val('fTrans'),
      seats: parseInt(val('fSeats'), 10),
      fuel: val('fFuel'),
      color: val('fColor'),
      description: val('fDesc'),
      features: $$('#featureChips input:checked').map(i => i.value),
      image: work.image,
      gallery: work.gallery,
      status: val('fStatus')
    };
    let ok = true;
    const bad = (id, msg) => { ok = false; setError(id, msg); };

    if (!data.id) bad('fId', 'ID wajib diisi.');
    else if (!/^[A-Z0-9_-]{3,30}$/.test(data.id)) bad('fId', 'Gunakan huruf, angka, atau tanda - (3–30 karakter).');
    else if ((!existing || existing.id !== data.id) && S.getVehicle(data.id)) bad('fId', 'ID sudah dipakai unit lain.');
    if (!data.name) bad('fName', 'Nama kendaraan wajib diisi.');
    if (!data.brand) bad('fBrand', 'Brand wajib diisi.');
    if (!data.location) bad('fLocation', 'Lokasi wajib diisi.');
    else if (!S.getLocation(data.location)) bad('fLocation', 'Lokasi tidak ditemukan.');
    if (isNaN(data.year) || data.year < 1990 || data.year > CURRENT_YEAR + 1) bad('fYear', `Tahun harus antara 1990 – ${CURRENT_YEAR + 1}.`);
    if (!(data.priceDay > 0)) bad('fPriceDay', 'Harga per hari wajib diisi dan lebih dari 0.');
    if (data.priceWeek < 0) bad('fPriceWeek', 'Harga tidak boleh negatif.');
    if (data.priceMonth < 0) bad('fPriceMonth', 'Harga tidak boleh negatif.');
    if (data.priceWeek && data.priceWeek < data.priceDay) bad('fPriceWeek', 'Harga mingguan lebih kecil dari harga harian.');
    if (data.priceMonth && data.priceWeek && data.priceMonth < data.priceWeek) bad('fPriceMonth', 'Harga bulanan lebih kecil dari harga mingguan.');
    if (isNaN(data.seats) || data.seats < 1 || data.seats > 60) bad('fSeats', 'Kapasitas 1 – 60 penumpang.');

    if (!ok) { toast('Mohon periksa kembali isian yang ditandai.', 'error'); firstErrorFocus(form); return; }

    try {
      S.upsertVehicle(data, existing ? existing.id : null);
    } catch (err) {
      toast(err.message || 'Gagal menyimpan data.', 'error');
      return;
    }
    closeModal();
    toast(existing ? 'Data berhasil disimpan.' : 'Unit berhasil ditambahkan.', 'success');
    refreshCurrent();
  }

  async function deleteUnit(id) {
    const v = S.getVehicle(id);
    if (!v) return;
    const yes = await confirmDialog({ title: 'Hapus unit ini?', text: `${v.name} (${v.id}) akan dihapus permanen dari website. Tindakan ini tidak dapat dibatalkan.`, confirmText: 'Ya, Hapus' });
    if (!yes) return;
    S.deleteVehicle(id);
    toast('Unit berhasil dihapus.', 'success');
    refreshCurrent();
  }

  function duplicateUnit(id) {
    const v = S.getVehicle(id);
    if (!v) return;
    const copy = U.clone(v);
    let n = 2, newId = v.id + '-C';
    while (S.getVehicle(newId)) newId = v.id + '-C' + (n++);
    copy.id = newId;
    copy.name = v.name + ' (Salinan)';
    copy.createdAt = null; copy.updatedAt = null;
    try { S.upsertVehicle(copy); } catch (err) { toast(err.message, 'error'); return; }
    toast('Unit berhasil diduplikasi.', 'success');
    refreshCurrent();
    openUnitForm(newId);
  }

  function toggleUnit(id) {
    const v = S.getVehicle(id);
    if (!v) return;
    v.status = v.status === 'Inactive' ? 'Available' : 'Inactive';
    try { S.upsertVehicle(v, id); } catch (err) { toast(err.message, 'error'); return; }
    toast(v.status === 'Inactive' ? `${v.name} dinonaktifkan (disembunyikan dari website).` : `${v.name} diaktifkan kembali.`, 'success');
    refreshCurrent();
  }

  /* =====================================================================
     LOCATIONS
     ===================================================================== */
  function renderLocations(root) {
    const locs = S.getLocations();
    const vs = S.getVehicles();
    root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h2>Lokasi Layanan</h2><p>Kelola kota layanan. Lokasi baru otomatis muncul di navbar, pencarian, dan halaman lokasi website.</p></div>
          <div class="page-head__actions"><button type="button" class="btn btn--gold" data-add-loc>${icon('plus')} Tambah Lokasi</button></div>
        </div>
        ${locs.length ? `<div class="loc-grid">${locs.map((l, i) => {
          const n = vs.filter(v => v.location === l.id).length;
          return `<article class="card loc-card" style="--d:${i * 50}ms">
            <div class="loc-card__img"><img src="${esc(safeUrl(NR.locationImage(l)))}" alt="${esc(l.name)}" loading="lazy">
              <span class="pill ${l.active ? 'pill--Available' : 'pill--Inactive'}">${l.active ? 'Aktif' : 'Nonaktif'}</span></div>
            <div class="loc-card__body">
              <h3>${esc(l.name)}</h3>
              <div class="loc-card__meta">
                <span>${icon('map')} ${esc(l.city || '-')}</span>
                <span>${icon('car')} ${n} unit</span>
                <span>${icon('whatsapp')} ${l.whatsapp ? esc(U.prettyPhone(l.whatsapp)) : 'Pakai WA utama'}</span>
              </div>
              <p class="muted" style="font-size:.84rem">${esc(l.address || 'Alamat belum diisi')}</p>
            </div>
            <div class="loc-card__foot">
              <label class="switch"><input type="checkbox" data-toggle-loc="${esc(l.id)}" ${l.active ? 'checked' : ''}><span class="switch__track"></span><span>${l.active ? 'Aktif' : 'Nonaktif'}</span></label>
              <div class="actions">
                <button type="button" class="icon-btn" data-view-loc="${esc(l.id)}" data-tip="Lihat halaman" aria-label="Lihat halaman">${icon('eye')}</button>
                <button type="button" class="icon-btn" data-edit-loc="${esc(l.id)}" data-tip="Edit" aria-label="Edit">${icon('edit')}</button>
                <button type="button" class="icon-btn icon-btn--danger" data-del-loc="${esc(l.id)}" data-tip="Hapus" aria-label="Hapus">${icon('trash')}</button>
              </div>
            </div>
          </article>`;
        }).join('')}</div>` : `<div class="card"><div class="empty-state"><div class="empty-state__icon">${icon('map')}</div><h3>Belum ada lokasi</h3><p>Tambahkan kota layanan pertama Anda.</p><button type="button" class="btn btn--gold" data-add-loc>${icon('plus')} Tambah Lokasi</button></div></div>`}
        <p class="note">${icon('info')} <span>Contoh kota yang bisa ditambahkan berikutnya: Bali, Semarang, Malang, Medan, Makassar. Setelah lokasi dibuat, tambahkan unit dan pilih lokasi tersebut.</span></p>
      </div>`;
  }

  function openLocationForm(id) {
    const existing = id ? S.getLocation(id) : null;
    const isNew = !existing;
    const l = existing ? U.clone(existing) : S.normalizeLocation({ id: '', name: '', active: true, hue: Math.floor(Math.random() * 360) });
    const work = { photo: l.photo, hue: l.hue };
    const body = `
      <form id="locForm" novalidate>
        <div class="form-section">
          <h4>${icon('map')} Informasi Lokasi</h4>
          <div class="form-grid form-grid--2">
            <div class="field"><label for="lName">Nama Lokasi <span class="req">*</span></label><input id="lName" value="${esc(l.name)}" placeholder="mis. Bali" maxlength="40"><span class="error"></span></div>
            <div class="field"><label for="lCity">Kota / Provinsi</label><input id="lCity" value="${esc(l.city)}" placeholder="mis. Denpasar, Bali" maxlength="60"></div>
            <div class="field"><label for="lId">ID / Slug URL</label><input id="lId" value="${esc(l.id)}" ${isNew ? '' : 'readonly'} placeholder="otomatis dari nama" maxlength="30"><span class="hint">Halaman: index.html#lokasi/<b id="lSlugPreview">${esc(l.id || '…')}</b>${isNew ? '' : ' (tidak dapat diubah)'}</span><span class="error"></span></div>
            <div class="field"><label for="lWa">Nomor WhatsApp</label><input id="lWa" value="${esc(l.whatsapp)}" inputmode="tel" placeholder="6282211116847 (kosong = WA utama)"><span class="error"></span></div>
            <div class="field span-2"><label for="lAddress">Alamat</label><input id="lAddress" value="${esc(l.address)}" placeholder="Alamat kantor / pool kendaraan" maxlength="160"></div>
            <div class="field span-2"><label for="lDesc">Deskripsi</label><textarea id="lDesc" rows="3" maxlength="500" placeholder="Deskripsi singkat layanan di kota ini">${esc(l.description)}</textarea></div>
            <div class="field span-2"><label for="lAreas">Area Layanan</label><textarea id="lAreas" rows="2" placeholder="Pisahkan dengan koma, mis. Kuta, Seminyak, Ubud, Bandara Ngurah Rai">${esc(l.areas.join(', '))}</textarea></div>
          </div>
          <label class="switch"><input type="checkbox" id="lActive" ${l.active ? 'checked' : ''}><span class="switch__track"></span><span>Lokasi aktif (tampil di website)</span></label>
        </div>
        <div class="form-section">
          <h4>${icon('image')} Foto Lokasi</h4>
          <div class="img-main">
            <div class="img-preview" id="locPreview"></div>
            <div style="display:grid;gap:10px">
              <div class="field"><label for="lPhotoUrl">URL foto</label>
                <div class="tag-input"><input class="input" id="lPhotoUrl" value="${esc(/^data:/.test(work.photo) ? '' : work.photo)}" placeholder="https://… (kosong = ilustrasi kota)"><button type="button" class="btn btn--soft" id="lPhotoApply">Pakai</button></div><span class="error"></span></div>
              <label class="btn btn--ghost" style="cursor:pointer">${icon('upload')} Upload Foto<input type="file" id="lPhotoFile" accept="image/*" hidden></label>
              <div class="field"><label for="lHue">Warna ilustrasi (jika tanpa foto)</label><input type="range" id="lHue" min="0" max="359" value="${work.hue}"></div>
            </div>
          </div>
        </div>
      </form>`;
    openModal({
      title: isNew ? 'Tambah Lokasi' : 'Edit Lokasi',
      sub: isNew ? 'Kota baru akan otomatis tersedia di website.' : l.name,
      size: 'sm',
      body,
      foot: `<button type="button" class="btn btn--ghost" data-close-modal>Batal</button><button type="button" class="btn btn--primary" id="locSave">${icon('check')} ${isNew ? 'Tambah Lokasi' : 'Simpan Perubahan'}</button>`
    });

    const draw = () => {
      const src = work.photo ? safeUrl(work.photo) : NR.art.city({ id: $('#lId').value || 'x', name: $('#lName').value || 'KOTA', hue: work.hue });
      $('#locPreview').innerHTML = `<img src="${esc(src)}" alt="Preview"><span class="img-preview__badge">${work.photo ? 'Foto' : 'Ilustrasi otomatis'}</span>
        ${work.photo ? `<button type="button" class="icon-btn icon-btn--danger img-preview__remove" id="lPhotoRemove" aria-label="Hapus foto">${icon('trash')}</button>` : ''}`;
      const rm = $('#lPhotoRemove');
      if (rm) rm.addEventListener('click', () => { work.photo = ''; $('#lPhotoUrl').value = ''; draw(); });
    };
    draw();
    let slugTouched = !isNew;
    $('#lName').addEventListener('input', () => {
      if (!slugTouched) $('#lId').value = U.slugify($('#lName').value);
      $('#lSlugPreview').textContent = $('#lId').value || '…';
      if (!work.photo) draw();
    });
    $('#lId').addEventListener('input', () => { slugTouched = true; $('#lSlugPreview').textContent = U.slugify($('#lId').value) || '…'; });
    $('#lHue').addEventListener('input', e => { work.hue = +e.target.value; if (!work.photo) draw(); });
    $('#lPhotoApply').addEventListener('click', () => {
      const v = $('#lPhotoUrl').value.trim();
      clearErrors($('#locForm'));
      if (v && !isImageSource(v)) { setError('lPhotoUrl', 'URL gambar tidak valid.'); return; }
      work.photo = v; draw();
    });
    $('#lPhotoFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { work.photo = await handleImageFile(f, { maxDim: 1600, targetBytes: 380 * 1024, folder: 'lokasi' }); draw(); }
      catch (err) { toast(err.message, 'error'); }
    });
    $('#locSave').addEventListener('click', () => saveLocation(existing, work));
  }

  function saveLocation(existing, work) {
    const form = $('#locForm');
    clearErrors(form);
    const name = $('#lName').value.trim();
    const id = existing ? existing.id : U.slugify($('#lId').value || name);
    const wa = $('#lWa').value.trim();
    let ok = true;
    const bad = (f, m) => { ok = false; setError(f, m); };
    if (!name) bad('lName', 'Nama lokasi wajib diisi.');
    if (!id) bad('lId', 'ID lokasi wajib diisi.');
    else if (!existing && S.getLocation(id)) bad('lId', 'ID lokasi sudah digunakan.');
    if (wa && !U.isValidPhone(wa)) bad('lWa', 'Nomor WhatsApp tidak valid. Contoh: 6282211116847');
    if (!ok) { toast('Mohon periksa kembali isian yang ditandai.', 'error'); firstErrorFocus(form); return; }

    const loc = {
      id, name,
      city: $('#lCity').value.trim(),
      description: $('#lDesc').value.trim(),
      address: $('#lAddress').value.trim(),
      whatsapp: wa ? U.normalizePhone(wa) : '',
      photo: work.photo,
      active: $('#lActive').checked,
      hue: work.hue,
      areas: $('#lAreas').value.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    };
    const list = S.getLocations();
    const idx = list.findIndex(x => x.id === id);
    if (idx > -1) list[idx] = loc; else list.push(loc);
    try { S.saveLocations(list); } catch (err) { toast(err.message, 'error'); return; }
    closeModal();
    toast(existing ? 'Data berhasil disimpan.' : 'Lokasi berhasil ditambahkan.', 'success');
    refreshCurrent();
  }

  async function deleteLocation(id) {
    const l = S.getLocation(id);
    if (!l) return;
    const n = S.getVehicles().filter(v => v.location === id).length;
    const yes = await confirmDialog({
      title: `Hapus lokasi ${l.name}?`,
      text: n ? `Terdapat ${n} unit di lokasi ini. Unit tidak ikut terhapus, tetapi akan disembunyikan dari website sampai dipindahkan ke lokasi lain.` : 'Lokasi akan dihapus dari website. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus'
    });
    if (!yes) return;
    S.saveLocations(S.getLocations().filter(x => x.id !== id));
    toast('Lokasi berhasil dihapus.', 'success');
    refreshCurrent();
  }

  function toggleLocation(id, active) {
    const list = S.getLocations();
    const l = list.find(x => x.id === id);
    if (!l) return;
    l.active = active;
    S.saveLocations(list);
    toast(`Lokasi ${l.name} ${active ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    refreshCurrent();
  }

  /* =====================================================================
     WHATSAPP SETTINGS
     ===================================================================== */
  function renderWhatsapp(root) {
    const w = S.getWhatsapp();
    const locs = S.getLocations();
    const sample = S.getVehicles()[0];
    root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div><h2>WhatsApp Settings</h2><p>Semua tombol WhatsApp di website memakai nomor dari halaman ini — tanpa mengubah source code.</p></div>
        </div>
        <div class="dash-grid">
          <form class="card" id="waForm" novalidate>
            <div class="card__head"><div><h3>${icon('whatsapp')} Nomor WhatsApp</h3><p>Format internasional tanpa + atau spasi, mis. 6282211116847</p></div></div>
            <div class="card__body">
              <div class="wa-row">
                <div class="wa-row__head"><span class="wa-row__icon">${icon('whatsapp')}</span><div><strong>WhatsApp Utama</strong><small>Dipakai tombol floating, navbar, dan lokasi tanpa nomor khusus</small></div></div>
                <div class="wa-row__input">
                  <div class="field"><label class="sr-only" for="waMain">WhatsApp utama</label><input id="waMain" inputmode="tel" value="${esc(w.main)}" placeholder="6282211116847"><span class="error"></span></div>
                  <button type="button" class="btn btn--ghost" data-test-wa="waMain">${icon('external')} Tes</button>
                </div>
              </div>
              ${locs.map(l => `
              <div class="wa-row">
                <div class="wa-row__head"><span class="wa-row__icon">${icon('pin')}</span><div><strong>WhatsApp ${esc(l.name)}</strong><small>Kosongkan untuk memakai WhatsApp utama</small></div></div>
                <div class="wa-row__input">
                  <div class="field"><label class="sr-only" for="wa_${esc(l.id)}">WhatsApp ${esc(l.name)}</label><input id="wa_${esc(l.id)}" data-loc-wa="${esc(l.id)}" inputmode="tel" value="${esc(l.whatsapp)}" placeholder="Pakai WhatsApp utama"><span class="error"></span></div>
                  <button type="button" class="btn btn--ghost" data-test-wa="wa_${esc(l.id)}">${icon('external')} Tes</button>
                </div>
              </div>`).join('')}
              <div class="field" style="margin-top:14px"><label for="waFloat">Pesan tombol WhatsApp floating</label><textarea id="waFloat" rows="2" maxlength="300">${esc(w.floatingMessage)}</textarea></div>
            </div>
            <div class="card__foot"><button type="submit" class="btn btn--primary">${icon('check')} Simpan Pengaturan</button></div>
          </form>
          <div class="card">
            <div class="card__head"><div><h3>${icon('eye')} Contoh Pesan Booking</h3><p>Pesan otomatis yang terkirim saat customer memesan</p></div></div>
            <div class="card__body">
              <div class="msg-preview">${esc(sampleMessage(sample))}</div>
              <p class="note" style="margin-top:14px">${icon('info')} <span>Link dibuat dengan format <code>https://wa.me/62XXXXXXXXXX?text=…</code>. Nomor tujuan otomatis mengikuti lokasi unit.</span></p>
            </div>
          </div>
        </div>
      </div>`;

    $('#waForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = $('#waForm');
      clearErrors(form);
      let ok = true;
      const main = $('#waMain').value.trim();
      if (!main) { ok = false; setError('waMain', 'WhatsApp utama wajib diisi.'); }
      else if (!U.isValidPhone(main)) { ok = false; setError('waMain', 'Nomor WhatsApp tidak valid. Contoh: 6282211116847'); }
      $$('[data-loc-wa]', form).forEach(inp => {
        const v = inp.value.trim();
        if (v && !U.isValidPhone(v)) { ok = false; setError(inp.id, 'Nomor WhatsApp tidak valid.'); }
      });
      if (!ok) { toast('Mohon periksa kembali nomor WhatsApp.', 'error'); firstErrorFocus(form); return; }
      S.saveWhatsapp({ main: U.normalizePhone(main), floatingMessage: $('#waFloat').value.trim() || NR.DEFAULT_WHATSAPP.floatingMessage });
      const list = S.getLocations();
      $$('[data-loc-wa]', form).forEach(inp => {
        const l = list.find(x => x.id === inp.getAttribute('data-loc-wa'));
        if (l) l.whatsapp = inp.value.trim() ? U.normalizePhone(inp.value) : '';
      });
      S.saveLocations(list);
      toast('Data berhasil disimpan.', 'success');
      refreshCurrent();
    });
    $$('[data-test-wa]', root).forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById(b.getAttribute('data-test-wa'));
      const v = inp.value.trim() || $('#waMain').value.trim();
      if (!U.isValidPhone(v)) { toast('Nomor WhatsApp tidak valid.', 'error'); return; }
      window.open(U.waLink(v, 'Tes nomor WhatsApp dari Admin ' + S.getSettings().siteName), '_blank');
    }));
  }

  function sampleMessage(v) {
    const st = S.getSettings();
    if (!v) return 'Belum ada unit untuk contoh pesan.';
    const ln = locName(v.location) || '-';
    return [
      `Halo ${st.siteName},`, '', 'Saya ingin melakukan pemesanan kendaraan.', '', 'Detail kendaraan:',
      `Mobil: ${v.name}`, `Kode Unit: ${v.id}`, `Tahun: ${v.year}`, `Lokasi: ${ln}`, `Harga: ${U.rupiah(v.priceDay)}/hari`, '',
      `Tanggal mulai: ${U.formatDate(U.todayISO(1))}`, `Tanggal selesai: ${U.formatDate(U.todayISO(3))}`, 'Durasi: 2 hari',
      `Estimasi biaya: ${U.rupiah(U.estimateCost(v, 2))}`, '', 'Mohon informasi ketersediaan dan proses selanjutnya.', '', 'Terima kasih.'
    ].join('\n');
  }

  /* =====================================================================
     WEBSITE SETTINGS
     ===================================================================== */
  function renderSettings(root) {
    const st = S.getSettings();
    const w = S.getWhatsapp();
    const admin = S.getAdmin();
    root.innerHTML = `
      <div class="page">
        <div class="page-head"><div><h2>Website Settings</h2><p>Identitas brand, kontak, dan media sosial yang tampil di website.</p></div></div>
        <div class="dash-grid">
          <form class="card" id="settingsForm" novalidate>
            <div class="card__head"><div><h3>${icon('globe')} Identitas &amp; Kontak</h3></div></div>
            <div class="card__body">
              <div class="form-grid form-grid--2">
                <div class="field"><label for="sName">Nama Website <span class="req">*</span></label><input id="sName" value="${esc(st.siteName)}" maxlength="40"><span class="error"></span></div>
                <div class="field"><label for="sTagline">Tagline</label><input id="sTagline" value="${esc(st.tagline)}" maxlength="80"></div>
                <div class="field span-2"><label for="sLogo">Logo URL</label>
                  <div class="tag-input"><input class="input" id="sLogo" value="${esc(/^data:/.test(st.logoUrl) ? '' : st.logoUrl)}" placeholder="assets/logo.png atau https://…"><label class="btn btn--ghost" style="cursor:pointer">${icon('upload')} Upload<input type="file" id="sLogoFile" accept="image/*" hidden></label></div>
                  <span class="hint" id="sLogoHint">${/^data:/.test(st.logoUrl) ? 'Logo saat ini: hasil upload. ' : ''}Disarankan persegi (1:1), mis. 512×512 px.</span><span class="error"></span></div>
                <div class="field span-2"><label for="sHero">Foto Background Hero (opsional)</label><input id="sHero" value="${esc(st.heroImage)}" placeholder="https://… foto mobil premium (kosong = ilustrasi bawaan)"><span class="error"></span></div>
                <div class="field"><label for="sWa">Nomor WhatsApp Utama <span class="req">*</span></label><input id="sWa" inputmode="tel" value="${esc(w.main)}"><span class="hint">Sama dengan WhatsApp utama di menu WhatsApp.</span><span class="error"></span></div>
                <div class="field"><label for="sEmail">Email</label><input id="sEmail" type="email" value="${esc(st.email)}"><span class="error"></span></div>
                <div class="field span-2"><label for="sAddress">Alamat</label><input id="sAddress" value="${esc(st.address)}" maxlength="160"></div>
                <div class="field span-2"><label for="sHours">Jam Operasional</label><input id="sHours" value="${esc(st.hours)}" maxlength="80"></div>
                <div class="field"><label for="sIg">Instagram</label><input id="sIg" value="${esc(st.instagram)}" placeholder="https://instagram.com/…"><span class="error"></span></div>
                <div class="field"><label for="sFb">Facebook</label><input id="sFb" value="${esc(st.facebook)}" placeholder="https://facebook.com/…"><span class="error"></span></div>
                <div class="field"><label for="sTt">TikTok</label><input id="sTt" value="${esc(st.tiktok)}" placeholder="https://tiktok.com/@…"><span class="error"></span></div>
              </div>
            </div>
            <div class="card__foot"><button type="submit" class="btn btn--primary">${icon('check')} Simpan Pengaturan</button></div>
          </form>

          <div style="display:grid;gap:20px;align-content:start">
            <div class="card">
              <div class="card__head"><div><h3>${icon('image')} Preview Brand</h3></div></div>
              <div class="card__body" style="display:flex;gap:14px;align-items:center">
                <span class="brand-mark brand-mark--lg" style="margin:0" id="logoPreview"></span>
                <div><strong style="color:var(--ink);font-size:1.1rem" id="namePreview">${esc(st.siteName)}</strong><p class="muted" id="taglinePreview">${esc(st.tagline)}</p></div>
              </div>
            </div>
            ${CLOUD() ? `
            <form class="card" id="securityForm" novalidate autocomplete="off">
              <div class="card__head"><div><h3>${icon('key')} Keamanan Admin</h3><p>Ubah password akun admin online</p></div></div>
              <div class="card__body form-grid">
                <div class="field"><label>Email admin</label><input value="${esc(CL.user && CL.user.email || '')}" readonly></div>
                <div class="field"><label for="secCurrent">Password saat ini <span class="req">*</span></label><input id="secCurrent" type="password" autocomplete="current-password"><span class="error"></span></div>
                <div class="field"><label for="secNew">Password baru <span class="req">*</span></label><input id="secNew" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"><span class="error"></span></div>
                <div class="field"><label for="secConfirm">Ulangi password baru <span class="req">*</span></label><input id="secConfirm" type="password" autocomplete="new-password"><span class="error"></span></div>
                <p class="note">${icon('shield')} <span>Login dikelola oleh Supabase Auth (server). Email admin dapat diganti di dashboard Supabase → Authentication → Users.</span></p>
              </div>
              <div class="card__foot"><button type="submit" class="btn btn--primary">${icon('lock')} Ganti Password</button></div>
            </form>` : `
            <form class="card" id="securityForm" novalidate autocomplete="off">
              <div class="card__head"><div><h3>${icon('key')} Keamanan Admin</h3><p>Ubah username &amp; password login</p></div></div>
              <div class="card__body form-grid">
                <div class="field"><label for="secCurrent">Password saat ini <span class="req">*</span></label><input id="secCurrent" type="password" autocomplete="current-password"><span class="error"></span></div>
                <div class="field"><label for="secUser">Username baru</label><input id="secUser" value="${esc(admin.username)}" autocomplete="username"><span class="error"></span></div>
                <div class="field"><label for="secNew">Password baru</label><input id="secNew" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter"><span class="error"></span></div>
                <div class="field"><label for="secConfirm">Ulangi password baru</label><input id="secConfirm" type="password" autocomplete="new-password"><span class="error"></span></div>
                <p class="note note--warn">${icon('alert')} <span>Autentikasi ini hanya untuk prototype (frontend). Gunakan backend authentication untuk production.</span></p>
              </div>
              <div class="card__foot"><button type="submit" class="btn btn--primary">${icon('lock')} Perbarui Login</button></div>
            </form>`}
          </div>
        </div>
      </div>`;

    let logoData = /^data:/.test(st.logoUrl) ? st.logoUrl : '';
    const drawLogo = () => {
      const src = logoData || safeUrl($('#sLogo').value.trim());
      const box = $('#logoPreview');
      if (!src) { box.innerHTML = LOGO_SVG; return; }
      const img = document.createElement('img');
      img.alt = '';
      img.onerror = () => { box.innerHTML = LOGO_SVG; };
      img.src = src;
      box.innerHTML = ''; box.appendChild(img);
    };
    drawLogo();
    $('#sLogo').addEventListener('input', () => { logoData = ''; $('#sLogoHint').textContent = 'Disarankan persegi (1:1), mis. 512×512 px.'; drawLogo(); });
    $('#sLogoFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        logoData = await handleImageFile(f, { maxDim: 256, targetBytes: 120 * 1024, format: 'image/png', folder: 'brand' });
        $('#sLogo').value = CLOUD() ? logoData : '';
        $('#sLogoHint').textContent = 'Logo hasil upload siap disimpan — klik Simpan Pengaturan.';
        drawLogo();
      } catch (err) { toast(err.message, 'error'); }
    });
    $('#sName').addEventListener('input', e => { $('#namePreview').textContent = e.target.value; });
    $('#sTagline').addEventListener('input', e => { $('#taglinePreview').textContent = e.target.value; });

    $('#settingsForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = $('#settingsForm');
      clearErrors(form);
      const v = id => $(id).value.trim();
      let ok = true;
      const bad = (f, m) => { ok = false; setError(f, m); };
      if (!v('#sName')) bad('sName', 'Nama website wajib diisi.');
      if (!U.isValidPhone(v('#sWa'))) bad('sWa', 'Nomor WhatsApp tidak valid. Contoh: 6282211116847');
      if (v('#sEmail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('#sEmail'))) bad('sEmail', 'Format email tidak valid.');
      if (v('#sLogo') && !isImageSource(v('#sLogo'))) bad('sLogo', 'URL logo tidak valid.');
      if (v('#sHero') && !isImageSource(v('#sHero'))) bad('sHero', 'URL foto tidak valid.');
      [['#sIg', 'sIg'], ['#sFb', 'sFb'], ['#sTt', 'sTt']].forEach(p => { if (v(p[0]) && !isHttpUrl(v(p[0]))) bad(p[1], 'Gunakan URL lengkap diawali https://'); });
      if (!ok) { toast('Mohon periksa kembali isian yang ditandai.', 'error'); firstErrorFocus(form); return; }
      const next = Object.assign(S.getSettings(), {
        siteName: v('#sName'), tagline: v('#sTagline'), logoUrl: logoData || v('#sLogo'), heroImage: v('#sHero'),
        email: v('#sEmail'), address: v('#sAddress'), hours: v('#sHours'),
        instagram: v('#sIg'), facebook: v('#sFb'), tiktok: v('#sTt')
      });
      try {
        S.saveSettings(next);
        const w2 = S.getWhatsapp(); w2.main = U.normalizePhone(v('#sWa')); S.saveWhatsapp(w2);
      } catch (err) { toast(err.message, 'error'); return; }
      toast('Data berhasil disimpan.', 'success');
      applyBrand();
    });

    $('#securityForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = $('#securityForm');
      clearErrors(form);
      if (CLOUD()) {
        const cur = $('#secCurrent').value, np = $('#secNew').value, cf = $('#secConfirm').value;
        let ok = true;
        const bad = (f, m) => { ok = false; setError(f, m); };
        if (!cur) bad('secCurrent', 'Password saat ini wajib diisi.');
        if (!np || np.length < 8) bad('secNew', 'Password minimal 8 karakter.');
        if (np !== cf) bad('secConfirm', 'Konfirmasi password tidak sama.');
        if (!ok) { toast('Mohon periksa kembali isian keamanan.', 'error'); return; }
        const btn = $('button[type=submit]', form);
        btn.disabled = true;
        try {
          await CL.changePassword(cur, np);
          form.reset();
          toast('Password admin berhasil diganti.', 'success');
        } catch (err) {
          if (/saat ini/.test(err.message)) setError('secCurrent', err.message);
          toast(err.message, 'error');
        } finally { btn.disabled = false; }
        return;
      }
      const a = S.getAdmin();
      const cur = $('#secCurrent').value, user = $('#secUser').value.trim(), np = $('#secNew').value, cf = $('#secConfirm').value;
      let ok = true;
      const bad = (f, m) => { ok = false; setError(f, m); };
      if (!cur || sha256(cur) !== a.passwordHash) bad('secCurrent', 'Password saat ini salah.');
      if (!user || !/^[a-zA-Z0-9_.-]{3,30}$/.test(user)) bad('secUser', 'Username 3–30 karakter (huruf, angka, _ . -).');
      if (np && np.length < 6) bad('secNew', 'Password minimal 6 karakter.');
      if (np !== cf) bad('secConfirm', 'Konfirmasi password tidak sama.');
      if (!ok) { toast('Mohon periksa kembali isian keamanan.', 'error'); return; }
      S.saveAdmin({ username: user, passwordHash: np ? sha256(np) : a.passwordHash, sessionHours: a.sessionHours });
      setSession(user);
      $('#profileUser').textContent = user;
      form.reset();
      $('#secUser').value = user;
      toast('Login admin berhasil diperbarui.', 'success');
    });
  }

  /* =====================================================================
     BACKUP & RESTORE
     ===================================================================== */
  function renderBackup(root) {
    const vs = S.getVehicles(), locs = S.getLocations();
    const used = S.usage();
    const pct = Math.min(100, used / STORAGE_LIMIT * 100);
    const meta = S.getMeta();
    root.innerHTML = `
      <div class="page">
        ${CLOUD() ? `
        <div class="page-head"><div><h2>Backup &amp; Restore</h2><p>Data website tersimpan online di database Supabase dan tampil untuk semua pengunjung.</p></div></div>
        <p class="note">${icon('shield')} <span>Mode online aktif. Restore &amp; Reset di halaman ini <strong>langsung mengubah website online</strong>. Tetap lakukan Export Data berkala sebagai cadangan.</span></p>` : `
        <div class="page-head"><div><h2>Backup &amp; Restore</h2><p>Data website tersimpan di browser (LocalStorage). Lakukan backup secara berkala agar data tidak hilang.</p></div></div>
        <p class="note note--warn">${icon('alert')} <span>Data hanya tersimpan di browser &amp; perangkat ini. Membersihkan cache/riwayat browser atau berpindah browser akan membuat data kembali ke default — gunakan <strong>Export Data</strong> untuk menyimpan cadangan.</span></p>`}
        <div class="backup-grid">
          <div class="card"><div class="card__body backup-action">
            <span class="backup-action__icon">${icon('download')}</span>
            <div><h3>Export Data</h3><p class="muted">Unduh seluruh database sebagai file <code>nusantara-rental-backup.json</code>.</p></div>
            <dl class="kv"><dt>Unit</dt><dd>${vs.length}</dd><dt>Lokasi</dt><dd>${locs.length}</dd><dt>Update</dt><dd>${meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('id-ID') : '-'}</dd></dl>
            <button type="button" class="btn btn--primary btn--block" id="btnExport">${icon('download')} Export Data</button>
          </div></div>

          <div class="card"><div class="card__body backup-action">
            <span class="backup-action__icon" style="background:var(--gold-100);color:var(--gold-600)">${icon('upload')}</span>
            <div><h3>Import Data</h3><p class="muted">Pulihkan data dari file backup JSON. Data saat ini akan diganti.</p></div>
            <label class="dropzone" id="importDrop">${icon('database')}<strong id="importLabel">Pilih file .json</strong><span>atau seret file backup ke sini</span><input type="file" id="importFile" accept=".json,application/json" hidden></label>
            <div id="importSummary"></div>
            <button type="button" class="btn btn--gold btn--block" id="btnImport" disabled>${icon('refresh')} Restore Data</button>
          </div></div>

          <div class="card"><div class="card__body backup-action">
            <span class="backup-action__icon" style="background:var(--danger-bg);color:var(--danger)">${icon('refresh')}</span>
            <div><h3>Reset ke Default</h3><p class="muted">Hapus semua perubahan dan kembalikan ${NR.DEFAULT_VEHICLES.length} kendaraan contoh serta pengaturan awal.</p></div>
            ${CLOUD() ? '' : `<div class="storage-meter"><small>Penggunaan penyimpanan: <strong>${U.formatBytes(used)}</strong> dari ±5 MB (${pct.toFixed(1)}%)</small>
              <div class="storage-meter__track"><div class="storage-meter__fill" style="width:${pct.toFixed(1)}%"></div></div></div>`}
            <button type="button" class="btn btn--danger btn--block" id="btnReset">${icon('trash')} Reset Data</button>
          </div></div>
        </div>
      </div>`;

    let pending = null;
    $('#btnExport').addEventListener('click', () => {
      const data = S.exportAll();
      downloadFile('nusantara-rental-backup.json', JSON.stringify(data, null, 2));
      toast('Backup berhasil diunduh.', 'success');
    });

    const readFile = file => {
      if (!file) return;
      if (!/\.json$/i.test(file.name) && file.type !== 'application/json') { toast('File harus berformat .json', 'error'); return; }
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(r.result);
          const d = obj && obj.data ? obj.data : obj;
          if (!d || !Array.isArray(d.vehicles) || !Array.isArray(d.locations)) throw new Error('Struktur backup tidak valid.');
          pending = obj;
          $('#importLabel').textContent = file.name;
          $('#importSummary').innerHTML = `<dl class="kv"><dt>Unit</dt><dd>${d.vehicles.length}</dd><dt>Lokasi</dt><dd>${d.locations.length}</dd><dt>Dibuat</dt><dd>${obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('id-ID') : '-'}</dd></dl>`;
          $('#btnImport').disabled = false;
        } catch (err) {
          pending = null;
          $('#btnImport').disabled = true;
          $('#importSummary').innerHTML = '';
          toast('File backup tidak valid: ' + err.message, 'error');
        }
      };
      r.readAsText(file);
    };
    $('#importFile').addEventListener('change', e => { readFile(e.target.files[0]); e.target.value = ''; });
    const drop = $('#importDrop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
    drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));

    $('#btnImport').addEventListener('click', async () => {
      if (!pending) return;
      const yes = await confirmDialog({ title: 'Restore data dari backup?', text: 'Seluruh data saat ini (unit, lokasi, pengaturan) akan diganti dengan isi file backup.', confirmText: 'Ya, Restore', danger: false, icon: 'refresh' });
      if (!yes) return;
      try { S.importAll(pending); } catch (err) { toast(err.message, 'error'); return; }
      toast('Data berhasil dipulihkan dari backup.', 'success');
      if (!getSession()) { showLogin(); return; }
      refreshCurrent();
    });

    $('#btnReset').addEventListener('click', async () => {
      const yes = await confirmDialog({ title: 'Reset semua data?', text: 'Semua unit, lokasi, dan pengaturan akan kembali ke data default. Disarankan Export Data terlebih dahulu.', confirmText: 'Ya, Reset' });
      if (!yes) return;
      S.resetAll();
      toast('Data berhasil direset ke default.', 'success');
      refreshCurrent();
    });
  }

  /* =====================================================================
     GLOBAL EVENTS
     ===================================================================== */
  function bindEvents() {
    $('#loginForm').addEventListener('submit', onLogin);
    $('#togglePass').addEventListener('click', () => {
      const p = $('#lPass');
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      $('#togglePass').innerHTML = icon(show ? 'eyeOff' : 'eye');
      $('#togglePass').setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    });

    $('#sidebarToggle').addEventListener('click', openSidebar);
    $('#sidebarBackdrop').addEventListener('click', closeSidebar);
    $('#profileBtn').addEventListener('click', e => {
      e.stopPropagation();
      const p = $('#profile');
      p.classList.toggle('is-open');
      $('#profileBtn').setAttribute('aria-expanded', String(p.classList.contains('is-open')));
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('#profile')) $('#profile').classList.remove('is-open');
      const t = e.target;
      const q = sel => t.closest(sel);
      let el;
      if (q('[data-logout]')) { logout(); return; }
      if (q('[data-close-modal]')) { closeModal(); return; }
      if ((el = q('[data-confirm]'))) { resolveConfirm(el.getAttribute('data-confirm') === 'yes'); return; }
      if (q('[data-add-unit]')) { openUnitForm(null); return; }
      if ((el = q('[data-edit-unit]'))) { openUnitForm(el.getAttribute('data-edit-unit')); return; }
      if ((el = q('[data-del-unit]'))) { deleteUnit(el.getAttribute('data-del-unit')); return; }
      if ((el = q('[data-dup-unit]'))) { duplicateUnit(el.getAttribute('data-dup-unit')); return; }
      if ((el = q('[data-toggle-unit]'))) { toggleUnit(el.getAttribute('data-toggle-unit')); return; }
      if ((el = q('[data-preview-unit]'))) { openSite('#mobil/' + encodeURIComponent(el.getAttribute('data-preview-unit')) + '?preview'); return; }
      if (q('[data-add-loc]')) { openLocationForm(null); return; }
      if ((el = q('[data-edit-loc]'))) { openLocationForm(el.getAttribute('data-edit-loc')); return; }
      if ((el = q('[data-del-loc]'))) { deleteLocation(el.getAttribute('data-del-loc')); return; }
      if ((el = q('[data-view-loc]'))) { openSite('#lokasi/' + encodeURIComponent(el.getAttribute('data-view-loc'))); return; }
      if ((el = q('[data-go]'))) { location.hash = '#' + el.getAttribute('data-go'); return; }
      if (q('[data-open-site]')) { openSite(''); return; }
    });

    // Hapus tanda error ketika field diperbaiki
    document.addEventListener('input', e => {
      const f = e.target.closest && e.target.closest('.field.has-error');
      if (f) f.classList.remove('has-error');
    });

    document.addEventListener('change', e => {
      const t = e.target;
      if (t.matches && t.matches('[data-toggle-loc]')) toggleLocation(t.getAttribute('data-toggle-loc'), t.checked);
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if ($('#confirmModal').classList.contains('is-open')) { resolveConfirm(false); return; }
      if ($('#formModal').classList.contains('is-open')) { closeModal(); return; }
      closeSidebar();
      $('#profile').classList.remove('is-open');
    });

    window.addEventListener('hashchange', () => { closeModal(); route(); });

    // Sinkron bila data diubah di tab lain
    window.addEventListener('storage', e => {
      if (!e.key || e.key.indexOf('nusantaraRental') !== 0) return;
      if (!getSession() || $('#formModal').classList.contains('is-open')) return;
      refreshCurrent();
    });
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  async function init() {
    hydrateIcons(document);
    applyBrand();
    bindEvents();
    window.addEventListener('nr:cloud', onCloudEvent);
    renderCloudStatus();
    if (CL.configured && !CL.enabled) {
      // Supabase sudah diatur tapi library gagal dimuat (biasanya offline)
      setBusy('Tidak dapat terhubung ke database online', true);
      return;
    }
    if (CLOUD()) {
      setBusy('Menghubungkan ke database online…');
      await CL.start();
      if (!CL.ready) { setBusy('Tidak dapat terhubung ke database online', true); return; }
      setBusy(null);
      applyBrand();
      if (CL.user) setSession(CL.user.email || 'admin'); else clearSession();
    } else if (!S.available) toast('LocalStorage tidak tersedia di browser ini. Perubahan tidak akan tersimpan permanen.', 'error');
    if (getSession()) showApp(); else showLogin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
