import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMe } from '@/lib/session';
import { color, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';

const tiles: { label: string; icon: IconName; to: string }[] = [
  { label: 'Begivenheder', icon: 'calendar', to: '/begivenheder' },
  { label: 'Torvet', icon: 'shop', to: '/torvet' },
  { label: 'Grupper', icon: 'circles', to: '/grupper' },
  { label: 'Sider', icon: 'flag', to: '/sider' },
  { label: 'Gemt', icon: 'bookmark', to: '/gemt' },
  { label: 'Udvid cirkel', icon: 'user-plus', to: '/find-folk' },
];

/** "Mere" i bundmenuen (som i prototypen): din profil og genveje */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Mere">
      <View style={s.body}>
        <Pressable accessibilityRole="link" onPress={() => go('/profil')} style={({ pressed }) => [s.profile, pressed && { opacity: 0.7 }]}>
          <Avatar name={me.name} path={me.avatar_path} />
          <View style={{ flex: 1 }}>
            <T v="headingS" numberOfLines={1}>
              {me.name}
            </T>
            <T v="caption" c={color.textSecondary}>
              Se din profil
            </T>
          </View>
          <Icon name="chevron-right" size={18} />
        </Pressable>
        <View style={s.tiles}>
          {tiles.map((t) => (
            <Pressable key={t.to} accessibilityRole="link" onPress={() => go(t.to)} style={({ pressed }) => [s.tile, pressed && { opacity: 0.7 }]}>
              <View style={s.tileIcon}>
                <Icon name={t.icon} size={20} />
              </View>
              <T v="label" numberOfLines={1}>
                {t.label}
              </T>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="link" onPress={() => go('/indstillinger')} style={({ pressed }) => [s.settings, pressed && { opacity: 0.7 }]}>
          <Icon name="settings" size={20} />
          <T v="label">Indstillinger</T>
        </Pressable>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: color.bgSubtle,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48.5%',
    minHeight: TAP + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  settings: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP, paddingHorizontal: 12 },
});
