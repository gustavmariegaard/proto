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
  /** Ikon foran teksten (18 px som prototypens "Rediger interesser" / "Dine sider") */
  icon?: IconName;
  iconSize?: number;
  trailing?: IconName;
  accessibilityLabel?: string;
  small?: boolean;
  style?: ViewStyle;
};

/** Filter-chip. Valgt = mørk. Bruges til emner, kategorier og filtre. */
export function Chip({ label, children, selected = false, onPress, icon, iconSize = 18, trailing, small, style, accessibilityLabel }: Props) {
  const fg = selected ? color.textOnAction : color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, small && s.small, selected && s.on, style]}
    >
      {icon && <Icon name={icon} size={iconSize} color={fg} />}
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
