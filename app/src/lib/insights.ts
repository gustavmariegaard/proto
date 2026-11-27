import { supabase } from './supabase';

/*
 * Analytics: appen melder, hvilke opslag man har set, og hvilke profiler man har besøgt.
 * Visninger samles og sendes samlet hvert par sekunder (højst én pr. opslag pr. dag tæller i databasen).
 */

const queue = new Set<string>();
const sent = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const ids = [...queue];
  queue.clear();
  if (ids.length) supabase.rpc('record_views', { ids }).then(() => {}, () => {});
}

/** Et opslag er blevet vist (egne opslag tæller ikke) */
export function trackView(postId: string, authorId: string, meId: string) {
  if (authorId === meId || sent.has(postId)) return;
  sent.add(postId);
  queue.add(postId);
  if (!timer) timer = setTimeout(flush, 2000);
}

/** En profil er blevet besøgt */
export function trackVisit(profileId: string, meId: string) {
  if (profileId === meId) return;
  supabase.rpc('record_profile_visit', { p: profileId }).then(() => {}, () => {});
}

export type Insights = {
  days: number;
  reach: number;
  reach_prev: number;
  views: number;
  views_prev: number;
  visits: number;
  visits_prev: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  interactions_prev: number;
  followers: number;
  new_followers: number;
  new_followers_prev: number;
  reach_followers: number;
  series: { day: string; views: number; followers: number }[];
  top: { id: string; kind: string; text: string; image_paths: string[]; media_type: 'image' | 'video'; created_at: string; views: number; likes: number; comments: number }[];
};

export async function myInsights(days: number): Promise<Insights | null> {
  const { data, error } = await supabase.rpc('my_insights', { days });
  if (error) return null;
  return data as Insights;
}
