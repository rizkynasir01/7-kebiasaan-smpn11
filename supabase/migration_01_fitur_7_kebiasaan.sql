-- =========================================================
-- MIGRASI 01
-- Pengembangan 7 Kebiasaan Anak Indonesia Hebat
-- UPTD SMPN 11 SINJAI
-- =========================================================

-- =========================================================
-- 1. TABEL KELAS
-- =========================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. TAMBAHAN DATA PENGGUNA / PROFIL
-- =========================================================

alter table public.profiles
  add column if not exists assignment text;

-- Role baru:
-- admin
-- wali_kelas
-- guru_wali

-- =========================================================
-- 3. TAMBAHAN DATA PADA DAILY RECORDS
-- =========================================================

-- Jam bangun
alter table public.daily_records
  add column if not exists jam_bangun time;

-- Jam tidur
alter table public.daily_records
  add column if not exists jam_tidur time;

-- Durasi olahraga dalam menit
alter table public.daily_records
  add column if not exists durasi_olahraga integer;

-- Durasi belajar dalam menit
alter table public.daily_records
  add column if not exists durasi_belajar integer;

-- =========================================================
-- 4. CATATAN ORANG TUA / WALI
-- =========================================================

alter table public.daily_records
  add column if not exists catatan_bangun_pagi text;

alter table public.daily_records
  add column if not exists catatan_beribadah text;

alter table public.daily_records
  add column if not exists catatan_berolahraga text;

alter table public.daily_records
  add column if not exists catatan_makan_sehat text;

alter table public.daily_records
  add column if not exists catatan_gemar_belajar text;

alter table public.daily_records
  add column if not exists catatan_bermasyarakat text;

alter table public.daily_records
  add column if not exists catatan_tidur_cepat text;

-- =========================================================
-- 5. VALIDASI DURASI
-- =========================================================

alter table public.daily_records
  drop constraint if exists daily_records_durasi_olahraga_check;

alter table public.daily_records
  add constraint daily_records_durasi_olahraga_check
  check (
    durasi_olahraga is null
    or durasi_olahraga >= 0
  );

alter table public.daily_records
  drop constraint if exists daily_records_durasi_belajar_check;

alter table public.daily_records
  add constraint daily_records_durasi_belajar_check
  check (
    durasi_belajar is null
    or durasi_belajar >= 0
  );
-- =========================================================
-- 5B. PERUBAHAN ROLE PENGGUNA
-- =========================================================

-- Hapus constraint role lama
alter table public.profiles
  drop constraint if exists profiles_role_check;

-- Ubah data role lama "guru" menjadi "guru_wali"
update public.profiles
set role = 'guru_wali'
where role = 'guru';

-- Tambahkan constraint role baru
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'wali_kelas', 'guru_wali'));
  
-- =========================================================
-- 6. RLS UNTUK TABEL CLASSES
-- =========================================================

alter table public.classes enable row level security;

-- Admin dapat melihat kelas
drop policy if exists "admin can read classes"
on public.classes;

create policy "admin can read classes"
on public.classes
for select
to authenticated
using (
  public.current_role() = 'admin'
);

-- Admin dapat menambah kelas
drop policy if exists "admin can insert classes"
on public.classes;

create policy "admin can insert classes"
on public.classes
for insert
to authenticated
with check (
  public.current_role() = 'admin'
);

-- Admin dapat mengubah kelas
drop policy if exists "admin can update classes"
on public.classes;

create policy "admin can update classes"
on public.classes
for update
to authenticated
using (
  public.current_role() = 'admin'
)
with check (
  public.current_role() = 'admin'
);

-- Admin dapat menghapus kelas
drop policy if exists "admin can delete classes"
on public.classes;

create policy "admin can delete classes"
on public.classes
for delete
to authenticated
using (
  public.current_role() = 'admin'
);

-- =========================================================
-- 7. IZIN AKSES TABEL CLASSES
-- =========================================================

grant select, insert, update, delete
on public.classes
to authenticated;

-- =========================================================
-- SELESAI
-- =========================================================