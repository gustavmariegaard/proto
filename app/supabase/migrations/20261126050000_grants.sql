-- Adgang for loggede ind brugere til tabeller og funktioner.
-- Hvad de faktisk må se og ændre, styres af reglerne (RLS) på hver tabel.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
