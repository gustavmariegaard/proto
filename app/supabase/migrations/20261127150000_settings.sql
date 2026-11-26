-- Trin 2 (E): indstillinger, offentlig person, forældrekontrol, Udvid cirkel og Skaber.

-- ============================================================
-- Brugerens indstillinger (sprog og oversættelse, aktiv-status)
-- ============================================================
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  language text not null default 'da' check (char_length(language) between 2 and 5),
  translate_posts boolean not null default true,
  translate_messages boolean not null default true,
  hide_active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "settings: egne" on public.user_settings;
create policy "settings: egne" on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Offentlig person: ansøgning med 3 bilag. Godkendes af ciircle (service role / dashboard).
-- ============================================================
create table if not exists public.public_figure_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 40),
  links text[] not null check (cardinality(links) = 3),
  attachment_paths text[] not null check (cardinality(attachment_paths) = 3),
  status text not null default 'behandles' check (status in ('behandles', 'godkendt', 'afvist')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists pfa_user on public.public_figure_applications (user_id, created_at desc);
alter table public.public_figure_applications enable row level security;
drop policy if exists "pfa: se egne" on public.public_figure_applications;
create policy "pfa: se egne" on public.public_figure_applications for select to authenticated using (user_id = auth.uid());
-- Man kan kun sende en ny ansøgning med status "behandles" (aldrig godkende sig selv)
drop policy if exists "pfa: send" on public.public_figure_applications;
create policy "pfa: send" on public.public_figure_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'behandles' and decided_at is null);
-- Man kan trække en ansøgning tilbage, mens den behandles
drop policy if exists "pfa: træk tilbage" on public.public_figure_applications;
create policy "pfa: træk tilbage" on public.public_figure_applications for delete to authenticated
  using (user_id = auth.uid() and status = 'behandles');

-- Godkendt ansøgning → globus ved navnet (public_kind = 'person'). Kun service role kan ændre status.
create or replace function public.on_pfa_decided() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.decided_at := now();
    if new.status = 'godkendt' then
      update profiles set public_kind = 'person' where id = new.user_id;
    elsif old.status = 'godkendt' then
      update profiles set public_kind = null where id = new.user_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists pfa_decided on public.public_figure_applications;
create trigger pfa_decided before update on public.public_figure_applications for each row execute function public.on_pfa_decided();

-- Privat mappe til bilag: kun ejeren kan uploade og se sine egne filer
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumenter', 'dokumenter', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;
drop policy if exists "dokumenter: egne" on storage.objects;
create policy "dokumenter: egne" on storage.objects for select to authenticated
  using (bucket_id = 'dokumenter' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "dokumenter: upload" on storage.objects;
create policy "dokumenter: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'dokumenter' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "dokumenter: slet" on storage.objects;
create policy "dokumenter: slet" on storage.objects for delete to authenticated
  using (bucket_id = 'dokumenter' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Forældrekontrol: forælderen laver en kode, barnet skriver den ind på sin egen profil
-- ============================================================
create table if not exists public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'afventer' check (status in ('afventer', 'aktiv')),
  created_at timestamptz not null default now(),
  check (child_id is null or child_id <> guardian_id)
);
create unique index if not exists guardian_links_pair on public.guardian_links (guardian_id, child_id) where child_id is not null;

create or replace function public.is_guardian_of(g uuid, c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from guardian_links where guardian_id = g and child_id = c and status = 'aktiv');
$$;

alter table public.guardian_links enable row level security;
drop policy if exists "guardian: se" on public.guardian_links;
create policy "guardian: se" on public.guardian_links for select to authenticated using (guardian_id = auth.uid() or child_id = auth.uid());
drop policy if exists "guardian: fjern" on public.guardian_links;
create policy "guardian: fjern" on public.guardian_links for delete to authenticated using (guardian_id = auth.uid());

-- Forælder: lav en kode (gyldig til den bruges eller slettes)
create or replace function public.create_guardian_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  delete from guardian_links where guardian_id = auth.uid() and status = 'afventer';
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when length(c) = 6 and not exists (select 1 from guardian_links where code = c);
  end loop;
  insert into guardian_links (guardian_id, code) values (auth.uid(), c);
  return c;
end $$;

-- Barn: skriv koden. Returnerer forælderens navn.
create or replace function public.accept_guardian_code(c text)
returns text language plpgsql security definer set search_path = public as $$
declare l guardian_links;
begin
  select * into l from guardian_links where code = upper(trim(c)) and status = 'afventer';
  if l.id is null then raise exception 'Koden findes ikke' using errcode = 'P0002'; end if;
  if l.guardian_id = auth.uid() then raise exception 'Du kan ikke tilknytte dig selv' using errcode = '22023'; end if;
  update guardian_links set child_id = auth.uid(), status = 'aktiv' where id = l.id;
  insert into child_settings (child_id) values (auth.uid()) on conflict (child_id) do nothing;
  return (select name from profiles where id = l.guardian_id);
end $$;

create table if not exists public.child_settings (
  child_id uuid primary key references public.profiles (id) on delete cascade,
  areas jsonb not null default '{"moments":true,"flicks":true,"debat":false,"sider":true,"grupper":true,"torvet":false,"begivenheder":true}',
  sensitive boolean not null default true,
  blocked_topics text[] not null default '{}',
  approve_followers boolean not null default true,
  screen_time text not null default '60 min.',
  bedtime boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.child_settings enable row level security;
drop policy if exists "child: se" on public.child_settings;
create policy "child: se" on public.child_settings for select to authenticated
  using (child_id = auth.uid() or public.is_guardian_of(auth.uid(), child_id));
-- Kun forælderen ændrer barnets indstillinger
drop policy if exists "child: ret" on public.child_settings;
create policy "child: ret" on public.child_settings for update to authenticated
  using (public.is_guardian_of(auth.uid(), child_id)) with check (public.is_guardian_of(auth.uid(), child_id));

-- Forælder: gør barnets profil privat/offentlig (profiler kan ellers kun ændres af ejeren)
create or replace function public.set_child_private(c uuid, p boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_guardian_of(auth.uid(), c) then raise exception 'Ikke forælder' using errcode = '42501'; end if;
  update profiles set is_private = p where id = c;
end $$;

-- Barnets profil og ventende følgere (for forælderen)
create or replace function public.my_children()
returns table (id uuid, username text, name text, avatar_path text, is_private boolean, birthdate date)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.name, p.avatar_path, p.is_private, pp.birthdate
  from guardian_links l join profiles p on p.id = l.child_id left join profile_private pp on pp.id = p.id
  where l.guardian_id = auth.uid() and l.status = 'aktiv';
$$;

create or replace function public.child_follow_requests(c uuid)
returns table (id uuid, username text, name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.name, p.avatar_path
  from follows f join profiles p on p.id = f.follower_id
  where f.followee_id = c and f.status = 'pending' and is_guardian_of(auth.uid(), c);
$$;

create or replace function public.answer_child_follow(c uuid, follower uuid, ok boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_guardian_of(auth.uid(), c) then raise exception 'Ikke forælder' using errcode = '42501'; end if;
  if ok then update follows set status = 'accepted' where follower_id = follower and followee_id = c;
  else delete from follows where follower_id = follower and followee_id = c; end if;
end $$;

-- "Godkend nye følgere": følg et barn med den indstilling slået til → anmodning (som privat profil)
create or replace function public.follow_status_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := case
    when (select is_private from profiles where id = new.followee_id) then 'pending'
    when coalesce((select approve_followers from child_settings where child_id = new.followee_id), false) then 'pending'
    else 'accepted'
  end;
  return new;
end $$;

-- ============================================================
-- Udvid cirkel: forslag (venners venner og folk fra dine grupper)
-- ============================================================
create or replace function public.suggest_people(max_rows int default 20)
returns table (id uuid, username text, name text, avatar_path text, reason text, score int)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  mine as (select followee_id from follows, me where follower_id = me.id and status = 'accepted'),
  fof as (
    select f.followee_id as id, count(*)::int as n, min(p.name) as via
    from follows f join mine m on m.followee_id = f.follower_id join profiles p on p.id = f.follower_id
    where f.status = 'accepted'
    group by f.followee_id
  ),
  grp as (
    select gm2.user_id as id, min(g.name) as gname
    from group_members gm1 join group_members gm2 on gm1.group_id = gm2.group_id
    join groups g on g.id = gm1.group_id, me
    where gm1.user_id = me.id and gm1.status = 'medlem' and gm2.status = 'medlem'
    group by gm2.user_id
  ),
  cand as (
    select coalesce(fof.id, grp.id) as id,
      coalesce(fof.n, 0) * 2 + (case when grp.id is not null then 1 else 0 end) as score,
      case
        when fof.n > 1 then fof.n || ' fælles'
        when fof.n = 1 then 'Følges af ' || split_part(fof.via, ' ', 1)
        else 'Medlem af ' || grp.gname
      end as reason
    from fof full join grp on grp.id = fof.id
  )
  select p.id, p.username::text, p.name, p.avatar_path, c.reason, c.score
  from cand c join profiles p on p.id = c.id, me
  where c.id <> me.id
    and not exists (select 1 from follows f where f.follower_id = me.id and f.followee_id = c.id)
    and not is_blocked(me.id, c.id)
  order by c.score desc, p.name
  limit max_rows;
$$;

-- ============================================================
-- Skaber: samlede tal for dine egne opslag (aldrig hvem enkeltpersoner er)
-- ============================================================
create or replace function public.creator_stats()
returns table (posts bigint, likes bigint, comments bigint, saves bigint, followers bigint, new_followers_30d bigint, stances bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from posts where author_id = auth.uid()),
    (select count(*) from post_likes l join posts p on p.id = l.post_id where p.author_id = auth.uid()),
    (select count(*) from comments c join posts p on p.id = c.post_id where p.author_id = auth.uid() and c.author_id <> auth.uid()),
    (select count(*) from saves s join posts p on p.id = s.post_id where p.author_id = auth.uid()),
    (select count(*) from follows where followee_id = auth.uid() and status = 'accepted'),
    (select count(*) from follows where followee_id = auth.uid() and status = 'accepted' and created_at > now() - interval '30 days'),
    (select count(*) from post_stances s join posts p on p.id = s.post_id where p.author_id = auth.uid());
$$;

-- Dine opslag med flest reaktioner (hjerter + kommentarer + gemt + stemmer)
create or replace function public.creator_top_posts(max_rows int default 5)
returns table (id uuid, text text, kind text, image_paths text[], created_at timestamptz, reactions bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.text, p.kind, p.image_paths, p.created_at,
    (select count(*) from post_likes where post_id = p.id)
    + (select count(*) from comments where post_id = p.id)
    + (select count(*) from saves where post_id = p.id)
    + (select count(*) from post_stances where post_id = p.id) as reactions
  from posts p where p.author_id = auth.uid()
  order by reactions desc, p.created_at desc
  limit max_rows;
$$;

grant select, insert, update, delete on public.user_settings, public.public_figure_applications, public.guardian_links, public.child_settings to authenticated;
revoke all on public.user_settings, public.public_figure_applications, public.guardian_links, public.child_settings from anon;
grant execute on function public.create_guardian_code(), public.accept_guardian_code(text), public.set_child_private(uuid, boolean),
  public.my_children(), public.child_follow_requests(uuid), public.answer_child_follow(uuid, uuid, boolean),
  public.suggest_people(int), public.creator_stats(), public.creator_top_posts(int), public.is_guardian_of(uuid, uuid) to authenticated;
revoke execute on function public.create_guardian_code(), public.accept_guardian_code(text), public.set_child_private(uuid, boolean),
  public.my_children(), public.child_follow_requests(uuid), public.answer_child_follow(uuid, uuid, boolean),
  public.suggest_people(int), public.creator_stats(), public.creator_top_posts(int) from anon, public;
