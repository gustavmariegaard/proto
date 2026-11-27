import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { color, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  /** Læses op af skærmlæsere. Påkrævet, fordi knappen ikke har synlig tekst. */
  label: string;
  onPress?: () => void;
  /** outline = hvid med kant, filled = sort, ghost = kun ikonet (standard) */
  variant?: 'outline' | 'filled' | 'ghost';
  /** Ældre navn for variant="outline" */
  outline?: boolean;
  size?: number;
  tint?: string;
  /** Mint prik, der viser noget ulæst */
  dot?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Rund ikon-knap, 44 px (prototypens IconButton) */
export function IconButton({ icon, label, onPress, variant, outline, size = 24, tint, dot, disabled, style }: Props) {
  const v = variant ?? (outline ? 'outline' : 'ghost');
  const fg = tint ?? (v === 'filled' ? color.textOnAction : color.textPrimary);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dot ? `${label}, ulæst` : label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.btn, v === 'outline' && s.outline, v === 'filled' && s.filled, pressed && s.pressed, style]}
    >
      <Icon name={icon} size={size} color={fg} />
      {dot && <View style={s.dot} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    width: TAP,
    height: TAP,
    flexShrink: 0,
    borderRadius: TAP / 2,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  filled: { backgroundColor: color.actionPrimary },
  pressed: { transform: [{ scale: 0.94 }] },
  /* Ulæst-prik: 10 px, 29 px fra venstre og 8 px fra toppen (Figma). Kanten (1 px) trækkes fra. */
  dot: {
    position: 'absolute',
    left: 28,
    top: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.accentHighlight,
    borderWidth: 2,
    borderColor: color.bgApp,
  },
});
