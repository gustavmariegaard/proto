import { supabase } from './supabase';
import type { Note, Rating } from './types';

/** Grunde, man kan vælge efter sin vurdering (som på X) */
export const reasons = {
  god: ['Gode kilder', 'Let at forstå', 'Svarer direkte på påstanden', 'Giver vigtig kontekst', 'Neutralt sprog'],
  daarlig: ['Mangler kilder', 'Mening eller gætværk', 'Usaglig eller partisk', 'Overser vigtige punkter', 'Opslaget behøver ingen note'],
};

export const statusLabel = { vist: 'Vises på opslaget', forslag: 'Kræver flere vurderinger', ikke: 'Ikke vurderet hjælpsom' } as const;

export async function notesFor(postId: string) {
  const { data } = await supabase.rpc('notes_for_post', { p_id: postId });
  const notes = ((data ?? []) as Note[]).map((n) => ({ ...n, ratings: Number(n.ratings) }));
  // Kun én note vises på opslaget: den nyeste med status "vist"
  const shown = notes.find((n) => n.status === 'vist');
  return notes.map((n) => (n.status === 'vist' && n.id !== shown?.id ? { ...n, status: 'forslag' as const } : n));
}

export async function addNote(postId: string, userId: string, text: string, sources: string[]) {
  return supabase.from('notes').insert({ post_id: postId, author_id: userId, text, sources });
}

export async function editNote(id: string, text: string, sources: string[]) {
  return supabase.from('notes').update({ text, sources }).eq('id', id);
}

export async function deleteNote(id: string) {
  return supabase.from('notes').delete().eq('id', id);
}

export async function rateNote(noteId: string, userId: string, rating: Rating | null, reasons: string[] = []) {
  if (!rating) return supabase.from('note_ratings').delete().eq('note_id', noteId).eq('user_id', userId);
  return supabase.from('note_ratings').upsert({ note_id: noteId, user_id: userId, rating, reasons });
}
