==========================================================================
 NUSANTARA RENTAL — Website Rental Mobil (Standalone Prototype)
 "Temukan Mobil Pilihanmu, Jelajahi Indonesia."
==========================================================================

Website katalog rental mobil untuk Jakarta, Bandung, Jogja, dan Surabaya.
Dibangun dengan HTML5 + CSS3 + Vanilla JavaScript.

Dua mode penyimpanan:
  - MODE ONLINE (disarankan): data & foto disimpan di Supabase (gratis).
    Perubahan di Admin langsung tampil untuk SEMUA pengunjung website.
    Lihat bagian "0. SETUP MODE ONLINE" di bawah.
  - MODE LOKAL: bila js/supabase-config.js dibiarkan kosong. Data hanya
    tersimpan di LocalStorage browser yang dipakai (tidak online).


0. SETUP MODE ONLINE (SUPABASE + GITHUB PAGES) — GRATIS
-------------------------------------------------------
A. Buat project Supabase
   1. Buka https://supabase.com → Start your project → daftar (bisa
      pakai akun GitHub). Paket Free tidak perlu kartu kredit.
   2. New project → isi nama (mis. nusantara-rental), buat Database
      Password (simpan baik-baik), Region: Southeast Asia (Singapore).
      Tunggu ±2 menit sampai project siap.

B. Buat tabel & tempat foto
   3. Menu SQL Editor → New query → buka file "supabase-setup.sql",
      salin SELURUH isinya, tempel → klik Run. Harus muncul "Success".

C. Buat akun admin
   4. Menu Authentication → Users → Add user → Create new user.
      Isi email & password admin, centang "Auto Confirm User" → Create.
   5. Authentication → Sign In / Providers (atau Settings) → MATIKAN
      "Allow new users to sign up". (Penting: agar orang lain tidak bisa
      membuat akun dan mengubah website.)

D. Hubungkan website
   6. Project Settings → API Keys / Data API. Salin:
        - Project URL                (https://xxxx.supabase.co)
        - anon public key  ATAU  Publishable key (sb_publishable_...)
      JANGAN pakai "service_role" / "secret key".
   7. Buka file js/supabase-config.js dengan Notepad, isi url & anonKey,
      simpan.

E. Upload ke GitHub Pages
   8. Upload seluruh isi folder nusantara-rental ke repository GitHub.
   9. Repository → Settings → Pages → Source: Deploy from a branch →
      Branch: main, folder / (root) → Save. Setelah ±1 menit website
      online di https://USERNAME.github.io/NAMA-REPO/
  10. Buka https://USERNAME.github.io/NAMA-REPO/admin.html → login
      memakai EMAIL & password admin dari langkah 4.
      Login pertama: database masih kosong, jadi data di browser itu
      otomatis diunggah sebagai data awal website.

F. Memindahkan data lama (yang sudah diedit di komputer)
   - Buka admin.html LAMA (versi file di komputer) → Backup & Restore →
     Export Data.
   - Buka admin.html ONLINE → login → Backup & Restore → Import →
     Restore Data. Foto upload lama (Base64) otomatis dipindahkan ke
     penyimpanan foto Supabase.

Setelah setup:
   - Ganti foto/harga/WhatsApp di Admin → klik Simpan → status di pojok
     kanan atas berubah "Tersimpan online" → pengunjung cukup refresh
     website untuk melihat perubahan. TIDAK perlu upload ulang ke GitHub.
   - Upload ulang ke GitHub hanya bila Anda mengubah file kode
     (HTML/CSS/JS) atau menambah file di folder assets/.

Batas paket Free Supabase (lebih dari cukup untuk website ini):
   database 500 MB, penyimpanan foto 1 GB, ±5 GB transfer/bulan.
   Project Free dapat di-"pause" otomatis bila tidak ada aktivitas
   selama 7 hari. Jika itu terjadi, buka dashboard Supabase dan klik
   "Restore project". Selama di-pause, website menampilkan data
   terakhir yang tersimpan di browser pengunjung (atau data contoh).


STRUKTUR FILE
-------------
nusantara-rental/
  index.html        -> Website customer
  admin.html        -> Halaman Admin
  css/style.css     -> Tampilan website
  css/admin.css     -> Tampilan admin
  js/data.js        -> Data default + database LocalStorage + utilitas
  js/app.js         -> Logika website (search, filter, detail, WhatsApp)
  js/admin.js       -> Logika admin (login, CRUD, settings, backup)
  js/cloud.js       -> Sinkronisasi online (Supabase: data, foto, login)
  js/supabase-config.js -> ISI URL & key Supabase di sini
  supabase-setup.sql    -> Script pembuatan tabel & bucket foto
  assets/logo.png   -> Logo
  assets/cars/      -> Tempat menyimpan foto kendaraan asli
  README.txt


1. CARA MENJALANKAN WEBSITE
---------------------------
- Buka folder "nusantara-rental".
- Double-click file "index.html". Website langsung terbuka di browser.
- Disarankan memakai Google Chrome / Microsoft Edge versi terbaru.
- Internet hanya dipakai untuk font Manrope (opsional). Tanpa internet,
  website tetap berjalan memakai font bawaan sistem.

  Saat pertama kali dibuka, website otomatis membuat 16 data kendaraan
  contoh (4 per kota) di LocalStorage.


2. CARA MEMBUKA ADMIN
---------------------
- Double-click file "admin.html" (di folder yang sama), atau
- Dari website, ketik admin.html di akhir alamat browser.
- Tombol "Lihat Website" di admin membuka index.html.

  PENTING: buka index.html dan admin.html dengan browser yang SAMA,
  karena data LocalStorage tersimpan per browser.


3. USERNAME & PASSWORD ADMIN
----------------------------
  MODE ONLINE: login memakai email & password akun admin yang dibuat di
  Supabase (langkah 0.C). Password dapat diganti di Admin > Website
  Settings > Keamanan Admin. Login diperiksa oleh server Supabase.

  MODE LOKAL (tanpa Supabase):
  Username : admin
  Password : admin123
  CATATAN: login mode lokal hanya autentikasi frontend untuk prototype.


4. CARA MENAMBAH KENDARAAN
--------------------------
- Admin > Unit Kendaraan > tombol "Tambah Unit".
- Isi Nama Mobil, Brand, Tahun, Lokasi, Tipe, Harga per Hari (wajib),
  lalu spesifikasi, fasilitas, deskripsi, dan foto (opsional).
- Foto: pilih tab "URL Gambar" (link internet / assets/cars/nama.jpg)
  atau tab "Upload" (foto dari komputer, otomatis dikompres).
- Klik "Tambah Unit". Muncul notifikasi "Unit berhasil ditambahkan."
- Tombol lain per unit: Preview, Edit, Duplikat, Aktif/Nonaktif, Hapus.


5. CARA MENGUBAH HARGA
----------------------
- Admin > Unit Kendaraan > klik ikon Edit (pensil) pada unit.
- Ubah Harga per Hari / Minggu / Bulan. Cukup ketik angka,
  contoh 1250000 -> website menampilkan "Rp 1.250.000".
- Klik "Simpan Perubahan".
- Lokasi unit juga dapat dipindah dari form yang sama (kolom Lokasi).


6. CARA MENGUBAH NOMOR WHATSAPP
-------------------------------
- Admin > WhatsApp.
- Isi "WhatsApp Utama" (format 62..., contoh 6282211116847;
  awalan 08... otomatis diubah ke 628...).
- Isi nomor per lokasi bila tiap kota punya admin sendiri.
  Jika dikosongkan, lokasi memakai WhatsApp Utama.
- Klik "Simpan Pengaturan". Gunakan tombol "Tes" untuk mencoba nomor.


7. CARA BACKUP DATABASE
-----------------------
- Admin > Backup & Restore > "Export Data".
- File "nusantara-rental-backup.json" akan terunduh.
- Simpan file ini di tempat aman (Google Drive, flashdisk, dll).
  Lakukan backup rutin — membersihkan data browser akan menghapus
  LocalStorage.


8. CARA RESTORE DATABASE
------------------------
- Admin > Backup & Restore > bagian "Import Data".
- Pilih / seret file "nusantara-rental-backup.json".
- Periksa ringkasan (jumlah unit & lokasi), lalu klik "Restore Data"
  dan konfirmasi. Data saat ini akan diganti dengan isi backup.
- "Reset Data" mengembalikan website ke data contoh awal.


FITUR LAIN
----------
- Lokasi baru (Bali, Semarang, Malang, Medan, Makassar, dst.) dapat
  ditambahkan di Admin > Lokasi; otomatis muncul di navbar, pencarian,
  footer, dan halaman lokasi (index.html#lokasi/nama-kota).
- Website Settings: nama website, tagline, logo, foto hero, email,
  alamat, jam operasional, Instagram, Facebook, TikTok.
- Perubahan di admin langsung tersinkron ke tab website yang terbuka.


CATATAN MODE LOKAL
------------------
- LocalStorage berkapasitas sekitar 5 MB per browser. Foto upload
  disimpan sebagai Base64 dan memakan kuota; untuk banyak foto,
  gunakan URL gambar atau file di folder assets/cars/.
- Data tidak tersinkron antar perangkat/browser. Aktifkan MODE ONLINE
  (bagian 0) agar perubahan admin tampil untuk semua pengunjung.

© 2026 Nusantara Rental. All Rights Reserved.
