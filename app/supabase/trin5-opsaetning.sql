-- ciircle trin 5: push-notifikationer, opkald, bedre søgning på Torvet og sider (skift mellem din profil og dine sider).
-- Kør trin3-og-4-opsaetning.sql først, hvis du ikke allerede har gjort det.
-- Kopiér HELE filen ind i Supabase → SQL Editor → New query, og tryk Run. Den kan køres flere gange uden skade.


-- ===== 20261129000000_web_push.sql =====
-- Trin 5: push-notifikationer i browseren (også på iPhone, når appen er lagt på hjemmeskærmen).
-- Alt er gratis: browseren leverer selv beskeden (Apple/Google/Mozilla), og nøglerne laves af
-- Edge Function "push" første gang og gemmes her i databasen, så ingen skal håndtere hemmeligheder.

create extension if not exists pg_net with schema extensions;

-- ============================================================
-- Hvilke enheder (browsere) en bruger vil have push på
-- ============================================================
create table if not exists public.web_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists web_push_user on public.web_push_subscriptions (user_id);
alter table public.web_push_subscriptions enable row level security;
drop policy if exists "webpush: egne" on public.web_push_subscriptions;
create policy "webpush: egne" on public.web_push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.web_push_subscriptions to authenticated;

-- Hvad man vil have push om (tom = alt slået til)
alter table public.user_settings add column if not exists push_prefs jsonb not null default '{}'::jsonb;

-- ============================================================
-- Opsætning, som kun databasen og Edge Function kan se (ingen adgang fra appen)
-- ============================================================
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  function_url text not null,
  hook_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  vapid_public text,
  vapid_private text
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (function_url)
values ('https://pgxpcrynivyvfivxalxr.supabase.co/functions/v1/push')
on conflict (id) do nothing;

-- Appen må kun kende den offentlige nøgle
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public as $$
  select vapid_public from push_config where id = 1;
$$;
grant execute on function public.push_public_key() to authenticated;

-- ============================================================
-- Ny notifikation eller besked: bed Edge Function om at sende push (i baggrunden)
-- ============================================================
create or replace function public.push_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg push_config;
begin
  select * into cfg from push_config where id = 1;
  if cfg.function_url is null then
    return new;
  end if;
  perform net.http_post(
    url := cfg.function_url,
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', cfg.hook_secret),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- Push må aldrig forhindre, at selve notifikationen eller beskeden gemmes
  return new;
end $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.push_notify();
drop trigger if exists messages_push on public.messages;
create trigger messages_push after insert on public.messages for each row execute function public.push_notify();


-- ===== 20261129100000_calls.sql =====
-- Beskeder og opkald: opkald logges i samtalen, man kan slette sine egne beskeder,
-- og man kan se, hvornår den anden sidst har læst (til "Set").

-- ============================================================
-- Opkald som en særlig slags besked ("Opkald · 2:13", "Ubesvaret opkald")
-- ============================================================
alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'call'));
-- { video: bool, status: 'ended' | 'missed' | 'declined' | 'busy', seconds: int }
alter table public.messages add column if not exists call jsonb;
alter table public.messages drop constraint if exists messages_call_check;
alter table public.messages add constraint messages_call_check check (
  (kind = 'text' and call is null)
  or (kind = 'call' and call is not null and octet_length(call::text) <= 300 and call->>'status' in ('ended', 'missed', 'declined', 'busy'))
);

-- Opkald kun i samtaler med præcis én anden (ikke cirkler)
create or replace function public.check_call_message() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'call' then
    if (select is_group from conversations where id = new.conversation_id)
       or (select count(*) from conversation_members where conversation_id = new.conversation_id) <> 2 then
      raise exception 'Opkald kun mellem to personer' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_call_check on public.messages;
create trigger messages_call_check before insert on public.messages for each row execute function public.check_call_message();

-- ============================================================
-- Slet egne beskeder
-- ============================================================
drop policy if exists "messages: slet egen" on public.messages;
create policy "messages: slet egen" on public.messages for delete to authenticated using (sender_id = auth.uid());
grant delete on public.messages to authenticated;

-- Samtalelisten: seneste besked kan være et opkald
drop function if exists public.my_conversations();
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
  members jsonb,
  last_kind text,
  last_call jsonb
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
    ), '[]'::jsonb),
    lm.kind, lm.call
  from conversations c
  join conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  left join lateral (
    select ms.id, ms.body, ms.sender_id, ms.kind, ms.call from messages ms
    where ms.conversation_id = c.id order by ms.created_at desc limit 1
  ) lm on true
  order by c.last_message_at desc;
$$;
grant execute on function public.my_conversations() to authenticated;


-- ===== 20261129200000_market_search.sql =====
-- Torvet: søgning der virker. Hele landet, også dine egne annoncer, fuldtekst på dansk,
-- begyndelsen af ord ("pole" finder Polestar), stavefejl ("polstar") og kategorier som synonymer ("bil").

create extension if not exists pg_trgm with schema extensions;

-- ============================================================
-- Nye kategorier: Biler og Tøj
-- ============================================================
alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('Møbler', 'Cykler', 'Børn', 'Elektronik', 'Fritid', 'Biler', 'Tøj'));

-- Eksisterende annoncer, der ligner biler, flyttes til Biler
update public.listings set category = 'Biler'
where category = 'Fritid'
  and lower(title || ' ' || description) ~ '(\m(bil|biler|elbil|stationcar|varebil|hybridbil|personbil|polestar|tesla|volvo|vw|volkswagen|toyota|skoda|škoda|audi|bmw|mercedes|ford|peugeot|kia|hyundai|renault|citroën|citroen|opel|nissan|mazda|fiat|seat|cupra|mg|byd|honda|suzuki|dacia|mini|lexus|jaguar|porsche|subaru|mitsubishi|jeep|land rover|xpeng|nio|lynk)\M)';

-- ============================================================
-- Søgetekst: titel, kategori (med synonymer) og beskrivelse
-- ============================================================
create or replace function public.listing_category_words(c text) returns text language sql immutable as $$
  select case c
    when 'Biler' then 'bil biler auto elbil køretøj'
    when 'Cykler' then 'cykel cykler'
    when 'Tøj' then 'tøj beklædning'
    when 'Elektronik' then 'elektronik'
    when 'Møbler' then 'møbel møbler'
    when 'Børn' then 'børn barn baby'
    when 'Fritid' then 'fritid'
    else '' end;
$$;

alter table public.listings drop column if exists search;
alter table public.listings add column search tsvector generated always as (
  setweight(to_tsvector('danish'::regconfig, coalesce(title, '')), 'A') ||
  setweight(to_tsvector('danish'::regconfig, coalesce(category, '') || ' ' || public.listing_category_words(category)), 'B') ||
  setweight(to_tsvector('danish'::regconfig, coalesce(description, '')), 'C')
) stored;
create index if not exists listings_search on public.listings using gin (search);
create index if not exists listings_title_trgm on public.listings using gin (lower(title) extensions.gin_trgm_ops);

-- ============================================================
-- Søg: hele landet, sorteret efter hvor godt det passer, derefter afstand
-- ============================================================
drop function if exists public.search_listings(text, double precision, double precision, int);
create or replace function public.search_listings(
  q text,
  lat double precision default null,
  lng double precision default null,
  max_rows int default 60
)
returns table (
  id uuid, seller_id uuid, title text, description text, price integer, category text, condition text,
  image_paths text[], city text, shipping boolean, created_at timestamptz, distance_km double precision,
  seller_name text, seller_username text, seller_avatar_path text, saved boolean, score real
)
language sql stable security invoker set search_path = public, extensions as $$
  with input as (
    select lower(trim(coalesce(q, ''))) as raw
  ),
  words as (
    select array_agg(w) as ws
    from input, regexp_split_to_table(input.raw, '[^[:alnum:]æøåäöüé]+') as w
    where w <> ''
  ),
  query as (
    select input.raw,
      -- Hvert ord som begyndelse af et ord: "pole 2" -> pole:* & 2:*
      case when words.ws is null then null
        else to_tsquery('danish', array_to_string(array(select quote_literal(w) || ':*' from unnest(words.ws) w), ' & '))
      end as prefix,
      websearch_to_tsquery('danish', input.raw) as web
    from input, words
  )
  select l.id, l.seller_id, l.title, l.description, l.price, l.category, l.condition,
    l.image_paths, l.city, l.shipping, l.created_at,
    case when search_listings.lat is null or search_listings.lng is null then null
      else round(km_between(search_listings.lat, search_listings.lng, l.lat, l.lng)::numeric, 1)::double precision end,
    p.name, p.username, p.avatar_path,
    exists (select 1 from listing_saves s where s.listing_id = l.id and s.user_id = auth.uid()),
    (
      coalesce(ts_rank(l.search, query.web), 0) * 4
      + coalesce(ts_rank(l.search, query.prefix), 0) * 2
      + case when lower(l.title) like '%' || query.raw || '%' then 1.5 else 0 end
      + case when lower(l.title) like query.raw || '%' then 1 else 0 end
      + word_similarity(query.raw, lower(l.title))
    )::real as score
  from listings l
  join profiles p on p.id = l.seller_id
  cross join query
  where not l.sold
    and length(query.raw) > 0
    and (
      (query.web is not null and l.search @@ query.web)
      or (query.prefix is not null and l.search @@ query.prefix)
      or lower(l.title) like '%' || query.raw || '%'
      or lower(l.description) like '%' || query.raw || '%'
      or (length(query.raw) >= 4 and word_similarity(query.raw, lower(l.title)) > 0.5)
    )
  order by score desc,
    case when search_listings.lat is null then 0 else km_between(search_listings.lat, search_listings.lng, l.lat, l.lng) end asc,
    l.created_at desc
  limit greatest(1, least(max_rows, 100));
$$;
grant execute on function public.search_listings(text, double precision, double precision, int) to authenticated;
grant execute on function public.listing_category_words(text) to authenticated;


-- ===== 20261129300000_pages_acting.sql =====
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


-- ===== 20261129400000_call_push.sql =====
-- Opkald: "X ringer til dig" som push, så man kan tage opkaldet, selv om appen er lukket.
-- Appen kalder ring_push, når den ringer op. Kun mellem to personer i en fælles 1:1-samtale, og ikke ved blokering.

create or replace function public.ring_push(callee uuid, conversation uuid, video boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  cfg push_config;
begin
  if auth.uid() is null or callee = auth.uid() then
    return;
  end if;
  -- Samtalen skal være en 1:1-samtale mellem netop de to
  if not exists (
    select 1 from conversations c
    where c.id = conversation and not c.is_group
      and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid())
      and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = callee)
  ) or is_blocked(callee, auth.uid()) then
    return;
  end if;
  select * into cfg from push_config where id = 1;
  if cfg.function_url is null then
    return;
  end if;
  perform net.http_post(
    url := cfg.function_url,
    body := jsonb_build_object('type', 'INSERT', 'table', 'ring', 'record',
      jsonb_build_object('caller', auth.uid(), 'callee', callee, 'conversation_id', conversation, 'video', video)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', cfg.hook_secret),
    timeout_milliseconds := 5000
  );
exception when others then
  return;
end $$;
grant execute on function public.ring_push(uuid, uuid, boolean) to authenticated;
