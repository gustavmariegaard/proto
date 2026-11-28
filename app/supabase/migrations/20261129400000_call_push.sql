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
