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
