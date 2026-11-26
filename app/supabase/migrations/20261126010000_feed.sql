-- Kommentarer med forfatter, antal hjerter, antal svar og om du selv har givet hjerte.
-- security_invoker: reglerne på comments/profiles gælder stadig (blokerede vises ikke).
create or replace view public.comment_cards with (security_invoker = true) as
select
  c.id, c.post_id, c.author_id, c.parent_id, c.text, c.created_at,
  a.username as author_username, a.name as author_name, a.avatar_path as author_avatar_path,
  (select count(*) from comment_likes l where l.comment_id = c.id) as likes,
  exists (select 1 from comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked,
  (select count(*) from comments r where r.parent_id = c.id) as replies
from comments c
join profiles a on a.id = c.author_id;

revoke all on public.comment_cards from anon;
grant select on public.comment_cards to authenticated;
