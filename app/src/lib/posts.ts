import { supabase } from './supabase';
import type { PostCard, Stance } from './types';

/* Handlinger på opslag. Alle tjekkes af databasens regler (RLS). */

export async function setLike(postId: string, userId: string, on: boolean) {
  if (on) await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  else await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
}

export async function setSaved(postId: string, userId: string, on: boolean) {
  if (on) await supabase.from('saves').insert({ post_id: postId, user_id: userId });
  else await supabase.from('saves').delete().eq('post_id', postId).eq('user_id', userId);
}

/** null fjerner din stemme */
export async function setStance(postId: string, userId: string, stance: Stance | null) {
  if (stance) await supabase.from('post_stances').upsert({ post_id: postId, user_id: userId, stance });
  else await supabase.from('post_stances').delete().eq('post_id', postId).eq('user_id', userId);
}

export async function stanceCounts(postId: string) {
  const { data } = await supabase.rpc('stance_counts', { p_id: postId });
  const row = (data as { agree: number; disagree: number }[] | null)?.[0];
  return { agree: Number(row?.agree ?? 0), disagree: Number(row?.disagree ?? 0) };
}

export async function hidePost(postId: string, userId: string, on = true) {
  if (on) await supabase.from('hidden_posts').insert({ post_id: postId, user_id: userId });
  else await supabase.from('hidden_posts').delete().eq('post_id', postId).eq('user_id', userId);
}

export async function deletePost(postId: string) {
  return supabase.from('posts').delete().eq('id', postId);
}

export async function muteInDebate(userId: string, mutedId: string, on = true) {
  if (on) await supabase.from('debate_mutes').insert({ user_id: userId, muted_id: mutedId });
  else await supabase.from('debate_mutes').delete().eq('user_id', userId).eq('muted_id', mutedId);
}

export async function getPost(id: string) {
  const { data } = await supabase.from('post_cards').select('*').eq('id', id).maybeSingle();
  return data as PostCard | null;
}

/** Normaliserer tal fra Postgres (bigint kommer som tekst/tal) */
export const normalize = (p: PostCard): PostCard => ({ ...p, likes: Number(p.likes), comments: Number(p.comments) });
