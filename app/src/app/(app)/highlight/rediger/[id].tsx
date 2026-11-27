import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { coverOf, HighlightMedia } from '@/components/HighlightTile';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Masonry, photoHeights, photoStyle } from '@/components/ProfileMasonry';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { Tag } from '@/components/Tag';
import { deleteHighlight, highlightMoments, myMoments, saveHighlight, type MomentCard } from '@/lib/moments';
import { useMe } from '@/lib/session';
import { color, radius } from '@/theme/tokens';

/**
 * Rediger samling (prototypens CollectionEdit). Tryk på et billede for at tage det med eller fjerne det.
 * "Vælg forside" skifter til en tilstand, hvor et tryk vælger forsiden. Ændringer gemmes, når man trykker Færdig.
 */
export default function HighlightEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [all, setAll] = useState<MomentCard[]>([]);
  // Alle billeder, der vises (også dem, der er fravalgt), og hvilke der er med
  const [shown, setShown] = useState<string[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [cover, setCover] = useState<string | undefined>();
  const [choosingCover, setChoosingCover] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([highlightMoments(id), myMoments(me.id)]).then(([h, mine]) => {
      if (!h || h.owner_id !== me.id) return router.replace('/profil');
      setTitle(h.title);
      const ids = h.moments.map((m) => m.id);
      setShown(ids);
      setIncluded(ids);
      setCover(coverOf(h.moments));
      const byId = new Map([...mine, ...h.moments].map((m) => [m.id, m]));
      setAll([...byId.values()]);
    });
  }, [id, me.id]);

  const byId = new Map(all.map((m) => [m.id, m]));
  const others = all.filter((m) => !shown.includes(m.id));

  const done = async () => {
    setBusy(true);
    const ids = shown.filter((m) => included.includes(m));
    if (ids.length === 0) {
      await deleteHighlight(id);
      router.replace('/profil');
      return;
    }
    // Forsiden står først, så den også er forside på profilen
    const next = cover && ids.includes(cover) ? [cover, ...ids.filter((m) => m !== cover)] : ids;
    await saveHighlight(me.id, title, next, id);
    if (router.canGoBack()) router.back();
    else router.replace(`/highlight/samling/${id}`);
  };

  const tap = (mid: string) => {
    if (choosingCover) {
      setCover(mid);
      setIncluded((l) => (l.includes(mid) ? l : [...l, mid]));
      setChoosingCover(false);
      return;
    }
    setIncluded((l) => (l.includes(mid) ? l.filter((x) => x !== mid) : [...l, mid]));
  };

  const add = (mid: string) => {
    setShown((l) => [...l, mid]);
    setIncluded((l) => [...l, mid]);
  };

  return (
    <View style={s.root}>
      <PageHeader title={title} fallback="/profil">
        <Button variant="ghost" disabled={busy || !title} onPress={done}>
          Færdig
        </Button>
      </PageHeader>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}>
        <T v="caption" c={color.textSecondary} style={s.full} accessibilityLiveRegion="polite">
          {choosingCover ? 'Tryk på det billede, der skal være forside.' : 'Tryk for at tilføje eller fjerne billeder. De markerede er med i samlingen.'}
        </T>
        <Masonry
          label={`Billeder i ${title}`}
          tiles={shown.flatMap((mid, i) => {
            const m = byId.get(mid);
            if (!m) return [];
            const on = included.includes(mid);
            return [
              {
                key: mid,
                height: photoHeights[i % photoHeights.length]!,
                render: () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: choosingCover ? mid === cover : on }}
                    accessibilityLabel={choosingCover ? `Vælg billede ${i + 1} som forside` : `Billede ${i + 1}`}
                    onPress={() => tap(mid)}
                    style={photoStyle}
                  >
                    <HighlightMedia m={m} dim={!on} />
                    {mid === cover && (
                      <View style={s.coverTag}>
                        <Tag>Forside</Tag>
                      </View>
                    )}
                    {!choosingCover && <View style={[s.check, on && s.checkOn]}>{on && <Icon name="check" size={16} />}</View>}
                  </Pressable>
                ),
              },
            ];
          })}
        />
        <Button variant="secondary" block accessibilityState={{ selected: choosingCover }} onPress={() => setChoosingCover((v) => !v)}>
          Vælg forside
        </Button>
        <Button variant="secondary" block onPress={() => setAdding(true)}>
          Tilføj fra dine billeder
        </Button>
      </ScrollView>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Tilføj fra dine billeder" initialSize="half" dim>
        {others.length === 0 ? (
          <T v="bodyS" c={color.textSecondary}>
            Alle dine billeder er allerede med.
          </T>
        ) : (
          <View style={s.addGrid}>
            {others.map((m) => (
              <Pressable key={m.id} accessibilityRole="button" accessibilityLabel="Tilføj billede" onPress={() => add(m.id)} style={s.addItem}>
                <HighlightMedia m={m} />
                <View style={s.check} />
              </Pressable>
            ))}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20, alignItems: 'flex-start' },
  full: { alignSelf: 'stretch' },
  coverTag: { position: 'absolute', top: 8, left: 8 },
  // Markering: 26 px rund, mint med flueben, ellers hvid med kant
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: color.accentHighlight, backgroundColor: color.accentHighlight },
  addGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addItem: { width: '31.5%', aspectRatio: 1, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: color.bgSubtle },
});
