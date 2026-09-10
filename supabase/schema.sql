-- 7 Kebiasaan Anak Indonesia Hebat — UPTD SMPN 11 SINJAI
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('guru','admin')),
  class_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_class text not null,
  parent_name text not null,
  record_date date not null,
  bangun_pagi boolean not null default false,
  beribadah boolean not null default false,
  berolahraga boolean not null default false,
  makan_sehat boolean not null default false,
  gemar_belajar boolean not null default false,
  bermasyarakat boolean not null default false,
  tidur_cepat boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_records_unique_student_date unique(student_name, student_class, record_date)
);

alter table public.profiles enable row level security;
alter table public.daily_records enable row level security;

-- Helper checks
create or replace function public.current_role() returns text
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

create or replace function public.current_class() returns text
language sql stable security definer set search_path=public
as $$ select class_name from public.profiles where id=auth.uid() $$;

-- Public parent intake: insert records without login.
-- Read access is NOT public; only authenticated staff can read.
create policy "public can insert daily records"
on public.daily_records for insert to anon, authenticated
with check (true);

create policy "authenticated staff can read daily records"
on public.daily_records for select to authenticated
using (public.current_role() in ('guru','admin') and (public.current_role()='admin' or student_class=public.current_class()));

create policy "authenticated staff can delete daily records"
on public.daily_records for delete to authenticated
using (public.current_role() in ('guru','admin') and (public.current_role()='admin' or student_class=public.current_class()));

create policy "authenticated staff can update daily records"
on public.daily_records for update to authenticated
using (public.current_role() in ('guru','admin') and (public.current_role()='admin' or student_class=public.current_class()))
with check (public.current_role() in ('guru','admin') and (public.current_role()='admin' or student_class=public.current_class()));

create policy "staff can read profiles"
on public.profiles for select to authenticated
using (public.current_role()='admin' or id=auth.uid());

create policy "admin can insert profiles"
on public.profiles for insert to authenticated
with check (public.current_role()='admin');

-- First admin bootstrap: create the Auth user from Supabase Dashboard, then insert its profile here.
-- Replace values below and run once.
-- insert into public.profiles(id,username,display_name,role) values('YOUR_AUTH_USER_UUID','admin','Administrator','admin');

-- Allow anon upsert on daily_records for the parent form.
grant insert on public.daily_records to anon;
grant select, insert, update, delete on public.daily_records to authenticated;
grant select on public.profiles to authenticated;
