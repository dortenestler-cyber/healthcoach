-- Gewohnheiten (früher „Einflüsse“): freiwillige Details je Gewohnheit, z. B. Sauna
-- {"sauna": {"gaenge": "3", "wann": "abends", "kaeltebecken": true}}
-- Läuft nach dem Merge automatisch (Workflow „Supabase-Migrationen ausführen“). Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), die neue Spalte fällt darunter.
-- Liste, Reihenfolge und eigene Gewohnheiten stehen in settings.data.habits, dafür ist keine Änderung nötig.
alter table public.diary_entries add column if not exists habit_details jsonb not null default '{}'::jsonb;
