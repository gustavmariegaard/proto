import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { invite } from '@/lib/community';
import { supabase } from '@/lib/supabase';
import { color, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';
import { TextField } from './TextField';

type Person = { id: string; name: string; username: string; avatar_path: string | null };

/** Inviter folk til en begivenhed: dem du følger øverst, ellers søg */
export function EventInviteSheet({ open, onClose, eventId, me, exclude, onDone }: { open: boolean; onClose: () => void; eventId: string; me: string; exclude: string[]; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const term = q.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
    const t = setTimeout(async () => {
      let rows: Person[] = [];
      if (term.length >= 2) {
        const { data } = await supabase.from('profiles').select('id, name, username, avatar_path').or(`name.ilike.%${term}%,username.ilike.%${term}%`).neq('id', me).limit(25);
        rows = (data ?? []) as Person[];
      } else {
        const { data } = await supabase.from('follows').select('p:profiles!follows_followee_id_fkey(id, name, username, avatar_path)').eq('follower_id', me).eq('status', 'accepted').limit(50);
        rows = ((data ?? []) as any[]).map((r) => r.p).filter(Boolean);
      }
      if (alive) setPeople(rows.filter((p) => !exclude.includes(p.id)));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, open, me, exclude]);

  const send = async () => {
    setBusy(true);
    await invite(eventId, me, picked);
    setBusy(false);
    setPicked([]);
    setQ('');
    onDone();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Inviter">
      <View style={{ padding: 16, gap: 10, maxHeight: 520 }}>
        <TextField label="Søg efter folk" showLabel={false} placeholder="Søg efter folk" value={q} onChangeText={setQ} autoCapitalize="none" />
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 4 }} keyboardShouldPersistTaps="handled">
          {people.length === 0 && (
            <T v="bodyS" c={color.textSecondary} style={{ padding: 8 }}>
              {q.trim().length >= 2 ? 'Ingen fundet.' : 'Søg efter dem, du vil invitere.'}
            </T>
          )}
          {people.map((p) => {
            const on = picked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.name}
                onPress={() => setPicked((l) => (on ? l.filter((x) => x !== p.id) : [...l, p.id]))}
                style={s.row}
              >
                <Avatar name={p.name} path={p.avatar_path} />
                <View style={{ flex: 1 }}>
                  <T v="headingS" numberOfLines={1}>
                    {p.name}
                  </T>
                  <T v="caption" c={color.textSecondary}>
                    @{p.username}
                  </T>
                </View>
                <View style={[s.box, on && s.boxOn]}>{on && <Icon name="check" size={16} color={color.white} />}</View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button title={picked.length ? `Inviter (${picked.length})` : 'Inviter'} block disabled={!picked.length} loading={busy} onPress={send} />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TAP + 8, paddingHorizontal: 8, borderRadius: radius.md },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
