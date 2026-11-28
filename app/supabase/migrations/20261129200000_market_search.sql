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
