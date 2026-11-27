import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { MoreSheet } from '@/components/MoreSheet';
import { TabBar } from '@/components/TabBar';
import { color } from '@/theme/tokens';

// Profil er også en fane (så bundmenuen bliver), men har ingen knap: den nås fra Mere.
// Beskeder ligger uden for fanerne, for prototypen viser ingen bundmenu dér.
const routes = ['index', 'debat', 'ny', 'flicks', 'profil'];

/** Bundmenuen: prototypens flydende pille. Den valgte fane har grøn baggrund. */
function Bar({ state }: BottomTabBarProps) {
  const [more, setMore] = useState(false);
  const route = state.routes[state.index]?.name;
  // Som prototypen: Mere er kun markeret, mens arket er åbent; på Profil er ingen fane markeret
  const current = more ? 'mere' : route === 'profil' ? undefined : route;
  return (
    <>
      <TabBar
        current={current}
        onPress={(name) =>
          name === 'ny' ? router.push('/opret') : name === 'mere' ? setMore(true) : router.navigate(name === 'index' ? '/' : `/${name}`)
        }
      />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <Bar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bgApp } }}>
      {routes.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
