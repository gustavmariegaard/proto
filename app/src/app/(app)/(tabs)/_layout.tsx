import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useUnread } from '@/lib/unread';
import { color, radius } from '@/theme/tokens';

const items: { name: string; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'home', label: 'Hjem' },
  { name: 'debat', icon: 'compass', label: 'Offentlig debat' },
  { name: 'ny', icon: 'plus', label: 'Opret' },
  { name: 'beskeder', icon: 'chat', label: 'Beskeder' },
  { name: 'profil', icon: 'user', label: 'Profil' },
];

/** Bundmenuen: en svævende pille som i prototypen. Den valgte fane har grøn baggrund. */
function TabBar({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  const current = state.routes[state.index]?.name;
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={s.bar} accessibilityRole="tablist">
        {items.map((it) => {
          const on = current === it.name;
          return (
            <Pressable
              key={it.name}
              accessibilityRole="tab"
              accessibilityLabel={it.label}
              accessibilityState={{ selected: on }}
              style={[s.item, on && s.itemOn]}
              onPress={() => (it.name === 'ny' ? router.push('/opret') : router.navigate(it.name === 'index' ? '/' : `/${it.name}`))}
            >
              <Icon name={it.icon} size={24} />
              {it.name === 'beskeder' && unread.messages > 0 && <View style={s.dot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bgApp } }}>
      {items.map((it) => (
        <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />
      ))}
    </Tabs>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: color.bgSurface,
    borderWidth: 1,
    borderColor: color.borderDefault,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { flex: 1, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  itemOn: { backgroundColor: color.accentBg },
  dot: { position: 'absolute', top: 10, right: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent },
});
