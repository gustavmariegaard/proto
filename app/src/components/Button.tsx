import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Variant =
  // Prototypens fire (Button.css)
  | 'primary'
  | 'secondary'
  | 'highlight'
  | 'ghost'
  // Appens ekstra: danger = rød tekst; accent/outlineLight/ghostLight bruges på log ind-skærmene
  | 'danger'
  | 'accent'
  | 'outlineLight'
  | 'ghostLight';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Teksten (eller brug children som i prototypen) */
  title?: string;
  children?: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  /** Fylder hele bredden */
  block?: boolean;
  style?: ViewStyle;
};

/**
 * Pille-knap, 44 px høj (prototypens Button).
 * Primary til hovedhandling, Secondary til alternativ,
 * Highlight sparsomt, Ghost til mindre vigtige handlinger.
 */
export function Button({ title, children, variant = 'primary', icon, loading, block, disabled, style, ...rest }: Props) {
  const fg =
    variant === 'primary'
      ? color.textOnAction
      : variant === 'highlight'
        ? color.textOnHighlight
        : variant === 'danger'
          ? color.danger
          : color.textPrimary;
  // Log ind-skærmenes knapper beholder deres egen størrelse og tryk-effekt
  const auth = variant === 'accent' || variant === 'outlineLight' || variant === 'ghostLight';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        auth && s.authBase,
        s[variant],
        block && s.block,
        (disabled || loading) && s.disabled,
        pressed && (auth ? s.pressedAuth : s.pressed),
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <T v="label" c={fg} numberOfLines={1}>
            {title ?? children}
          </T>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: TAP,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: color.actionPrimary },
  secondary: { backgroundColor: color.bgSurface, borderColor: color.borderStrong },
  highlight: { backgroundColor: color.accentHighlight },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent' },
  accent: { backgroundColor: color.accent, minHeight: 54 },
  outlineLight: { backgroundColor: color.bgSurface, borderWidth: 1.5, borderColor: color.borderStrong, minHeight: 54 },
  ghostLight: { backgroundColor: 'transparent', paddingHorizontal: 12 },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
  pressedAuth: { opacity: 0.75 },
  authBase: { borderWidth: 0, minHeight: TAP + 4 },
});
