-- ciircle: hele databasen i én fil. Kopiér alt og kør det i Supabase → SQL Editor.
-- Genereret fra supabase/migrations. Kør kun én gang på et nyt projekt.

-- ===== 20261126000000_init.sql =====
-- ciircle: første database (trin 1).
-- Alle tabeller har Row Level Security (RLS): reglerne nederst i hver blok
-- bestemmer, hvem der må se og ændre hvad. Appen kan ikke komme uden om dem.

create extension if not exists citext;

-- ============================================================
-- Profiler
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique check (username ~ '^[a-z0-9._æøå]{2,30}$'),
  name text not null check (char_length(name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 150),
  avatar_path text,
  is_private boolean not null default false,
  -- Offentlig person eller side (godkendes af ciircle, ikke af brugeren selv)
  public_kind text check (public_kind in ('person', 'side')),
  created_at timestamptz not null default now()
);

-- Følger: accepted, eller pending når profilen er privat
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'pending')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Blokering: gælder begge veje, overalt
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Skjult i Offentlig debat: kun dine egne debatopslag-visninger påvirkes
create table public.debate_mutes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id)
);

-- Interesser (de emner, man følger i Offentlig debat)
create table public.interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 40),
  active boolean not null default true,
  primary key (user_id, topic)
);

-- Hjælpefunktioner (security definer, så de kan læse på tværs af RLS uden at lække data)
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.follows_accepted(viewer uuid, owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from follows where follower_id = viewer and followee_id = owner and status = 'accepted'
  );
$$;

-- Må viewer se owners indhold i feedet? (ikke blokeret, og offentlig eller fulgt)
create or replace function public.can_see_content(viewer uuid, owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer = owner or (
    not is_blocked(viewer, owner)
    and (
      not (select is_private from profiles where id = owner)
      or follows_accepted(viewer, owner)
    )
  );
$$;

alter table public.profiles enable row level security;
-- Navn, brugernavn og billede kan alle loggede ind se (også private profiler), men ikke blokerede
create policy "profiles: se" on public.profiles for select to authenticated
  using (id = auth.uid() or not public.is_blocked(auth.uid(), id));
create policy "profiles: opret egen" on public.profiles for insert to authenticated
  with check (id = auth.uid() and public_kind is null);
create policy "profiles: ret egen" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- public_kind må kun ændres af ciircle (service role), aldrig af brugeren
create or replace function public.protect_public_kind()
returns trigger language plpgsql as $$
begin
  if new.public_kind is distinct from old.public_kind and auth.role() <> 'service_role' then
    new.public_kind := old.public_kind;
  end if;
  return new;
end $$;
create trigger profiles_protect_public_kind before update on public.profiles
  for each row execute function public.protect_public_kind();

alter table public.follows enable row level security;
create policy "follows: se" on public.follows for select to authenticated
  using (
    follower_id = auth.uid() or followee_id = auth.uid()
    or (status = 'accepted' and public.can_see_content(auth.uid(), followee_id))
  );
-- Man kan kun følge på egne vegne. Privat profil → pending (sættes af trigger).
create policy "follows: følg" on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and not public.is_blocked(follower_id, followee_id));
-- Kun den, der bliver fulgt, kan godkende
create policy "follows: godkend" on public.follows for update to authenticated
  using (followee_id = auth.uid()) with check (followee_id = auth.uid());
-- Stop med at følge, eller fjern en følger
create policy "follows: stop" on public.follows for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

create or replace function public.follow_status_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := case when (select is_private from profiles where id = new.followee_id) then 'pending' else 'accepted' end;
  return new;
end $$;
create trigger follows_status before insert on public.follows
  for each row execute function public.follow_status_on_insert();

alter table public.blocks enable row level security;
create policy "blocks: egne" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: bloker" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: fjern" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- Blokering fjerner følgerskab begge veje
create or replace function public.unfollow_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;
create trigger blocks_unfollow after insert on public.blocks
  for each row execute function public.unfollow_on_block();

alter table public.debate_mutes enable row level security;
create policy "mutes: egne" on public.debate_mutes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.interests enable row level security;
create policy "interests: egne" on public.interests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Opslag, hjerter, enig/uenig, kommentarer, gemt
-- ============================================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- feed = almindeligt opslag (følgere/offentlig profil), debat = Offentlig debat (alle)
  kind text not null default 'feed' check (kind in ('feed', 'debat')),
  text text not null default '' check (char_length(text) <= 2200),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 10),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  allow_share boolean not null default true,
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or cardinality(image_paths) > 0),
  check (kind = 'feed' or cardinality(tags) between 1 and 5)
);
create index posts_author_created on public.posts (author_id, created_at desc);
create index posts_kind_created on public.posts (kind, created_at desc);
create index posts_tags on public.posts using gin (tags);

-- Opslag i debatten kan alle se (undtagen ved blokering). Andre opslag følger profilens synlighed.
create or replace function public.can_see_post(viewer uuid, post_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts p
    where p.id = post_id
      and (
        p.author_id = viewer
        or (p.kind = 'debat' and not is_blocked(viewer, p.author_id))
        or (p.kind = 'feed' and can_see_content(viewer, p.author_id))
      )
  );
$$;

alter table public.posts enable row level security;
-- Bruger felterne direkte (ikke can_see_post), så et nyt opslag kan returneres med det samme
create policy "posts: se" on public.posts for select to authenticated
  using (
    author_id = auth.uid()
    or (kind = 'debat' and not public.is_blocked(auth.uid(), author_id))
    or (kind = 'feed' and public.can_see_content(auth.uid(), author_id))
  );
create policy "posts: opret" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts: ret" on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "posts: slet" on public.posts for delete to authenticated using (author_id = auth.uid());

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes: se" on public.post_likes for select to authenticated using (public.can_see_post(auth.uid(), post_id));
create policy "likes: giv" on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_post(auth.uid(), post_id));
create policy "likes: fjern" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Enig/uenig: hvem der stemte hvad er privat. Kun tal deles (via post_stance_counts).
create table public.post_stances (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stance text not null check (stance in ('enig', 'uenig')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_stances enable row level security;
create policy "stances: egne" on public.post_stances for select to authenticated using (user_id = auth.uid());
create policy "stances: stem" on public.post_stances for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_post(auth.uid(), post_id));
create policy "stances: skift" on public.post_stances for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "stances: fjern" on public.post_stances for delete to authenticated using (user_id = auth.uid());

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Svar på en anden kommentar (én tråd-dybde)
  parent_id uuid references public.comments (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);
alter table public.comments enable row level security;
create policy "comments: se" on public.comments for select to authenticated
  using (public.can_see_post(auth.uid(), post_id) and not public.is_blocked(auth.uid(), author_id));
create policy "comments: skriv" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_post(auth.uid(), post_id));
create policy "comments: slet" on public.comments for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
create policy "comment_likes: se" on public.comment_likes for select to authenticated using (true);
create policy "comment_likes: giv" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "comment_likes: fjern" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- Gemt er privat
create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.saves enable row level security;
create policy "saves: egne" on public.saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Skjult ("Ikke interesseret") er privat
create table public.hidden_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);
alter table public.hidden_posts enable row level security;
create policy "hidden: egne" on public.hidden_posts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Fællesskabsnoter (Offentlig debat)
-- ============================================================
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 10 and 280),
  sources text[] not null check (cardinality(sources) >= 1),
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;
-- Noter er anonyme i appen: forfatteren vises kun for forfatteren selv (via notes_for_post)
create policy "notes: se" on public.notes for select to authenticated using (public.can_see_post(auth.uid(), post_id));
create policy "notes: skriv" on public.notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id and p.kind = 'debat' and p.author_id <> auth.uid())
  );
create policy "notes: ret" on public.notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "notes: slet" on public.notes for delete to authenticated using (author_id = auth.uid());

create table public.note_ratings (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating text not null check (rating in ('ja', 'lidt', 'nej')),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
alter table public.note_ratings enable row level security;
create policy "ratings: egne" on public.note_ratings for select to authenticated using (user_id = auth.uid());
create policy "ratings: giv" on public.note_ratings for insert to authenticated
  with check (user_id = auth.uid() and not exists (select 1 from notes n where n.id = note_id and n.author_id = auth.uid()));
create policy "ratings: skift" on public.note_ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ratings: fjern" on public.note_ratings for delete to authenticated using (user_id = auth.uid());

-- Testfase: nye noter vises med det samme (som i prototypen).
-- Sæt til false for den rigtige regel: noten vises, når folk med forskellig holdning finder den hjælpsom.
create or replace function public.notes_show_immediately()
returns boolean language sql immutable as $$ select true $$;

-- Status pr. note: 'vist', 'forslag' eller 'ikke'.
-- Rigtig regel (forenklet "bridging"): mindst 2 hjælpsomme vurderinger fra både en, der er enig,
-- og en, der er uenig i opslaget, og mindst 2/3 af vurderingerne er hjælpsomme.
create or replace function public.note_status(n_id uuid)
returns text language sql stable security definer set search_path = public as $$
  with r as (
    select nr.rating, ps.stance
    from note_ratings nr
    join notes n on n.id = nr.note_id
    left join post_stances ps on ps.post_id = n.post_id and ps.user_id = nr.user_id
    where nr.note_id = n_id
  ),
  agg as (
    select
      count(*) as total,
      count(*) filter (where rating in ('ja', 'lidt')) as helpful,
      bool_or(rating in ('ja', 'lidt') and stance = 'enig') as helpful_enig,
      bool_or(rating in ('ja', 'lidt') and stance = 'uenig') as helpful_uenig
    from r
  )
  select case
    when total >= 5 and helpful * 3 < total then 'ikke'
    when notes_show_immediately() then 'vist'
    when helpful >= 2 and helpful * 3 >= total * 2 and coalesce(helpful_enig, false) and coalesce(helpful_uenig, false) then 'vist'
    else 'forslag'
  end
  from agg;
$$;

-- Alle noter på et opslag med status, antal vurderinger og din egen vurdering.
-- security definer for at kunne tælle vurderinger uden at vise, hvem der vurderede.
create or replace function public.notes_for_post(p_id uuid)
returns table (
  id uuid, text text, sources text[], created_at timestamptz, status text,
  ratings bigint, mine boolean, my_rating text, my_reasons text[]
)
language sql stable security definer set search_path = public as $$
  select
    n.id, n.text, n.sources, n.created_at, note_status(n.id),
    (select count(*) from note_ratings c where c.note_id = n.id),
    n.author_id = auth.uid(),
    nr.rating, coalesce(nr.reasons, '{}')
  from notes n
  left join note_ratings nr on nr.note_id = n.id and nr.user_id = auth.uid()
  where n.post_id = p_id and can_see_post(auth.uid(), p_id)
  order by n.created_at desc;
$$;

-- ============================================================
-- Rapporter
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('kategori', 'had', 'ulovligt', 'svindel', 'misinformation', 'boern', 'andet')),
  wrong_tags text[] not null default '{}',
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'ny' check (status in ('ny', 'behandlet')),
  created_at timestamptz not null default now(),
  check (post_id is not null or profile_id is not null)
);
alter table public.reports enable row level security;
-- Man kan kun indsende. Moderatorer læser via service role (Supabase-dashboardet).
create policy "reports: indsend" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- ============================================================
-- Beskeder
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Anmodning: modtageren følger ikke afsenderen. Skal accepteres, før man svarer.
  is_request boolean not null default false,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create or replace function public.is_member(c_id uuid, u_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = c_id and user_id = u_id);
$$;

alter table public.conversations enable row level security;
create policy "conv: se" on public.conversations for select to authenticated using (public.is_member(id, auth.uid()));
-- Oprettes via start_conversation()

alter table public.conversation_members enable row level security;
create policy "members: se" on public.conversation_members for select to authenticated
  using (public.is_member(conversation_id, auth.uid()));
create policy "members: ret egen" on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members: forlad" on public.conversation_members for delete to authenticated using (user_id = auth.uid());

-- OBS: beskeder er endnu IKKE end-to-end-krypterede (se plan). De er beskyttet af RLS og kryptering på serveren.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conv on public.messages (conversation_id, created_at desc);
alter table public.messages enable row level security;
create policy "messages: se" on public.messages for select to authenticated using (public.is_member(conversation_id, auth.uid()));
create policy "messages: send" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_member(conversation_id, auth.uid())
    -- Ingen beskeder til eller fra blokerede
    and not exists (
      select 1 from conversation_members m
      where m.conversation_id = messages.conversation_id and m.user_id <> auth.uid() and public.is_blocked(auth.uid(), m.user_id)
    )
  );

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  -- Svarer man, er anmodningen accepteret
  update conversation_members set is_request = false where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

-- Start (eller find) en direkte samtale, eller opret en gruppe ("cirkel")
create or replace function public.start_conversation(member_ids uuid[], group_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  others uuid[] := array(select distinct unnest(member_ids) except select me);
  c_id uuid;
  o uuid;
begin
  if me is null then raise exception 'Ikke logget ind'; end if;
  if cardinality(others) = 0 then raise exception 'Vælg mindst én'; end if;
  foreach o in array others loop
    if is_blocked(me, o) then raise exception 'Blokeret'; end if;
  end loop;
  -- Direkte samtale: genbrug den, der findes
  if cardinality(others) = 1 and group_name is null then
    select c.id into c_id from conversations c
    where not c.is_group
      and exists (select 1 from conversation_members where conversation_id = c.id and user_id = me)
      and exists (select 1 from conversation_members where conversation_id = c.id and user_id = others[1])
    limit 1;
    if c_id is not null then return c_id; end if;
  end if;
  insert into conversations (is_group, name, created_by)
    values (cardinality(others) > 1 or group_name is not null, group_name, me)
    returning id into c_id;
  insert into conversation_members (conversation_id, user_id) values (c_id, me);
  -- Er man ikke fulgt af modtageren, lander beskeden som anmodning
  insert into conversation_members (conversation_id, user_id, is_request)
    select c_id, x, not follows_accepted(x, me) from unnest(others) x;
  return c_id;
end $$;

-- Realtime for beskeder og notifikationer
alter publication supabase_realtime add table public.messages;

-- ============================================================
-- Notifikationer og push
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'follow_request', 'like', 'comment', 'note', 'message')),
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notif: egne" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif: læst" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.notifications;

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "push: egne" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify(recipient uuid, actor uuid, kind text, p_id uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, actor_id, type, post_id)
  select recipient, actor, kind, p_id
  where recipient <> actor and not is_blocked(recipient, actor);
$$;

create or replace function public.on_follow() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.followee_id, new.follower_id, case when new.status = 'pending' then 'follow_request' else 'follow' end);
  return new;
end $$;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow();

create or replace function public.on_like() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify((select author_id from posts where id = new.post_id), new.user_id, 'like', new.post_id);
  return new;
end $$;
create trigger likes_notify after insert on public.post_likes for each row execute function public.on_like();

create or replace function public.on_comment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify((select author_id from posts where id = new.post_id), new.author_id, 'comment', new.post_id);
  return new;
end $$;
create trigger comments_notify after insert on public.comments for each row execute function public.on_comment();

create or replace function public.on_note() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Noter er anonyme: forfatteren af opslaget får besked uden afsender
  insert into notifications (user_id, type, post_id)
  select author_id, 'note', new.post_id from posts where id = new.post_id;
  return new;
end $$;
create trigger notes_notify after insert on public.notes for each row execute function public.on_note();

-- ============================================================
-- Feeds (én forespørgsel giver opslag + forfatter + tal + dine valg)
-- ============================================================
create or replace view public.post_cards with (security_invoker = true) as
select
  p.id, p.kind, p.text, p.image_paths, p.tags, p.allow_share, p.created_at,
  p.author_id, a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  a.public_kind as author_public_kind,
  (select count(*) from post_likes l where l.post_id = p.id) as likes,
  (select count(*) from comments c where c.post_id = p.id) as comments,
  exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked,
  exists (select 1 from saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved,
  (select stance from post_stances s where s.post_id = p.id and s.user_id = auth.uid()) as my_stance
from posts p
join profiles a on a.id = p.author_id;

-- Enig/uenig-tal (uden at afsløre hvem)
create or replace function public.stance_counts(p_id uuid)
returns table (agree bigint, disagree bigint)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where stance = 'enig'),
    count(*) filter (where stance = 'uenig')
  from post_stances
  where post_id = p_id and can_see_post(auth.uid(), p_id);
$$;

-- Hjem: dine egne og dem, du følger
create or replace function public.feed_home(before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'feed'
    and pc.created_at < before
    and (pc.author_id = auth.uid() or follows_accepted(auth.uid(), pc.author_id))
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
  order by pc.created_at desc
  limit max_rows;
$$;

-- Offentlig debat: opslag om dine aktive interesser, uden dem du har skjult
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

-- ============================================================
-- Billeder (privat bucket: kun loggede ind kan hente, og kun ejeren kan uploade i sin mappe)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "media: hent" on storage.objects for select to authenticated using (bucket_id = 'media');
create policy "media: upload i egen mappe" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: slet egne" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Slet konto (fjerner brugeren og alt indhold via cascade)
-- ============================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from anon;

-- ===== 20261126010000_feed.sql =====
-- Kommentarer med forfatter, antal hjerter, antal svar og om du selv har givet hjerte.
-- security_invoker: reglerne på comments/profiles gælder stadig (blokerede vises ikke).
create or replace view public.comment_cards with (security_invoker = true) as
select
  c.id, c.post_id, c.author_id, c.parent_id, c.text, c.created_at,
  a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  (select count(*) from comment_likes l where l.comment_id = c.id) as likes,
  exists (select 1 from comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked,
  (select count(*) from comments r where r.parent_id = c.id) as replies
from comments c
join profiles a on a.id = c.author_id;

revoke all on public.comment_cards from anon;
grant select on public.comment_cards to authenticated;

-- ===== 20261126030000_messages.sql =====
-- Beskeder: én forespørgsel til samtalelisten.
-- security invoker: RLS gælder, så man kun ser egne samtaler.
create or replace function public.my_conversations()
returns table (
  id uuid,
  is_group boolean,
  name text,
  last_message_at timestamptz,
  last_body text,
  last_sender_id uuid,
  last_read_at timestamptz,
  is_request boolean,
  has_messages boolean,
  members jsonb
)
language sql stable security invoker set search_path = public as $$
  select
    c.id, c.is_group, c.name, c.last_message_at,
    lm.body, lm.sender_id,
    me.last_read_at, me.is_request,
    lm.id is not null,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'name', p.name, 'avatar_path', p.avatar_path) order by p.name)
      from conversation_members m join profiles p on p.id = m.user_id
      where m.conversation_id = c.id and m.user_id <> auth.uid()
    ), '[]'::jsonb)
  from conversations c
  join conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  left join lateral (
    select ms.id, ms.body, ms.sender_id from messages ms
    where ms.conversation_id = c.id order by ms.created_at desc limit 1
  ) lm on true
  order by c.last_message_at desc;
$$;

-- Beskeder giver ikke en notifikation i listen (de har deres egen ulæst-prik).
-- Push for beskeder sendes af Edge Function "push" via en webhook på messages-tabellen.
drop trigger if exists messages_notify on public.messages;
drop function if exists public.on_message();

-- ===== 20261126040000_profile.sql =====
-- Profilsider: ét kald giver hovedet (tal, følgestatus, blokering).

-- Profil efter brugernavn. Har de blokeret dig, findes de ikke. Har du blokeret dem, får du kun navnet.
create or replace function public.profile_view(uname text)
returns table (
  id uuid, username text, name text, bio text, avatar_path text, is_private boolean, public_kind text,
  i_blocked boolean, follows_me boolean, my_follow text, can_see boolean,
  posts bigint, debate_posts bigint, followers bigint, following bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.username::text, p.name, p.bio, p.avatar_path, p.is_private, p.public_kind,
    exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id),
    follows_accepted(p.id, auth.uid()),
    (select f.status from follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    can_see_content(auth.uid(), p.id),
    (select count(*) from posts x where x.author_id = p.id and x.kind = 'feed'),
    (select count(*) from posts x where x.author_id = p.id and x.kind = 'debat'),
    (select count(*) from follows f where f.followee_id = p.id and f.status = 'accepted'),
    (select count(*) from follows f where f.follower_id = p.id and f.status = 'accepted')
  from profiles p
  where p.username = uname::citext
    and not exists (select 1 from blocks b where b.blocker_id = p.id and b.blocked_id = auth.uid());
$$;

-- Dem, du har blokeret (profiles-reglen skjuler dem ellers)
create or replace function public.my_blocked()
returns table (id uuid, username text, name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.name, p.avatar_path
  from blocks b join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- ===== 20261126050000_grants.sql =====
-- Adgang for loggede ind brugere til tabeller og funktioner.
-- Hvad de faktisk må se og ændre, styres af reglerne (RLS) på hver tabel.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ===== 20261127000000_signup.sql =====
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

-- ===== 20261127100000_shared.sql =====
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

-- ===== 20261127110000_moments.sql =====
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

-- ===== 20261127120000_flicks.sql =====
-- Flicks: korte lodrette videoer og billeder (opslag med kind = 'flick').
-- Interesser: flicks om dine aktive interesser (alle, hvis du ingen har valgt).
-- Følger: flicks fra dem, du følger.

create or replace function public.feed_flicks(mode text default 'interesser', before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'flick'
    and pc.created_at < before
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
    and (
      (mode = 'foelger' and follows_accepted(auth.uid(), pc.author_id))
      or (
        mode = 'interesser'
        and not exists (select 1 from debate_mutes m where m.user_id = auth.uid() and m.muted_id = pc.author_id)
        and (
          pc.author_id = auth.uid()
          or not exists (select 1 from interests i where i.user_id = auth.uid() and i.active)
          or pc.tags && array(select topic from interests i where i.user_id = auth.uid() and i.active)
        )
      )
    )
  order by pc.created_at desc
  limit max_rows;
$$;

revoke all on function public.feed_flicks(text, timestamptz, int) from anon;
grant execute on function public.feed_flicks(text, timestamptz, int) to authenticated;

-- Flicks skal have en video eller et billede og højst 5 tags
alter table public.posts drop constraint if exists posts_flick_media;
alter table public.posts add constraint posts_flick_media check (kind <> 'flick' or cardinality(image_paths) >= 1);

-- ===== 20261127130000_market.sql =====
-- Torvet: annoncer i nærheden, "Til dig" ud fra sete annoncer, gemte annoncer og besked med annoncen som kontekst.
-- Placering gemmes kun afrundet (ca. 1 km), og kun brugeren selv kan læse sin egen.

-- ============================================================
-- Din placering (kun din egen række)
-- ============================================================
create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  city text not null default '' check (char_length(city) <= 80),
  updated_at timestamptz not null default now()
);
alter table public.user_locations enable row level security;
drop policy if exists "locations: egen" on public.user_locations;
create policy "locations: egen" on public.user_locations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Afrund til ca. 1 km (2 decimaler), før det gemmes
create or replace function public.round_location() returns trigger language plpgsql as $$
begin
  new.lat := round(new.lat::numeric, 2)::double precision;
  new.lng := round(new.lng::numeric, 2)::double precision;
  return new;
end $$;
drop trigger if exists user_locations_round on public.user_locations;
create trigger user_locations_round before insert or update on public.user_locations for each row execute function public.round_location();

-- ============================================================
-- Annoncer
-- ============================================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  price integer not null check (price >= 0 and price <= 10000000),
  category text not null default 'Fritid' check (category in ('Møbler', 'Cykler', 'Børn', 'Elektronik', 'Fritid')),
  condition text not null default 'God' check (condition in ('Ny', 'Som ny', 'God', 'Brugt')),
  image_paths text[] not null check (cardinality(image_paths) between 1 and 10),
  city text not null default '' check (char_length(city) <= 80),
  lat double precision not null,
  lng double precision not null,
  shipping boolean not null default false,
  sold boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists listings_created on public.listings (created_at desc) where not sold;
create index if not exists listings_seller on public.listings (seller_id, created_at desc);

drop trigger if exists listings_round on public.listings;
create trigger listings_round before insert or update on public.listings for each row execute function public.round_location();

alter table public.listings enable row level security;
-- Alle loggede ind ser annoncer, der ikke er solgt (undtagen ved blokering). Sælgeren ser altid sine egne.
drop policy if exists "listings: se" on public.listings;
create policy "listings: se" on public.listings for select to authenticated
  using (seller_id = auth.uid() or (not sold and not public.is_blocked(auth.uid(), seller_id)));
drop policy if exists "listings: opret" on public.listings;
create policy "listings: opret" on public.listings for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists "listings: ret" on public.listings;
create policy "listings: ret" on public.listings for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists "listings: slet" on public.listings;
create policy "listings: slet" on public.listings for delete to authenticated using (seller_id = auth.uid());

-- Sete annoncer (til "Til dig") – private
create table if not exists public.listing_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.listing_views enable row level security;
drop policy if exists "views: egne" on public.listing_views;
create policy "views: egne" on public.listing_views for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Gemte annoncer – private
create table if not exists public.listing_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.listing_saves enable row level security;
drop policy if exists "listing_saves: egne" on public.listing_saves;
create policy "listing_saves: egne" on public.listing_saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Besked kan pege på en annonce (vises som kort i samtalen)
alter table public.messages add column if not exists listing_id uuid references public.listings (id) on delete set null;

-- Rapportér en annonce
alter table public.reports add column if not exists listing_id uuid references public.listings (id) on delete set null;
alter table public.reports drop constraint if exists reports_check;
alter table public.reports add constraint reports_check check (post_id is not null or profile_id is not null or listing_id is not null);

-- ============================================================
-- Afstand (haversine, km) og annoncer i nærheden
-- ============================================================
create or replace function public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Kort til lister: annonce + sælger + afstand + gemt
drop function if exists public.listings_near(double precision, double precision, double precision, text, timestamptz, int);
create or replace function public.listings_near(
  lat double precision,
  lng double precision,
  km double precision default null,   -- null = hele landet
  category text default null,
  before timestamptz default now(),
  max_rows int default 40
)
returns table (
  id uuid, seller_id uuid, title text, description text, price integer, category text, condition text,
  image_paths text[], city text, shipping boolean, created_at timestamptz, distance_km double precision,
  seller_name text, seller_username text, seller_avatar_path text, saved boolean
)
language sql stable security invoker set search_path = public as $$
  select l.id, l.seller_id, l.title, l.description, l.price, l.category, l.condition,
    l.image_paths, l.city, l.shipping, l.created_at,
    round(km_between(listings_near.lat, listings_near.lng, l.lat, l.lng)::numeric, 1)::double precision,
    p.name, p.username, p.avatar_path,
    exists (select 1 from listing_saves s where s.listing_id = l.id and s.user_id = auth.uid())
  from listings l
  join profiles p on p.id = l.seller_id
  where not l.sold
    and l.seller_id <> auth.uid()
    and l.created_at < before
    and (listings_near.category is null or l.category = listings_near.category)
    and (km is null or km_between(listings_near.lat, listings_near.lng, l.lat, l.lng) <= km)
  order by l.created_at desc
  limit max_rows;
$$;

-- Kategorier, du senest har kigget på (nyeste først) – til "Til dig"
create or replace function public.my_recent_listing_categories()
returns table (category text) language sql stable security invoker set search_path = public as $$
  select l.category from listing_views v join listings l on l.id = v.listing_id
  where v.user_id = auth.uid()
  group by l.category
  order by max(v.viewed_at) desc;
$$;

grant select, insert, update, delete on public.user_locations, public.listings, public.listing_views, public.listing_saves to authenticated;
grant execute on function public.km_between(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.listings_near(double precision, double precision, double precision, text, timestamptz, int) to authenticated;
grant execute on function public.my_recent_listing_categories() to authenticated;
revoke all on public.user_locations, public.listings, public.listing_views, public.listing_saves from anon;

-- ===== 20261127140000_community.sql =====
-- Begivenheder, grupper og sider: kort med tal og dine egne valg (til lister i appen).
-- Alle views er security_invoker, så tabellernes regler (RLS) gælder.

-- Begivenheder: arrangør, dit svar, om du er inviteret, og antal deltagere
create or replace view public.event_cards with (security_invoker = true) as
select
  e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.cover_path, e.privacy, e.group_id, e.created_at,
  e.created_by, p.name as organizer_name, p.username as organizer_username, p.avatar_path as organizer_avatar_path,
  (select status from event_rsvps r where r.event_id = e.id and r.user_id = auth.uid()) as my_status,
  exists (select 1 from event_invites i where i.event_id = e.id and i.user_id = auth.uid()) as invited_me,
  (select count(*) from event_rsvps r where r.event_id = e.id and r.status = 'deltager') as going
from events e
join profiles p on p.id = e.created_by;
grant select on public.event_cards to authenticated;

-- Antal medlemmer skal kunne ses, også for private grupper (uden at vise hvem)
create or replace function public.group_member_count(g uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from group_members where group_id = g and status = 'medlem';
$$;

-- Grupper: antal medlemmer og din status/rolle
create or replace view public.group_cards with (security_invoker = true) as
select
  g.id, g.name, g.description, g.avatar_path, g.privacy, g.created_by, g.created_at,
  public.group_member_count(g.id) as members,
  (select status from group_members m where m.group_id = g.id and m.user_id = auth.uid()) as my_status,
  (select role from group_members m where m.group_id = g.id and m.user_id = auth.uid()) as my_role
from groups g;
grant select on public.group_cards to authenticated;

-- Sider: antal følgere, om du følger, og om du er administrator
create or replace view public.page_cards with (security_invoker = true) as
select
  pg.id, pg.handle, pg.name, pg.bio, pg.category, pg.avatar_path, pg.created_by, pg.created_at,
  (select count(*) from page_follows f where f.page_id = pg.id) as followers,
  exists (select 1 from page_follows f where f.page_id = pg.id and f.user_id = auth.uid()) as i_follow,
  exists (select 1 from page_admins a where a.page_id = pg.id and a.user_id = auth.uid()) as i_admin
from pages pg;
grant select on public.page_cards to authenticated;

-- Notifikationer: anmodning om at blive medlem af en gruppe → gruppens admins
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'like', 'comment', 'note', 'message', 'group_request', 'event_invite'));

create or replace function public.on_group_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'anmodet' then
    insert into notifications (user_id, actor_id, type)
    select m.user_id, new.user_id, 'group_request' from group_members m
    where m.group_id = new.group_id and m.role = 'admin' and m.status = 'medlem' and m.user_id <> new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists group_members_notify on public.group_members;
create trigger group_members_notify after insert on public.group_members for each row execute function public.on_group_request();

create or replace function public.on_event_invite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.user_id, new.invited_by, 'event_invite');
  return new;
end $$;
drop trigger if exists event_invites_notify on public.event_invites;
create trigger event_invites_notify after insert on public.event_invites for each row execute function public.on_event_invite();

grant execute on function public.group_member_count(uuid) to authenticated;

-- ===== 20261127150000_settings.sql =====
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

-- ===== 20261127160000_integration.sql =====
-- Samling af trin 2: notifikationer peger på den rigtige gruppe/begivenhed, og opslag kan deles som opslag.

-- Notifikationer: hvilken gruppe eller begivenhed handler det om?
alter table public.notifications add column if not exists group_id uuid references public.groups (id) on delete cascade;
alter table public.notifications add column if not exists event_id uuid references public.events (id) on delete cascade;

create or replace function public.on_group_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'anmodet' then
    insert into notifications (user_id, actor_id, type, group_id)
    select m.user_id, new.user_id, 'group_request', new.group_id from group_members m
    where m.group_id = new.group_id and m.role = 'admin' and m.status = 'medlem' and m.user_id <> new.user_id;
  end if;
  return new;
end $$;

create or replace function public.on_event_invite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type, event_id)
  select new.user_id, new.invited_by, 'event_invite', new.event_id
  where new.user_id <> new.invited_by and not is_blocked(new.user_id, new.invited_by);
  return new;
end $$;

-- Del som opslag: et nyt opslag, der viser det oprindelige indeni
alter table public.posts add column if not exists shared_post_id uuid references public.posts (id) on delete set null;

-- Man kan kun dele et opslag, man selv kan se, og som tillader deling
create or replace function public.check_shared_post() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shared_post_id is not null then
    if not can_see_post(new.author_id, new.shared_post_id)
       or not (select allow_share from posts where id = new.shared_post_id) then
      raise exception 'Opslaget kan ikke deles' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_check_shared on public.posts;
create trigger posts_check_shared before insert on public.posts for each row execute function public.check_shared_post();

-- Et opslag, der kun deler et andet opslag, må gerne være uden tekst og billeder
alter table public.posts drop constraint if exists posts_check;
alter table public.posts drop constraint if exists posts_text_or_media;
alter table public.posts add constraint posts_text_or_media
  check (char_length(text) > 0 or cardinality(image_paths) > 0 or shared_post_id is not null);

-- post_cards får det delte opslags id til sidst (nye kolonner skal stå sidst i et view)
create or replace view public.post_cards with (security_invoker = true) as
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
  (select stance from post_stances s where s.post_id = p.id and s.user_id = auth.uid()) as my_stance,
  p.shared_post_id
from posts p
join profiles a on a.id = p.author_id
left join groups g on g.id = p.group_id
left join events e on e.id = p.event_id
left join pages pg on pg.id = p.page_id;
grant select on public.post_cards to authenticated;
