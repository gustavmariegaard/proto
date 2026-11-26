import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MomentStory } from '@/components/MomentStory';
import { highlightMoments, type MomentCard } from '@/lib/moments';

/** En highlight: moments, man har gemt på sin profil */
export default function HighlightRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [h, setH] = useState<{ title: string; moments: MomentCard[] } | null | undefined>(undefined);
  useEffect(() => {
    highlightMoments(id).then(setH);
  }, [id]);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profil'));
  useEffect(() => {
    if (h === null || (h && h.moments.length === 0)) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h]);
  if (!h?.moments.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return <MomentStory moments={h.moments} title={h.title} onEnd={close} />;
}
