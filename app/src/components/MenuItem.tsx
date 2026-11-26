import { Pressable, StyleSheet } from 'react-native';
import { color, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

/** Række i et ⋯-ark */
export function MenuItem({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const c = danger ? color.danger : color.textPrimary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.item, pressed && { backgroundColor: color.bgSubtle }]}>
      <Icon name={icon} color={c} />
      <T v="body" c={c}>
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: { minHeight: TAP + 12, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
});
