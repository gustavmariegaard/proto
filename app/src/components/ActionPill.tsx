import { Pressable, StyleSheet } from 'react-native';
import { fmtNumber } from '@/lib/time';
import { color, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

type Props = { icon: IconName; label: string; count?: number; on?: boolean; filled?: boolean; tint?: string; onPress?: () => void };

/** Handling under et opslag: ikon + antal i en pille (hjerte, kommentarer, del, gem) */
export function ActionPill({ icon, label, count = 0, on, filled, tint, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}: ${fmtNumber(count)}` : label}
      accessibilityState={on !== undefined ? { selected: on } : undefined}
      hitSlop={{ top: 2, bottom: 2 }}
      onPress={onPress}
      style={({ pressed }) => [s.pill, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={20} filled={filled} color={tint} />
      {count > 0 && (
        <T v="captionStrong" style={{ fontVariant: ['tabular-nums'] }}>
          {fmtNumber(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
