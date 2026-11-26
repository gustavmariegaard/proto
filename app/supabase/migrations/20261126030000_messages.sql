-- Beskeder: én forespørgsel til samtalelisten.
-- security invoker: RLS gælder, så man kun ser egne samtaler.
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
  members jsonb
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
    ), '[]'::jsonb)
  from conversations c
  join conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  left join lateral (
    select ms.id, ms.body, ms.sender_id from messages ms
    where ms.conversation_id = c.id order by ms.created_at desc limit 1
  ) lm on true
  order by c.last_message_at desc;
$$;

-- Beskeder giver ikke en notifikation i listen (de har deres egen ulæst-prik).
-- Push for beskeder sendes af Edge Function "push" via en webhook på messages-tabellen.
drop trigger if exists messages_notify on public.messages;
drop function if exists public.on_message();
