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
