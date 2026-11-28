-- Sider: dine egne sider vises under Interesser (opslag og moments), og sider skriver ikke i Offentlig debat.

-- Hjem → Interesser: opslag fra sider, du følger, og sider, du selv står bag
create or replace function public.feed_interests(before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'feed'
    and pc.page_id is not null
    and (
      pc.page_id in (select page_id from page_follows where user_id = auth.uid())
      or is_page_admin(pc.page_id, auth.uid())
    )
    and pc.created_at < before
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
  order by pc.created_at desc
  limit max_rows;
$$;

-- Hjem → Interesser: moments fra sider, du følger, og dine egne sider
create or replace function public.page_moment_rings()
returns table (page_id uuid, handle text, name text, avatar_path text, count bigint, unseen boolean, latest timestamptz)
language sql stable security invoker set search_path = public as $$
  select
    mc.page_id, mc.page_handle::text, mc.page_name, mc.page_avatar_path,
    count(*), bool_or(not mc.seen and mc.author_id <> auth.uid()), max(mc.created_at)
  from moment_cards mc
  where (mc.page_id in (select page_id from page_follows where user_id = auth.uid()) or is_page_admin(mc.page_id, auth.uid()))
    and mc.expires_at > now()
  group by mc.page_id, mc.page_handle, mc.page_name, mc.page_avatar_path
  order by is_page_admin(mc.page_id, auth.uid()) desc, bool_or(not mc.seen and mc.author_id <> auth.uid()) desc, max(mc.created_at) desc;
$$;

-- Sider deltager ikke i Offentlig debat (kun almindelige opslag og flicks)
alter table public.posts drop constraint if exists posts_page_not_debate;
alter table public.posts add constraint posts_page_not_debate check (page_id is null or kind <> 'debat') not valid;
