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
