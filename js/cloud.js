/* =====================================================================
   NUSANTARA RENTAL — cloud.js (Sinkronisasi Online via Supabase)
   ---------------------------------------------------------------------
   - Data website (unit, lokasi, pengaturan, WhatsApp) disimpan di tabel
     Supabase "site_data" sehingga SEMUA pengunjung melihat data yang sama.
   - Foto yang di-upload dari Admin disimpan di Supabase Storage (bucket
     "foto"), bukan lagi Base64 di LocalStorage.
   - Login admin memakai Supabase Auth (email + password).
   - LocalStorage tetap dipakai sebagai cache agar website cepat tampil.

   Jika js/supabase-config.js belum diisi, file ini tidak melakukan apa-apa
   dan website berjalan seperti semula (mode LocalStorage / offline).
   ===================================================================== */
(function (window) {
  'use strict';

  var NR = window.NR;
  if (!NR || !NR.store) return;
  var S = NR.store;
  var cfg = window.NR_SUPABASE || {};

  var C = NR.cloud = {
    enabled: false,
    configured: false,
    ready: false,      // data sudah berhasil diambil dari cloud
    canWrite: false,   // admin login + data siap → perubahan dikirim ke cloud
    user: null,
    status: 'off',     // off | loading | synced | saving | error
    lastError: '',
    remoteKeys: {},
    dirty: {}
  };

  var SYNCED_FLAG = 'nr-cloud-synced';
  var TABLE = cfg.table || 'site_data';
  var BUCKET = cfg.bucket || 'foto';
  var SYNC = {
    vehicles: NR.KEYS.vehicles,
    locations: NR.KEYS.locations,
    settings: NR.KEYS.settings,
    whatsapp: NR.KEYS.whatsapp
  };
  // Catatan: NR.KEYS.admin (hash password lama) SENGAJA tidak disinkronkan.
  var NAME_OF = {};
  Object.keys(SYNC).forEach(function (n) { NAME_OF[SYNC[n]] = n; });

  var url = String(cfg.url || '').trim().replace(/\/+$/, '');
  var key = String(cfg.anonKey || '').trim();
  C.configured = !!(url && key && /^https:\/\//.test(url) && !/ISI_|xxxx/i.test(url + key));
  if (!C.configured) return; // → mode lokal

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    C.status = 'error';
    C.lastError = 'Library Supabase gagal dimuat. Periksa koneksi internet.';
    if (window.console) console.warn('[cloud] ' + C.lastError);
    return;
  }

  var sb = C.client = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nr-supabase-auth' }
  });
  C.enabled = true;

  /* ---------------- util ---------------- */
  function emit(type, extra) {
    var d = { type: type };
    if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
    try { window.dispatchEvent(new CustomEvent('nr:cloud', { detail: d })); } catch (e) { /* abaikan */ }
  }
  function setStatus(st, msg) {
    C.status = st;
    if (msg !== undefined) C.lastError = msg;
    emit('status', { status: st, message: C.lastError });
  }
  function errText(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Kesalahan tidak diketahui');
    if (/Failed to fetch|NetworkError|Load failed|timeout/i.test(m)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
    if (/Invalid login credentials/i.test(m)) return 'Email atau password salah.';
    if (/Email not confirmed/i.test(m)) return 'Email admin belum dikonfirmasi di Supabase.';
    if (/row-level security|permission denied|42501|Unauthorized|JWT/i.test(m)) return 'Akses ditolak database. Pastikan Anda login sebagai admin dan SQL setup sudah dijalankan.';
    if (/relation .* does not exist|Could not find the table|PGRST205/i.test(m)) return 'Tabel "' + TABLE + '" belum dibuat. Jalankan file supabase-setup.sql di Supabase.';
    if (/Bucket not found/i.test(m)) return 'Bucket foto "' + BUCKET + '" belum dibuat. Jalankan file supabase-setup.sql di Supabase.';
    return m;
  }
  C.errText = errText;
  function withTimeout(p, ms) {
    return Promise.race([
      Promise.resolve(p),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })
    ]);
  }
  function readCache(lsKey) {
    try { return JSON.parse(S.readRaw(lsKey) || 'null'); } catch (e) { return null; }
  }
  function updateCanWrite() {
    var before = C.canWrite;
    C.canWrite = !!(C.enabled && C.ready && C.user);
    if (before !== C.canWrite) emit('write', { canWrite: C.canWrite });
  }

  /* ---------------- ambil data (semua pengunjung) ---------------- */
  C.pull = async function () {
    var res = await withTimeout(sb.from(TABLE).select('key,value,updated_at'), 12000);
    if (res.error) throw res.error;
    var rows = res.data || [];
    var changed = false;
    C.remoteKeys = {};
    rows.forEach(function (r) {
      var lsKey = SYNC[r.key];
      if (!lsKey || r.value == null) return;
      C.remoteKeys[r.key] = true;
      var json = JSON.stringify(r.value);
      if (S.readRaw(lsKey) !== json) { S.writeCache(lsKey, r.value); changed = true; }
    });
    try { window.localStorage.setItem(SYNCED_FLAG, new Date().toISOString()); } catch (e) { /* abaikan */ }
    return { rows: rows.length, changed: changed };
  };

  C.start = function () {
    if (C._start) return C._start;
    C._start = (async function () {
      setStatus('loading', '');
      try {
        var s = await withTimeout(sb.auth.getSession(), 8000);
        C.user = s && s.data && s.data.session ? s.data.session.user : null;
      } catch (e) { C.user = null; }
      try {
        var r = await C.pull();
        C.ready = true;
        setStatus('synced', '');
        if (r.changed) emit('data', { source: 'pull' });
      } catch (e) {
        C.ready = false;
        setStatus('error', errText(e));
      }
      updateCanWrite();
      return C;
    })();
    return C._start;
  };

  // Untuk index.html: tampilkan cache dulu bila ada, lalu perbarui otomatis.
  C.whenReady = function (cb, timeoutMs) {
    var done = false;
    var go = function () { if (!done) { done = true; cb(); } };
    var hasCache = false;
    try { hasCache = !!window.localStorage.getItem(SYNCED_FLAG); } catch (e) { /* abaikan */ }
    var p = C.start();
    if (hasCache) go();
    else { p.then(go, go); setTimeout(go, timeoutMs || 6000); }
  };

  /* ---------------- upload foto ---------------- */
  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    var bin = window.atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  var uploadedCache = {};
  C.uploadImage = async function (dataUrl, folder) {
    if (!C.canWrite) throw new Error('Login admin diperlukan untuk upload foto.');
    if (uploadedCache[dataUrl]) return uploadedCache[dataUrl];
    var blob = dataUrlToBlob(dataUrl);
    var ext = ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[blob.type] || 'jpg';
    var path = (folder || 'lainnya') + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var up = await withTimeout(sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }), 60000);
    if (up.error) throw new Error(errText(up.error));
    var pub = sb.storage.from(BUCKET).getPublicUrl(path);
    var out = pub && pub.data && pub.data.publicUrl;
    if (!out) throw new Error('Gagal mendapatkan URL foto.');
    uploadedCache[dataUrl] = out;
    return out;
  };
  C.isCloudUrl = function (u) { return typeof u === 'string' && u.indexOf(url + '/storage/') === 0; };

  // Foto Base64 lama (hasil upload sebelum online / dari file backup)
  // dipindahkan otomatis ke Supabase Storage sebelum data dikirim.
  async function externalize(name, val) {
    var changed = false;
    var isData = function (s) { return typeof s === 'string' && /^data:image\//i.test(s); };
    var up = async function (s, folder) { changed = true; return C.uploadImage(s, folder); };
    if (name === 'vehicles' && Array.isArray(val)) {
      for (var i = 0; i < val.length; i++) {
        var v = val[i];
        if (isData(v.image)) v.image = await up(v.image, 'kendaraan');
        if (Array.isArray(v.gallery)) {
          for (var j = 0; j < v.gallery.length; j++) if (isData(v.gallery[j])) v.gallery[j] = await up(v.gallery[j], 'kendaraan');
        }
      }
    } else if (name === 'locations' && Array.isArray(val)) {
      for (var k = 0; k < val.length; k++) if (isData(val[k].photo)) val[k].photo = await up(val[k].photo, 'lokasi');
    } else if (name === 'settings' && val) {
      if (isData(val.logoUrl)) val.logoUrl = await up(val.logoUrl, 'brand');
      if (isData(val.heroImage)) val.heroImage = await up(val.heroImage, 'brand');
    }
    return { value: val, changed: changed };
  }

  /* ---------------- kirim perubahan (admin) ---------------- */
  var pushTimer = null;
  NR.onWrite = function (lsKey) {
    var name = NAME_OF[lsKey];
    if (!name || !C.canWrite) return;
    C.dirty[name] = true;
    setStatus('saving', '');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { C.flush(); }, 350);
  };

  C.hasPending = function () { return !!(C._flushing || Object.keys(C.dirty).length); };

  C.flush = function () {
    if (C._flushing) { C._again = true; return C._flushing; }
    C._flushing = (async function () {
      var failed = null;
      do {
        C._again = false;
        var names = Object.keys(C.dirty);
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          delete C.dirty[name];
          var lsKey = SYNC[name];
          try {
            var ext = await externalize(name, readCache(lsKey));
            if (ext.value == null) continue;
            if (ext.changed) { S.writeCache(lsKey, ext.value); emit('data', { source: 'images' }); }
            var r = await withTimeout(sb.from(TABLE).upsert({ key: name, value: ext.value, updated_at: new Date().toISOString() }), 20000);
            if (r.error) throw r.error;
            C.remoteKeys[name] = true;
          } catch (e) {
            C.dirty[name] = true;
            failed = e;
          }
        }
      } while (C._again && !failed);
      C._flushing = null;
      if (failed) {
        setStatus('error', errText(failed));
        emit('push-error', { message: errText(failed) });
      } else if (Object.keys(C.dirty).length) {
        return C.flush();
      } else {
        setStatus('synced', '');
        emit('pushed');
      }
    })();
    return C._flushing;
  };

  // Login pertama kali: bila tabel masih kosong, unggah data yang ada di
  // browser ini (termasuk foto lama) sebagai data awal website online.
  C.seedIfEmpty = function () {
    if (!C.canWrite) return Promise.resolve(false);
    var missing = Object.keys(SYNC).filter(function (n) { return !C.remoteKeys[n]; });
    if (!missing.length) return Promise.resolve(false);
    missing.forEach(function (n) { C.dirty[n] = true; });
    setStatus('saving', '');
    return C.flush().then(function () { return !Object.keys(C.dirty).length; });
  };

  /* ---------------- autentikasi admin ---------------- */
  C.signIn = async function (email, password) {
    var r = await withTimeout(sb.auth.signInWithPassword({ email: email, password: password }), 15000);
    if (r.error) throw new Error(errText(r.error));
    C.user = r.data.user;
    if (!C.ready) {
      try { await C.pull(); C.ready = true; setStatus('synced', ''); } catch (e) { setStatus('error', errText(e)); }
    }
    updateCanWrite();
    return C.user;
  };

  C.signOut = async function () {
    if (C.hasPending()) { try { await C.flush(); } catch (e) { /* abaikan */ } }
    try { await sb.auth.signOut(); } catch (e) { /* abaikan */ }
    C.user = null;
    updateCanWrite();
  };

  C.changePassword = async function (currentPassword, newPassword) {
    if (!C.user || !C.user.email) throw new Error('Silakan login ulang.');
    var check = await sb.auth.signInWithPassword({ email: C.user.email, password: currentPassword });
    if (check.error) throw new Error('Password saat ini salah.');
    var r = await sb.auth.updateUser({ password: newPassword });
    if (r.error) throw new Error(errText(r.error));
    return true;
  };

  sb.auth.onAuthStateChange(function (event, session) {
    C.user = session ? session.user : null;
    updateCanWrite();
    emit('auth', { event: event });
  });

  // Cegah menutup tab admin sebelum perubahan selesai terkirim
  window.addEventListener('beforeunload', function (e) {
    if (C.canWrite && C.hasPending()) { e.preventDefault(); e.returnValue = ''; return ''; }
  });
})(window);
