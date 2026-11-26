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
