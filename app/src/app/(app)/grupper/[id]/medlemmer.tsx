import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MenuItem } from '@/components/MenuItem';
import { matches, MoreCard, MoreScreen } from '@/components/MoreParts';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { getGroup, groupMembers, type GroupCard, type Member } from '@/lib/community';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

/**
 * Alle medlemmer i en gruppe, med søgning (prototypens GroupMembers).
 * Admins ser desuden anmodninger øverst og kan holde en række nede for at gøre til admin eller fjerne.
 */
export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [group, setGroup] = useState<GroupCard | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const [g, m] = await Promise.all([getGroup(id), groupMembers(id)]);
    setGroup(g);
    setMembers(m);
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const admin = group?.my_status === 'medlem' && group.my_role === 'admin';
  const requests = (members ?? []).filter((m) => m.status === 'anmodet');
  const all = (members ?? [])
    .filter((m) => m.status === 'medlem')
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, 'da') : a.role === 'admin' ? -1 : 1));
  const shown = all.filter((m) => matches(`${m.name} ${m.username}`, query));

  const update = async (m: Member, patch: Partial<Pick<Member, 'role' | 'status'>>) => {
    await supabase.from('group_members').update(patch).eq('group_id', id).eq('user_id', m.id);
    load();
  };
  const remove = async (m: Member) => {
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', m.id);
    load();
  };

  return (
    <MoreScreen title="Medlemmer" fallback={`/grupper/${id}`}>
      <T v="headingM" accessibilityRole="header">
        {group?.name ?? ''}
      </T>
      {admin &&
        requests.map((m) => (
          <MoreCard key={m.id} label={m.name}>
            <View style={s.cardRow}>
              <Avatar name={m.name} path={m.avatar_path} size="L" />
              <View style={s.text}>
                <T v="headingS" numberOfLines={1}>
                  {m.name}
                </T>
                <T v="caption" c={color.textSecondary} numberOfLines={1}>
                  Vil være medlem
                </T>
              </View>
            </View>
            <View style={s.buttons}>
              <Button style={{ flex: 1 }} onPress={() => update(m, { status: 'medlem' })}>
                Accepter
              </Button>
              <Button variant="secondary" style={{ flex: 1 }} onPress={() => remove(m)}>
                Slet
              </Button>
            </View>
          </MoreCard>
        ))}
      <TextField label="Søg blandt medlemmerne" showLabel={false} value={query} onChangeText={setQuery} />
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {query.trim() ? `${shown.length} af ${all.length} medlemmer` : `${all.length} medlemmer`}
      </T>
      {members && shown.length === 0 ? (
        <T v="bodyS" c={color.textSecondary} style={s.empty}>
          {query.trim() ? `Ingen medlemmer hedder “${query.trim()}”.` : 'Ingen medlemmer endnu.'}
        </T>
      ) : (
        <View style={s.list}>
          {shown.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="link"
              onPress={() => router.push(`/bruger/${m.username}`)}
              onLongPress={admin && m.id !== me.id ? () => setPicked(m) : undefined}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
            >
              <Avatar name={m.name} path={m.avatar_path} />
              <View style={s.text}>
                <View style={s.name}>
                  <T v="headingS" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {m.name}
                  </T>
                  {m.role === 'admin' && (
                    <View style={s.admin}>
                      <T v="captionStrong" c={color.accentNoteText}>
                        Admin
                      </T>
                    </View>
                  )}
                </View>
                <T v="caption" c={color.textSecondary} numberOfLines={1}>
                  @{m.username}
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked?.name}>
        {picked && (
          <View>
            {picked.role === 'admin' ? (
              <MenuItem icon="user" label="Gør til medlem" onPress={() => (update(picked, { role: 'medlem' }), setPicked(null))} />
            ) : (
              <MenuItem icon="star" label="Gør til admin" onPress={() => (update(picked, { role: 'admin' }), setPicked(null))} />
            )}
            <MenuItem icon="user-minus" label="Fjern fra gruppen" danger onPress={() => (remove(picked), setPicked(null))} />
          </View>
        )}
      </Sheet>
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  list: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg },
  text: { flex: 1, minWidth: 0, gap: 2 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  admin: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: color.accentNoteBg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
