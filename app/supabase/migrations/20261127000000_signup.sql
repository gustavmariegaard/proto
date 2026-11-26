-- Rigtig tilmelding: navn, brugernavn og fødselsdato vælges ved oprettelsen.
-- Profilen oprettes af databasen i samme øjeblik som kontoen (trigger på auth.users),
-- så der aldrig findes en konto uden profil.

-- Fødselsdato er privat: kun brugeren selv kan læse den
create table if not exists public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birthdate date not null
);
alter table public.profile_private enable row level security;
drop policy if exists "private: egen" on public.profile_private;
create policy "private: egen" on public.profile_private for select to authenticated using (id = auth.uid());
revoke all on public.profile_private from anon;
grant select on public.profile_private to authenticated;

-- Mindstealder (Danmark: digitalt samtykke fra 13 år)
create or replace function public.min_age() returns int language sql immutable as $$ select 13 $$;

-- Er brugernavnet ledigt? Må kaldes før login (afslører kun ja/nej).
create or replace function public.username_available(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select lower(u) ~ '^[a-z0-9._æøå]{2,30}$' and not exists (select 1 from profiles where username = lower(u));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- Når en konto oprettes med navn, brugernavn og fødselsdato, laves profilen med det samme.
-- Fejler noget (fx brugernavn taget eller for ung), fejler tilmeldingen også.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  bd date;
begin
  if m ? 'username' then
    bd := (m->>'birthdate')::date;
    if bd is null or bd > (current_date - make_interval(years => min_age())) or bd < date '1900-01-01' then
      raise exception 'ugyldig fødselsdato' using errcode = '22023';
    end if;
    insert into profiles (id, username, name) values (new.id, lower(m->>'username'), trim(m->>'name'));
    insert into profile_private (id, birthdate) values (new.id, bd);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
