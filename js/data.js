/* =====================================================================
   NUSANTARA RENTAL — data.js
   ---------------------------------------------------------------------
   Berisi:
   1. Data default (kendaraan, lokasi, pengaturan website, WhatsApp, admin)
   2. Lapisan "database" LocalStorage (NR.store)
   3. Utilitas bersama (format Rupiah, tanggal, nomor WhatsApp, dll)
   4. Generator ilustrasi kendaraan & kota (SVG placeholder, offline)
   5. Kumpulan ikon SVG

   File ini dimuat oleh index.html DAN admin.html, sehingga kedua halaman
   memakai sumber data yang sama. Dimuat sebagai <script> biasa (bukan
   module/fetch) agar tetap berjalan ketika dibuka via file:///
   ===================================================================== */
(function (window) {
  'use strict';

  var NR = window.NR = window.NR || {};
  NR.version = '1.0.0';

  /* -------------------------------------------------------------------
     1. KUNCI LOCALSTORAGE
     ------------------------------------------------------------------- */
  NR.KEYS = {
    vehicles: 'nusantaraRentalVehicles',
    locations: 'nusantaraRentalLocations',
    settings: 'nusantaraRentalSettings',
    whatsapp: 'nusantaraRentalWhatsapp',
    admin: 'nusantaraRentalAdmin',
    meta: 'nusantaraRentalMeta'
  };

  NR.VEHICLE_TYPES = ['City Car', 'MPV', 'SUV', 'Sedan', 'Luxury', 'Van'];
  NR.STATUSES = ['Available', 'Booked', 'Maintenance', 'Inactive'];
  NR.STATUS_LABEL = {
    Available: 'Tersedia',
    Booked: 'Sedang Disewa',
    Maintenance: 'Perawatan',
    Inactive: 'Nonaktif'
  };
  NR.TRANSMISSIONS = ['Automatic', 'Manual'];
  NR.FUELS = ['Bensin', 'Diesel', 'Hybrid', 'Listrik'];
  NR.COMMON_FEATURES = [
    'AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', 'Audio System',
    'Kamera Mundur', 'Sensor Parkir', 'Airbag', 'ABS', 'Cruise Control',
    'Captain Seat', 'Sunroof', 'Apple CarPlay', 'Android Auto', 'Keyless Entry'
  ];

  /* -------------------------------------------------------------------
     2. DATA DEFAULT
     ------------------------------------------------------------------- */
  // Catatan: field "image" & "gallery" sengaja dikosongkan. Website akan
  // otomatis menampilkan ilustrasi kendaraan (SVG) sesuai tipe & warna.
  // Ganti dengan foto asli melalui halaman Admin (URL atau upload).
  NR.DEFAULT_VEHICLES = [
    // ---------------- JAKARTA ----------------
    {
      id: 'NR-JKT-001', name: 'Toyota Avanza', brand: 'Toyota', model: 'Avanza 1.5 G', year: 2023,
      location: 'jakarta', type: 'MPV', priceDay: 350000, priceWeek: 2200000, priceMonth: 8000000,
      transmission: 'Automatic', seats: 7, fuel: 'Bensin', color: 'Silver',
      description: 'MPV keluarga paling populer di Indonesia. Kabin lega untuk 7 penumpang, irit bahan bakar, dan nyaman untuk mobilitas harian maupun perjalanan keluarga di Jabodetabek.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-JKT-002', name: 'Toyota Innova Reborn', brand: 'Toyota', model: 'Kijang Innova 2.4 V', year: 2023,
      location: 'jakarta', type: 'MPV', priceDay: 650000, priceWeek: 4200000, priceMonth: 15000000,
      transmission: 'Automatic', seats: 7, fuel: 'Diesel', color: 'Hitam',
      description: 'Pilihan favorit untuk perjalanan bisnis dan keluarga. Mesin diesel bertenaga, suspensi empuk, dan kabin premium yang tetap nyaman untuk perjalanan jauh.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Kamera Mundur'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-JKT-003', name: 'Toyota Fortuner', brand: 'Toyota', model: 'Fortuner 2.4 VRZ', year: 2022,
      location: 'jakarta', type: 'SUV', priceDay: 1100000, priceWeek: 7000000, priceMonth: 26000000,
      transmission: 'Automatic', seats: 7, fuel: 'Diesel', color: 'Putih',
      description: 'SUV tangguh dengan ground clearance tinggi. Cocok untuk perjalanan luar kota, medan menanjak, maupun kebutuhan eksekutif yang membutuhkan kesan gagah.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Kamera Mundur', 'Cruise Control'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-JKT-004', name: 'Toyota Camry', brand: 'Toyota', model: 'Camry 2.5 V', year: 2023,
      location: 'jakarta', type: 'Sedan', priceDay: 1300000, priceWeek: 8500000, priceMonth: 0,
      transmission: 'Automatic', seats: 5, fuel: 'Bensin', color: 'Hitam',
      description: 'Sedan eksekutif yang elegan dan senyap. Ideal untuk tamu VIP, perjalanan bisnis, dan acara formal di Jakarta.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', 'Sensor Parkir', 'Cruise Control'],
      image: '', gallery: [], status: 'Available'
    },
    // ---------------- BANDUNG ----------------
    {
      id: 'NR-BDG-001', name: 'Honda Brio', brand: 'Honda', model: 'Brio RS CVT', year: 2024,
      location: 'bandung', type: 'City Car', priceDay: 300000, priceWeek: 1900000, priceMonth: 7000000,
      transmission: 'Automatic', seats: 5, fuel: 'Bensin', color: 'Merah',
      description: 'City car lincah dan irit, mudah bermanuver di jalanan Bandung yang padat. Pas untuk wisata kuliner dan belanja di pusat kota.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-BDG-002', name: 'Toyota Alphard', brand: 'Toyota', model: 'Alphard 2.5 G', year: 2022,
      location: 'bandung', type: 'Luxury', priceDay: 2500000, priceWeek: 16000000, priceMonth: 0,
      transmission: 'Automatic', seats: 7, fuel: 'Bensin', color: 'Hitam',
      description: 'MPV mewah dengan captain seat dan kabin kelas satu. Pilihan utama untuk pernikahan, tamu VIP, dan perjalanan eksekutif.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', 'Captain Seat', 'Sunroof', '7 Seat'],
      image: '', gallery: [], status: 'Booked'
    },
    {
      id: 'NR-BDG-003', name: 'Toyota Hiace', brand: 'Toyota', model: 'Hiace Commuter', year: 2023,
      location: 'bandung', type: 'Van', priceDay: 1200000, priceWeek: 7800000, priceMonth: 0,
      transmission: 'Manual', seats: 15, fuel: 'Diesel', color: 'Putih',
      description: 'Van berkapasitas besar untuk rombongan, study tour, atau outing kantor ke Lembang dan Ciwidey.',
      features: ['AC', 'Audio System', 'USB', 'Power Steering', '15 Seat'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-BDG-004', name: 'Mitsubishi Pajero Sport', brand: 'Mitsubishi', model: 'Pajero Sport Dakar', year: 2023,
      location: 'bandung', type: 'SUV', priceDay: 1150000, priceWeek: 7300000, priceMonth: 27000000,
      transmission: 'Automatic', seats: 7, fuel: 'Diesel', color: 'Abu-abu',
      description: 'SUV bertenaga dengan fitur keselamatan lengkap, sangat cocok untuk menjelajah dataran tinggi Bandung.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Kamera Mundur'],
      image: '', gallery: [], status: 'Available'
    },
    // ---------------- JOGJA ----------------
    {
      id: 'NR-JOG-001', name: 'Toyota Avanza', brand: 'Toyota', model: 'Avanza 1.3 E', year: 2023,
      location: 'jogja', type: 'MPV', priceDay: 325000, priceWeek: 2100000, priceMonth: 7500000,
      transmission: 'Manual', seats: 7, fuel: 'Bensin', color: 'Putih',
      description: 'MPV andalan untuk keliling Jogja — dari Malioboro, Prambanan, hingga pantai selatan. Irit dan mudah dikendarai.',
      features: ['AC', 'Audio System', 'USB', 'Power Steering', '7 Seat'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-JOG-002', name: 'Mitsubishi Xpander', brand: 'Mitsubishi', model: 'Xpander Ultimate', year: 2024,
      location: 'jogja', type: 'MPV', priceDay: 400000, priceWeek: 2600000, priceMonth: 9500000,
      transmission: 'Automatic', seats: 7, fuel: 'Bensin', color: 'Silver',
      description: 'Desain modern dengan kabin lapang dan suspensi nyaman. Favorit wisatawan keluarga di Yogyakarta.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-JOG-003', name: 'Honda Mobilio', brand: 'Honda', model: 'Mobilio E CVT', year: 2022,
      location: 'jogja', type: 'MPV', priceDay: 300000, priceWeek: 1900000, priceMonth: 7000000,
      transmission: 'Automatic', seats: 7, fuel: 'Bensin', color: 'Abu-abu',
      description: 'MPV kompak yang ekonomis, cocok untuk perjalanan wisata hemat bersama keluarga kecil.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat'],
      image: '', gallery: [], status: 'Maintenance'
    },
    {
      id: 'NR-JOG-004', name: 'Toyota Hiace Premio', brand: 'Toyota', model: 'Hiace Premio', year: 2023,
      location: 'jogja', type: 'Van', priceDay: 1400000, priceWeek: 9000000, priceMonth: 0,
      transmission: 'Manual', seats: 14, fuel: 'Diesel', color: 'Silver',
      description: 'Van premium dengan kursi reclining, ideal untuk rombongan wisata Borobudur dan Dieng.',
      features: ['AC', 'Audio System', 'USB', 'Power Steering', '14 Seat', 'Captain Seat'],
      image: '', gallery: [], status: 'Available'
    },
    // ---------------- SURABAYA ----------------
    {
      id: 'NR-SBY-001', name: 'Toyota Innova Zenix', brand: 'Toyota', model: 'Innova Zenix 2.0 Q HV', year: 2024,
      location: 'surabaya', type: 'MPV', priceDay: 800000, priceWeek: 5200000, priceMonth: 19000000,
      transmission: 'Automatic', seats: 7, fuel: 'Hybrid', color: 'Putih',
      description: 'Generasi terbaru Innova bertenaga hybrid — senyap, irit, dan sangat nyaman. Cocok untuk perjalanan bisnis di Surabaya dan sekitarnya.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Captain Seat', 'Kamera Mundur'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-SBY-002', name: 'Toyota Fortuner', brand: 'Toyota', model: 'Fortuner 2.8 GR Sport', year: 2023,
      location: 'surabaya', type: 'SUV', priceDay: 1150000, priceWeek: 7400000, priceMonth: 27000000,
      transmission: 'Automatic', seats: 7, fuel: 'Diesel', color: 'Hitam',
      description: 'SUV gagah varian GR Sport dengan performa mesin 2.8L. Pas untuk perjalanan ke Bromo maupun Malang.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Kamera Mundur', 'Cruise Control'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-SBY-003', name: 'Hyundai Stargazer', brand: 'Hyundai', model: 'Stargazer Prime', year: 2024,
      location: 'surabaya', type: 'MPV', priceDay: 420000, priceWeek: 2700000, priceMonth: 10000000,
      transmission: 'Automatic', seats: 7, fuel: 'Bensin', color: 'Biru',
      description: 'MPV futuristik dengan fitur modern dan kabin lapang. Nyaman untuk keluarga maupun perjalanan dinas.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic', '7 Seat', 'Apple CarPlay'],
      image: '', gallery: [], status: 'Available'
    },
    {
      id: 'NR-SBY-004', name: 'Toyota Agya', brand: 'Toyota', model: 'Agya 1.2 GR Sport', year: 2024,
      location: 'surabaya', type: 'City Car', priceDay: 280000, priceWeek: 1800000, priceMonth: 6500000,
      transmission: 'Automatic', seats: 5, fuel: 'Bensin', color: 'Kuning',
      description: 'City car hemat dan stylish untuk mobilitas harian di dalam kota Surabaya.',
      features: ['AC', 'Bluetooth', 'USB', 'Power Steering', 'Automatic'],
      image: '', gallery: [], status: 'Available'
    }
  ];

  NR.DEFAULT_LOCATIONS = [
    {
      id: 'jakarta', name: 'Jakarta', city: 'DKI Jakarta',
      description: 'Layanan rental mobil di ibu kota dengan armada lengkap untuk kebutuhan bisnis, keluarga, hingga acara formal. Antar-jemput unit ke seluruh Jabodetabek dan bandara Soekarno-Hatta.',
      address: 'Jl. Jend. Sudirman Kav. 52, Senayan, Jakarta Selatan',
      whatsapp: '6282211116847', photo: '', active: true, hue: 214,
      areas: ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Bandara Soekarno-Hatta', 'Tangerang', 'Bekasi', 'Depok']
    },
    {
      id: 'bandung', name: 'Bandung', city: 'Jawa Barat',
      description: 'Jelajahi Kota Kembang dan dataran tinggi Lembang, Ciwidey, hingga Pangalengan dengan kendaraan yang nyaman dan terawat.',
      address: 'Jl. Ir. H. Juanda No. 88, Dago, Bandung',
      whatsapp: '6282211116847', photo: '', active: true, hue: 160,
      areas: ['Dago', 'Pasteur', 'Buah Batu', 'Lembang', 'Cimahi', 'Ciwidey', 'Stasiun Bandung', 'Bandara Kertajati']
    },
    {
      id: 'jogja', name: 'Jogja', city: 'D.I. Yogyakarta',
      description: 'Rental mobil di Yogyakarta untuk wisata budaya, pantai, dan kuliner. Siap antar ke hotel, stasiun, maupun Bandara YIA.',
      address: 'Jl. Malioboro No. 21, Gedong Tengen, Yogyakarta',
      whatsapp: '6282211116847', photo: '', active: true, hue: 28,
      areas: ['Malioboro', 'Sleman', 'Bantul', 'Kaliurang', 'Prambanan', 'Borobudur', 'Stasiun Tugu', 'Bandara YIA']
    },
    {
      id: 'surabaya', name: 'Surabaya', city: 'Jawa Timur',
      description: 'Armada rental mobil di Kota Pahlawan untuk perjalanan bisnis maupun wisata ke Malang, Batu, dan Bromo.',
      address: 'Jl. Basuki Rahmat No. 15, Tegalsari, Surabaya',
      whatsapp: '6282211116847', photo: '', active: true, hue: 350,
      areas: ['Surabaya Pusat', 'Surabaya Barat', 'Surabaya Timur', 'Sidoarjo', 'Gresik', 'Bandara Juanda', 'Malang', 'Batu']
    }
  ];

  NR.DEFAULT_SETTINGS = {
    siteName: 'Nusantara Rental',
    tagline: 'Temukan Mobil Pilihanmu, Jelajahi Indonesia.',
    logoUrl: 'assets/logo.png',
    heroImage: '', // opsional: URL foto background hero
    email: 'halo@nusantararental.id',
    address: 'Jl. Jend. Sudirman Kav. 52, Senayan, Jakarta Selatan 12190',
    instagram: 'https://instagram.com/nusantararental',
    facebook: 'https://facebook.com/nusantararental',
    tiktok: 'https://tiktok.com/@nusantararental',
    hours: 'Senin – Minggu, 07.00 – 22.00 WIB'
  };

  NR.DEFAULT_WHATSAPP = {
    main: '6282211116847',
    floatingMessage: 'Halo Nusantara Rental, saya ingin menanyakan informasi rental mobil.'
  };

  // CATATAN KEAMANAN:
  // Login admin ini HANYA autentikasi frontend untuk prototype.
  // Password disimpan dalam bentuk hash SHA-256 (bukan teks asli), namun
  // siapa pun yang membuka DevTools tetap dapat memodifikasi LocalStorage.
  // Untuk PRODUCTION wajib menggunakan autentikasi backend (server-side
  // session/JWT, password hashing bcrypt/argon2, HTTPS, rate limiting).
  NR.DEFAULT_ADMIN = {
    username: 'admin',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // sha256("admin123")
    sessionHours: 8
  };

  /* -------------------------------------------------------------------
     3. UTILITAS
     ------------------------------------------------------------------- */
  var U = NR.util = {};

  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  U.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // 1250000 -> "Rp 1.250.000"
  U.rupiah = function (n) {
    var num = Math.round(Number(n) || 0);
    var neg = num < 0;
    var s = String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + 'Rp ' + s;
  };

  // Versi ringkas: 1250000 -> "1,25 jt"
  U.rupiahShort = function (n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' M';
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' jt';
    if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
    return String(n);
  };

  // Ambil angka murni dari input (mis. "Rp 1.250.000" -> 1250000)
  U.parseNumber = function (v) {
    if (typeof v === 'number') return v;
    var s = String(v || '').replace(/[^\d-]/g, '');
    return s === '' || s === '-' ? NaN : parseInt(s, 10);
  };

  U.MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // "2026-10-20" -> "20 Oktober 2026"
  U.formatDate = function (iso) {
    if (!iso) return '-';
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return parseInt(p[2], 10) + ' ' + U.MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  };

  U.todayISO = function (offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };

  // Jumlah hari sewa. Tanggal sama = 1 hari.
  U.rentalDays = function (start, end) {
    if (!start || !end) return 0;
    var a = new Date(start + 'T00:00:00'), b = new Date(end + 'T00:00:00');
    var diff = Math.round((b - a) / 86400000);
    if (isNaN(diff) || diff < 0) return -1;
    return Math.max(1, diff);
  };

  // Estimasi biaya terbaik memakai harga bulanan/mingguan bila tersedia
  U.estimateCost = function (v, days) {
    if (!v || !days || days < 1) return 0;
    var total = 0, rest = days;
    if (v.priceMonth > 0 && rest >= 30) { total += Math.floor(rest / 30) * v.priceMonth; rest = rest % 30; }
    if (v.priceWeek > 0 && rest >= 7) { total += Math.floor(rest / 7) * v.priceWeek; rest = rest % 7; }
    total += rest * (v.priceDay || 0);
    return Math.min(total, days * (v.priceDay || 0)) || total;
  };

  U.slugify = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  U.uid = function (prefix) {
    return (prefix || 'NR') + '-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();
  };

  // Normalisasi nomor WhatsApp ke format internasional Indonesia (62...)
  U.normalizePhone = function (v) {
    var s = String(v || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (s.indexOf('0') === 0) s = '62' + s.slice(1);
    else if (s.indexOf('8') === 0) s = '62' + s;
    return s.replace(/\D/g, '');
  };

  U.isValidPhone = function (v) {
    var s = U.normalizePhone(v);
    return /^62[1-9]\d{7,12}$/.test(s);
  };

  U.prettyPhone = function (v) {
    var s = U.normalizePhone(v);
    if (!s) return '-';
    return '+62 ' + s.slice(2).replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
  };

  U.waLink = function (number, text) {
    return 'https://wa.me/' + U.normalizePhone(number) + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  U.hashString = function (s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  };

  U.byteSize = function (str) {
    // LocalStorage menyimpan UTF-16 → ±2 byte per karakter
    return (str || '').length * 2;
  };

  U.formatBytes = function (b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  };

  /* -------------------------------------------------------------------
     4. DATABASE LOCALSTORAGE
     ------------------------------------------------------------------- */
  var memoryFallback = {};
  var storageOK = (function () {
    try {
      var k = '__nr_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function rawGet(key) {
    try { return storageOK ? window.localStorage.getItem(key) : (memoryFallback[key] || null); }
    catch (e) { return memoryFallback[key] || null; }
  }
  function rawSet(key, value) {
    if (!storageOK) { memoryFallback[key] = value; return true; }
    try { window.localStorage.setItem(key, value); return true; }
    catch (e) {
      // QuotaExceededError — biasanya karena foto Base64 terlalu besar
      var err = new Error('Penyimpanan browser penuh. Kurangi ukuran/jumlah foto upload atau gunakan URL gambar.');
      err.code = 'QUOTA';
      throw err;
    }
  }
  function readJSON(key, fallback) {
    var raw = rawGet(key);
    if (!raw) return U.clone(fallback);
    try { return JSON.parse(raw); } catch (e) { return U.clone(fallback); }
  }
  function writeJSON(key, val) {
    rawSet(key, JSON.stringify(val));
    rawSet(NR.KEYS.meta, JSON.stringify({ version: NR.version, updatedAt: new Date().toISOString() }));
    // Hook sinkronisasi online (diisi oleh js/cloud.js bila Supabase aktif)
    if (typeof NR.onWrite === 'function') {
      try { NR.onWrite(key, val); } catch (e) { if (window.console) console.warn('Sinkron cloud gagal:', e); }
    }
  }

  function normalizeVehicle(v) {
    v = v || {};
    return {
      id: String(v.id || U.uid('NR')),
      name: String(v.name || ''),
      brand: String(v.brand || ''),
      model: String(v.model || ''),
      year: parseInt(v.year, 10) || new Date().getFullYear(),
      location: String(v.location || ''),
      type: String(v.type || 'MPV'),
      priceDay: Math.max(0, Number(v.priceDay) || 0),
      priceWeek: Math.max(0, Number(v.priceWeek) || 0),
      priceMonth: Math.max(0, Number(v.priceMonth) || 0),
      transmission: String(v.transmission || 'Automatic'),
      seats: parseInt(v.seats, 10) || 0,
      fuel: String(v.fuel || 'Bensin'),
      color: String(v.color || ''),
      description: String(v.description || ''),
      features: Array.isArray(v.features) ? v.features.map(String) : [],
      image: String(v.image || ''),
      gallery: Array.isArray(v.gallery) ? v.gallery.map(String) : [],
      status: NR.STATUSES.indexOf(v.status) > -1 ? v.status : 'Available',
      createdAt: v.createdAt || new Date().toISOString(),
      updatedAt: v.updatedAt || new Date().toISOString()
    };
  }

  function normalizeLocation(l) {
    l = l || {};
    return {
      id: String(l.id || U.slugify(l.name) || U.uid('loc').toLowerCase()),
      name: String(l.name || ''),
      city: String(l.city || ''),
      description: String(l.description || ''),
      address: String(l.address || ''),
      whatsapp: String(l.whatsapp || ''),
      photo: String(l.photo || ''),
      active: l.active !== false,
      hue: typeof l.hue === 'number' ? l.hue : (U.hashString(l.id || l.name) % 360),
      areas: Array.isArray(l.areas) ? l.areas.map(String) : []
    };
  }

  var S = NR.store = {
    available: storageOK,

    // Dipanggil sekali di awal. Jika LocalStorage kosong → isi data default.
    init: function () {
      if (!rawGet(NR.KEYS.vehicles)) writeJSON(NR.KEYS.vehicles, NR.DEFAULT_VEHICLES.map(normalizeVehicle));
      if (!rawGet(NR.KEYS.locations)) writeJSON(NR.KEYS.locations, NR.DEFAULT_LOCATIONS.map(normalizeLocation));
      if (!rawGet(NR.KEYS.settings)) writeJSON(NR.KEYS.settings, NR.DEFAULT_SETTINGS);
      if (!rawGet(NR.KEYS.whatsapp)) writeJSON(NR.KEYS.whatsapp, NR.DEFAULT_WHATSAPP);
      if (!rawGet(NR.KEYS.admin)) writeJSON(NR.KEYS.admin, NR.DEFAULT_ADMIN);
    },

    getVehicles: function () {
      var list = readJSON(NR.KEYS.vehicles, []);
      return Array.isArray(list) ? list.map(normalizeVehicle) : [];
    },
    saveVehicles: function (list) { writeJSON(NR.KEYS.vehicles, list.map(normalizeVehicle)); },
    getVehicle: function (id) {
      return S.getVehicles().filter(function (v) { return v.id === id; })[0] || null;
    },
    upsertVehicle: function (v, originalId) {
      var list = S.getVehicles();
      var key = originalId || v.id;
      var idx = -1;
      list.forEach(function (x, i) { if (x.id === key) idx = i; });
      v = normalizeVehicle(v);
      v.updatedAt = new Date().toISOString();
      if (idx > -1) { v.createdAt = list[idx].createdAt; list[idx] = v; } else list.unshift(v);
      S.saveVehicles(list);
      return v;
    },
    deleteVehicle: function (id) {
      S.saveVehicles(S.getVehicles().filter(function (v) { return v.id !== id; }));
    },

    getLocations: function () {
      var list = readJSON(NR.KEYS.locations, []);
      return Array.isArray(list) ? list.map(normalizeLocation) : [];
    },
    getActiveLocations: function () { return S.getLocations().filter(function (l) { return l.active; }); },
    saveLocations: function (list) { writeJSON(NR.KEYS.locations, list.map(normalizeLocation)); },
    getLocation: function (id) {
      return S.getLocations().filter(function (l) { return l.id === id; })[0] || null;
    },

    getSettings: function () {
      var s = readJSON(NR.KEYS.settings, NR.DEFAULT_SETTINGS);
      var out = U.clone(NR.DEFAULT_SETTINGS);
      Object.keys(s || {}).forEach(function (k) { out[k] = s[k]; });
      return out;
    },
    saveSettings: function (s) { writeJSON(NR.KEYS.settings, s); },

    getWhatsapp: function () {
      var w = readJSON(NR.KEYS.whatsapp, NR.DEFAULT_WHATSAPP);
      return {
        main: w.main || NR.DEFAULT_WHATSAPP.main,
        floatingMessage: w.floatingMessage || NR.DEFAULT_WHATSAPP.floatingMessage
      };
    },
    saveWhatsapp: function (w) { writeJSON(NR.KEYS.whatsapp, w); },

    getAdmin: function () {
      var a = readJSON(NR.KEYS.admin, NR.DEFAULT_ADMIN);
      return {
        username: a.username || NR.DEFAULT_ADMIN.username,
        passwordHash: a.passwordHash || NR.DEFAULT_ADMIN.passwordHash,
        sessionHours: a.sessionHours || NR.DEFAULT_ADMIN.sessionHours
      };
    },
    saveAdmin: function (a) { writeJSON(NR.KEYS.admin, a); },

    getMeta: function () { return readJSON(NR.KEYS.meta, {}); },

    // SATU-SATUNYA sumber nomor WhatsApp untuk seluruh website.
    // Jika lokasi punya nomor sendiri → pakai itu, jika tidak → WhatsApp utama.
    getWhatsappNumber: function (locationId) {
      var main = S.getWhatsapp().main;
      if (locationId) {
        var loc = S.getLocation(locationId);
        if (loc && loc.whatsapp && U.isValidPhone(loc.whatsapp)) return U.normalizePhone(loc.whatsapp);
      }
      return U.normalizePhone(main);
    },

    exportAll: function () {
      return {
        app: 'Nusantara Rental',
        version: NR.version,
        exportedAt: new Date().toISOString(),
        data: {
          vehicles: S.getVehicles(),
          locations: S.getLocations(),
          settings: S.getSettings(),
          whatsapp: S.getWhatsapp(),
          admin: S.getAdmin()
        }
      };
    },

    importAll: function (obj) {
      var d = obj && obj.data ? obj.data : obj;
      if (!d || !Array.isArray(d.vehicles) || !Array.isArray(d.locations)) {
        throw new Error('Format file backup tidak valid (vehicles/locations tidak ditemukan).');
      }
      writeJSON(NR.KEYS.vehicles, d.vehicles.map(normalizeVehicle));
      writeJSON(NR.KEYS.locations, d.locations.map(normalizeLocation));
      if (d.settings) writeJSON(NR.KEYS.settings, d.settings);
      if (d.whatsapp) writeJSON(NR.KEYS.whatsapp, d.whatsapp);
      if (d.admin && d.admin.passwordHash) writeJSON(NR.KEYS.admin, d.admin);
    },

    resetAll: function () {
      Object.keys(NR.KEYS).forEach(function (k) {
        try { if (storageOK) window.localStorage.removeItem(NR.KEYS[k]); else delete memoryFallback[NR.KEYS[k]]; } catch (e) { /* abaikan */ }
      });
      S.init();
    },

    usage: function () {
      var total = 0;
      Object.keys(NR.KEYS).forEach(function (k) { total += U.byteSize(rawGet(NR.KEYS[k]) || ''); });
      return total;
    }
  };

  S.normalizeVehicle = normalizeVehicle;
  S.normalizeLocation = normalizeLocation;

  // Dipakai js/cloud.js: menulis cache lokal TANPA memicu sinkron ke cloud
  S.readRaw = rawGet;
  S.writeCache = function (key, val) { rawSet(key, JSON.stringify(val)); };

  /* -------------------------------------------------------------------
     5. ILUSTRASI KENDARAAN (SVG PLACEHOLDER)
     Menghasilkan gambar mobil sesuai tipe dan warna kendaraan sehingga
     katalog tetap terlihat rapi walau foto asli belum tersedia.
     ------------------------------------------------------------------- */
  var COLORS = {
    putih: '#eef0f3', white: '#eef0f3', hitam: '#1b212c', black: '#1b212c',
    silver: '#b8bfc8', 'abu-abu': '#6c7480', abu: '#6c7480', grey: '#6c7480', gray: '#6c7480',
    merah: '#a3191f', red: '#a3191f', biru: '#1f4f9e', blue: '#1f4f9e', navy: '#1b2c4f',
    coklat: '#6e4a32', brown: '#6e4a32', hijau: '#2f6b4f', green: '#2f6b4f',
    emas: '#c9a24a', gold: '#c9a24a', kuning: '#e2b33a', yellow: '#e2b33a',
    oranye: '#d9662b', orange: '#d9662b', ungu: '#5b3f8c', purple: '#5b3f8c', champagne: '#d8c8a8'
  };

  function colorFromName(name) {
    var n = String(name || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(n)) return n;
    if (COLORS[n]) return COLORS[n];
    var first = n.split(/\s+/)[0];
    if (COLORS[first]) return COLORS[first];
    var palette = ['#1f4f9e', '#6c7480', '#b8bfc8', '#1b212c', '#a3191f', '#2f6b4f'];
    return palette[U.hashString(n || 'x') % palette.length];
  }

  function mix(hex, target, amt) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - amt) + ((b >> 16) & 255) * amt);
    var g = Math.round(((a >> 8) & 255) * (1 - amt) + ((b >> 8) & 255) * amt);
    var bl = Math.round((a & 255) * (1 - amt) + (b & 255) * amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  // Bentuk bodi per tipe (menghadap kiri). wheels = posisi x roda, wy = y pusat roda.
  var SHAPES = {
    'Sedan': {
      body: 'M30,150 Q30,128 52,124 L120,118 Q150,88 190,84 L250,84 Q285,86 310,116 L350,122 Q370,126 370,146 L370,160 Q370,168 362,168 L330,168 A35,35 0 0 0 260,168 L140,168 A35,35 0 0 0 70,168 L38,168 Q30,168 30,160 Z',
      glass: 'M134,117 Q160,94 192,92 L246,92 Q272,94 292,116 Z', pillars: [214], gy: 117,
      wheels: [105, 295], r: 30, head: [34, 132], tail: [364, 132]
    },
    'City Car': {
      body: 'M60,150 Q60,128 80,122 L115,116 Q140,80 175,74 L280,72 Q310,74 322,110 L332,124 Q340,130 340,148 L340,160 Q340,168 332,168 L310,168 A32,32 0 0 0 246,168 L154,168 A32,32 0 0 0 90,168 L68,168 Q60,168 60,160 Z',
      glass: 'M128,114 Q148,84 177,80 L279,79 Q303,81 313,112 Z', pillars: [232], gy: 114,
      wheels: [122, 278], r: 27, head: [64, 132], tail: [334, 128]
    },
    'SUV': {
      body: 'M28,145 Q28,118 50,112 L95,106 Q118,72 150,68 L300,68 Q330,70 345,104 L362,112 Q374,118 374,140 L374,160 Q374,168 366,168 L335,168 A37,37 0 0 0 261,168 L139,168 A37,37 0 0 0 65,168 L36,168 Q28,168 28,160 Z',
      glass: 'M108,105 Q126,78 153,76 L297,76 Q319,78 332,104 Z', pillars: [200, 266], gy: 105,
      wheels: [102, 298], r: 32, head: [32, 122], tail: [368, 120]
    },
    'MPV': {
      body: 'M28,150 Q28,126 48,120 L100,112 Q135,74 175,68 L330,66 Q352,66 360,90 L366,120 Q372,126 372,146 L372,160 Q372,168 364,168 L330,168 A35,35 0 0 0 260,168 L140,168 A35,35 0 0 0 70,168 L36,168 Q28,168 28,160 Z',
      glass: 'M114,111 Q143,80 178,75 L326,73 Q344,74 350,94 L353,111 Z', pillars: [230, 292], gy: 111,
      wheels: [105, 295], r: 30, head: [32, 128], tail: [362, 106]
    },
    'Luxury': {
      body: 'M26,150 Q26,122 44,114 L78,106 Q104,60 150,54 L338,52 Q362,52 366,76 L370,120 Q374,126 374,146 L374,160 Q374,168 366,168 L333,168 A36,36 0 0 0 261,168 L139,168 A36,36 0 0 0 67,168 L34,168 Q26,168 26,160 Z',
      glass: 'M92,105 Q114,64 152,61 L336,60 Q354,61 357,80 L360,105 Z', pillars: [172, 246, 310], gy: 105,
      wheels: [103, 297], r: 31, head: [30, 124], tail: [366, 96], grille: true
    },
    'Van': {
      body: 'M24,150 Q24,124 40,116 L60,110 Q72,56 110,50 L350,48 Q372,48 374,70 L376,158 Q376,168 366,168 L340,168 A36,36 0 0 0 268,168 L132,168 A36,36 0 0 0 60,168 L32,168 Q24,168 24,160 Z',
      glass: 'M72,106 Q82,64 112,60 L362,59 Q366,59 366,66 L366,104 Z', pillars: [142, 212, 282], gy: 106,
      wheels: [96, 304], r: 31, head: [28, 128], tail: [370, 118]
    }
  };

  function carGroup(type, colorHex, uidp) {
    var sh = SHAPES[type] || SHAPES.MPV;
    var light = mix(colorHex, '#ffffff', 0.35);
    var dark = mix(colorHex, '#000000', 0.38);
    var isLight = parseInt(colorHex.slice(1, 3), 16) > 200;
    var lineCol = isLight ? 'rgba(20,30,50,.22)' : 'rgba(0,0,0,.35)';
    var g = '';
    g += '<defs>' +
      '<linearGradient id="b' + uidp + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + light + '"/><stop offset=".45" stop-color="' + colorHex + '"/><stop offset="1" stop-color="' + dark + '"/></linearGradient>' +
      '<linearGradient id="g' + uidp + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#3d5170"/><stop offset=".55" stop-color="#121a28"/><stop offset="1" stop-color="#26354d"/></linearGradient>' +
      '<radialGradient id="r' + uidp + '" cx=".5" cy=".5" r=".5">' +
      '<stop offset="0" stop-color="#eef1f4"/><stop offset=".7" stop-color="#a7afb9"/><stop offset="1" stop-color="#5d6570"/></radialGradient>' +
      '<clipPath id="cl' + uidp + '"><path d="' + sh.glass + '"/></clipPath>' +
      '</defs>';
    var groundY = 168 + sh.r + 1;
    g += '<ellipse cx="200" cy="' + groundY + '" rx="185" ry="9" fill="rgba(0,0,0,.35)"/>';
    g += '<path d="' + sh.body + '" fill="url(#b' + uidp + ')" stroke="' + lineCol + '" stroke-width="1.2"/>';
    g += '<path d="' + sh.glass + '" fill="url(#g' + uidp + ')"/>';
    // pantulan kaca
    g += '<path d="' + sh.glass + '" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>';
    sh.pillars.forEach(function (x) {
      g += '<rect x="' + (x - 3) + '" y="50" width="6" height="' + (sh.gy - 48) + '" fill="' + dark + '" clip-path="url(#cl' + uidp + ')" opacity=".95"/>';
    });
    // garis pintu & handle
    sh.pillars.forEach(function (x) {
      g += '<line x1="' + x + '" y1="' + (sh.gy + 2) + '" x2="' + (x + 4) + '" y2="158" stroke="' + lineCol + '" stroke-width="1.4"/>';
      g += '<rect x="' + (x + 12) + '" y="' + (sh.gy + 12) + '" width="16" height="3.5" rx="1.7" fill="' + dark + '"/>';
    });
    // garis karakter samping
    g += '<path d="M' + (sh.wheels[0] - 40) + ',' + (sh.gy + 24) + ' L' + (sh.wheels[1] + 50) + ',' + (sh.gy + 20) + '" stroke="rgba(255,255,255,.28)" stroke-width="1.6" fill="none"/>';
    // lampu
    g += '<path d="M' + sh.head[0] + ',' + sh.head[1] + ' l18,-3 l2,7 l-19,2 z" fill="#fff6d8" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>';
    g += '<rect x="' + (sh.tail[0] - 6) + '" y="' + (sh.tail[1] - 4) + '" width="9" height="12" rx="2" fill="#c81e1e"/>';
    if (sh.grille) g += '<rect x="' + (sh.head[0] - 2) + '" y="' + (sh.head[1] + 8) + '" width="10" height="20" rx="2" fill="#c8ccd2" opacity=".9"/>';
    // bumper bawah
    g += '<path d="M' + (sh.head[0] - 2) + ',158 L' + (sh.head[0] + 26) + ',158" stroke="rgba(0,0,0,.35)" stroke-width="3" stroke-linecap="round"/>';
    // roda
    sh.wheels.forEach(function (x) {
      var r = sh.r;
      g += '<circle cx="' + x + '" cy="168" r="' + r + '" fill="#141820"/>';
      g += '<circle cx="' + x + '" cy="168" r="' + (r * 0.62) + '" fill="url(#r' + uidp + ')"/>';
      for (var i = 0; i < 5; i++) {
        g += '<rect x="' + (x - 2) + '" y="' + (168 - r * 0.58) + '" width="4" height="' + (r * 0.5) + '" rx="2" fill="#4a525d" transform="rotate(' + (i * 72) + ' ' + x + ' 168)"/>';
      }
      g += '<circle cx="' + x + '" cy="168" r="' + (r * 0.17) + '" fill="#2b313a"/>';
    });
    return g;
  }

  var artCache = {};
  NR.art = {
    colorFromName: colorFromName,

    // variant: 0 = studio gelap, 1 = studio terang, 2 = golden hour
    car: function (v, variant) {
      variant = variant || 0;
      var type = v.type || 'MPV';
      var key = [type, v.color, v.brand, variant].join('|');
      if (artCache[key]) return artCache[key];
      var col = colorFromName(v.color);
      var uidp = 'c' + (U.hashString(key) % 100000);
      var bg = '';
      var brand = U.escapeHtml(String(v.brand || 'NUSANTARA').toUpperCase());
      if (variant === 1) {
        bg = '<defs><linearGradient id="bg' + uidp + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8fb"/><stop offset="1" stop-color="#dfe4ec"/></linearGradient></defs>' +
          '<rect width="800" height="500" fill="url(#bg' + uidp + ')"/>' +
          '<ellipse cx="400" cy="470" rx="420" ry="60" fill="#cfd6e1"/>' +
          '<text x="400" y="190" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-weight="800" font-size="120" fill="#0b1f3a" opacity=".05" letter-spacing="8">' + brand + '</text>';
      } else if (variant === 2) {
        bg = '<defs><linearGradient id="bg' + uidp + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2a3a"/><stop offset=".6" stop-color="#7a5636"/><stop offset="1" stop-color="#d7a65a"/></linearGradient></defs>' +
          '<rect width="800" height="500" fill="url(#bg' + uidp + ')"/>' +
          '<circle cx="620" cy="170" r="70" fill="#ffd89a" opacity=".55"/>' +
          '<rect y="420" width="800" height="80" fill="#1d1a22" opacity=".55"/>' +
          '<text x="400" y="190" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-weight="800" font-size="120" fill="#fff" opacity=".07" letter-spacing="8">' + brand + '</text>';
      } else {
        bg = '<defs><radialGradient id="bg' + uidp + '" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#21426f"/><stop offset="1" stop-color="#0a1a31"/></radialGradient></defs>' +
          '<rect width="800" height="500" fill="url(#bg' + uidp + ')"/>' +
          '<ellipse cx="400" cy="475" rx="430" ry="70" fill="#163056"/>' +
          '<rect x="0" y="120" width="800" height="1.5" fill="#c9a24a" opacity=".35"/>' +
          '<text x="400" y="190" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-weight="800" font-size="120" fill="#fff" opacity=".06" letter-spacing="8">' + brand + '</text>';
      }
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">' + bg +
        '<g transform="translate(80,138) scale(1.6)">' + carGroup(type, col, uidp) + '</g></svg>';
      var uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      artCache[key] = uri;
      return uri;
    },

    // Mobil tanpa background (dipakai di hero)
    carOnly: function (type, color) {
      var uidp = 'h' + (U.hashString(type + color) % 100000);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 400 180" width="800" height="360">' +
        carGroup(type, colorFromName(color), uidp) + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },

    city: function (loc) {
      var key = 'city|' + loc.id + '|' + loc.hue + '|' + loc.name;
      if (artCache[key]) return artCache[key];
      var hue = loc.hue || 214;
      var seed = U.hashString(loc.id || loc.name);
      function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
      var c1 = 'hsl(' + hue + ',45%,22%)', c2 = 'hsl(' + ((hue + 345) % 360) + ',55%,44%)';
      var b = '';
      var x = 0;
      while (x < 1200) {
        var w = 40 + rnd() * 70, h = 80 + rnd() * 230;
        b += '<rect x="' + x.toFixed(0) + '" y="' + (600 - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" fill="#0b1f3a" opacity="' + (0.55 + rnd() * 0.35).toFixed(2) + '"/>';
        for (var wy = 600 - h + 14; wy < 580; wy += 22) {
          for (var wx = x + 8; wx < x + w - 10; wx += 14) {
            if (rnd() > 0.55) b += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="6" height="9" fill="#f6d58a" opacity=".55"/>';
          }
        }
        x += w + 4 + rnd() * 10;
      }
      var name = U.escapeHtml(String(loc.name || '').toUpperCase());
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="1200" height="600">' +
        '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
        '<rect width="1200" height="600" fill="url(#s)"/>' +
        '<circle cx="' + (300 + (U.hashString(loc.name) % 600)) + '" cy="210" r="90" fill="#ffe2a8" opacity=".35"/>' +
        '<text x="600" y="250" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-weight="800" font-size="170" fill="#fff" opacity=".08" letter-spacing="10">' + name + '</text>' +
        b + '</svg>';
      var uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      artCache[key] = uri;
      return uri;
    }
  };

  // Foto utama kendaraan (foto asli jika ada, jika tidak → ilustrasi)
  NR.vehicleImage = function (v) { return v.image ? v.image : NR.art.car(v, 0); };
  NR.vehicleGallery = function (v) {
    var list = [];
    if (v.image) list.push(v.image);
    (v.gallery || []).forEach(function (g) { if (g && list.indexOf(g) === -1) list.push(g); });
    if (list.length < 3) {
      [0, 1, 2].forEach(function (i) { if (list.length < 3) list.push(NR.art.car(v, i)); });
    }
    return list;
  };
  NR.locationImage = function (l) { return l.photo ? l.photo : NR.art.city(l); };

  /* -------------------------------------------------------------------
     6. IKON SVG (stroke, 24x24)
     ------------------------------------------------------------------- */
  var P = {
    whatsapp: '<path fill="currentColor" stroke="none" d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-7.01 15.24a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/>',
    pin: '<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    gear: '<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/>',
    fuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M6 8h6"/><path d="M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    car: '<path d="M5 17h14M3 17v-4l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v4"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M3 13h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    facebook: '<path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v4H8v7h4v-7h3l.5-4H12V7.8c0-.5.4-.8.8-.8H15V3Z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
    power: '<path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    map: '<path d="m9 3-6 3v15l6-3 6 3 6-3V3l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    headset: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3ZM3 19a2 2 0 0 0 2 2h1v-6H3Z"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v14H5a2 2 0 0 1-2-2V5"/><circle cx="16" cy="14" r="1.5"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>'
  };
  NR.icon = function (name, cls) {
    var body = P[name] || P.info;
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };

  // Inisialisasi database saat file dimuat
  S.init();
})(window);
