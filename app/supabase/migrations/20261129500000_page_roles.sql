-- Sider: roller som på Facebook (Admin, Redaktør, Moderator), og børn under forældrekontrol kan ikke oprette eller være med til at styre sider.
--   Admin:     alt (indstillinger, roller, slet side, opslag)
--   Redaktør:  skriv, ret og slet sidens opslag, ret sidens oplysninger
--   Moderator: brug appen som siden og se følgere, men ikke skrive opslag eller ændre siden

alter table public.page_admins add column if not exists role text not null default 'admin';
alter table public.page_admins add column if not exists created_at timestamptz not null default now();
alter table public.page_admins drop constraint if exists page_admins_role_check;
alter table public.page_admins add constraint page_admins_role_check check (role in ('admin', 'redaktoer', 'moderator'));

create or replace function public.page_role(p uuid, u uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from page_admins where page_id = p and user_id = u;
$$;

create or replace function public.can_post_as_page(p uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'redaktoer') from page_admins where page_id = p and user_id = u), false);
$$;

-- Er brugeren under forældrekontrol (tilknyttet en forælder)?
create or replace function public.is_under_guardian(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from guardian_links where child_id = u and status = 'aktiv');
$$;

grant execute on function public.page_role(uuid, uuid), public.can_post_as_page(uuid, uuid), public.is_under_guardian(uuid) to authenticated;

-- ============================================================
-- Rettigheder
-- ============================================================
-- Skrive som siden: kun Admin og Redaktør
drop policy if exists "posts: opret" on public.posts;
create policy "posts: opret" on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id, auth.uid()))
    and (page_id is null or public.can_post_as_page(page_id, auth.uid()))
    and (event_id is null or public.can_see_event(event_id, auth.uid()))
  );
-- Admin og Redaktør kan rette og slette alle sidens opslag (også andres)
drop policy if exists "posts: side ret" on public.posts;
create policy "posts: side ret" on public.posts for update to authenticated
  using (page_id is not null and public.can_post_as_page(page_id, auth.uid()))
  with check (page_id is not null and public.can_post_as_page(page_id, auth.uid()));
drop policy if exists "posts: side slet" on public.posts;
create policy "posts: side slet" on public.posts for delete to authenticated
  using (page_id is not null and public.can_post_as_page(page_id, auth.uid()));

-- Sidens oplysninger: Admin og Redaktør. Slet siden: kun Admin.
drop policy if exists "pages: ret" on public.pages;
create policy "pages: ret" on public.pages for update to authenticated using (public.can_post_as_page(id, auth.uid()));
drop policy if exists "pages: slet" on public.pages;
create policy "pages: slet" on public.pages for delete to authenticated using (public.page_role(id, auth.uid()) = 'admin');

-- Roller: kun Admin kan tilføje, ændre og fjerne. Man kan selv forlade siden.
drop policy if exists "page_admins: tilføj" on public.page_admins;
create policy "page_admins: tilføj" on public.page_admins for insert to authenticated with check (public.page_role(page_id, auth.uid()) = 'admin');
drop policy if exists "page_admins: ret" on public.page_admins;
create policy "page_admins: ret" on public.page_admins for update to authenticated
  using (public.page_role(page_id, auth.uid()) = 'admin') with check (public.page_role(page_id, auth.uid()) = 'admin');
drop policy if exists "page_admins: fjern" on public.page_admins;
create policy "page_admins: fjern" on public.page_admins for delete to authenticated
  using (public.page_role(page_id, auth.uid()) = 'admin' or user_id = auth.uid());
grant update on public.page_admins to authenticated;

-- Siden skal altid have mindst én Admin
create or replace function public.keep_last_page_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Hele siden slettes: så må rollerne forsvinde
  if not exists (select 1 from pages where id = old.page_id) then
    return coalesce(new, old);
  end if;
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from page_admins where page_id = old.page_id and role = 'admin' and user_id <> old.user_id) then
    raise exception 'Siden skal have mindst én administrator' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists page_admins_keep_last on public.page_admins;
create trigger page_admins_keep_last before update or delete on public.page_admins for each row execute function public.keep_last_page_admin();

-- ============================================================
-- Forældrekontrol: børn kan ikke oprette sider eller få en rolle på en side
-- ============================================================
create or replace function public.pages_no_children() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_under_guardian(new.created_by) then
    raise exception 'Du kan ikke oprette en side, mens du er under forældrekontrol' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists pages_no_children on public.pages;
create trigger pages_no_children before insert on public.pages for each row execute function public.pages_no_children();

create or replace function public.page_admins_no_children() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_under_guardian(new.user_id) then
    raise exception 'Personen er under forældrekontrol og kan ikke få en rolle på en side' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists page_admins_no_children on public.page_admins;
create trigger page_admins_no_children before insert on public.page_admins for each row execute function public.page_admins_no_children();

-- ============================================================
-- Notifikation: "X tilføjede dig som redaktør på Siden"
-- ============================================================
alter table public.notifications add column if not exists page_id uuid references public.pages (id) on delete cascade;
alter table public.notifications add column if not exists detail text check (detail is null or char_length(detail) <= 40);
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'like', 'comment', 'note', 'message', 'group_request', 'event_invite', 'mention', 'mention_bio', 'page_role'));

-- Tilføj en person til siden med en rolle (kun Admin). Returnerer personens id.
create or replace function public.add_page_member(page uuid, username text, role text default 'redaktoer')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if role not in ('admin', 'redaktoer', 'moderator') then
    raise exception 'Ukendt rolle' using errcode = '22023';
  end if;
  if page_role(page, me) is distinct from 'admin' then
    raise exception 'Kun administratorer kan tilføje personer' using errcode = '42501';
  end if;
  select id into target from profiles p where lower(p.username::text) = lower(ltrim(add_page_member.username, '@'));
  if target is null then
    raise exception 'Personen findes ikke' using errcode = 'P0002';
  end if;
  if target = me then
    raise exception 'Du er allerede med på siden' using errcode = '23505';
  end if;
  if is_blocked(me, target) then
    raise exception 'Personen kan ikke tilføjes' using errcode = '42501';
  end if;
  if is_under_guardian(target) then
    raise exception 'Personen er under forældrekontrol og kan ikke få en rolle på en side' using errcode = '42501';
  end if;
  if exists (select 1 from page_admins where page_id = page and user_id = target) then
    raise exception 'Personen er allerede med på siden' using errcode = '23505';
  end if;
  insert into page_admins (page_id, user_id, role) values (page, target, add_page_member.role);
  insert into notifications (user_id, actor_id, type, page_id, detail) values (target, me, 'page_role', page, add_page_member.role);
  return target;
end $$;
grant execute on function public.add_page_member(uuid, text, text) to authenticated;

-- Sidens personer med navn og rolle (alle kan se, hvem der står bag en side, som før)
create or replace function public.page_members(page uuid)
returns table (user_id uuid, role text, name text, username text, avatar_path text, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.user_id, a.role, p.name, p.username::text, p.avatar_path, a.created_at
  from page_admins a join profiles p on p.id = a.user_id
  where a.page_id = page
  order by case a.role when 'admin' then 0 when 'redaktoer' then 1 else 2 end, a.created_at;
$$;
grant execute on function public.page_members(uuid) to authenticated;

-- page_cards: din rolle på siden (tilføjet sidst)
create or replace view public.page_cards with (security_invoker = true) as
select
  pg.id, pg.handle, pg.name, pg.bio, pg.category, pg.avatar_path, pg.created_by, pg.created_at,
  (select count(*) from page_follows f where f.page_id = pg.id) as followers,
  exists (select 1 from page_follows f where f.page_id = pg.id and f.user_id = auth.uid()) as i_follow,
  exists (select 1 from page_admins a where a.page_id = pg.id and a.user_id = auth.uid()) as i_admin,
  (select a.role from page_admins a where a.page_id = pg.id and a.user_id = auth.uid()) as my_role
from pages pg;
grant select on public.page_cards to authenticated;
