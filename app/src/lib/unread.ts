import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './session';

type Unread = { messages: number; notifications: number };

/** Ulæste beskeder og notifikationer (opdateres live) */
export function useUnread(): Unread {
  const { session } = useSession();
  const uid = session?.user.id;
  const [u, setU] = useState<Unread>({ messages: 0, notifications: 0 });

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const load = async () => {
      const [{ count: n }, { data: convs }] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
        supabase.from('conversation_members').select('conversation_id, last_read_at, conversations(last_message_at)').eq('user_id', uid),
      ]);
      const m = (convs ?? []).filter((c: any) => c.conversations && c.conversations.last_message_at > c.last_read_at).length;
      if (alive) setU({ messages: m, notifications: n ?? 0 });
    };
    load();
    const ch = supabase
      .channel(`unread-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, load)
      .subscribe();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, [uid]);

  return u;
}
