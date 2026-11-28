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
