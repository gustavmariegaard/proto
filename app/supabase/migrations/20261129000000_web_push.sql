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
