-- Health Coach · Phase 2: Garmin-Daten
-- Tageswerte und Aktivitäten aus der Garmin Personal API.
-- Zugriffsschutz pro Konto wie bei allen Tabellen.

-- Tageswerte: eine Zeile pro Tag
create table if not exists public.garmin_daily (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  sleep_seconds integer,          -- Schlafdauer
  sleep_score smallint,           -- Schlafwert 0–100
  hrv_last_night smallint,        -- HRV letzte Nacht in ms
  hrv_weekly_avg smallint,        -- HRV Wochenschnitt in ms
  hrv_status text,                -- z. B. BALANCED, UNBALANCED, LOW
  resting_hr smallint,            -- Ruhepuls
  stress_avg smallint,            -- Stress Durchschnitt 0–100
  bb_max smallint,                -- Body Battery Höchstwert
  bb_min smallint,                -- Body Battery Tiefstwert
  bb_charged smallint,            -- Body Battery aufgeladen
  bb_drained smallint,            -- Body Battery verbraucht
  steps integer,
  intensity_minutes smallint,     -- moderat + 2 × intensiv
  synced_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Aktivitäten: eine Zeile pro Einheit
create table if not exists public.garmin_activities (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id bigint not null,
  type_key text,                  -- z. B. running, hiking, cycling, walking, bouldering, strength_training
  name text,
  start_local timestamp,          -- Startzeit in Ortszeit
  duration_s integer,
  distance_m real,
  avg_hr smallint,
  max_hr smallint,
  training_load real,
  synced_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);
create index if not exists garmin_activities_user_start on public.garmin_activities (user_id, start_local desc);

alter table public.garmin_daily enable row level security;
alter table public.garmin_activities enable row level security;

do $$
declare t text;
begin
  foreach t in array array['garmin_daily', 'garmin_activities'] loop
    execute format('drop policy if exists "nur eigene Daten" on public.%I', t);
    execute format(
      'create policy "nur eigene Daten" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- Freigabe für angemeldete Nutzerinnen, keine für nicht angemeldete
grant select, insert, update, delete on public.garmin_daily, public.garmin_activities to authenticated;
revoke all on public.garmin_daily, public.garmin_activities from anon;
