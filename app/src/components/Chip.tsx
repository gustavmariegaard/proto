import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Props = { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; trailing?: IconName; small?: boolean; style?: ViewStyle };

/** Filter-chip. Valgt = sort. */
export function Chip({ label, selected, onPress, icon, trailing, small, style }: Props) {
  const fg = selected ? color.textOnAction : color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [s.chip, small && s.small, selected && s.on, pressed && { opacity: 0.75 }, style]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <T v="label" c={fg} style={small ? { fontSize: 13 } : undefined}>
        {label}
      </T>
      {trailing && <Icon name={trailing} size={16} color={fg} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    minHeight: TAP,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  small: { paddingHorizontal: 14 },
  on: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
