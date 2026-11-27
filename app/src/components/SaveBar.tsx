import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow } from '@/theme/tokens';
import { Button } from './Button';
import { T } from './T';

/**
 * Vises nederst, når der er ændringer, der ikke er gemt.
 * Ændringerne træder først i kraft, når man trykker "Gem".
 */
export function SaveBar({ dirty, onSave, onReset, note, saving }: { dirty: boolean; onSave: () => void; onReset: () => void; note?: string; saving?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!dirty) return null;
  return (
    <View style={[s.bar, { paddingBottom: 12 + insets.bottom }]} accessibilityLabel="Ændringer, der ikke er gemt">
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {note ?? 'Du har ændringer, der ikke er gemt.'}
      </T>
      <View style={s.buttons}>
        <Button variant="secondary" onPress={onReset} style={s.btn}>
          Fortryd
        </Button>
        <Button onPress={onSave} loading={saving} style={s.btn}>
          Gem ændringer
        </Button>
      </View>
    </View>
  );
}

/** Kort bekræftelse efter gem */
export function SavedToast({ show }: { show: boolean }) {
  const insets = useSafeAreaInsets();
  if (!show) return null;
  return (
    <View style={[s.toastWrap, { bottom: 24 + insets.bottom }]} pointerEvents="none">
      <View style={s.toast} accessibilityRole="alert">
        <T v="captionStrong" c={color.textOnAction}>
          Ændringerne er gemt
        </T>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    ...shadow.savebar,
  },
  buttons: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  toast: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.actionPrimary },
});
