import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  tint?: string;
  outline?: boolean;
  /** Lille grøn prik (fx ulæste) */
  dot?: boolean;
  style?: ViewStyle;
};

/** Rund ikonknap, 44 × 44 */
export function IconButton({ icon, label, onPress, size = 24, tint = color.textPrimary, outline, dot, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [s.btn, outline && s.outline, pressed && { opacity: 0.6 }, style]}
    >
      <Icon name={icon} size={size} color={tint} />
      {dot && <View style={s.dot} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { width: TAP, height: TAP, borderRadius: TAP / 2, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  dot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
});
