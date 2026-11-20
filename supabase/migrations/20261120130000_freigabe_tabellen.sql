-- Health Coach · Freigabe der Tabellen für angemeldete Nutzerinnen
-- Neue Supabase-Projekte geben selbst angelegte Tabellen nicht automatisch frei.
-- Ohne diese Freigabe lehnt die Datenbank Lesen und Speichern aus der App ab.
-- Der Zugriffsschutz pro Konto (Row Level Security) bleibt bestehen:
-- Jede Person sieht weiterhin nur ihre eigenen Zeilen.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.settings,
  public.diary_entries,
  public.hot_flashes,
  public.checkins
to authenticated;

-- Nicht angemeldete Besucher bekommen keinen Zugriff
revoke all on
  public.settings,
  public.diary_entries,
  public.hot_flashes,
  public.checkins
from anon;
