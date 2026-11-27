import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { HighlightStory, StoryAction } from '@/components/HighlightStory';
import { highlightMoments, type MomentCard } from '@/lib/moments';
import { useMe } from '@/lib/session';

/**
 * En highlight afspillet som story (prototypens CollectionViewer / UserCollection).
 * ?start= starter ved et bestemt billede. Din egen: "Se alle" åbner redigering.
 */
export default function HighlightRoute() {
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const me = useMe();
  const [h, setH] = useState<{ owner_id: string; title: string; moments: MomentCard[] } | null | undefined>(undefined);
  useEffect(() => {
    highlightMoments(id).then(setH);
  }, [id]);
  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/profil')), []);
  useEffect(() => {
    if (h === null || (h && h.moments.length === 0)) close();
  }, [h, close]);
  if (!h?.moments.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <HighlightStory
      items={h.moments}
      title={h.title}
      startAt={Number(start) || 0}
      onClose={close}
      actions={
        h.owner_id === me.id ? (
          // "Se alle" åbner samlingen, hvor man også kan redigere den
          <StoryAction icon="layout-grid" label="Se alle" onPress={() => router.replace(`/highlight/rediger/${id}`)} />
        ) : undefined
      }
    />
  );
}
