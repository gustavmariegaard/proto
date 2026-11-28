import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MintTile } from '@/components/CreateFlow';
import { PageHeader } from '@/components/PageHeader';
import { PersonRow } from '@/components/PersonRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { profileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

type Tab = 'foelgere' | 'foelger';
type Person = { id: string; username: string; name: string; avatar_path: string | null };

const tabs = [
  { value: 'foelgere', label: 'Følgere' },
  { value: 'foelger', label: 'Følger' },
] as const;

/**
 * Følgere og Følger for en profil. Rute: /forbindelser?bruger=<brugernavn>&fane=foelger
 * På din egen profil kan du fjerne en følger eller stoppe med at følge nogen (du bliver spurgt først).
 */
export default function Connections() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { bruger, fane } = useLocalSearchParams<{ bruger?: string; fane?: string }>();
  const username = bruger || me.username;
  const own = username === me.username;
  const tab: Tab = fane === 'foelger' ? 'foelger' : 'foelgere';

  const [owner, setOwner] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [lists, setLists] = useState<Record<Tab, Person[] | null>>({ foelgere: null, foelger: null });
  const [confirm, setConfirm] = useState<{ kind: Tab; person: Person } | null>(null);

  const load = useCallback(async () => {
    const v = own ? { id: me.id, name: me.name, can_see: true } : await profileView(username);
    if (!v || !v.can_see) return setOwner(null);
    setOwner({ id: v.id, name: v.name });
    const [a, b] = await Promise.all([
      supabase.from('follows').select('created_at, profiles!follows_follower_id_fkey(id, username, name, avatar_path)').eq('followee_id', v.id).eq('status', 'accepted').order('created_at', { ascending: false }),
      supabase.from('follows').select('created_at, profiles!follows_followee_id_fkey(id, username, name, avatar_path)').eq('follower_id', v.id).eq('status', 'accepted').order('created_at', { ascending: false }),
    ]);
    const people = (rows: unknown) => ((rows ?? []) as { profiles: Person | null }[]).map((r) => r.profiles).filter((p): p is Person => !!p);
    setLists({ foelgere: people(a.data), foelger: people(b.data) });
  }, [own, username, me.id, me.name]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!confirm) return;
    const { kind, person } = confirm;
    setConfirm(null);
    // Fjernes med det samme; kommer tilbage, hvis det ikke lykkes
    setLists((l) => ({ ...l, [kind]: (l[kind] ?? []).filter((p) => p.id !== person.id) }));
    const q = supabase.from('follows').delete();
    const { error } = kind === 'foelgere' ? await q.eq('follower_id', person.id).eq('followee_id', me.id) : await q.eq('follower_id', me.id).eq('followee_id', person.id);
    if (error) load();
  };

  const list = lists[tab];
  const first = (name: string) => name.split(' ')[0] ?? name;
  const title = own ? 'Dine forbindelser' : owner ? owner.name : 'Forbindelser';

  return (
    <View style={s.root}>
      <PageHeader title={title} fallback={own ? '/profil' : `/bruger/${username}`} />
      <View style={s.switch}>
        <SegmentedControl label="Vis" options={tabs} value={tab} onChange={(v) => router.setParams({ fane: v === 'foelger' ? 'foelger' : undefined })} />
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}>
        {owner === null ? (
          <T v="bodyS" c={color.textSecondary} style={s.center}>
            Profilen er privat. Følg den for at se, hvem der følger med.
          </T>
        ) : !list ? (
          <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
        ) : list.length === 0 ? (
          <View style={s.empty}>
            <T v="bodyS" c={color.textSecondary} style={s.center}>
              {tab === 'foelgere'
                ? own
                  ? 'Ingen følger dig endnu.'
                  : `Ingen følger ${first(owner?.name ?? '')} endnu.`
                : own
                  ? 'Du følger ingen endnu.'
                  : `${first(owner?.name ?? '')} følger ingen endnu.`}
            </T>
            {own && tab === 'foelger' && (
              <Pressable accessibilityRole="link" onPress={() => router.push('/find-folk')} style={({ pressed }) => [s.emptyAction, pressed && { opacity: 0.85 }]}>
                <T v="label" c={color.textOnAction}>
                  Find folk at følge
                </T>
              </Pressable>
            )}
          </View>
        ) : (
          list.map((p) => (
            <PersonRow key={p.id} name={p.name} username={p.username} avatar={p.avatar_path}>
              {own && p.id !== me.id && (
                <SmallButton title={tab === 'foelgere' ? 'Fjern' : 'Følger'} onPress={() => setConfirm({ kind: tab, person: p })} />
              )}
            </PersonRow>
          ))
        )}
      </ScrollView>

      {/* Spørg først (samme udtryk som Slet i opslagsmenuen) */}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} dim initialSize="auto">
        {confirm && (
          <View style={[s.panel, { paddingBottom: 16 + insets.bottom }]}>
            <MintTile icon="user-minus" size={48} tone="danger" />
            <T v="headingM" accessibilityRole="header">
              {confirm.kind === 'foelgere' ? `Fjern ${first(confirm.person.name)} som følger?` : `Stop med at følge ${first(confirm.person.name)}?`}
            </T>
            <T v="bodyS" c={color.textSecondary}>
              {confirm.kind === 'foelgere'
                ? `${first(confirm.person.name)} får ikke besked. Er din profil privat, skal ${first(confirm.person.name)} spørge igen for at følge dig.`
                : `Du ser ikke længere opslag og moments fra ${first(confirm.person.name)} på Hjem.`}
            </T>
            <View style={s.buttons}>
              <Button variant="secondary" onPress={() => setConfirm(null)} style={{ flex: 1 }}>
                Annullér
              </Button>
              <Pressable accessibilityRole="button" onPress={remove} style={({ pressed }) => [s.danger, pressed && { opacity: 0.85 }]}>
                <T style={s.dangerText} c={color.white}>
                  {confirm.kind === 'foelgere' ? 'Fjern' : 'Stop med at følge'}
                </T>
              </Pressable>
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  switch: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  content: { paddingHorizontal: 20, paddingTop: 6, gap: 8 },
  center: { textAlign: 'center' },
  empty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
  },
  emptyAction: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  panel: { gap: 10, paddingTop: 14, paddingHorizontal: 20 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  danger: { flex: 1, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.danger, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20 },
});
