import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { T } from './T';

/** Række med titel, evt. hint og en kontakt */
export function Toggle({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={s.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headingS">{title}</T>
        {hint && (
          <T v="caption" c={color.textSecondary}>
            {hint}
          </T>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.actionPrimary, false: color.borderStrong }} thumbColor={color.white} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
});
