-- Health Coach · Phase 1: Fundament
-- Tabellen für Einstellungen, Tagebuch, Hitzewallungen und Morgen-Check-in.
-- Jede Tabelle hat Zugriffsschutz pro Konto (Row Level Security):
-- Jede Person sieht und ändert nur ihre eigenen Zeilen.
-- Ausführen: einmal im SQL-Editor von Supabase einfügen und auf "Run" klicken.

-- Einstellungen: eine Zeile pro Person, Inhalt flexibel als JSON
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tagebuch: ein Eintrag pro Tag
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  bleeding smallint not null default 0 check (bleeding between 0 and 4),   -- 0 keine · 1 Schmier · 2 leicht · 3 mittel · 4 stark
  symptoms jsonb not null default '{}'::jsonb,                             -- {"hitze": 2, "nacht": 1} mit 1 leicht · 2 mittel · 3 stark
  influences text[] not null default '{}',                                 -- z. B. {alkohol, koffein, stress, sport}
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Hitzewallungen: jeder Eintrag einzeln, von Handy oder Uhr
create table if not exists public.hot_flashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  source text not null default 'app' check (source in ('app', 'uhr'))
);
create index if not exists hot_flashes_user_at on public.hot_flashes (user_id, at desc);

-- Morgen-Check-in: ein Eintrag pro Tag, Werte 1 niedrig · 2 mittel · 3 gut
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  energy smallint check (energy between 1 and 3),
  sleep smallint check (sleep between 1 and 3),
  mood smallint check (mood between 1 and 3),
  source text not null default 'app' check (source in ('app', 'uhr')),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Zugriffsschutz einschalten
alter table public.settings enable row level security;
alter table public.diary_entries enable row level security;
alter table public.hot_flashes enable row level security;
alter table public.checkins enable row level security;

-- Regeln: nur eigene Zeilen lesen, anlegen, ändern und löschen
do $$
declare t text;
begin
  foreach t in array array['settings', 'diary_entries', 'hot_flashes', 'checkins'] loop
    execute format('drop policy if exists "nur eigene Daten" on public.%I', t);
    execute format(
      'create policy "nur eigene Daten" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;
