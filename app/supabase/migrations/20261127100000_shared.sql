-- Fælles fundament for trin 2: sider, grupper, begivenheder og flere slags opslag.
-- Hver del (moments, flicks, torvet, begivenheder/grupper/sider, indstillinger) bygger videre i egne migrationer.

-- ============================================================
-- Sider (fx foreninger, virksomheder, kommunen). Følges i Hjem → Interesser.
-- ============================================================
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  handle citext not null unique check (handle ~ '^[a-z0-9._æøå]{2,30}$'),
  name text not null check (char_length(name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 300),
  category text not null default '' check (char_length(category) <= 40),
  avatar_path text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.page_admins (
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (page_id, user_id)
);
create table if not exists public.page_follows (
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

create or replace function public.is_page_admin(p uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from page_admins where page_id = p and user_id = u);
$$;

alter table public.pages enable row level security;
drop policy if exists "pages: se" on public.pages;
create policy "pages: se" on public.pages for select to authenticated using (true);
drop policy if exists "pages: opret" on public.pages;
create policy "pages: opret" on public.pages for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "pages: ret" on public.pages;
create policy "pages: ret" on public.pages for update to authenticated using (public.is_page_admin(id, auth.uid()));
drop policy if exists "pages: slet" on public.pages;
create policy "pages: slet" on public.pages for delete to authenticated using (public.is_page_admin(id, auth.uid()));

-- Den, der opretter en side, bliver administrator
create or replace function public.page_creator_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into page_admins (page_id, user_id) values (new.id, new.created_by) on conflict do nothing;
  return new;
end $$;
drop trigger if exists pages_creator_admin on public.pages;
create trigger pages_creator_admin after insert on public.pages for each row execute function public.page_creator_admin();

alter table public.page_admins enable row level security;
drop policy if exists "page_admins: se" on public.page_admins;
create policy "page_admins: se" on public.page_admins for select to authenticated using (true);
drop policy if exists "page_admins: tilføj" on public.page_admins;
create policy "page_admins: tilføj" on public.page_admins for insert to authenticated with check (public.is_page_admin(page_id, auth.uid()));
drop policy if exists "page_admins: fjern" on public.page_admins;
create policy "page_admins: fjern" on public.page_admins for delete to authenticated using (public.is_page_admin(page_id, auth.uid()));

alter table public.page_follows enable row level security;
drop policy if exists "page_follows: se" on public.page_follows;
create policy "page_follows: se" on public.page_follows for select to authenticated using (true);
drop policy if exists "page_follows: følg" on public.page_follows;
create policy "page_follows: følg" on public.page_follows for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "page_follows: stop" on public.page_follows;
create policy "page_follows: stop" on public.page_follows for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- Grupper (offentlige eller private)
-- ============================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  avatar_path text,
  privacy text not null default 'offentlig' check (privacy in ('offentlig', 'privat')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'medlem' check (role in ('admin', 'medlem')),
  status text not null default 'medlem' check (status in ('medlem', 'anmodet', 'inviteret')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.is_group_member(g uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = u and status = 'medlem');
$$;
create or replace function public.is_group_admin(g uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = u and status = 'medlem' and role = 'admin');
$$;

alter table public.groups enable row level security;
-- Navn og beskrivelse kan alle se (også private grupper, så man kan anmode om at blive medlem)
drop policy if exists "groups: se" on public.groups;
create policy "groups: se" on public.groups for select to authenticated using (true);
drop policy if exists "groups: opret" on public.groups;
create policy "groups: opret" on public.groups for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "groups: ret" on public.groups;
create policy "groups: ret" on public.groups for update to authenticated using (public.is_group_admin(id, auth.uid()));
drop policy if exists "groups: slet" on public.groups;
create policy "groups: slet" on public.groups for delete to authenticated using (public.is_group_admin(id, auth.uid()));

create or replace function public.group_creator_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role, status) values (new.id, new.created_by, 'admin', 'medlem') on conflict do nothing;
  return new;
end $$;
drop trigger if exists groups_creator_admin on public.groups;
create trigger groups_creator_admin after insert on public.groups for each row execute function public.group_creator_admin();

alter table public.group_members enable row level security;
drop policy if exists "group_members: se" on public.group_members;
create policy "group_members: se" on public.group_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id, auth.uid())
    or (status = 'medlem' and (select privacy from groups where id = group_id) = 'offentlig')
  );
-- Bliv medlem (offentlig) eller anmod (privat). Admins kan invitere.
drop policy if exists "group_members: tilmeld" on public.group_members;
create policy "group_members: tilmeld" on public.group_members for insert to authenticated
  with check (
    (user_id = auth.uid() and role = 'medlem' and (
      (status = 'medlem' and (select privacy from groups where id = group_id) = 'offentlig')
      or status = 'anmodet'
    ))
    or (public.is_group_admin(group_id, auth.uid()) and status = 'inviteret')
  );
-- Admins godkender anmodninger og gør andre til admin. Inviterede kan selv takke ja.
drop policy if exists "group_members: ret" on public.group_members;
create policy "group_members: ret" on public.group_members for update to authenticated
  using (public.is_group_admin(group_id, auth.uid()) or (user_id = auth.uid() and status = 'inviteret'));
drop policy if exists "group_members: forlad" on public.group_members;
create policy "group_members: forlad" on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id, auth.uid()));

-- ============================================================
-- Begivenheder
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check (char_length(location) <= 200),
  cover_path text,
  privacy text not null default 'offentlig' check (privacy in ('offentlig', 'inviterede')),
  group_id uuid references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('interesseret', 'deltager', 'maaske', 'deltager_ikke')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create table if not exists public.event_invites (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function public.can_see_event(e uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events ev where ev.id = e and (
      ev.created_by = u
      or (ev.privacy = 'offentlig' and (ev.group_id is null or (select privacy from groups where id = ev.group_id) = 'offentlig' or is_group_member(ev.group_id, u)))
      or exists (select 1 from event_invites i where i.event_id = e and i.user_id = u)
      or (ev.group_id is not null and is_group_member(ev.group_id, u))
    )
  );
$$;

create or replace function public.is_event_owner(e uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = e and created_by = u);
$$;

alter table public.events enable row level security;
drop policy if exists "events: se" on public.events;
create policy "events: se" on public.events for select to authenticated using (created_by = auth.uid() or public.can_see_event(id, auth.uid()));
drop policy if exists "events: opret" on public.events;
create policy "events: opret" on public.events for insert to authenticated
  with check (created_by = auth.uid() and (group_id is null or public.is_group_member(group_id, auth.uid())));
drop policy if exists "events: ret" on public.events;
create policy "events: ret" on public.events for update to authenticated using (created_by = auth.uid());
drop policy if exists "events: slet" on public.events;
create policy "events: slet" on public.events for delete to authenticated using (created_by = auth.uid());

alter table public.event_rsvps enable row level security;
drop policy if exists "rsvps: se" on public.event_rsvps;
create policy "rsvps: se" on public.event_rsvps for select to authenticated using (public.can_see_event(event_id, auth.uid()));
drop policy if exists "rsvps: svar" on public.event_rsvps;
create policy "rsvps: svar" on public.event_rsvps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_see_event(event_id, auth.uid()));

alter table public.event_invites enable row level security;
drop policy if exists "invites: se" on public.event_invites;
create policy "invites: se" on public.event_invites for select to authenticated
  using (user_id = auth.uid() or invited_by = auth.uid() or public.is_event_owner(event_id, auth.uid()));
drop policy if exists "invites: inviter" on public.event_invites;
create policy "invites: inviter" on public.event_invites for insert to authenticated
  with check (invited_by = auth.uid() and public.can_see_event(event_id, auth.uid()));
drop policy if exists "invites: fjern" on public.event_invites;
create policy "invites: fjern" on public.event_invites for delete to authenticated using (user_id = auth.uid() or invited_by = auth.uid());

-- ============================================================
-- Opslag: i en gruppe, en begivenhed, som en side, og flicks (video)
-- ============================================================
alter table public.posts add column if not exists group_id uuid references public.groups (id) on delete cascade;
alter table public.posts add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.posts add column if not exists page_id uuid references public.pages (id) on delete cascade;
alter table public.posts add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video'));
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (kind in ('feed', 'debat', 'flick'));
create index if not exists posts_group on public.posts (group_id, created_at desc) where group_id is not null;
create index if not exists posts_event on public.posts (event_id, created_at desc) where event_id is not null;
create index if not exists posts_page on public.posts (page_id, created_at desc) where page_id is not null;

-- Synlighed: gruppe → medlemmer (eller alle ved offentlig gruppe), begivenhed → dem der kan se den, side → alle
create or replace function public.can_see_post(viewer uuid, post_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts p
    where p.id = post_id
      and not is_blocked(viewer, p.author_id)
      and (
        p.author_id = viewer
        or (p.group_id is not null and (is_group_member(p.group_id, viewer) or (select privacy from groups where id = p.group_id) = 'offentlig'))
        or (p.group_id is null and p.event_id is not null and can_see_event(p.event_id, viewer))
        or (p.group_id is null and p.event_id is null and p.page_id is not null)
        or (p.group_id is null and p.event_id is null and p.page_id is null and p.kind = 'debat')
        or (p.group_id is null and p.event_id is null and p.page_id is null and p.kind in ('feed', 'flick') and can_see_content(viewer, p.author_id))
      )
  );
$$;

drop policy if exists "posts: se" on public.posts;
create policy "posts: se" on public.posts for select to authenticated
  using (
    author_id = auth.uid()
    or (
      not public.is_blocked(auth.uid(), author_id)
      and (
        (group_id is not null and (public.is_group_member(group_id, auth.uid()) or (select privacy from public.groups g where g.id = group_id) = 'offentlig'))
        or (group_id is null and event_id is not null and public.can_see_event(event_id, auth.uid()))
        or (group_id is null and event_id is null and page_id is not null)
        or (group_id is null and event_id is null and page_id is null and kind = 'debat')
        or (group_id is null and event_id is null and page_id is null and kind in ('feed', 'flick') and public.can_see_content(auth.uid(), author_id))
      )
    )
  );
-- Kun medlemmer kan skrive i en gruppe, kun admins som en side, kun dem der kan se en begivenhed
drop policy if exists "posts: opret" on public.posts;
create policy "posts: opret" on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id, auth.uid()))
    and (page_id is null or public.is_page_admin(page_id, auth.uid()))
    and (event_id is null or public.can_see_event(event_id, auth.uid()))
  );

-- post_cards med gruppe, begivenhed, side og medietype (opdaterer viewet fra trin 1)
drop view if exists public.post_cards cascade;
create view public.post_cards with (security_invoker = true) as
select
  p.id, p.kind, p.text, p.image_paths, p.tags, p.allow_share, p.created_at, p.media_type,
  p.author_id, a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  a.public_kind as author_public_kind,
  p.group_id, g.name as group_name, g.avatar_path as group_avatar_path,
  p.event_id, e.title as event_title,
  p.page_id, pg.handle as page_handle, pg.name as page_name, pg.avatar_path as page_avatar_path,
  (select count(*) from post_likes l where l.post_id = p.id) as likes,
  (select count(*) from comments c where c.post_id = p.id) as comments,
  exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked,
  exists (select 1 from saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved,
  (select stance from post_stances s where s.post_id = p.id and s.user_id = auth.uid()) as my_stance
from posts p
join profiles a on a.id = p.author_id
left join groups g on g.id = p.group_id
left join events e on e.id = p.event_id
left join pages pg on pg.id = p.page_id;
grant select on public.post_cards to authenticated;

-- Hjem → Brugere: dine egne, dem du følger og dine grupper (ikke sider)
create or replace function public.feed_home(before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'feed'
    and pc.page_id is null
    and pc.event_id is null
    and pc.created_at < before
    and (
      (pc.group_id is null and (pc.author_id = auth.uid() or follows_accepted(auth.uid(), pc.author_id)))
      or (pc.group_id is not null and is_group_member(pc.group_id, auth.uid()))
    )
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
  order by pc.created_at desc
  limit max_rows;
$$;

-- Hjem → Interesser: opslag fra sider, du følger
create or replace function public.feed_interests(before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'feed'
    and pc.page_id in (select page_id from page_follows where user_id = auth.uid())
    and pc.created_at < before
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
  order by pc.created_at desc
  limit max_rows;
$$;

-- feed_debate genskabes (viewet blev genskabt)
create or replace function public.feed_debate(before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'debat'
    and pc.created_at < before
    and not exists (select 1 from debate_mutes m where m.user_id = auth.uid() and m.muted_id = pc.author_id)
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
    and (
      pc.author_id = auth.uid()
      or not exists (select 1 from interests i where i.user_id = auth.uid() and i.active)
      or pc.tags && array(select topic from interests i where i.user_id = auth.uid() and i.active)
    )
  order by pc.created_at desc
  limit max_rows;
$$;

-- Videoer i media-mappen (flicks og moments), op til 50 MB
update storage.buckets
  set file_size_limit = 52428800,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
  where id = 'media';

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
