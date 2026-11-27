import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, layout, radius } from '@/theme/tokens';

type Kind = 'alle' | 'brugere' | 'opslag' | 'grupper' | 'sider';

const kinds: { value: Kind; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'brugere', label: 'Brugere' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'grupper', label: 'Grupper' },
  { value: 'sider', label: 'Sider' },
];

type Person = { id: string; username: string; name: string; avatar_path: string | null; relation: string };
type Post = { id: string; author_name: string; author_avatar_path: string | null; text: string; thumb: string | null };
type Place = { id: string; name: string; avatar_path: string | null; meta: string; to: Href };
type Results = { people: Person[]; posts: Post[]; groups: Place[]; pages: Place[] };

const empty: Results = { people: [], posts: [], groups: [], pages: [] };

// Huskes, mens appen er åben, så "Seneste søgninger" overlever et besøg på en anden side.
let recentStore: string[] = [];

/** Fjerner tegn, der har betydning i PostgREST-filtre */
const clean = (q: string) => q.replace(/^@/, '').replace(/[%_,()*]/g, '').trim();

async function search(me: string, q: string): Promise<Results> {
  const term = clean(q);
  const like = `%${term}%`;
  const [people, posts, groups, pages] = await Promise.all([
    term
      ? supabase.from('profiles').select('id, username, name, avatar_path').or(`name.ilike.${like},username.ilike.${like}`).neq('id', me).limit(30)
      : supabase
          .from('follows')
          .select('p:profiles!follows_followee_id_fkey(id, username, name, avatar_path)')
          .eq('follower_id', me)
          .eq('status', 'accepted')
          .limit(30),
    (term
      ? supabase.from('post_cards').select('id, author_name, author_avatar_path, text, image_paths, media_type').in('kind', ['feed', 'debat']).or(`text.ilike.${like},author_name.ilike.${like}`)
      : supabase.from('post_cards').select('id, author_name, author_avatar_path, text, image_paths, media_type').in('kind', ['feed', 'debat']).neq('author_id', me)
    )
      .order('created_at', { ascending: false })
      .limit(term ? 30 : 4),
    term
      ? supabase.from('group_cards').select('id, name, avatar_path, members').ilike('name', like).limit(30)
      : supabase.from('group_cards').select('id, name, avatar_path, members').eq('my_status', 'medlem').limit(30),
    term
      ? supabase.from('page_cards').select('id, handle, name, avatar_path, category').or(`name.ilike.${like},category.ilike.${like},handle.ilike.${like}`).limit(30)
      : supabase.from('page_cards').select('id, handle, name, avatar_path, category').eq('i_follow', true).limit(30),
  ]);

  // Brugere: hvordan kender du dem?
  let persons: Omit<Person, 'relation'>[] = term
    ? ((people.data ?? []) as Omit<Person, 'relation'>[])
    : ((people.data ?? []) as any[]).map((r) => r.p).filter(Boolean);
  const ids = persons.map((p) => p.id);
  const [{ data: mine }, { data: theirs }] = ids.length
    ? await Promise.all([
        supabase.from('follows').select('followee_id, status').eq('follower_id', me).in('followee_id', ids),
        supabase.from('follows').select('follower_id').eq('followee_id', me).eq('status', 'accepted').in('follower_id', ids),
      ])
    : [{ data: [] }, { data: [] }];
  const st = new Map(((mine ?? []) as { followee_id: string; status: string }[]).map((x) => [x.followee_id, x.status]));
  const fol = new Set(((theirs ?? []) as { follower_id: string }[]).map((x) => x.follower_id));
  persons = persons.sort((a, b) => a.name.localeCompare(b.name, 'da'));

  return {
    people: persons.map((p) => ({
      ...p,
      relation: st.get(p.id) === 'accepted' ? 'Du følger' : st.get(p.id) === 'pending' ? 'Anmodet' : fol.has(p.id) ? 'Følger dig' : '',
    })),
    posts: ((posts.data ?? []) as any[]).map((p) => ({
      id: p.id,
      author_name: p.author_name,
      author_avatar_path: p.author_avatar_path,
      text: p.text,
      thumb: p.media_type !== 'video' && p.image_paths?.[0] ? p.image_paths[0] : null,
    })),
    groups: ((groups.data ?? []) as any[]).map((g) => ({
      id: g.id,
      name: g.name,
      avatar_path: g.avatar_path,
      meta: `Gruppe · ${Number(g.members)} ${Number(g.members) === 1 ? 'medlem' : 'medlemmer'}`,
      to: `/grupper/${g.id}` as Href,
    })),
    pages: ((pages.data ?? []) as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      avatar_path: p.avatar_path,
      meta: p.category ? `Side · ${p.category}` : 'Side',
      to: `/sider/${p.handle}` as Href,
    })),
  };
}

/** Søg: brugere, opslag, grupper og sider. Åbnes fra søgeikonet i topbaren. */
export default function Search() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('alle');
  const [recent, setRecentState] = useState(recentStore);
  const [res, setRes] = useState<Results>(empty);
  const [loaded, setLoaded] = useState(false);

  const setRecent = (list: string[]) => {
    recentStore = list;
    setRecentState(list);
  };

  const q = query.trim();

  useEffect(() => {
    let alive = true;
    const t = setTimeout(
      async () => {
        const r = await search(me.id, q);
        if (alive) {
          setRes(r);
          setLoaded(true);
        }
      },
      q ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me.id]);

  const remember = () => {
    if (!q) return;
    setRecent([q, ...recent.filter((r) => r.toLocaleLowerCase('da') !== q.toLocaleLowerCase('da'))].slice(0, 6));
  };

  const go = (to: Href) => {
    remember();
    router.push(to);
  };

  const { people, posts, groups, pages } = res;
  const counts = { brugere: people.length, opslag: posts.length, grupper: groups.length, sider: pages.length };
  const count = kind === 'alle' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[kind];

  const personRows = (list: Person[]) =>
    list.map((p) => (
      <Card key={p.id} onPress={() => go(p.id === me.id ? '/profil' : `/bruger/${p.username}`)}>
        <Avatar name={p.name} path={p.avatar_path} size="L" />
        <View style={s.cardText}>
          <T v="headingS" numberOfLines={1}>
            {p.name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            @{p.username}
            {p.relation ? ` · ${p.relation}` : ''}
          </T>
        </View>
      </Card>
    ));

  const postRows = (list: Post[]) =>
    list.map((p) => (
      <Card key={p.id} onPress={() => go(`/opslag/${p.id}`)}>
        <Avatar name={p.author_name} path={p.author_avatar_path} size="L" />
        <View style={s.cardText}>
          <T v="headingS" numberOfLines={1}>
            {p.author_name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={2}>
            {p.text}
          </T>
        </View>
        {p.thumb && <Image source={imageSource(p.thumb)} style={s.thumb} contentFit="cover" />}
      </Card>
    ));

  const placeRows = (list: Place[]) =>
    list.map((g) => (
      <Card key={g.id} onPress={() => go(g.to)}>
        <Avatar name={g.name} path={g.avatar_path} size="L" />
        <View style={s.cardText}>
          <T v="headingS" numberOfLines={1}>
            {g.name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            {g.meta}
          </T>
        </View>
      </Card>
    ));

  /* "Alle": de bedste resultater fra hver type, med "Se alle" til den fulde liste */
  const sections: { kind: Exclude<Kind, 'alle'>; label: string; rows: ReactNode[]; total: number }[] = [
    { kind: 'brugere', label: 'Brugere', rows: personRows(people.slice(0, 3)), total: people.length },
    { kind: 'opslag', label: 'Opslag', rows: postRows(posts.slice(0, 3)), total: posts.length },
    { kind: 'grupper', label: 'Grupper', rows: placeRows(groups.slice(0, 2)), total: groups.length },
    { kind: 'sider', label: 'Sider', rows: placeRows(pages.slice(0, 2)), total: pages.length },
  ];

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: layout.topGap + insets.top }]}>
        <BackButton fallback="/" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextField
            label="Søg efter brugere, opslag, grupper og sider"
            showLabel={false}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="search"
            returnKeyType="search"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={remember}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {/* Samme opbygning som filteret i Offentlig debat: én række, der kan swipes */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.rowWrap}
          contentContainerStyle={s.row}
          accessibilityRole="radiogroup"
          accessibilityLabel="Søg efter"
        >
          {kinds.map((k) => (
            <Chip key={k.value} selected={k.value === kind} onPress={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
        </ScrollView>

        {!q && recent.length > 0 && (
          <>
            <View style={s.between}>
              <T v="headingS" accessibilityRole="header">
                Seneste søgninger
              </T>
              <Button variant="ghost" onPress={() => setRecent([])}>
                Ryd
              </Button>
            </View>
            <View style={s.chips}>
              {recent.map((r) => (
                <Chip key={r} onPress={() => setQuery(r)}>
                  {r}
                </Chip>
              ))}
            </View>
          </>
        )}

        {!loaded ? null : count === 0 ? (
          q ? (
            <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
              Ingen resultater for "{q}"
            </T>
          ) : null
        ) : kind === 'alle' ? (
          sections
            .filter((sec) => sec.total > 0)
            .map((sec) => (
              <View key={sec.kind} style={s.section}>
                <View style={s.between}>
                  <T v="headingS" accessibilityRole="header">
                    {sec.label}
                  </T>
                  {sec.total > sec.rows.length && (
                    <Button variant="ghost" onPress={() => setKind(sec.kind)}>
                      {`Se alle ${sec.total}`}
                    </Button>
                  )}
                </View>
                <View style={s.list}>{sec.rows}</View>
              </View>
            ))
        ) : (
          <>
            <T v="headingS" accessibilityRole="header">
              {kinds.find((k) => k.value === kind)!.label}
            </T>
            <View style={s.list}>
              {kind === 'brugere' && personRows(people)}
              {kind === 'opslag' && postRows(posts)}
              {kind === 'grupper' && placeRows(groups)}
              {kind === 'sider' && placeRows(pages)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Kort (List row): hvid, 1 px kant, radius 18 */
function Card({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  rowWrap: { marginHorizontal: -20, flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 20 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 10 },
  list: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: color.bgSubtle },
});
