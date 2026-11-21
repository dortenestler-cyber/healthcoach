-- Health Coach · Freigabe für den Server-Zugang (service_role)
-- Neue Supabase-Projekte geben selbst angelegte Tabellen nicht automatisch frei,
-- auch nicht für den Server-Zugang. Die Funktion "watch" braucht ihn, weil die Uhr
-- sich mit dem Uhr-Schlüssel statt mit einem Supabase-Login meldet.
-- Der Server-Zugang wird nur in Edge Functions benutzt, nie im Browser oder auf der Uhr.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
