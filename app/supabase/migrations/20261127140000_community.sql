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
