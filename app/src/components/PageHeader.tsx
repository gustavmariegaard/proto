import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout } from '@/theme/tokens';
import { BackButton } from './BackButton';
import { T } from './T';

type Props = {
  title: string;
  fallback?: Href;
  /** false = ingen tilbage-knap */
  back?: boolean;
  onBack?: () => void;
  /** Lægger selv safe area-luften i toppen (standard). false, hvis skærmen allerede gør det. */
  safeTop?: boolean;
  children?: ReactNode;
};

/** Sidehoved med tilbage-knap og titel (prototypens PageHeader) */
export function PageHeader({ title, fallback = '/', back = true, onBack, safeTop = true, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: layout.topGap + (safeTop ? insets.top : 0) }]}>
      {back && <BackButton fallback={fallback} onPress={onBack} />}
      <T v="titleL" style={s.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: color.bgApp,
  },
  title: { flex: 1, minWidth: 0 },
});
