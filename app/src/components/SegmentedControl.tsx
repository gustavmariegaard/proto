import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { T } from './T';

type Props<V extends string> = {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** Beskriver gruppen for skærmlæsere, fx "Vis opslag fra" */
  label: string;
  style?: ViewStyle;
};

/** Skift mellem 2–3 visninger. Den aktive får hvid baggrund. (prototypens SegmentedControl) */
export function SegmentedControl<V extends string>({ options, value, onChange, label, style }: Props<V>) {
  return (
    <View style={[s.wrap, style]} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[s.item, on && s.on]}
          >
            <T v="captionStrong" c={on ? color.textPrimary : color.textSecondary} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, height: 52, padding: 4, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  item: { flex: 1, minWidth: 0, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: color.bgSurface },
});
