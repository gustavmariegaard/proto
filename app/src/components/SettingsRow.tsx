import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { T } from './T';

/** Række i Indstillinger: ikon, titel, evt. hint og pil */
export function SettingsRow({ icon, title, hint, onPress, danger }: { icon: IconName; title: string; hint?: string; onPress: () => void; danger?: boolean }) {
  const c = danger ? color.danger : color.textPrimary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}>
      <View style={s.icon}>
        <Icon name={icon} size={20} color={c} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headingS" c={c}>
          {title}
        </T>
        {hint && (
          <T v="caption" c={color.textSecondary}>
            {hint}
          </T>
        )}
      </View>
      {!danger && <Icon name="chevron-right" size={20} color={color.textSecondary} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
});
