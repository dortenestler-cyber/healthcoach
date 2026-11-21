-- Health Coach · Phase 5: Uhr
-- Uhr-Schlüssel: Die Uhr meldet sich mit einem eigenen Schlüssel an, nicht mit dem Passwort.
-- Gespeichert wird nur ein Hash des Schlüssels.

create table if not exists public.watch_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Fenix',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.watch_tokens enable row level security;
drop policy if exists "nur eigene Daten" on public.watch_tokens;
create policy "nur eigene Daten" on public.watch_tokens for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.watch_tokens to authenticated;
revoke all on public.watch_tokens from anon;
