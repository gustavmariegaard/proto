import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { T } from './T';

/** Neutralt tekstmærke til korte oplysninger, fx status. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <View style={s.tag}>
      <T v="captionStrong" numberOfLines={1}>
        {children}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
});
