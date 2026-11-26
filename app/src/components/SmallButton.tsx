import { Pressable, StyleSheet } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { T } from './T';

/** Lille knap i en række (Følg, Fjern blokering, Vis igen …). dark = sort. */
export function SmallButton({ title, onPress, dark }: { title: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.btn, dark && s.dark, pressed && { opacity: 0.7 }]}>
      <T v="label" c={dark ? color.textOnAction : color.textPrimary}>
        {title}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    minHeight: TAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dark: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
