import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius } from '@/theme/tokens';
import { T } from './T';

/** Ark nedefra (menuer som ⋯). Tryk udenfor for at lukke. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Luk" />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />
        {title && (
          <T v="headingM" style={s.title} accessibilityRole="header">
            {title}
          </T>
        )}
        {children}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: color.bgSurface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.borderStrong, marginBottom: 8 },
  title: { textAlign: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
});
