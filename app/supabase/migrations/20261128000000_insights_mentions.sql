-- Trin 3: analytics på egen profil, tagging (@) af personer og sider, og deling altid tilladt.

-- ============================================================
-- Deling: andres opslag kan altid deles videre (kun synlighed tæller)
-- ============================================================
create or replace function public.check_shared_post() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shared_post_id is not null and not can_see_post(new.author_id, new.shared_post_id) then
    raise exception 'Opslaget kan ikke deles' using errcode = '42501';
  end if;
  return new;
end $$;

-- ============================================================
-- Visninger og profilbesøg (højst én pr. person pr. dag). Kun til analytics.
-- Ingen kan læse tabellerne direkte; ejeren ser kun samlede tal via my_insights().
-- ============================================================
create table if not exists public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  primary key (post_id, viewer_id, day)
);
create index if not exists post_views_day on public.post_views (day);
alter table public.post_views enable row level security;

create table if not exists public.profile_visits (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  visitor_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  primary key (profile_id, visitor_id, day)
);
create index if not exists profile_visits_day on public.profile_visits (profile_id, day);
alter table public.profile_visits enable row level security;

-- Appen melder, hvilke opslag man har set (egne tæller ikke)
create or replace function public.record_views(ids uuid[])
returns void language sql security definer set search_path = public as $$
  insert into post_views (post_id, viewer_id)
  select p.id, auth.uid() from posts p
  where p.id = any (ids) and p.author_id <> auth.uid() and can_see_post(auth.uid(), p.id)
  on conflict do nothing;
$$;

create or replace function public.record_profile_visit(p uuid)
returns void language sql security definer set search_path = public as $$
  insert into profile_visits (profile_id, visitor_id)
  select p, auth.uid() where p <> auth.uid() and not is_blocked(p, auth.uid())
  on conflict do nothing;
$$;

grant execute on function public.record_views(uuid[]) to authenticated;
grant execute on function public.record_profile_visit(uuid) to authenticated;

-- Samlede tal for de seneste `days` dage og perioden før (til sammenligning)
create or replace function public.my_insights(days int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d int := greatest(1, least(days, 365));
  since date := current_date - (d - 1);
  prev date := current_date - (2 * d - 1);
  result json;
begin
  if me is null then
    return null;
  end if;

  with mine as (select id from posts where author_id = me),
  v as (select pv.* from post_views pv join mine m on m.id = pv.post_id where pv.day >= prev),
  pv as (select * from profile_visits where profile_id = me and day >= prev),
  lk as (select l.created_at::date as day from post_likes l join mine m on m.id = l.post_id where l.created_at >= prev and l.user_id <> me),
  cm as (select c.created_at::date as day from comments c join mine m on m.id = c.post_id where c.created_at >= prev and c.author_id <> me),
  sv as (select s.created_at::date as day from saves s join mine m on m.id = s.post_id where s.created_at >= prev and s.user_id <> me),
  sh as (select p.created_at::date as day from posts p join mine m on m.id = p.shared_post_id where p.created_at >= prev and p.author_id <> me),
  fo as (select created_at::date as day from follows where followee_id = me and status = 'accepted' and created_at >= prev),
  followers_now as (select follower_id from follows where followee_id = me and status = 'accepted')
  select json_build_object(
    'days', d,
    'reach', (select count(distinct viewer_id) from v where day >= since),
    'reach_prev', (select count(distinct viewer_id) from v where day < since),
    'views', (select count(*) from v where day >= since),
    'views_prev', (select count(*) from v where day < since),
    'visits', (select count(*) from pv where day >= since),
    'visits_prev', (select count(*) from pv where day < since),
    'likes', (select count(*) from lk where day >= since),
    'comments', (select count(*) from cm where day >= since),
    'saves', (select count(*) from sv where day >= since),
    'shares', (select count(*) from sh where day >= since),
    'interactions_prev', (select count(*) from lk where day < since) + (select count(*) from cm where day < since)
                       + (select count(*) from sv where day < since) + (select count(*) from sh where day < since),
    'followers', (select count(*) from followers_now),
    'new_followers', (select count(*) from fo where day >= since),
    'new_followers_prev', (select count(*) from fo where day < since),
    -- Andel af dem, der så dine opslag, som følger dig
    'reach_followers', (select count(distinct v.viewer_id) from v join followers_now f on f.follower_id = v.viewer_id where v.day >= since),
    -- Visninger og nye følgere pr. dag
    'series', (
      select coalesce(json_agg(json_build_object(
        'day', g.day,
        'views', (select count(*) from v where v.day = g.day),
        'followers', (select count(*) from fo where fo.day = g.day)
      ) order by g.day), '[]'::json)
      from (select generate_series(since, current_date, interval '1 day')::date as day) g
    ),
    -- De opslag, der klarede sig bedst i perioden
    'top', (
      select coalesce(json_agg(t order by t.score desc, t.created_at desc), '[]'::json)
      from (
        select p.id, p.kind, p.text, p.image_paths, p.media_type, p.created_at,
               (select count(*) from v where v.post_id = p.id and v.day >= since) as views,
               (select count(*) from post_likes l where l.post_id = p.id) as likes,
               (select count(*) from comments c where c.post_id = p.id) as comments,
               (select count(*) from v where v.post_id = p.id and v.day >= since)
                 + 3 * (select count(*) from post_likes l where l.post_id = p.id and l.created_at >= since)
                 + 5 * (select count(*) from comments c where c.post_id = p.id and c.created_at >= since) as score
        from posts p where p.author_id = me
        order by score desc, p.created_at desc
        limit 5
      ) t
      where t.score > 0
    )
  ) into result;
  return result;
end $$;
grant execute on function public.my_insights(int) to authenticated;

-- ============================================================
-- Tagging: @brugernavn eller @side i opslag og bio giver en notifikation
-- ============================================================
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'like', 'comment', 'note', 'message', 'group_request', 'event_invite', 'mention', 'mention_bio'));

-- Alle @navne i en tekst (små bogstaver, uden @)
create or replace function public.mentions_in(t text)
returns setof text language sql immutable as $$
  select distinct lower(m[1]) from regexp_matches(coalesce(t, ''), '@([A-Za-z0-9._æøåÆØÅ]{2,30})', 'g') as m;
$$;

create or replace function public.on_post_mention() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type, post_id)
  select pr.id, new.author_id, 'mention', new.id
  from profiles pr
  where pr.username in (select mentions_in(new.text))
    and pr.id <> new.author_id
    and not is_blocked(pr.id, new.author_id)
    and can_see_post(pr.id, new.id);
  return new;
end $$;
drop trigger if exists posts_mention on public.posts;
create trigger posts_mention after insert on public.posts for each row execute function public.on_post_mention();

-- Bio: kun nye tags giver besked
create or replace function public.on_bio_mention() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type)
  select pr.id, new.id, 'mention_bio'
  from profiles pr
  where pr.username in (select mentions_in(new.bio) except select mentions_in(case when tg_op = 'UPDATE' then old.bio else '' end))
    and pr.id <> new.id
    and not is_blocked(pr.id, new.id);
  return new;
end $$;
drop trigger if exists profiles_bio_mention on public.profiles;
create trigger profiles_bio_mention after insert or update of bio on public.profiles for each row execute function public.on_bio_mention();

-- ============================================================
-- Debatopslag: antal personer, der har set opslaget (vises med et øje). Kun antallet, aldrig hvem.
-- ============================================================
create or replace function public.post_view_counts(ids uuid[])
returns table (post_id uuid, views bigint) language sql stable security definer set search_path = public as $$
  select p.id, (select count(distinct v.viewer_id) from post_views v where v.post_id = p.id)
  from posts p
  where p.id = any (ids) and p.kind = 'debat' and can_see_post(auth.uid(), p.id);
$$;
grant execute on function public.post_view_counts(uuid[]) to authenticated;
