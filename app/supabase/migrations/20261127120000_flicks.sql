-- Flicks: korte lodrette videoer og billeder (opslag med kind = 'flick').
-- Interesser: flicks om dine aktive interesser (alle, hvis du ingen har valgt).
-- Følger: flicks fra dem, du følger.

create or replace function public.feed_flicks(mode text default 'interesser', before timestamptz default now(), max_rows int default 20)
returns setof public.post_cards language sql stable security invoker set search_path = public as $$
  select pc.* from post_cards pc
  where pc.kind = 'flick'
    and pc.created_at < before
    and not exists (select 1 from hidden_posts h where h.user_id = auth.uid() and h.post_id = pc.id)
    and (
      (mode = 'foelger' and follows_accepted(auth.uid(), pc.author_id))
      or (
        mode = 'interesser'
        and not exists (select 1 from debate_mutes m where m.user_id = auth.uid() and m.muted_id = pc.author_id)
        and (
          pc.author_id = auth.uid()
          or not exists (select 1 from interests i where i.user_id = auth.uid() and i.active)
          or pc.tags && array(select topic from interests i where i.user_id = auth.uid() and i.active)
        )
      )
    )
  order by pc.created_at desc
  limit max_rows;
$$;

revoke all on function public.feed_flicks(text, timestamptz, int) from anon;
grant execute on function public.feed_flicks(text, timestamptz, int) to authenticated;

-- Flicks skal have en video eller et billede og højst 5 tags
alter table public.posts drop constraint if exists posts_flick_media;
alter table public.posts add constraint posts_flick_media check (kind <> 'flick' or cardinality(image_paths) >= 1);
