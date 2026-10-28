-- =====================================================================
-- NUSANTARA RENTAL — Setup database Supabase (jalankan SEKALI)
-- Supabase Dashboard → SQL Editor → New query → tempel semua → Run
-- =====================================================================

-- 1) Tabel data website (unit, lokasi, pengaturan, WhatsApp)
create table if not exists public.site_data (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_data enable row level security;

-- Semua pengunjung boleh MEMBACA data website
drop policy if exists "site_data public read" on public.site_data;
create policy "site_data public read"
  on public.site_data for select
  using (true);

-- Hanya admin yang sudah login yang boleh MENGUBAH
drop policy if exists "site_data admin insert" on public.site_data;
create policy "site_data admin insert"
  on public.site_data for insert to authenticated
  with check (true);

drop policy if exists "site_data admin update" on public.site_data;
create policy "site_data admin update"
  on public.site_data for update to authenticated
  using (true) with check (true);

drop policy if exists "site_data admin delete" on public.site_data;
create policy "site_data admin delete"
  on public.site_data for delete to authenticated
  using (true);

-- 2) Bucket penyimpanan foto (publik untuk dilihat)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "foto public read" on storage.objects;
create policy "foto public read"
  on storage.objects for select
  using (bucket_id = 'foto');

drop policy if exists "foto admin upload" on storage.objects;
create policy "foto admin upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'foto');

drop policy if exists "foto admin update" on storage.objects;
create policy "foto admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'foto') with check (bucket_id = 'foto');

drop policy if exists "foto admin delete" on storage.objects;
create policy "foto admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'foto');

-- PENTING (keamanan):
-- Matikan pendaftaran user baru agar hanya akun admin yang Anda buat
-- sendiri yang bisa login:
--   Authentication → Sign In / Providers → matikan "Allow new users to sign up"
