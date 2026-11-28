import { supabase } from './supabase';

export type Member = { id: string; username: string; name: string; avatar_path: string | null };

export type ConversationRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  last_message_at: string;
  last_body: string | null;
  last_sender_id: string | null;
  last_read_at: string;
  is_request: boolean;
  has_messages: boolean;
  members: Member[];
  /** Seneste besked er et opkald (efter trin 5); mangler på ældre databaser */
  last_kind?: 'text' | 'call' | null;
  last_call?: { video?: boolean; status?: string; seconds?: number } | null;
};

export async function myConversations() {
  const { data, error } = await supabase.rpc('my_conversations');
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

/** Navnet på en samtale: gruppens navn, ellers de andres fornavne */
export function conversationTitle(c: Pick<ConversationRow, 'is_group' | 'name' | 'members'>) {
  if (c.name) return c.name;
  if (!c.members.length) return 'Kun dig';
  if (c.members.length === 1) return c.members[0]!.name;
  return c.members.map((m) => m.name.split(' ')[0]).join(', ');
}

export const isUnread = (c: ConversationRow, me: string) =>
  c.has_messages && c.last_sender_id !== me && new Date(c.last_message_at) > new Date(c.last_read_at);

export async function markRead(conversationId: string, me: string) {
  await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', me);
}
