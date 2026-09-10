-- ============================================================
-- MIGRATION 02
-- Perubahan role akun menjadi:
-- admin, wali_kelas, guru_wali
-- ============================================================

-- Hapus constraint role lama
alter table public.profiles
drop constraint if exists profiles_role_check;

-- Tambahkan constraint role baru
alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'wali_kelas', 'guru_wali'));

-- ============================================================
-- Tambahan kolom penugasan
-- ============================================================

alter table public.profiles
add column if not exists assignment text;

-- ============================================================
-- Tabel kelas
-- ============================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Aktifkan RLS
-- ============================================================

alter table public.classes enable row level security;

-- ============================================================
-- Admin dapat membaca kelas
-- ============================================================

drop policy if exists "admin can read classes"
on public.classes;

create policy "admin can read classes"
on public.classes
for select
to authenticated
using (
  public.current_role() = 'admin'
);

-- ============================================================
-- Admin dapat menambah kelas
-- ============================================================

drop policy if exists "admin can insert classes"
on public.classes;

create policy "admin can insert classes"
on public.classes
for insert
to authenticated
with check (
  public.current_role() = 'admin'
);

-- ============================================================
-- Admin dapat mengubah kelas
-- ============================================================

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

-- ============================================================
-- Admin dapat menghapus kelas
-- ============================================================

drop policy if exists "admin can delete classes"
on public.classes;

create policy "admin can delete classes"
on public.classes
for delete
to authenticated
using (
  public.current_role() = 'admin'
);

-- ============================================================
-- Hak akses tabel classes
-- ============================================================

grant select, insert, update, delete
on public.classes
to authenticated;

-- ============================================================
-- SELESAI
-- ============================================================