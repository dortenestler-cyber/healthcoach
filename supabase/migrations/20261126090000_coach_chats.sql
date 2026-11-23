-- Health Coach · Coach-Chats
-- Fasst die Nachrichten des Coachs zu Chats mit Titel zusammen, damit die App eine Verlaufsliste zeigen kann.
-- Bestehende Nachrichten kommen in einen Chat „Frühere Fragen“. Mehrfaches Ausführen schadet nicht.
create table if not exists public.coach_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Neuer Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coach_chats_user_updated on public.coach_chats (user_id, updated_at desc);

alter table public.coach_chats enable row level security;
drop policy if exists "nur eigene Daten" on public.coach_chats;
create policy "nur eigene Daten" on public.coach_chats for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.coach_chats to authenticated;
revoke all on public.coach_chats from anon;

-- Chat löschen löscht seine Nachrichten mit
alter table public.coach_messages add column if not exists chat_id uuid references public.coach_chats (id) on delete cascade;
create index if not exists coach_messages_chat_created on public.coach_messages (chat_id, created_at);

-- Bisherige Nachrichten ohne Chat: ein Chat „Frühere Fragen“ pro Konto
with neu as (
  insert into public.coach_chats (user_id, title, created_at, updated_at)
  select user_id, 'Frühere Fragen', min(created_at), max(created_at)
  from public.coach_messages where chat_id is null group by user_id
  returning id, user_id
)
update public.coach_messages m set chat_id = neu.id from neu where m.user_id = neu.user_id and m.chat_id is null;
