-- Health Coach · Coach-Kosten
-- Speichert pro Antwort den Verbrauch, damit die App die Kosten pro Monat zeigen kann.
-- Ausführen: einmal im SQL-Editor von Supabase einfügen und auf "Run" klicken. Mehrfaches Ausführen schadet nicht.
alter table public.coach_messages add column if not exists input_tokens integer;
alter table public.coach_messages add column if not exists output_tokens integer;
alter table public.coach_messages add column if not exists cost_usd numeric(10, 6);
