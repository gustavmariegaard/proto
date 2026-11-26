import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { T } from './T';

/** To eller flere valg side om side (fx Offentlig / Privat) */
export function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)} style={[s.opt, on && s.on]}>
            <T v="label" c={on ? color.textPrimary : color.textSecondary}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  opt: { flex: 1, minHeight: TAP, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  on: { backgroundColor: color.bgSurface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
