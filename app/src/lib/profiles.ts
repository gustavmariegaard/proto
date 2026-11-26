import { supabase } from './supabase';
import { normalize } from './posts';
import type { PostCard, PublicKind } from './types';

/** Hovedet på en profilside (fra profile_view i databasen) */
export type ProfileView = {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_path: string | null;
  is_private: boolean;
  public_kind: PublicKind;
  i_blocked: boolean;
  follows_me: boolean;
  my_follow: 'accepted' | 'pending' | null;
  can_see: boolean;
  posts: number;
  debate_posts: number;
  followers: number;
  following: number;
};

export async function profileView(username: string): Promise<ProfileView | null> {
  const { data } = await supabase.rpc('profile_view', { uname: username });
  const r = (data as any[] | null)?.[0];
  if (!r) return null;
  return {
    ...r,
    posts: Number(r.posts),
    debate_posts: Number(r.debate_posts),
    followers: Number(r.followers),
    following: Number(r.following),
  };
}

/** Opslag fra en profil, som du må se (reglerne i databasen filtrerer) */
export async function postsBy(authorId: string) {
  const { data } = await supabase.from('post_cards').select('*').eq('author_id', authorId).order('created_at', { ascending: false }).limit(60);
  return ((data ?? []) as PostCard[]).map(normalize);
}

export async function follow(me: string, them: string) {
  return supabase.from('follows').insert({ follower_id: me, followee_id: them });
}

export async function unfollow(me: string, them: string) {
  return supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', them);
}

/** Grunde til at anmelde (samme liste som i prototypen) */
export const reportReasons = [
  { id: 'had', title: 'Hadefuldt eller truende' },
  { id: 'ulovligt', title: 'Ulovligt indhold' },
  { id: 'svindel', title: 'Svindel eller falsk profil' },
  { id: 'misinformation', title: 'Misinformation' },
  { id: 'boern', title: 'Børns sikkerhed' },
  { id: 'andet', title: 'Andet' },
];
