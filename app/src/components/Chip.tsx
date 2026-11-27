import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Props = {
  /** Teksten (eller brug children som i prototypen) */
  label?: string;
  children?: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  trailing?: IconName;
  small?: boolean;
  style?: ViewStyle;
};

/** Filter-chip. Valgt = mørk. Bruges til emner, kategorier og filtre. */
export function Chip({ label, children, selected = false, onPress, icon, trailing, small, style }: Props) {
  const fg = selected ? color.textOnAction : color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, small && s.small, selected && s.on, style]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <T v="label" c={fg} numberOfLines={1} style={small ? { fontSize: 13 } : undefined}>
        {label ?? children}
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
    justifyContent: 'center',
    flexShrink: 0,
    gap: 6,
  },
  small: { paddingHorizontal: 14 },
  on: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
