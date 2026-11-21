-- Health Coach · Phase 3a: Gesundheit
-- Medikamente und Supplements, Einnahmen, Krankheiten, Verletzungen, Körperwerte.
-- Zugriffsschutz pro Konto wie bei allen Tabellen. Mengen trägt die Nutzerin selbst ein,
-- die App schlägt keine Dosis vor.

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'medikament' check (kind in ('medikament', 'supplement')),
  regular boolean not null default true,        -- regelmäßige Einnahme
  as_needed boolean not null default false,     -- bei Bedarf
  times text[] not null default '{}',           -- Uhrzeiten für regelmäßige Einnahme, z. B. {07:30,21:30}
  amount text,                                  -- selbst eingetragene Menge, wie verordnet
  notes_key text,                               -- Verweis auf die Karte "Worauf achten"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  at timestamptz not null default now(),
  as_needed boolean not null default false,     -- true = Bedarfs-Einnahme
  slot text,                                    -- Uhrzeit der regelmäßigen Einnahme, z. B. 07:30
  day date not null default current_date,
  source text not null default 'app' check (source in ('app', 'uhr'))
);
create index if not exists medication_intakes_user_day on public.medication_intakes (user_id, day desc);

create table if not exists public.illnesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,                           -- z. B. erkaeltung, grippe, migraene oder eigen
  label text not null,
  started_on date not null default current_date,
  ended_on date,
  severity smallint not null default 2 check (severity between 1 and 5),
  fever boolean not null default false,
  below_neck boolean not null default false,    -- Husten, Gliederschmerzen
  note text
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spot text not null,                           -- finger, hand, schulter, ruecken, knie, fuss
  kind text,                                    -- Prellung, Zerrung, Verstauchung, Haut
  cause text,                                   -- Karate, Klettern, Kettlebell, Alltag
  started_on date not null default current_date,
  ended_on date,
  note text
);

create table if not exists public.injury_pain (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  injury_id uuid not null references public.injuries (id) on delete cascade,
  day date not null default current_date,
  pain smallint not null check (pain between 0 and 10),
  primary key (injury_id, day)
);

create table if not exists public.body_measurements (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default current_date,
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 1),
  primary key (user_id, day)
);

do $$
declare t text;
begin
  foreach t in array array['medications', 'medication_intakes', 'illnesses', 'injuries', 'injury_pain', 'body_measurements'] loop
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
