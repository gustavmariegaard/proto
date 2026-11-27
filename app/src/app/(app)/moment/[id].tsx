import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MomentStory } from '@/components/MomentStory';
import { activeMoments, type MomentCard } from '@/lib/moments';

/**
 * Moments fra én person eller side. ?type=side for en side.
 * ?raekke=person:id,side:id … er rækken på Hjem, så viseren fortsætter til den næste.
 */
export default function MomentRoute() {
  const { id, type, raekke } = useLocalSearchParams<{ id: string; type?: string; raekke?: string }>();
  const kind = type === 'side' ? 'side' : 'person';
  const [moments, setMoments] = useState<MomentCard[] | null>(null);

  useEffect(() => {
    setMoments(null);
    activeMoments(id, kind).then(setMoments);
  }, [id, kind]);

  const queue = (raekke ?? '').split(',').filter(Boolean);
  const pos = queue.indexOf(`${kind}:${id}`);
  const go = (step: number) => {
    const target = queue[pos + step];
    if (pos === -1 || !target) return router.canGoBack() ? router.back() : router.replace('/');
    const [k, tid] = target.split(':');
    router.replace({ pathname: '/moment/[id]', params: { id: tid, type: k, raekke } });
  };

  useEffect(() => {
    if (moments && moments.length === 0) go(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moments]);

  if (!moments?.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return <MomentStory key={`${kind}:${id}`} moments={moments} startAtUnseen onEnd={() => go(1)} onBeforeStart={pos > 0 ? () => go(-1) : undefined} />;
}
