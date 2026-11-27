import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { coverOf, HighlightMedia } from '@/components/HighlightTile';
import { PageHeader } from '@/components/PageHeader';
import { Masonry, photoHeights, photoStyle } from '@/components/ProfileMasonry';
import { T } from '@/components/T';
import { Tag } from '@/components/Tag';
import { highlightMoments, type MomentCard } from '@/lib/moments';
import { useMe } from '@/lib/session';
import { color } from '@/theme/tokens';

/** Samling (fx Sommer), prototypens Collection. Tryk på et billede for at afspille samlingen. */
export default function HighlightCollection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [h, setH] = useState<{ owner_id: string; title: string; moments: MomentCard[] } | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      highlightMoments(id).then((r) => {
        if (!r || r.moments.length === 0) return router.replace('/profil');
        if (r.owner_id !== me.id) return router.replace(`/highlight/${id}`);
        setH(r);
      });
    }, [id, me.id]),
  );

  const list = h?.moments ?? [];
  const cover = coverOf(list);

  return (
    <View style={s.root}>
      <PageHeader title={h?.title ?? ''} fallback="/profil">
        <Button variant="ghost" onPress={() => router.push(`/highlight/rediger/${id}`)}>
          Rediger
        </Button>
      </PageHeader>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}>
        <T v="caption" c={color.textSecondary} style={s.full}>
          Tryk på et billede for at se samlingen.
        </T>
        <Masonry
          label={h ? `Billeder i ${h.title}` : undefined}
          tiles={list.map((m, i) => ({
            key: m.id,
            height: photoHeights[i % photoHeights.length]!,
            render: () => (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Afspil samlingen fra billede ${i + 1}`}
                onPress={() => router.push(`/highlight/${id}?start=${i}`)}
                style={({ pressed }) => [photoStyle, pressed && { opacity: 0.9 }]}
              >
                <HighlightMedia m={m} />
                {m.id === cover && (
                  <View style={s.coverTag}>
                    <Tag>Forside</Tag>
                  </View>
                )}
              </Pressable>
            ),
          }))}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20, alignItems: 'flex-start' },
  full: { alignSelf: 'stretch' },
  coverTag: { position: 'absolute', top: 8, left: 8 },
});
