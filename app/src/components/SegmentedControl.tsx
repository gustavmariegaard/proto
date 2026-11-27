import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, radius, shadow } from '@/theme/tokens';
import { Glass } from './Glass';
import { T } from './T';

type Props<V extends string> = {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** Beskriver gruppen for skærmlæsere, fx "Vis opslag fra" */
  label: string;
  style?: ViewStyle;
  /** Frostet glas og lidt lavere (Hjem: Brugere/Interesser oven på feedet) */
  glass?: boolean;
};

/** Skift mellem 2–3 visninger. Den aktive får hvid baggrund. (prototypens SegmentedControl) */
export function SegmentedControl<V extends string>({ options, value, onChange, label, style, glass }: Props<V>) {
  const Wrap = glass ? Glass : View;
  return (
    <Wrap style={(glass ? [s.glass, style] : [s.wrap, style]) as ViewStyle[]}>
    <View style={[s.inner, glass && s.innerGlass]} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[s.item, glass && s.itemGlass, on && s.on]}
          >
            <T v="captionStrong" c={on ? color.textPrimary : color.textSecondary} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
    </Wrap>
  );
}

const s = StyleSheet.create({
  wrap: { height: 52, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  /* Frostet glas som bundmenuen (ingen grå baggrund) */
  /* Jævn skygge hele vejen rundt (ingen forskydning nedad) */
  glass: { height: 42, borderRadius: radius.pill, ...shadow.tabbar, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12 },
  inner: { flex: 1, flexDirection: 'row', gap: 4, padding: 4 },
  innerGlass: { padding: 3 },
  itemGlass: { height: 34, borderRadius: radius.pill },
  item: { flex: 1, minWidth: 0, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: color.bgSurface },
});
