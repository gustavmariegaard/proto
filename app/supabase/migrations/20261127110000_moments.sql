-- Moments (forsvinder efter 24 timer), set/likes og highlights (moments gemt på profilen).

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Moment fra en side (vises under Hjem → Interesser)
  page_id uuid references public.pages (id) on delete cascade,
  media_path text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  -- "Del opslag som moment"
  post_id uuid references public.posts (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (media_path is not null or post_id is not null or char_length(text) > 0)
);
create index if not exists moments_author on public.moments (author_id, created_at);
create index if not exists moments_page on public.moments (page_id, created_at) where page_id is not null;

create table if not exists public.moment_views (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
create table if not exists public.moment_likes (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  created_at timestamptz not null default now()
);
create table if not exists public.highlight_items (
  highlight_id uuid not null references public.highlights (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  position int not null default 0,
  primary key (highlight_id, moment_id)
);

-- Må viewer se dette moment? Aktivt (24 t) eller gemt i en highlight, og ejeren kan ses.
create or replace function public.can_see_moment(m uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from moments mo
    where mo.id = m
      and (
        mo.author_id = viewer
        or (
          not is_blocked(viewer, mo.author_id)
          and (mo.page_id is not null or can_see_content(viewer, mo.author_id))
          and (mo.post_id is null or can_see_post(viewer, mo.post_id))
          and (mo.expires_at > now() or exists (select 1 from highlight_items hi where hi.moment_id = mo.id))
        )
      )
  );
$$;

alter table public.moments enable row level security;
drop policy if exists "moments: se" on public.moments;
create policy "moments: se" on public.moments for select to authenticated
  using (author_id = auth.uid() or public.can_see_moment(id, auth.uid()));
drop policy if exists "moments: opret" on public.moments;
create policy "moments: opret" on public.moments for insert to authenticated
  with check (
    author_id = auth.uid()
    and (page_id is null or public.is_page_admin(page_id, auth.uid()))
    and (post_id is null or public.can_see_post(auth.uid(), post_id))
  );
drop policy if exists "moments: slet" on public.moments;
create policy "moments: slet" on public.moments for delete to authenticated using (author_id = auth.uid());

alter table public.moment_views enable row level security;
-- Ejeren kan se, hvem der har set; man kan selv markere som set
drop policy if exists "moment_views: se" on public.moment_views;
create policy "moment_views: se" on public.moment_views for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from moments m where m.id = moment_id and m.author_id = auth.uid()));
drop policy if exists "moment_views: set" on public.moment_views;
create policy "moment_views: set" on public.moment_views for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_moment(moment_id, auth.uid()));

alter table public.moment_likes enable row level security;
drop policy if exists "moment_likes: se" on public.moment_likes;
create policy "moment_likes: se" on public.moment_likes for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from moments m where m.id = moment_id and m.author_id = auth.uid()));
drop policy if exists "moment_likes: giv" on public.moment_likes;
create policy "moment_likes: giv" on public.moment_likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_moment(moment_id, auth.uid()));
drop policy if exists "moment_likes: fjern" on public.moment_likes;
create policy "moment_likes: fjern" on public.moment_likes for delete to authenticated using (user_id = auth.uid());

alter table public.highlights enable row level security;
drop policy if exists "highlights: se" on public.highlights;
create policy "highlights: se" on public.highlights for select to authenticated
  using (owner_id = auth.uid() or public.can_see_content(auth.uid(), owner_id));
drop policy if exists "highlights: egne" on public.highlights;
create policy "highlights: egne" on public.highlights for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.owns_highlight(h uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from highlights where id = h and owner_id = u);
$$;

alter table public.highlight_items enable row level security;
drop policy if exists "highlight_items: se" on public.highlight_items;
create policy "highlight_items: se" on public.highlight_items for select to authenticated
  using (exists (select 1 from highlights h where h.id = highlight_id and (h.owner_id = auth.uid() or public.can_see_content(auth.uid(), h.owner_id))));
drop policy if exists "highlight_items: egne" on public.highlight_items;
create policy "highlight_items: egne" on public.highlight_items for all to authenticated
  using (public.owns_highlight(highlight_id, auth.uid()))
  with check (
    public.owns_highlight(highlight_id, auth.uid())
    and exists (select 1 from moments m where m.id = moment_id and m.author_id = auth.uid())
  );

-- Ét moment med alt, viseren skal bruge
create or replace view public.moment_cards with (security_invoker = true) as
select
  m.id, m.author_id, m.page_id, m.media_path, m.media_type, m.post_id, m.text, m.created_at, m.expires_at,
  a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  pg.handle as page_handle, pg.name as page_name, pg.avatar_path as page_avatar_path,
  exists (select 1 from moment_views v where v.moment_id = m.id and v.user_id = auth.uid()) as seen,
  exists (select 1 from moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()) as liked,
  case when m.author_id = auth.uid() then (select count(*) from moment_views v where v.moment_id = m.id and v.user_id <> m.author_id) end as views
from moments m
join profiles a on a.id = m.author_id
left join pages pg on pg.id = m.page_id;
grant select on public.moment_cards to authenticated;

-- Hjem → Brugere: rækken med moments (dig først, så usete, så nyeste). Kun personlige moments.
create or replace function public.moment_rings()
returns table (author_id uuid, username text, name text, avatar_path text, count bigint, unseen boolean, latest timestamptz, mine boolean)
language sql stable security invoker set search_path = public as $$
  select
    mc.author_id, mc.author_username::text, mc.author_name, mc.author_avatar_path,
    count(*), bool_or(not mc.seen and mc.author_id <> auth.uid()), max(mc.created_at), mc.author_id = auth.uid()
  from moment_cards mc
  where mc.page_id is null
    and mc.expires_at > now()
    and (mc.author_id = auth.uid() or follows_accepted(auth.uid(), mc.author_id))
  group by mc.author_id, mc.author_username, mc.author_name, mc.author_avatar_path
  order by (mc.author_id = auth.uid()) desc, bool_or(not mc.seen and mc.author_id <> auth.uid()) desc, max(mc.created_at) desc;
$$;

-- Hjem → Interesser: moments fra sider, du følger
create or replace function public.page_moment_rings()
returns table (page_id uuid, handle text, name text, avatar_path text, count bigint, unseen boolean, latest timestamptz)
language sql stable security invoker set search_path = public as $$
  select
    mc.page_id, mc.page_handle::text, mc.page_name, mc.page_avatar_path,
    count(*), bool_or(not mc.seen), max(mc.created_at)
  from moment_cards mc
  where mc.page_id in (select page_id from page_follows where user_id = auth.uid())
    and mc.expires_at > now()
  group by mc.page_id, mc.page_handle, mc.page_name, mc.page_avatar_path
  order by bool_or(not mc.seen) desc, max(mc.created_at) desc;
$$;

-- Delt opslag i en besked (Del → Besked)
alter table public.messages add column if not exists post_id uuid references public.posts (id) on delete set null;

grant select, insert, update, delete on public.moments, public.moment_views, public.moment_likes, public.highlights, public.highlight_items to authenticated;
grant execute on function public.can_see_moment(uuid, uuid), public.owns_highlight(uuid, uuid), public.moment_rings(), public.page_moment_rings() to authenticated;
revoke all on public.moments, public.moment_views, public.moment_likes, public.highlights, public.highlight_items, public.moment_cards from anon;
