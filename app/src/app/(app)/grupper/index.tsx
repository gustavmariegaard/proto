import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { GroupRow } from '@/components/GroupRow';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { joinGroup, leaveGroup, listGroups, type GroupCard } from '@/lib/community';
import { normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, TAP } from '@/theme/tokens';

type Tab = 'dine' | 'find' | 'aktivitet';

/** Grupper: dine, find nye og din aktivitet (dine opslag i grupper) */
export default function Groups() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('dine');
  const [groups, setGroups] = useState<GroupCard[] | null>(null);
  const [activity, setActivity] = useState<Post[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setGroups(await listGroups());
    const { data } = await supabase.from('post_cards').select('*').eq('author_id', me.id).not('group_id', 'is', null).order('created_at', { ascending: false }).limit(40);
    setActivity(((data ?? []) as Post[]).map(normalize));
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const words = q.trim().toLocaleLowerCase('da').split(/\s+/).filter(Boolean);
  const match = (g: GroupCard) => words.every((w) => `${g.name} ${g.description}`.toLocaleLowerCase('da').includes(w));
  const mine = (groups ?? []).filter((g) => g.my_status === 'medlem' && match(g));
  const waiting = (groups ?? []).filter((g) => g.my_status === 'anmodet' || g.my_status === 'inviteret');
  const others = (groups ?? []).filter((g) => !g.my_status && match(g));

  const join = async (g: GroupCard) => {
    setGroups((l) => l?.map((x) => (x.id === g.id ? { ...x, my_status: g.privacy === 'offentlig' ? 'medlem' : 'anmodet', members: x.members + (g.privacy === 'offentlig' ? 1 : 0) } : x)) ?? null);
    await joinGroup(g, me.id);
  };

  return (
    <Screen title="Grupper" right={<Button title="Opret" onPress={() => router.push('/grupper/ny')} style={{ minHeight: TAP, paddingHorizontal: 18 }} />} scroll={false}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Segmented
          label="Vis grupper"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dine', label: 'Dine' },
            { value: 'find', label: 'Find' },
            { value: 'aktivitet', label: 'Aktivitet' },
          ]}
        />
        {groups === null ? (
          <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
        ) : tab === 'aktivitet' ? (
          <>
            <T v="bodyS" c={color.textSecondary}>
              Opslag, du har lavet i dine grupper
            </T>
            {activity.length ? (
              activity.map((p) => <PostCard key={p.id} post={p} onRemoved={() => setActivity((l) => l.filter((x) => x.id !== p.id))} />)
            ) : (
              <T v="bodyS" c={color.textSecondary}>
                Ingen opslag endnu.
              </T>
            )}
          </>
        ) : (
          <>
            <TextField label={tab === 'dine' ? 'Søg i dine grupper' : 'Søg efter grupper'} showLabel={false} placeholder={tab === 'dine' ? 'Søg i dine grupper' : 'Søg efter grupper'} value={q} onChangeText={setQ} />
            {tab === 'dine' ? (
              <>
                {mine.length ? (
                  <View style={s.list}>
                    {mine.map((g) => (
                      <GroupRow key={g.id} group={g} />
                    ))}
                  </View>
                ) : (
                  <T v="bodyS" c={color.textSecondary}>
                    {words.length ? `Ingen grupper matcher “${q.trim()}”.` : 'Du er ikke med i nogen grupper endnu.'}
                  </T>
                )}
                {waiting.length > 0 && (
                  <View style={s.list}>
                    <T v="headingS">Afventer</T>
                    {waiting.map((g) => (
                      <GroupRow key={g.id} group={g}>
                        {g.my_status === 'inviteret' ? (
                          <SmallButton
                            title="Tak ja"
                            dark
                            onPress={async () => {
                              await supabase.from('group_members').update({ status: 'medlem' }).eq('group_id', g.id).eq('user_id', me.id);
                              load();
                            }}
                          />
                        ) : (
                          <SmallButton
                            title="Træk tilbage"
                            onPress={async () => {
                              await leaveGroup(g.id, me.id);
                              load();
                            }}
                          />
                        )}
                      </GroupRow>
                    ))}
                  </View>
                )}
              </>
            ) : others.length ? (
              <View style={s.list}>
                {others.map((g) => (
                  <GroupRow key={g.id} group={g}>
                    <SmallButton title={g.privacy === 'offentlig' ? 'Bliv medlem' : 'Anmod'} dark onPress={() => join(g)} />
                  </GroupRow>
                ))}
              </View>
            ) : (
              <T v="bodyS" c={color.textSecondary}>
                Ingen grupper at vise.
              </T>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 14, paddingBottom: 40 },
  list: { gap: 8 },
});
