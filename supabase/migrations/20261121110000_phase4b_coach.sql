-- Health Coach · Phase 4b: Coach
-- Verlauf des Coach-Chats. Zugriffsschutz pro Konto wie bei allen Tabellen.

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_user_created on public.coach_messages (user_id, created_at desc);

alter table public.coach_messages enable row level security;
drop policy if exists "nur eigene Daten" on public.coach_messages;
create policy "nur eigene Daten" on public.coach_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.coach_messages to authenticated;
revoke all on public.coach_messages from anon;
