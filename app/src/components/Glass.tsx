import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  /** light = hvidt frostet glas, dark = mørkt (fx på Flicks) */
  tint?: 'light' | 'dark';
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  children?: ReactNode;
};

const fill = { light: 'rgba(255,255,255,0.62)', dark: 'rgba(20,20,20,0.42)' } as const;
const edge = { light: 'rgba(255,255,255,0.7)', dark: 'rgba(255,255,255,0.14)' } as const;

/**
 * Frostet glas (som Instagram): indholdet bagved skinner sløret igennem.
 * Telefon: expo-blur. Web: browserens egen sløring (backdrop-filter).
 */
export function Glass({ tint = 'light', style, children }: Props) {
  const flat = StyleSheet.flatten(style as ViewStyle) ?? {};
  const base: ViewStyle = { overflow: 'hidden', borderWidth: 1, borderColor: edge[tint], backgroundColor: fill[tint] };
  if (Platform.OS === 'web') {
    const web = { backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)' } as unknown as ViewStyle;
    return <View style={[base, web, flat]}>{children}</View>;
  }
  return (
    <View style={[base, { backgroundColor: 'transparent' }, flat]}>
      <BlurView intensity={tint === 'dark' ? 40 : 60} tint={tint === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill[tint] }]} />
      {children}
    </View>
  );
}
