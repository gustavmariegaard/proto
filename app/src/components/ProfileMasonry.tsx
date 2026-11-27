import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme/tokens';

/** Faste højder i Figmas masonry (prototypens photoHeights) */
export const photoHeights = [190, 120, 120, 190, 170, 130];

export type Tile = { key: string; height: number; render: () => ReactNode };

/** To kolonner med 8 px mellemrum, skiftevis venstre/højre (prototypens Masonry) */
export function Masonry({ tiles, label }: { tiles: Tile[]; label?: string }) {
  const cols: [Tile[], Tile[]] = [[], []];
  tiles.forEach((t, i) => cols[i % 2]!.push(t));
  return (
    <View style={s.masonry} accessibilityLabel={label}>
      {cols.map((col, i) => (
        <View key={i} style={s.col}>
          {col.map((t) => (
            <View key={t.key} style={{ height: t.height, width: '100%' }}>
              {t.render()}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Billedfeltet i masonry (prototypens .pf-photo) */
export const photoStyle = { flex: 1, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: color.bgSubtle } as const;

const s = StyleSheet.create({
  masonry: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0, gap: 8 },
});
