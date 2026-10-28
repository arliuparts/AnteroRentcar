/* =====================================================================
   NUSANTARA RENTAL — app.js (Website customer)
   ---------------------------------------------------------------------
   Berisi: Homepage, Search, Filter, Detail kendaraan, Halaman lokasi,
   WhatsApp booking, dan seluruh interaksi UI.
   Data dibaca dari LocalStorage melalui NR.store (lihat data.js).
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

  /* -------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------- */
  const state = {
    filters: { q: '', location: '', type: '', brand: '', price: '', year: '', sort: 'recommended' },
    locTab: '',
    currentView: 'home',
    currentLocation: null,
    detail: { id: null, index: 0, gallery: [], prevHash: '' },
    lastFocus: null
  };

  let vehicles = [];
  let locations = [];
  let settings = {};
  let wa = {};

  const LOGO_SVG = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="lgN" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c983"/><stop offset="1" stop-color="#b08a33"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="#0b1f3a"/><path d="M14 34V14l20 20V14" fill="none" stroke="url(#lgN)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const FAQ = [
    { q: 'Apa saja syarat untuk menyewa mobil?', a: 'Untuk sewa lepas kunci, siapkan KTP, SIM A yang masih berlaku, dan dokumen pendukung (misalnya kartu identitas kerja atau NPWP). Untuk sewa dengan sopir cukup menyiapkan KTP. Detail persyaratan akan dikonfirmasi admin melalui WhatsApp.' },
    { q: 'Bagaimana cara memesan kendaraan?', a: 'Pilih lokasi dan tanggal sewa, buka detail mobil yang diinginkan, lalu klik "Pesan Mobil Ini via WhatsApp". Pesan pemesanan akan terisi otomatis dan admin kami akan mengonfirmasi ketersediaan unit.' },
    { q: 'Apakah bisa sewa dengan sopir?', a: 'Bisa. Pilih opsi "Dengan Sopir" pada formulir rencana sewa. Biaya sopir, BBM, dan tol akan diinformasikan oleh admin sesuai rute perjalanan Anda.' },
    { q: 'Bagaimana sistem pembayarannya?', a: 'Saat ini pemesanan dikonfirmasi melalui WhatsApp. Setelah unit dipastikan tersedia, admin akan mengirimkan rincian biaya dan instruksi pembayaran (transfer bank).' },
    { q: 'Apakah mobil bisa diantar ke hotel atau bandara?', a: 'Ya, kami menyediakan layanan antar-jemput unit di area layanan masing-masing kota, termasuk stasiun dan bandara. Biaya pengantaran (jika ada) akan diinformasikan saat konfirmasi.' },
    { q: 'Bagaimana jika saya ingin membatalkan pesanan?', a: 'Hubungi admin melalui WhatsApp sesegera mungkin. Kebijakan pembatalan dan pengembalian dana akan dijelaskan saat konfirmasi pemesanan.' }
  ];

  /* -------------------------------------------------------------------
     DATA HELPERS
     ------------------------------------------------------------------- */
  function loadData() {
    vehicles = S.getVehicles();
    locations = S.getLocations();
    settings = S.getSettings();
    wa = S.getWhatsapp();
  }

  const activeLocations = () => locations.filter(l => l.active);
  const locById = id => locations.find(l => l.id === id) || null;
  const locName = id => { const l = locById(id); return l ? l.name : (id || '-'); };

  function publicVehicles() {
    const activeIds = activeLocations().map(l => l.id);
    return vehicles.filter(v => v.status !== 'Inactive' && activeIds.indexOf(v.location) > -1);
  }

  function safeUrl(u) {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s) || /^blob:/i.test(s)) return s;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ''; // tolak javascript: dll
    return s; // path relatif
  }

  function joinNames(names) {
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ', dan ' + names[names.length - 1];
  }

  /* -------------------------------------------------------------------
     WHATSAPP
     ------------------------------------------------------------------- */
  function generalMessage(locId) {
    const name = settings.siteName || 'Nusantara Rental';
    if (locId) {
      const ln = locName(locId);
      return `Halo ${name} ${ln}, saya ingin menanyakan informasi rental mobil di ${ln}.`;
    }
    return `Halo ${name}, saya ingin menanyakan informasi rental mobil.`;
  }

  function bookingMessage(v, opt) {
    opt = opt || {};
    const name = settings.siteName || 'Nusantara Rental';
    const lines = [
      `Halo ${name},`,
      '',
      'Saya ingin melakukan pemesanan kendaraan.',
      '',
      'Detail kendaraan:',
      `Mobil: ${v.name}`,
      `Kode Unit: ${v.id}`,
      `Tahun: ${v.year}`,
      `Lokasi: ${locName(v.location)}`,
      `Harga: ${U.rupiah(v.priceDay)}/hari`,
      ''
    ];
    if (opt.start && opt.end) {
      const days = U.rentalDays(opt.start, opt.end);
      lines.push(`Tanggal mulai: ${U.formatDate(opt.start)}`);
      lines.push(`Tanggal selesai: ${U.formatDate(opt.end)}`);
      if (days > 0) {
        lines.push(`Durasi: ${days} hari`);
        lines.push(`Estimasi biaya: ${U.rupiah(U.estimateCost(v, days))}`);
      }
    } else {
      lines.push('Tanggal mulai: (mohon dibantu informasinya)');
      lines.push('Tanggal selesai: (mohon dibantu informasinya)');
    }
    if (opt.service) lines.push(`Layanan: ${opt.service}`);
    if (opt.customer) lines.push(`Nama pemesan: ${opt.customer}`);
    lines.push('', 'Mohon informasi ketersediaan dan proses selanjutnya.', '', 'Terima kasih.');
    return lines.join('\n');
  }

  function openWhatsApp(url) {
    const w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (e) { /* abaikan */ } }
    else window.location.href = url;
  }

  function updateWaLinks(root) {
    $$('[data-wa]', root).forEach(a => {
      const kind = a.getAttribute('data-wa');
      let url;
      if (kind === 'floating') url = U.waLink(S.getWhatsappNumber(), wa.floatingMessage);
      else if (kind.indexOf('loc:') === 0) {
        const id = kind.slice(4);
        url = U.waLink(S.getWhatsappNumber(id), generalMessage(id));
      } else url = U.waLink(S.getWhatsappNumber(), generalMessage());
      a.setAttribute('href', url);
    });
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
    if (!stack) return;
    const ic = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast__icon">${icon(ic)}</span><span>${esc(msg)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  function lockScroll(lock) {
    document.body.classList.toggle('no-scroll', !!lock);
  }

  /* -------------------------------------------------------------------
     SETTINGS → DOM
     ------------------------------------------------------------------- */
  function applySettings() {
    const name = settings.siteName || 'Nusantara Rental';
    $$('[data-site-name]').forEach(el => { el.textContent = name; });
    $$('[data-tagline]').forEach(el => { el.textContent = settings.tagline || ''; });

    // Logo (fallback ke logo SVG bawaan bila gagal dimuat)
    const logo = safeUrl(settings.logoUrl);
    $$('.brand__mark').forEach(mark => {
      if (!logo) { mark.innerHTML = LOGO_SVG; return; }
      const img = document.createElement('img');
      img.className = 'brand__logo';
      img.alt = '';
      img.width = 40; img.height = 40;
      img.onerror = () => { mark.innerHTML = LOGO_SVG; };
      img.src = logo;
      mark.innerHTML = '';
      mark.appendChild(img);
    });

    const cityNames = activeLocations().map(l => l.name);
    document.title = `${name} | Rental Mobil ${cityNames.length ? cityNames.slice(0, -1).join(', ') + (cityNames.length > 1 ? ' & ' : '') + cityNames[cityNames.length - 1] : 'Indonesia'}`;
    const sub = $('#heroSub');
    if (sub && cityNames.length) sub.textContent = `Temukan kendaraan pilihanmu di ${joinNames(cityNames)}.`;
    $$('[data-city-count]').forEach(el => { el.textContent = cityNames.length; });

    $$('[data-setting]').forEach(el => {
      const key = el.getAttribute('data-setting');
      el.textContent = settings[key] || '-';
    });
    $$('[data-setting-mail]').forEach(a => {
      a.textContent = settings.email || '-';
      a.setAttribute('href', settings.email ? 'mailto:' + settings.email : '#');
    });
    $$('[data-wa-label]').forEach(el => { el.textContent = U.prettyPhone(S.getWhatsappNumber()); });

    // Social media
    const socials = [
      ['instagram', settings.instagram, 'Instagram'],
      ['facebook', settings.facebook, 'Facebook'],
      ['tiktok', settings.tiktok, 'TikTok'],
      ['whatsapp', U.waLink(S.getWhatsappNumber(), generalMessage()), 'WhatsApp']
    ].filter(s => safeUrl(s[1]));
    $$('[data-socials]').forEach(box => {
      box.innerHTML = socials.map(s => `<a href="${esc(safeUrl(s[1]))}" target="_blank" rel="noopener" aria-label="${s[2]}" title="${s[2]}">${icon(s[0])}</a>`).join('');
    });

    // Foto hero opsional
    const hero = $('.hero');
    const heroBg = $('#heroBg');
    const photo = safeUrl(settings.heroImage);
    if (hero && heroBg) {
      if (photo) {
        heroBg.style.setProperty('--hero-photo', `url("${photo.replace(/"/g, '%22')}")`);
        heroBg.classList.add('has-photo');
        hero.classList.add('has-photo');
      } else {
        heroBg.classList.remove('has-photo');
        hero.classList.remove('has-photo');
      }
    }

    const meta = document.querySelector('meta[property="og:title"]');
    if (meta) meta.setAttribute('content', document.title);
    updateWaLinks();
  }

  /* -------------------------------------------------------------------
     NAVBAR & DRAWER
     ------------------------------------------------------------------- */
  function renderNav() {
    const locs = activeLocations();
    const inline = locs.slice(0, 4);
    const extra = locs.slice(4);
    let html = inline.map(l => `<a href="#lokasi/${esc(l.id)}" data-route data-nav="lokasi-${esc(l.id)}">${esc(l.name)}</a>`).join('');
    if (extra.length) {
      html += `<span class="nav__more"><button type="button" aria-haspopup="true">Lainnya ${icon('chevronDown')}</button>
        <span class="nav__dropdown">${extra.map(l => `<a href="#lokasi/${esc(l.id)}" data-route data-nav="lokasi-${esc(l.id)}">${esc(l.name)}</a>`).join('')}</span></span>`;
    }
    const navCities = $('#navCities');
    if (navCities) navCities.innerHTML = html;

    const drawer = $('#drawerLinks');
    if (drawer) {
      drawer.innerHTML = `
        <li><a href="#home" data-route data-nav="home">Home ${icon('chevronRight')}</a></li>
        <li><a href="#katalog" data-route data-nav="katalog">Rental Mobil ${icon('chevronRight')}</a></li>
        <li class="drawer__label">Lokasi</li>
        ${locs.map(l => `<li class="sub"><a href="#lokasi/${esc(l.id)}" data-route data-nav="lokasi-${esc(l.id)}"><span>${icon('pin')} ${esc(l.name)}</span>${icon('chevronRight')}</a></li>`).join('')}
        <li class="drawer__label">Info</li>
        <li><a href="#tentang" data-route data-nav="tentang">Tentang Kami ${icon('chevronRight')}</a></li>
        <li><a href="#faq" data-route data-nav="faq">FAQ ${icon('chevronRight')}</a></li>
        <li><a href="#kontak" data-route data-nav="kontak">Contact ${icon('chevronRight')}</a></li>`;
    }
  }

  function setActiveNav(key) {
    $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.getAttribute('data-nav') === key));
  }

  function openDrawer() {
    const d = $('#drawer');
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    $('#burger').setAttribute('aria-expanded', 'true');
    lockScroll(true);
  }
  function closeDrawer() {
    const d = $('#drawer');
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    $('#burger').setAttribute('aria-expanded', 'false');
    if (!$('#detailModal').classList.contains('is-open')) lockScroll(false);
  }

  function updateNavStyle() {
    const nav = $('#nav');
    nav.classList.toggle('is-solid', window.scrollY > 24);
    const tt = $('#toTop');
    if (tt) tt.classList.toggle('is-visible', window.scrollY > 700);
  }

  /* -------------------------------------------------------------------
     SEARCH BAR
     ------------------------------------------------------------------- */
  function renderSearchOptions() {
    const sLoc = $('#sLocation');
    const sType = $('#sType');
    const curLoc = sLoc.value;
    const curType = sType.value;
    sLoc.innerHTML = '<option value="">Semua Lokasi</option>' +
      activeLocations().map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
    sType.innerHTML = '<option value="">Semua</option>' + NR.VEHICLE_TYPES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    sLoc.value = curLoc && locById(curLoc) ? curLoc : (state.filters.location || '');
    sType.value = curType || state.filters.type || '';
  }

  function initDates() {
    const s = $('#sStart'), e = $('#sEnd');
    const today = U.todayISO();
    s.min = today; e.min = today;
    if (!s.value) s.value = U.todayISO(1);
    if (!e.value) e.value = U.todayISO(3);
    s.addEventListener('change', () => {
      e.min = s.value || today;
      if (e.value && s.value && e.value < s.value) e.value = s.value;
      hideSearchError();
    });
    e.addEventListener('change', hideSearchError);
  }

  function getBookingDates() {
    const s = $('#sStart').value, e = $('#sEnd').value;
    if (s && e && e >= s) return { start: s, end: e };
    return { start: '', end: '' };
  }

  function showSearchError(msg) {
    const el = $('#searchError');
    el.innerHTML = icon('alert') + ' ' + esc(msg);
    el.hidden = false;
  }
  function hideSearchError() { const el = $('#searchError'); if (el) el.hidden = true; }

  function onSearch(ev) {
    ev.preventDefault();
    const s = $('#sStart').value, e = $('#sEnd').value;
    if (!s || !e) { showSearchError('Mohon isi tanggal mulai dan tanggal selesai.'); return; }
    if (e < s) { showSearchError('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }
    if (s < U.todayISO()) { showSearchError('Tanggal mulai tidak boleh di masa lalu.'); return; }
    hideSearchError();
    state.filters.location = $('#sLocation').value;
    state.filters.type = $('#sType').value;
    syncFilterControls();
    if (location.hash !== '#katalog') location.hash = '#katalog';
    else route();
    renderCatalog(true);
    const count = filterVehicles().length;
    const where = state.filters.location ? ' di ' + locName(state.filters.location) : '';
    toast(`${count} mobil ditemukan${where} · ${U.rentalDays(s, e)} hari sewa`, count ? 'success' : 'info');
  }

  /* -------------------------------------------------------------------
     FILTER & KATALOG
     ------------------------------------------------------------------- */
  function renderFilterOptions() {
    const pub = publicVehicles();
    const fLoc = $('#fLocation'), fType = $('#fType'), fBrand = $('#fBrand'), fYear = $('#fYear');
    fLoc.innerHTML = '<option value="">Semua Lokasi</option>' + activeLocations().map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
    fType.innerHTML = '<option value="">Semua Tipe</option>' + NR.VEHICLE_TYPES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    const brands = Array.from(new Set(pub.map(v => v.brand).filter(Boolean))).sort();
    fBrand.innerHTML = '<option value="">Semua Brand</option>' + brands.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
    const years = Array.from(new Set(pub.map(v => v.year))).sort((a, b) => b - a);
    fYear.innerHTML = '<option value="">Semua Tahun</option>' + years.map(y => `<option value="${y}">${y} &amp; lebih baru</option>`).join('');
    // jaga nilai filter tetap valid
    if (state.filters.location && !locById(state.filters.location)) state.filters.location = '';
    if (state.filters.brand && brands.indexOf(state.filters.brand) === -1) state.filters.brand = '';
    if (state.filters.year && years.indexOf(+state.filters.year) === -1) state.filters.year = '';
    syncFilterControls();
  }

  function syncFilterControls() {
    const f = state.filters;
    $('#fQuery').value = f.q;
    $('#fLocation').value = f.location;
    $('#fType').value = f.type;
    $('#fBrand').value = f.brand;
    $('#fPrice').value = f.price;
    $('#fYear').value = f.year;
    $('#fSort').value = f.sort;
    $('#sLocation').value = f.location;
    $('#sType').value = f.type;
    ['#fLocation', '#fType', '#fBrand', '#fPrice', '#fYear'].forEach(id => {
      const el = $(id);
      el.classList.toggle('is-set', !!el.value);
    });
    $('#fSort').classList.toggle('is-set', f.sort !== 'recommended');
  }

  function activeFilterCount() {
    const f = state.filters;
    return ['location', 'type', 'brand', 'price', 'year'].filter(k => f[k]).length + (f.q ? 1 : 0);
  }

  const STATUS_ORDER = { Available: 0, Booked: 1, Maintenance: 2, Inactive: 3 };

  function filterVehicles(list, overrides) {
    const f = Object.assign({}, state.filters, overrides || {});
    const tokens = f.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let out = (list || publicVehicles()).filter(v => {
      if (f.location && v.location !== f.location) return false;
      if (f.type && v.type !== f.type) return false;
      if (f.brand && v.brand !== f.brand) return false;
      if (f.year && v.year < +f.year) return false;
      if (f.price) {
        const parts = f.price.split('-');
        const min = +parts[0] || 0;
        const max = parts[1] ? +parts[1] : Infinity;
        if (v.priceDay < min || v.priceDay > max) return false;
      }
      if (tokens.length) {
        const hay = [v.name, v.brand, v.model, v.type, v.year, v.color, locName(v.location), v.transmission, v.fuel].join(' ').toLowerCase();
        if (!tokens.every(t => hay.indexOf(t) > -1)) return false;
      }
      return true;
    });
    const sorters = {
      'price-asc': (a, b) => a.priceDay - b.priceDay,
      'price-desc': (a, b) => b.priceDay - a.priceDay,
      'year-desc': (a, b) => b.year - a.year || a.priceDay - b.priceDay,
      recommended: (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (b.year - a.year) || (a.priceDay - b.priceDay)
    };
    out.sort(sorters[f.sort] || sorters.recommended);
    return out;
  }

  function skeletonHTML(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="skeleton" aria-hidden="true"><div class="skeleton__img shimmer"></div>
        <div class="skeleton__line shimmer"></div><div class="skeleton__line skeleton__line--short shimmer"></div>
        <div class="skeleton__line shimmer"></div><div class="skeleton__line skeleton__line--btn shimmer"></div></div>`;
    }
    return html;
  }

  function cardHTML(v, i) {
    const img = safeUrl(NR.vehicleImage(v));
    const available = v.status === 'Available';
    const statusLabel = NR.STATUS_LABEL[v.status] || v.status;
    return `
      <article class="car-card" style="--d:${Math.min(i, 8) * 60}ms">
        <div class="car-card__media" data-action="detail" data-id="${esc(v.id)}" role="button" tabindex="0" aria-label="Lihat detail ${esc(v.name)}">
          <img src="${esc(img)}" alt="${esc(v.name)} ${v.year} – rental mobil ${esc(locName(v.location))}" loading="lazy" decoding="async" width="800" height="500">
          <div class="car-card__badges">
            <span class="chip chip--dark">${esc(v.type)}</span>
            <span class="chip chip--status chip--${esc(v.status)}">${esc(statusLabel)}</span>
          </div>
        </div>
        <div class="car-card__body">
          <div class="car-card__head">
            <div>
              <h3 class="car-card__title"><a href="#mobil/${esc(v.id)}" data-action="detail" data-id="${esc(v.id)}">${esc(v.name)}</a></h3>
              <p class="car-card__sub">${esc(v.brand)} · ${esc(v.model)}</p>
            </div>
            <span class="car-card__year">${v.year}</span>
          </div>
          <span class="car-card__loc">${icon('pin')} ${esc(locName(v.location))}</span>
          <div class="specs">
            <span class="spec">${icon('users')} ${v.seats} Kursi</span>
            <span class="spec">${icon('gear')} ${esc(v.transmission)}</span>
            <span class="spec">${icon('fuel')} ${esc(v.fuel)}</span>
          </div>
          <div class="car-card__foot">
            <div class="price"><strong>${U.rupiah(v.priceDay)}</strong><span>/ hari</span></div>
            <div class="car-card__actions">
              <button type="button" class="btn btn--outline" data-action="detail" data-id="${esc(v.id)}">Lihat Detail</button>
              <button type="button" class="btn btn--wa" data-action="book" data-id="${esc(v.id)}">${icon('whatsapp')} ${available ? 'Pesan Sekarang' : 'Tanya Jadwal'}</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  let catalogTimer = null;
  function renderCatalog(withSkeleton) {
    const grid = $('#carGrid');
    if (!grid) return;
    const draw = () => {
      const list = filterVehicles();
      const f = state.filters;
      const info = $('#resultInfo');
      const where = f.location ? ` di <strong>${esc(locName(f.location))}</strong>` : '';
      info.innerHTML = list.length
        ? `Menampilkan <strong>${list.length}</strong> mobil${where}`
        : `Tidak ada mobil yang cocok${where}`;
      const count = activeFilterCount();
      $('#resetFilter').hidden = count === 0;
      const badge = $('#filterCount');
      badge.hidden = count === 0;
      badge.textContent = count;

      if (!list.length) {
        const noVehiclesAtAll = !publicVehicles().length;
        grid.innerHTML = `
          <div class="empty">
            <div class="empty__icon">${icon('car')}</div>
            <h3>Mobil Tidak Ditemukan</h3>
            <p>${noVehiclesAtAll ? 'Belum ada kendaraan yang tersedia saat ini. Silakan hubungi kami melalui WhatsApp.' : 'Coba ubah kata kunci atau kurangi filter untuk melihat lebih banyak pilihan kendaraan.'}</p>
            <button type="button" class="btn btn--navy" data-action="reset-filters">${icon('refresh')} Reset Filter</button>
          </div>`;
        return;
      }
      grid.innerHTML = list.map(cardHTML).join('');
    };
    clearTimeout(catalogTimer);
    if (withSkeleton) {
      grid.innerHTML = skeletonHTML(Math.min(6, Math.max(3, filterVehicles().length || 3)));
      catalogTimer = setTimeout(draw, 450);
    } else draw();
  }

  function resetFilters() {
    state.filters = { q: '', location: '', type: '', brand: '', price: '', year: '', sort: 'recommended' };
    syncFilterControls();
    renderCatalog(true);
    toast('Filter telah direset.', 'info');
  }

  function bindFilters() {
    const onQuery = U.debounce(() => { state.filters.q = $('#fQuery').value; renderCatalog(false); }, 180);
    $('#fQuery').addEventListener('input', onQuery);
    [['#fLocation', 'location'], ['#fType', 'type'], ['#fBrand', 'brand'], ['#fPrice', 'price'], ['#fYear', 'year'], ['#fSort', 'sort']].forEach(pair => {
      $(pair[0]).addEventListener('change', e => {
        state.filters[pair[1]] = e.target.value;
        syncFilterControls();
        renderCatalog(false);
      });
    });
    $('#resetFilter').addEventListener('click', resetFilters);
    $('#filterToggle').addEventListener('click', () => {
      const panel = $('#filterPanel');
      const open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      $('#filterToggle').setAttribute('aria-expanded', String(open));
    });
  }

  /* -------------------------------------------------------------------
     HOMEPAGE SECTIONS
     ------------------------------------------------------------------- */
  function minPrice(list) {
    const p = list.map(v => v.priceDay).filter(n => n > 0);
    return p.length ? Math.min.apply(null, p) : 0;
  }

  function cityCardHTML(l) {
    const list = publicVehicles().filter(v => v.location === l.id);
    const mp = minPrice(list);
    return `
      <a class="city-card reveal" href="#lokasi/${esc(l.id)}" data-route aria-label="Rental Mobil ${esc(l.name)}">
        <img src="${esc(safeUrl(NR.locationImage(l)))}" alt="Rental mobil ${esc(l.name)}" loading="lazy" decoding="async">
        <div class="city-card__body">
          <small>${esc(l.city || 'Indonesia')}</small>
          <h3>${esc(l.name)}</h3>
          <div class="city-card__meta">
            <span>${list.length} unit${mp ? ' · mulai ' + U.rupiahShort(mp) : ''}</span>
            <span class="city-card__arrow">${icon('arrowRight')}</span>
          </div>
        </div>
      </a>`;
  }

  function renderCities() {
    const grid = $('#cityGrid');
    const locs = activeLocations();
    grid.innerHTML = locs.length ? locs.map(cityCardHTML).join('') :
      '<div class="empty"><div class="empty__icon">' + icon('map') + '</div><h3>Belum ada lokasi aktif</h3></div>';
    observeReveal(grid);
  }

  function renderHeroStats() {
    const pub = publicVehicles();
    const heroCar = $('#heroCar');
    if (heroCar && !heroCar.getAttribute('src')) heroCar.src = NR.art.carOnly('SUV', 'Putih');
    const mp = minPrice(pub);
    $('#heroMinPrice').textContent = mp ? U.rupiah(mp) : 'Hubungi kami';
    $('#heroUnitCount').textContent = pub.length;

    const brands = new Set(pub.map(v => v.brand)).size;
    const types = new Set(pub.map(v => v.type)).size;
    setCounter('#statUnits', pub.length);
    setCounter('#statCities', activeLocations().length);
    setCounter('#statTypes', types);
    setCounter('#aboutBrands', brands);

    const about = $('#aboutImg');
    if (about) {
      const feature = pub.find(v => v.image) || pub.find(v => v.type === 'Luxury') || pub[0];
      about.src = feature ? (feature.image ? safeUrl(feature.image) : NR.art.car(feature, 2)) : NR.art.car({ type: 'Luxury', color: 'Hitam', brand: settings.siteName }, 2);
    }
  }

  function renderFAQ() {
    const box = $('#faqList');
    box.innerHTML = FAQ.map((f, i) => `
      <div class="faq__item reveal${i === 0 ? ' is-open' : ''}">
        <button type="button" class="faq__q" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">
          <span>${esc(f.q)}</span>${icon('chevronDown')}
        </button>
        <div class="faq__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${esc(f.a)}</p></div></div>
      </div>`).join('');
    box.addEventListener('click', e => {
      const btn = e.target.closest('.faq__q');
      if (!btn) return;
      const item = btn.parentElement;
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    observeReveal(box);
  }

  function renderOffices() {
    const box = $('#officeList');
    box.innerHTML = activeLocations().map(l => `
      <article class="office reveal">
        <h4>${icon('pin')} ${esc(settings.siteName)} ${esc(l.name)}</h4>
        <p>${esc(l.address || '-')}</p>
        <p>${icon('phone')} ${esc(U.prettyPhone(S.getWhatsappNumber(l.id)))}</p>
        <div class="office__actions">
          <a class="btn btn--wa btn--sm" data-wa="loc:${esc(l.id)}" href="#" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
          <a class="btn btn--light btn--sm" href="#lokasi/${esc(l.id)}" data-route>Lihat Unit</a>
        </div>
      </article>`).join('');
    updateWaLinks(box);
    observeReveal(box);
  }

  function renderFooter() {
    const locs = activeLocations();
    $('#footerCities').innerHTML = locs.map(l => `<li><a href="#lokasi/${esc(l.id)}" data-route>Rental Mobil ${esc(l.name)}</a></li>`).join('');
    $('#footerCityLine').textContent = locs.map(l => l.name).join(' | ');
  }

  /* -------------------------------------------------------------------
     DETAIL MODAL
     ------------------------------------------------------------------- */
  function openDetail(id, opt) {
    opt = opt || {};
    const v = vehicles.find(x => x.id === id);
    const loc = v ? locById(v.location) : null;
    if (!v || (!opt.preview && (v.status === 'Inactive' || !loc || !loc.active))) {
      toast('Kendaraan tidak ditemukan atau sedang tidak tersedia.', 'error');
      if (/^#mobil\//.test(location.hash)) history.replaceState(null, '', '#katalog');
      return;
    }
    state.detail.id = id;
    state.detail.index = 0;
    state.detail.gallery = NR.vehicleGallery(v).map(safeUrl).filter(Boolean);
    state.lastFocus = document.activeElement;
    if (!/^#mobil\//.test(location.hash)) state.detail.prevHash = location.hash;
    history.replaceState(null, '', '#mobil/' + encodeURIComponent(id) + (opt.preview ? '?preview' : ''));

    const dates = getBookingDates();
    const statusLabel = NR.STATUS_LABEL[v.status] || v.status;
    const features = v.features.length ? v.features : ['AC', 'Power Steering'];
    const g = state.detail.gallery;

    const body = $('#detailBody');
    body.innerHTML = `
      ${opt.preview ? `<div class="preview-banner">${icon('eye')} Mode Preview Admin — status unit: ${esc(statusLabel)}</div>` : ''}
      <div class="detail">
        <div class="detail__gallery">
          <div class="detail__main">
            <img id="detailMainImg" src="${esc(g[0])}" alt="${esc(v.name)} ${v.year}">
            ${g.length > 1 ? `<button type="button" class="detail__nav detail__nav--prev" data-gal="-1" aria-label="Foto sebelumnya">${icon('chevronLeft')}</button>
            <button type="button" class="detail__nav detail__nav--next" data-gal="1" aria-label="Foto berikutnya">${icon('chevronRight')}</button>` : ''}
          </div>
          <div class="detail__thumbs" role="tablist" aria-label="Galeri foto">
            ${g.map((src, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-thumb="${i}" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}
          </div>
        </div>
        <div class="detail__info">
          <div>
            <div class="detail__chips">
              <span class="chip chip--dark">${esc(v.type)}</span>
              <span class="chip chip--status chip--${esc(v.status)}">${esc(statusLabel)}</span>
              <span class="chip chip--gold">${icon('pin')} ${esc(locName(v.location))}</span>
            </div>
            <h2 class="detail__title" id="detailTitle">${esc(v.name)}</h2>
            <p class="detail__sub">${esc(v.brand)} · ${esc(v.model)} · ${v.year}</p>
          </div>

          <div class="price-table">
            <div class="is-main"><small>Per Hari</small><strong>${U.rupiah(v.priceDay)}</strong></div>
            <div><small>Per Minggu</small>${v.priceWeek > 0 ? `<strong>${U.rupiah(v.priceWeek)}</strong>` : '<strong class="na">Hubungi kami</strong>'}</div>
            <div><small>Per Bulan</small>${v.priceMonth > 0 ? `<strong>${U.rupiah(v.priceMonth)}</strong>` : '<strong class="na">Hubungi kami</strong>'}</div>
          </div>

          <div class="spec-grid">
            <div><small>${icon('tag')} Brand</small><strong>${esc(v.brand)}</strong></div>
            <div><small>${icon('car')} Model</small><strong>${esc(v.model)}</strong></div>
            <div><small>${icon('calendar')} Tahun</small><strong>${v.year}</strong></div>
            <div><small>${icon('gear')} Transmisi</small><strong>${esc(v.transmission)}</strong></div>
            <div><small>${icon('users')} Kapasitas</small><strong>${v.seats} Penumpang</strong></div>
            <div><small>${icon('fuel')} Bahan Bakar</small><strong>${esc(v.fuel)}</strong></div>
            <div><small>${icon('sparkle')} Warna</small><strong>${esc(v.color || '-')}</strong></div>
            <div><small>${icon('pin')} Lokasi</small><strong>${esc(locName(v.location))}</strong></div>
            <div><small>${icon('dashboard')} Tipe</small><strong>${esc(v.type)}</strong></div>
          </div>

          <div>
            <h3>Fasilitas</h3>
            <div class="feature-tags">${features.map(f => `<span>${icon('check')} ${esc(f)}</span>`).join('')}</div>
          </div>

          <div>
            <h3>Deskripsi</h3>
            <p class="detail__desc">${esc(v.description || 'Kendaraan nyaman dan terawat, siap menemani perjalanan Anda.')}</p>
          </div>

          <form class="booking" id="bookingForm" novalidate>
            <h3 style="margin:0">${icon('calendar')} Rencana Sewa</h3>
            <div class="booking__row">
              <div class="field"><label for="bStart">Tanggal Mulai</label><input type="date" id="bStart" required min="${U.todayISO()}" value="${esc(dates.start || U.todayISO(1))}"></div>
              <div class="field"><label for="bEnd">Tanggal Selesai</label><input type="date" id="bEnd" required min="${U.todayISO()}" value="${esc(dates.end || U.todayISO(3))}"></div>
            </div>
            <div class="booking__row">
              <div class="field"><label for="bName">Nama (opsional)</label><input type="text" id="bName" maxlength="60" placeholder="Nama Anda" autocomplete="name"></div>
              <div class="field"><label for="bService">Layanan</label>
                <select id="bService"><option>Lepas Kunci</option><option>Dengan Sopir</option></select>
              </div>
            </div>
            <div class="booking__summary">
              <span>Durasi<br><strong id="bDays">-</strong></span>
              <span style="text-align:right">Estimasi biaya<br><strong id="bTotal">-</strong></span>
            </div>
            <p class="booking__error" id="bError" role="alert" hidden></p>
            <button type="submit" class="btn btn--wa btn--cta">${icon('whatsapp')} Pesan Mobil Ini via WhatsApp</button>
            <p class="booking__note">Harga final &amp; ketersediaan unit dikonfirmasi oleh admin melalui WhatsApp. Belum ada pembayaran online.</p>
          </form>
        </div>
      </div>`;

    const modal = $('#detailModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    body.scrollTop = 0;
    updateEstimate(v);

    const bStart = $('#bStart'), bEnd = $('#bEnd');
    bStart.addEventListener('change', () => {
      bEnd.min = bStart.value || U.todayISO();
      if (bEnd.value && bStart.value && bEnd.value < bStart.value) bEnd.value = bStart.value;
      updateEstimate(v);
    });
    bEnd.addEventListener('change', () => updateEstimate(v));
    $('#bookingForm').addEventListener('submit', e => { e.preventDefault(); submitBooking(v); });
    setTimeout(() => { const c = $('.modal__close'); if (c) c.focus({ preventScroll: true }); }, 60);
  }

  function updateEstimate(v) {
    const s = $('#bStart').value, e = $('#bEnd').value;
    const err = $('#bError');
    const days = U.rentalDays(s, e);
    $$('.booking .field').forEach(f => f.classList.remove('has-error'));
    if (days < 0) {
      err.textContent = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
      err.hidden = false;
      $('#bEnd').parentElement.classList.add('has-error');
      $('#bDays').textContent = '-';
      $('#bTotal').textContent = '-';
      return false;
    }
    err.hidden = true;
    $('#bDays').textContent = days ? days + ' hari' : '-';
    $('#bTotal').textContent = days ? U.rupiah(U.estimateCost(v, days)) : '-';
    return true;
  }

  function submitBooking(v) {
    const s = $('#bStart').value, e = $('#bEnd').value;
    const err = $('#bError');
    const fail = (msg, field) => {
      err.textContent = msg; err.hidden = false;
      if (field) $(field).parentElement.classList.add('has-error');
    };
    $$('.booking .field').forEach(f => f.classList.remove('has-error'));
    if (!s) return fail('Tanggal mulai wajib diisi.', '#bStart');
    if (!e) return fail('Tanggal selesai wajib diisi.', '#bEnd');
    if (e < s) return fail('Tanggal selesai tidak boleh sebelum tanggal mulai.', '#bEnd');
    if (s < U.todayISO()) return fail('Tanggal mulai tidak boleh di masa lalu.', '#bStart');
    err.hidden = true;

    // sinkronkan tanggal ke search bar
    $('#sStart').value = s; $('#sEnd').value = e;

    const msg = bookingMessage(v, {
      start: s, end: e,
      customer: $('#bName').value.trim(),
      service: $('#bService').value
    });
    toast('Mengarahkan ke WhatsApp…', 'success');
    openWhatsApp(U.waLink(S.getWhatsappNumber(v.location), msg));
  }

  function quickBook(id) {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    const d = getBookingDates();
    const msg = bookingMessage(v, d);
    toast('Mengarahkan ke WhatsApp…', 'success');
    openWhatsApp(U.waLink(S.getWhatsappNumber(v.location), msg));
  }

  function setGallery(i) {
    const g = state.detail.gallery;
    if (!g.length) return;
    state.detail.index = (i + g.length) % g.length;
    const img = $('#detailMainImg');
    img.style.animation = 'none';
    // force reflow agar animasi fade ulang
    void img.offsetWidth;
    img.style.animation = '';
    img.src = g[state.detail.index];
    $$('[data-thumb]').forEach(b => b.classList.toggle('is-active', +b.getAttribute('data-thumb') === state.detail.index));
  }

  function closeDetail() {
    const modal = $('#detailModal');
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    state.detail.id = null;
    if (/^#mobil\//.test(location.hash)) {
      const back = state.detail.prevHash && !/^#mobil\//.test(state.detail.prevHash) ? state.detail.prevHash : (state.currentView === 'location' && state.currentLocation ? '#lokasi/' + state.currentLocation : '#katalog');
      history.replaceState(null, '', back);
    }
    if (state.lastFocus && state.lastFocus.focus) { try { state.lastFocus.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }
  }

  /* -------------------------------------------------------------------
     LOCATION VIEW
     ------------------------------------------------------------------- */
  function renderLocation(id) {
    const view = $('#viewLocation');
    const l = locById(id);
    if (!l || !l.active) {
      view.innerHTML = `
        <section class="loc-hero"><div class="container">
          <nav class="crumbs"><a href="#home" data-route>Home</a> / <span>Lokasi</span></nav>
          <h1>Lokasi tidak ditemukan</h1>
          <p>Lokasi yang Anda cari belum tersedia atau sedang tidak aktif.</p>
          <div class="loc-hero__cta"><a href="#lokasi" data-route class="btn btn--gold btn--lg">Lihat Semua Lokasi</a></div>
        </div></section>`;
      return;
    }
    const list = publicVehicles().filter(v => v.location === l.id);
    const avail = list.filter(v => v.status === 'Available').length;
    const mp = minPrice(list);
    const types = NR.VEHICLE_TYPES.filter(t => list.some(v => v.type === t));
    if (state.locTab && types.indexOf(state.locTab) === -1) state.locTab = '';
    const others = activeLocations().filter(x => x.id !== l.id);

    view.innerHTML = `
      <section class="loc-hero" aria-labelledby="locTitle">
        <img class="loc-hero__img" id="locHeroImg" src="${esc(safeUrl(NR.locationImage(l)))}" alt="Rental mobil ${esc(l.name)}">
        <div class="container">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#home" data-route>Home</a><span>/</span><a href="#lokasi" data-route>Lokasi</a><span>/</span><span>${esc(l.name)}</span></nav>
          <span class="eyebrow eyebrow--light anim-in">${icon('pin')} ${esc(l.city || 'Indonesia')}</span>
          <h1 id="locTitle" class="anim-in" style="--d:80ms">Rental Mobil ${esc(l.name)}</h1>
          <p class="anim-in" style="--d:140ms">${esc(l.description)}</p>
          <div class="loc-hero__chips anim-in" style="--d:200ms">
            <span class="chip">${icon('car')} ${avail} dari ${list.length} unit tersedia</span>
            ${mp ? `<span class="chip">${icon('tag')} Mulai ${U.rupiah(mp)} / hari</span>` : ''}
            <span class="chip">${icon('clock')} ${esc(settings.hours || '')}</span>
          </div>
          <div class="loc-hero__cta anim-in" style="--d:260ms">
            <a href="#" class="btn btn--gold btn--lg" data-scroll="locUnits">${icon('search')} Lihat Mobil</a>
            <a href="#" class="btn btn--wa btn--lg" data-wa="loc:${esc(l.id)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp ${esc(l.name)}</a>
          </div>
        </div>
      </section>

      <div class="container">
        <div class="loc-info">
          <div class="loc-info__card"><span class="loc-info__ic">${icon('pin')}</span><div><small>Alamat</small><strong>${esc(l.address || '-')}</strong></div></div>
          <div class="loc-info__card"><span class="loc-info__ic">${icon('whatsapp')}</span><div><small>WhatsApp ${esc(l.name)}</small><a href="#" data-wa="loc:${esc(l.id)}" target="_blank" rel="noopener">${esc(U.prettyPhone(S.getWhatsappNumber(l.id)))}</a></div></div>
          <div class="loc-info__card"><span class="loc-info__ic">${icon('clock')}</span><div><small>Jam Operasional</small><strong>${esc(settings.hours || '-')}</strong></div></div>
        </div>
      </div>

      ${l.areas.length ? `
      <section class="section section--tight" aria-labelledby="areaTitle">
        <div class="container">
          <div class="section-head section-head--row reveal"><div>
            <span class="eyebrow">Area Layanan</span>
            <h2 id="areaTitle">Area Layanan ${esc(l.name)}</h2>
            <p>Unit dapat diantar dan dijemput di area berikut (biaya antar menyesuaikan jarak).</p>
          </div></div>
          <div class="area-list reveal">${l.areas.map(a => `<span>${icon('check')} ${esc(a)}</span>`).join('')}</div>
        </div>
      </section>` : ''}

      <section class="section section--gray" id="locUnits" aria-labelledby="locUnitsTitle">
        <div class="container">
          <div class="section-head section-head--row reveal"><div>
            <span class="eyebrow">Armada ${esc(l.name)}</span>
            <h2 id="locUnitsTitle">Daftar Mobil di ${esc(l.name)}</h2>
            <p>Harga sudah termasuk unit dalam kondisi prima. Pemesanan dikonfirmasi via WhatsApp.</p>
          </div></div>
          ${types.length > 1 ? `<div class="type-tabs" role="tablist">
            <button type="button" class="${!state.locTab ? 'is-active' : ''}" data-action="loc-tab" data-tab="">Semua (${list.length})</button>
            ${types.map(t => `<button type="button" class="${state.locTab === t ? 'is-active' : ''}" data-action="loc-tab" data-tab="${esc(t)}">${esc(t)} (${list.filter(v => v.type === t).length})</button>`).join('')}
          </div>` : ''}
          <div class="car-grid" id="locGrid"></div>
        </div>
      </section>

      ${others.length ? `
      <section class="section section--tight" aria-labelledby="otherTitle">
        <div class="container">
          <div class="section-head section-head--row reveal"><div>
            <span class="eyebrow">Kota Lain</span>
            <h2 id="otherTitle">Jelajahi Kota Lainnya</h2>
          </div></div>
          <div class="other-cities">${others.map(cityCardHTML).join('')}</div>
        </div>
      </section>` : ''}`;

    renderLocationGrid(l, list);
    updateWaLinks(view);
    observeReveal(view);
  }

  function renderLocationGrid(l, list) {
    const grid = $('#locGrid');
    if (!grid) return;
    const shown = filterVehicles(list, { q: '', location: '', type: state.locTab, brand: '', price: '', year: '', sort: 'recommended' });
    if (!list.length) {
      grid.innerHTML = `
        <div class="empty">
          <div class="empty__icon">${icon('car')}</div>
          <h3>Belum tersedia kendaraan di lokasi ini.</h3>
          <p>Hubungi tim kami di ${esc(l.name)} untuk informasi unit terbaru.</p>
          <a href="#" class="btn btn--wa" data-wa="loc:${esc(l.id)}" target="_blank" rel="noopener">${icon('whatsapp')} Tanya via WhatsApp</a>
        </div>`;
      updateWaLinks(grid);
      return;
    }
    grid.innerHTML = shown.map(cardHTML).join('');
  }

  /* -------------------------------------------------------------------
     ROUTER (hash based — bekerja di file:///)
     ------------------------------------------------------------------- */
  function showView(name) {
    state.currentView = name;
    $('#viewHome').hidden = name !== 'home';
    $('#viewLocation').hidden = name !== 'location';
  }

  function scrollToId(id, smooth) {
    if (!id || id === 'home') { window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }); return; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }

  let firstRoute = true;
  function route() {
    const hash = decodeURIComponent(location.hash || '#home');
    closeDrawer();

    if (hash.indexOf('#lokasi/') === 0) {
      const id = hash.slice(8);
      if (state.currentLocation !== id) state.locTab = '';
      state.currentLocation = id;
      closeDetail();
      showView('location');
      renderLocation(id);
      window.scrollTo({ top: 0, behavior: 'auto' });
      setActiveNav('lokasi-' + id);
      firstRoute = false;
      return;
    }

    if (hash.indexOf('#mobil/') === 0) {
      const rest = hash.slice(7).split('?');
      if (state.currentView !== 'home' && state.currentView !== 'location') showView('home');
      if (firstRoute) { showView('home'); scrollToId('katalog', false); }
      openDetail(rest[0], { preview: rest[1] === 'preview' });
      firstRoute = false;
      return;
    }

    closeDetail();
    const wasHome = state.currentView === 'home';
    showView('home');
    state.currentLocation = null;
    const id = hash.slice(1) || 'home';
    // tunggu layout bila baru berpindah view
    requestAnimationFrame(() => scrollToId(id, wasHome && !firstRoute));
    setActiveNav(['home', 'katalog', 'tentang', 'faq', 'kontak'].indexOf(id) > -1 ? id : '');
    firstRoute = false;
  }

  function navigate(href) {
    if (href === location.hash || (href === '#home' && !location.hash)) route();
    else location.hash = href;
  }

  /* -------------------------------------------------------------------
     ANIMASI: reveal, counter, parallax, scroll spy
     ------------------------------------------------------------------- */
  let revealObserver = null;
  function observeReveal(root) {
    const els = $$('.reveal:not(.is-in)', root);
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) { en.target.classList.add('is-in'); revealObserver.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    els.forEach(el => revealObserver.observe(el));
  }

  function setCounter(sel, value) {
    const el = $(sel);
    if (!el) return;
    el.setAttribute('data-target', value);
    if (el.getAttribute('data-done')) el.textContent = value;
  }

  function initCounters() {
    const els = $$('[data-counter]');
    const run = el => {
      const target = +el.getAttribute('data-target') || 0;
      const dur = 1200;
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
        else { el.textContent = target; el.setAttribute('data-done', '1'); }
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(el => { el.textContent = el.getAttribute('data-target'); }); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  function initScrollEffects() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateNavStyle();
        if (!reduce) {
          const y = window.scrollY;
          const visual = $('.hero__visual');
          if (visual && state.currentView === 'home' && y < 900) visual.style.translate = `0 ${(y * 0.12).toFixed(1)}px`;
          const locImg = $('#locHeroImg');
          if (locImg && state.currentView === 'location' && y < 900) locImg.style.translate = `0 ${(y * 0.25).toFixed(1)}px`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    updateNavStyle();

    // Scroll spy navbar (home view)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (state.currentView !== 'home') return;
        entries.forEach(en => { if (en.isIntersecting) setActiveNav(en.target.id === 'lokasi' ? '' : en.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['home', 'lokasi', 'katalog', 'tentang', 'faq', 'kontak'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    }
  }

  /* -------------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------------- */
  function bindGlobalEvents() {
    document.addEventListener('click', e => {
      // Aksi kartu (detail / book / reset / tab)
      const act = e.target.closest('[data-action]');
      if (act) {
        const a = act.getAttribute('data-action');
        if (a === 'detail') { e.preventDefault(); openDetail(act.getAttribute('data-id')); return; }
        if (a === 'book') { e.preventDefault(); quickBook(act.getAttribute('data-id')); return; }
        if (a === 'reset-filters') { e.preventDefault(); resetFilters(); return; }
        if (a === 'loc-tab') {
          e.preventDefault();
          state.locTab = act.getAttribute('data-tab');
          $$('.type-tabs button').forEach(b => b.classList.toggle('is-active', b === act));
          const l = locById(state.currentLocation);
          if (l) renderLocationGrid(l, publicVehicles().filter(v => v.location === l.id));
          return;
        }
      }
      // Scroll ke elemen di halaman yang sama
      const sc = e.target.closest('[data-scroll]');
      if (sc) { e.preventDefault(); scrollToId(sc.getAttribute('data-scroll'), true); return; }

      // Link internal (#...)
      const link = e.target.closest('a[href^="#"]');
      if (link && !link.hasAttribute('data-wa')) {
        const href = link.getAttribute('href');
        if (href.length > 1) { e.preventDefault(); navigate(href); }
        return;
      }

      // Galeri
      const gal = e.target.closest('[data-gal]');
      if (gal) { setGallery(state.detail.index + (+gal.getAttribute('data-gal'))); return; }
      const th = e.target.closest('[data-thumb]');
      if (th) { setGallery(+th.getAttribute('data-thumb')); return; }

      if (e.target.closest('[data-close-modal]')) { closeDetail(); return; }
      if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
    });

    // Enter/Space pada media kartu
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDetail(); closeDrawer(); return; }
      if ($('#detailModal').classList.contains('is-open') && state.detail.gallery.length > 1 && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
        if (e.key === 'ArrowRight') setGallery(state.detail.index + 1);
        if (e.key === 'ArrowLeft') setGallery(state.detail.index - 1);
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.car-card__media')) {
        e.preventDefault();
        openDetail(e.target.getAttribute('data-id'));
      }
    });

    $('#burger').addEventListener('click', openDrawer);
    $('#searchForm').addEventListener('submit', onSearch);
    $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    window.addEventListener('hashchange', route);

    // Sinkron otomatis bila data diubah dari tab Admin
    window.addEventListener('storage', e => {
      if (!e.key || e.key.indexOf('nusantaraRental') === 0) refreshAll();
    });

    // Data terbaru dari database online (Supabase) sudah diterima
    window.addEventListener('nr:cloud', e => {
      if (e.detail && e.detail.type === 'data') refreshAll();
    });
  }

  function refreshAll() {
    loadData();
    applySettings();
    renderNav();
    renderSearchOptions();
    renderFilterOptions();
    renderCities();
    renderCatalog(false);
    renderOffices();
    renderFooter();
    renderHeroStats();
    if (state.currentView === 'location' && state.currentLocation) renderLocation(state.currentLocation);
    hydrateIcons(document);
  }

  /* -------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------- */
  function init() {
    loadData();
    hydrateIcons(document);
    applySettings();
    renderNav();
    renderSearchOptions();
    initDates();
    renderFilterOptions();
    bindFilters();
    renderCities();
    renderCatalog(true);
    renderFAQ();
    renderOffices();
    renderFooter();
    renderHeroStats();
    bindGlobalEvents();
    observeReveal(document);
    initCounters();
    initScrollEffects();
    route();
    if (!S.available) toast('Penyimpanan browser tidak tersedia. Data hanya bersifat sementara.', 'error');
  }

  // Mode online: tunggu data dari Supabase (atau tampilkan cache lalu perbarui)
  const boot = () => (NR.cloud && NR.cloud.enabled ? NR.cloud.whenReady(init) : init());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
