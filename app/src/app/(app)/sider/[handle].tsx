import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PageProfile } from '@/components/PageProfile';
import { T } from '@/components/T';
import { getPage, type PageCard } from '@/lib/community';
import { color } from '@/theme/tokens';

/** En side, som andre ser den (samme profilkort som personer, tilpasset sider) */
export default function PageView() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<PageCard | null | undefined>(undefined);

  const load = useCallback(async () => {
    setPage(await getPage(handle));
  }, [handle]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <>
      <PageHeader title="Side" fallback="/sider" />
      <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}>
        {page === undefined && <ActivityIndicator color={color.textPrimary} />}
        {page === null && (
          <T v="bodyS" c={color.textSecondary}>
            Siden findes ikke.
          </T>
        )}
        {page && <PageProfile key={page.id} page={page} onChanged={load} />}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20 },
});
