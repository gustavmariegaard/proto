-- ciircle trin 4: "Del som moment" med eget udseende (tekst, placering, formatering), og flicks kan kun deles som moment eller besked.
-- Kør trin3-opsaetning.sql først, hvis du ikke allerede har gjort det.
-- Kopiér HELE filen ind i Supabase → SQL Editor → New query, og tryk Run. Den kan køres flere gange uden skade.

-- Trin 4: "Del som moment" med eget udseende (formatering, placering og tekst henover),
-- og flicks kan ikke længere deles som opslag (kun som moment eller besked).

-- ============================================================
-- Moments: opslagets udseende og tekster gemmes som ét lille JSON-objekt
-- ============================================================
alter table public.moments add column if not exists layout jsonb;
alter table public.moments drop constraint if exists moments_layout_size;
alter table public.moments add constraint moments_layout_size check (layout is null or octet_length(layout::text) <= 8000);

-- Viseren skal kende udseendet (kolonnen tilføjes sidst i viewet)
create or replace view public.moment_cards with (security_invoker = true) as
select
  m.id, m.author_id, m.page_id, m.media_path, m.media_type, m.post_id, m.text, m.created_at, m.expires_at,
  a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  pg.handle as page_handle, pg.name as page_name, pg.avatar_path as page_avatar_path,
  exists (select 1 from moment_views v where v.moment_id = m.id and v.user_id = auth.uid()) as seen,
  exists (select 1 from moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()) as liked,
  case when m.author_id = auth.uid() then (select count(*) from moment_views v where v.moment_id = m.id and v.user_id <> m.author_id) end as views,
  m.layout
from moments m
join profiles a on a.id = m.author_id
left join pages pg on pg.id = m.page_id;
grant select on public.moment_cards to authenticated;
revoke all on public.moment_cards from anon;

-- ============================================================
-- Deling: flicks kan ikke deles som opslag (de havner aldrig i dit gitter)
-- ============================================================
create or replace function public.check_shared_post() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shared_post_id is not null then
    if not can_see_post(new.author_id, new.shared_post_id) then
      raise exception 'Opslaget kan ikke deles' using errcode = '42501';
    end if;
    if (select kind from posts where id = new.shared_post_id) = 'flick' then
      raise exception 'Flicks kan kun deles som moment eller besked' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
