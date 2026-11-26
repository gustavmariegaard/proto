import { normalize } from './posts';
import { supabase } from './supabase';
import type { PostCard } from './types';

/* Begivenheder, grupper og sider. Databasens regler afgør, hvem der må se hvad. */

// ---------------- Begivenheder ----------------

export type Rsvp = 'interesseret' | 'deltager' | 'maaske' | 'deltager_ikke';

export const rsvpLabel: Record<Rsvp, string> = {
  interesseret: 'Interesseret',
  deltager: 'Deltager',
  maaske: 'Måske',
  deltager_ikke: 'Deltager ikke',
};
export const rsvpOrder: Rsvp[] = ['interesseret', 'deltager', 'maaske', 'deltager_ikke'];

export type EventCard = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  cover_path: string | null;
  privacy: 'offentlig' | 'inviterede';
  group_id: string | null;
  created_at: string;
  created_by: string;
  organizer_name: string;
  organizer_username: string;
  organizer_avatar_path: string | null;
  my_status: Rsvp | null;
  invited_me: boolean;
  going: number;
};

const ev = (e: EventCard): EventCard => ({ ...e, going: Number(e.going) });

export async function listEvents() {
  const { data } = await supabase.from('event_cards').select('*').order('starts_at', { ascending: true }).limit(200);
  return ((data ?? []) as EventCard[]).map(ev);
}

export async function getEvent(id: string) {
  const { data } = await supabase.from('event_cards').select('*').eq('id', id).maybeSingle();
  return data ? ev(data as EventCard) : null;
}

/** Dine: inviteret, svaret eller selv oprettet */
export const isMine = (e: EventCard, me: string) => e.created_by === me || e.invited_me || !!e.my_status;

export async function setRsvp(eventId: string, userId: string, status: Rsvp | null) {
  if (!status) return supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
  return supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() });
}

export type Guest = { id: string; name: string; username: string; avatar_path: string | null };

export async function eventGuests(eventId: string) {
  const [{ data: rs }, { data: inv }] = await Promise.all([
    supabase.from('event_rsvps').select('status, user:profiles!event_rsvps_user_id_fkey(id, name, username, avatar_path)').eq('event_id', eventId),
    supabase.from('event_invites').select('user_id, user:profiles!event_invites_user_id_fkey(id, name, username, avatar_path)').eq('event_id', eventId),
  ]);
  const by: Record<Rsvp, Guest[]> = { interesseret: [], deltager: [], maaske: [], deltager_ikke: [] };
  const answered = new Set<string>();
  for (const r of (rs ?? []) as any[]) {
    if (r.user) {
      by[r.status as Rsvp].push(r.user);
      answered.add(r.user.id);
    }
  }
  const invited = ((inv ?? []) as any[]).map((i) => i.user).filter((u: Guest | null) => u && !answered.has(u.id)) as Guest[];
  return { ...by, invited };
}

export async function invite(eventId: string, me: string, userIds: string[]) {
  if (!userIds.length) return { error: null };
  return supabase.from('event_invites').upsert(userIds.map((u) => ({ event_id: eventId, user_id: u, invited_by: me })), { ignoreDuplicates: true });
}

// ---------------- Grupper ----------------

export type GroupCard = {
  id: string;
  name: string;
  description: string;
  avatar_path: string | null;
  privacy: 'offentlig' | 'privat';
  created_by: string;
  created_at: string;
  members: number;
  my_status: 'medlem' | 'anmodet' | 'inviteret' | null;
  my_role: 'admin' | 'medlem' | null;
};

const gr = (g: GroupCard): GroupCard => ({ ...g, members: Number(g.members) });

export async function listGroups() {
  const { data } = await supabase.from('group_cards').select('*').order('created_at', { ascending: false }).limit(200);
  return ((data ?? []) as GroupCard[]).map(gr);
}

export async function getGroup(id: string) {
  const { data } = await supabase.from('group_cards').select('*').eq('id', id).maybeSingle();
  return data ? gr(data as GroupCard) : null;
}

/** Offentlig gruppe: bliv medlem med det samme. Privat: anmod. */
export async function joinGroup(g: GroupCard, me: string) {
  return supabase.from('group_members').insert({ group_id: g.id, user_id: me, status: g.privacy === 'offentlig' ? 'medlem' : 'anmodet' });
}

export async function leaveGroup(groupId: string, userId: string) {
  return supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
}

export type Member = Guest & { role: 'admin' | 'medlem'; status: 'medlem' | 'anmodet' | 'inviteret' };

export async function groupMembers(groupId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('role, status, user:profiles!group_members_user_id_fkey(id, name, username, avatar_path)')
    .eq('group_id', groupId);
  return ((data ?? []) as any[]).filter((m) => m.user).map((m) => ({ ...m.user, role: m.role, status: m.status })) as Member[];
}

// ---------------- Sider ----------------

export type PageCard = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  category: string;
  avatar_path: string | null;
  created_by: string;
  created_at: string;
  followers: number;
  i_follow: boolean;
  i_admin: boolean;
};

const pg = (p: PageCard): PageCard => ({ ...p, followers: Number(p.followers) });

export async function listPages() {
  const { data } = await supabase.from('page_cards').select('*').order('created_at', { ascending: false }).limit(200);
  return ((data ?? []) as PageCard[]).map(pg);
}

export async function getPage(handle: string) {
  const { data } = await supabase.from('page_cards').select('*').eq('handle', handle).maybeSingle();
  return data ? pg(data as PageCard) : null;
}

export async function setFollowPage(pageId: string, me: string, on: boolean) {
  if (on) return supabase.from('page_follows').insert({ page_id: pageId, user_id: me });
  return supabase.from('page_follows').delete().eq('page_id', pageId).eq('user_id', me);
}

// ---------------- Opslag i fællesskaber ----------------

export async function postsWhere(col: 'group_id' | 'event_id' | 'page_id', id: string) {
  const { data } = await supabase.from('post_cards').select('*').eq(col, id).order('created_at', { ascending: false }).limit(60);
  return ((data ?? []) as PostCard[]).map(normalize);
}

// ---------------- Datoer ----------------

const weekdays = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const two = (n: number) => String(n).padStart(2, '0');

/** "14" og "NOV" til datomærket */
export function dateBadge(iso: string) {
  const d = new Date(iso);
  return { day: two(d.getDate()), month: months[d.getMonth()]!.slice(0, 3).toUpperCase() };
}
/** "Lør 14. nov. · kl. 17.00" */
export function shortWhen(iso: string) {
  const d = new Date(iso);
  return `${cap(weekdays[d.getDay()]!.slice(0, 3))} ${d.getDate()}. ${months[d.getMonth()]!.slice(0, 3)}. · kl. ${two(d.getHours())}.${two(d.getMinutes())}`;
}
/** "Lørdag 14. november" */
export function longDate(iso: string) {
  const d = new Date(iso);
  return `${cap(weekdays[d.getDay()]!)} ${d.getDate()}. ${months[d.getMonth()]}`;
}
/** "Kl. 17.00 til 19.00" */
export function timeRange(start: string, end: string | null) {
  const a = new Date(start);
  const t = (d: Date) => `${two(d.getHours())}.${two(d.getMinutes())}`;
  return end ? `Kl. ${t(a)} til ${t(new Date(end))}` : `Kl. ${t(a)}`;
}
