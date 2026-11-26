import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { PageRow } from '@/components/PageRow';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { listPages, setFollowPage, type PageCard } from '@/lib/community';
import { useMe } from '@/lib/session';
import { color, TAP } from '@/theme/tokens';

type Tab = 'fulgte' | 'find' | 'dine';

/** Sider: dem du følger, find nye og dem du administrerer */
export default function Pages() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('fulgte');
  const [pages, setPages] = useState<PageCard[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => setPages(await listPages()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const words = q.trim().toLocaleLowerCase('da').split(/\s+/).filter(Boolean);
  const match = (p: PageCard) => words.every((w) => `${p.name} ${p.handle} ${p.category} ${p.bio}`.toLocaleLowerCase('da').includes(w));
  const shown = (pages ?? []).filter(match).filter((p) => (tab === 'fulgte' ? p.i_follow : tab === 'dine' ? p.i_admin : !p.i_follow && !p.i_admin));

  const toggle = async (p: PageCard) => {
    setPages((l) => l?.map((x) => (x.id === p.id ? { ...x, i_follow: !p.i_follow, followers: x.followers + (p.i_follow ? -1 : 1) } : x)) ?? null);
    await setFollowPage(p.id, me.id, !p.i_follow);
  };

  const empty = { fulgte: 'Du følger ingen sider endnu.', find: 'Ingen sider at vise.', dine: 'Du har ingen sider endnu.' }[tab];

  return (
    <Screen title="Sider" right={<Button title="Opret" onPress={() => router.push('/sider/ny')} style={{ minHeight: TAP, paddingHorizontal: 18 }} />} scroll={false}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Segmented
          label="Vis sider"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'fulgte', label: 'Fulgte' },
            { value: 'find', label: 'Find' },
            { value: 'dine', label: 'Dine' },
          ]}
        />
        <TextField label="Søg efter sider" showLabel={false} placeholder="Søg efter sider" value={q} onChangeText={setQ} />
        {pages === null ? (
          <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
        ) : shown.length ? (
          <View style={s.list}>
            {shown.map((p) => (
              <PageRow key={p.id} page={p}>
                {!p.i_admin && <SmallButton title={p.i_follow ? 'Følger' : 'Følg'} dark={!p.i_follow} onPress={() => toggle(p)} />}
              </PageRow>
            ))}
          </View>
        ) : (
          <T v="bodyS" c={color.textSecondary}>
            {words.length ? `Ingen sider matcher “${q.trim()}”.` : empty}
          </T>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 14, paddingBottom: 40 },
  list: { gap: 8 },
});
