-- Health Coach · Phase 3b: Training
-- Geplante Einheiten, Kettlebell-Pläne und Sätze, Boulder, Karate-Prüfungsliste.
-- Zugriffsschutz pro Konto wie bei allen Tabellen.

-- Geplante Einheiten im Kalender
create table if not exists public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  sport text not null check (sport in ('karate', 'kettlebell', 'klettern', 'ausdauer', 'sonstiges')),
  time text,                                   -- z. B. 19:00
  source text not null default 'eigen' check (source in ('vorlage', 'eigen')),
  status text not null default 'geplant' check (status in ('geplant', 'erledigt', 'ausgelassen')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, day, sport, source)
);
create index if not exists planned_sessions_user_day on public.planned_sessions (user_id, day);

-- Kettlebell-Pläne
create table if not exists public.kb_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  goal text,
  weeks smallint not null default 8 check (weeks between 1 and 52),
  per_week smallint not null default 2 check (per_week between 1 and 7),
  step_kg smallint not null default 1,          -- Steigerung pro Schritt
  step_every_weeks smallint not null default 2, -- alle wie viele Wochen steigern
  start_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kb_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.kb_plans (id) on delete cascade,
  pos smallint not null default 0,
  exercise text not null,
  sets smallint not null default 3,
  reps smallint not null default 10,
  weight_kg smallint not null default 0 check (weight_kg between 0 and 20), -- 0 = eigenes Körpergewicht
  per_side boolean not null default false
);

-- Erfasste Sätze
create table if not exists public.kb_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid references public.kb_plans (id) on delete set null,
  day date not null,
  exercise text not null,
  set_no smallint not null,
  reps smallint not null,
  weight_kg smallint not null,
  target_reps smallint,
  target_kg smallint,
  created_at timestamptz not null default now()
);
create index if not exists kb_sets_user_day on public.kb_sets (user_id, day desc);

-- Boulder (Fontainebleau-Skala)
create table if not exists public.climbs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  grade text not null,                          -- 4, 4+, 5, 5+, 6A, 6A+, 6B
  result text not null check (result in ('flash', 'top', 'versuch')),
  created_at timestamptz not null default now()
);
create index if not exists climbs_user_day on public.climbs (user_id, day desc);

-- Eigene Liste für die Prüfung zum 5. Kyu
create table if not exists public.karate_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  category text not null default 'Kihon' check (category in ('Kihon', 'Kata', 'Kumite', 'Sonstiges')),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['planned_sessions', 'kb_plans', 'kb_plan_items', 'kb_sets', 'climbs', 'karate_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "nur eigene Daten" on public.%I', t);
    execute format(
      'create policy "nur eigene Daten" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
