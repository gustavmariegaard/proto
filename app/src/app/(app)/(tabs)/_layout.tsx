import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useState } from 'react';
import { MoreSheet } from '@/components/MoreSheet';
import { color, radius } from '@/theme/tokens';

// Som i prototypen: Hjem, Offentlig debat, Opret, Flicks og Mere.
// Beskeder og Profil er også faner (så bundmenuen bliver), men har ingen knap: de nås fra Hjem og Mere.
const items: { name: string; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'home', label: 'Hjem' },
  { name: 'debat', icon: 'compass', label: 'Offentlig debat' },
  { name: 'ny', icon: 'plus', label: 'Opret' },
  { name: 'flicks', icon: 'clip', label: 'Flicks' },
  { name: 'mere', icon: 'more', label: 'Mere' },
];
const routes = ['index', 'debat', 'ny', 'flicks', 'beskeder', 'profil'];

/** Bundmenuen: en svævende pille som i prototypen. Den valgte fane har grøn baggrund. */
function TabBar({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  const route = state.routes[state.index]?.name;
  // Profil hører under Mere
  const current = route === 'profil' ? 'mere' : route;
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 12), pointerEvents: 'box-none' }]}>
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
              onPress={() =>
                it.name === 'ny' ? router.push('/opret') : it.name === 'mere' ? setMore(true) : router.navigate(it.name === 'index' ? '/' : `/${it.name}`)
              }
            >
              <Icon name={it.icon} size={24} />
            </Pressable>
          );
        })}
      </View>
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bgApp } }}>
      {routes.map((name) => (
        <Tabs.Screen key={name} name={name} />
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
});
