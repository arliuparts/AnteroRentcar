/* =====================================================================
   KONFIGURASI SUPABASE (database online gratis)
   ---------------------------------------------------------------------
   Isi 2 nilai di bawah dari Supabase:
     Project Settings → API (atau "Data API" / "API Keys")
       - Project URL          → url
       - anon public key      → anonKey
         (atau "Publishable key" yang diawali sb_publishable_...)

   Kunci "anon / publishable" MEMANG aman ditaruh di website publik.
   JANGAN PERNAH menaruh "service_role" / "secret key" di sini.

   Jika dibiarkan kosong, website berjalan dalam mode lokal (LocalStorage)
   seperti sebelumnya — perubahan admin tidak tampil online.
   ===================================================================== */
window.NR_SUPABASE = {
  url: 'https://tfnztimlofkzmctfeglb.supabase.co',      // contoh: 'https://abcdefghijklmn.supabase.co'
  anonKey: 'sb_publishable_wWB5eaPJdT_s0dc4RwNKxg_s6SwAHuf',  // contoh: 'eyJhbGciOi...'  atau  'sb_publishable_...'
  bucket: 'foto',
  table: 'site_data'
};
