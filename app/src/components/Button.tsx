import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
};

/** Knap: primary = sort, secondary = hvid med kant, ghost = kun tekst */
export function Button({ title, variant = 'primary', icon, loading, block, disabled, style, ...rest }: Props) {
  const fg = variant === 'primary' ? color.textOnAction : variant === 'danger' ? color.danger : color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        s[variant],
        block && s.block,
        (disabled || loading) && s.disabled,
        pressed && s.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <T v="label" c={fg}>
            {title}
          </T>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: TAP + 4,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: color.actionPrimary },
  secondary: { backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderStrong },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: 12 },
  danger: { backgroundColor: 'transparent' },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
