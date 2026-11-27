import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/** Sortering af kommentarer (som i prototypen) */
export type CommentOrder = 'relevante' | 'omdiskuterede' | 'nyeste' | 'aeldste';

const options: { id: CommentOrder; label: string }[] = [
  { id: 'relevante', label: 'Relevante' },
  { id: 'omdiskuterede', label: 'Omdiskuterede' },
  { id: 'nyeste', label: 'Nyeste' },
  { id: 'aeldste', label: 'Ældste' },
];

/** Én lille knap ("Relevante ⌄"), der åbner en kort liste */
export function CommentSort({ value, onChange }: { value: CommentOrder; onChange: (v: CommentOrder) => void }) {
  const [open, setOpen] = useState(false);
  // Menuen lægges lige under knappen, 4 px inde fra knappens venstre kant (som i prototypen)
  const [pos, setPos] = useState({ left: 16, top: 0 });
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { width } = useWindowDimensions();
  const current = options.find((o) => o.id === value)!;
  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sorter kommentarer: ${current.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          ref.current?.measureInWindow((x, y, w, h) => {
            setPos({ left: Math.min(x + 4, width - 232), top: y + h - 2 });
            setOpen(true);
          });
        }}
        style={s.btn}
      >
        <T v="captionStrong" c={color.textSecondary}>
          {current.label}
        </T>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron-right" size={16} color={color.textSecondary} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Luk" />
        <View style={[s.menu, pos]} accessibilityRole="menu">
          {options.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: o.id === value }}
              onPress={() => {
                onChange(o.id);
                setOpen(false);
              }}
              style={({ pressed }) => [s.opt, pressed && { backgroundColor: color.bgSubtle }]}
            >
              <T v={o.id === value ? 'label' : 'bodyS'}>{o.label}</T>
              {o.id === value && <Icon name="check" size={18} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

type Sortable = { likes: number; replies: number; created_at: string };

/** Sorterer tråde (en kommentar og dens svar). Svar står altid under deres kommentar. */
export function sortThreads<T extends Sortable>(items: T[], order: CommentOrder): T[] {
  const age = (t: T) => (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const hot = (t: T) => (t.likes + t.replies * 2 + 1) / Math.pow(age(t) + 2, 1.2);
  const by: Record<CommentOrder, (a: T, b: T) => number> = {
    relevante: (a, b) => hot(b) - hot(a),
    omdiskuterede: (a, b) => b.replies - a.replies || b.likes - a.likes,
    nyeste: (a, b) => age(a) - age(b),
    aeldste: (a, b) => age(b) - age(a),
  };
  return [...items].sort(by[order]);
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: TAP, alignSelf: 'flex-start', paddingHorizontal: 8 },
  menu: {
    position: 'absolute',
    minWidth: 220,
    padding: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  opt: { minHeight: TAP, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, borderRadius: radius.sm },
});
