import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { color, TAB_SPACE } from '@/theme/tokens';
import { MoreSheet } from './MoreSheet';
import { reportTabScroll, TabBar } from './TabBar';
import { TopBar } from './TopBar';

/**
 * Rammen om Torvet og Begivenheder (prototypens AppShell): fast topbar,
 * rullende indhold og den flydende bundmenu ovenpå. Kun indholdet ruller.
 */
export function MarketEventsShell({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> }) {
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <View style={s.shell}>
      <TopBar />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: TAB_SPACE }}
        keyboardShouldPersistTaps="handled"
        onScroll={reportTabScroll}
        scrollEventThrottle={32}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await onRefresh();
                setRefreshing(false);
              }}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {/* Samme bundmenu og Mere-ark som fanerne: ingen fane er markeret her, Mere kun mens arket er åbent */}
      <TabBar
        current={more ? 'mere' : undefined}
        onPress={(name) => (name === 'ny' ? router.push('/opret') : name === 'mere' ? setMore(true) : router.navigate(name === 'index' ? '/' : `/${name}`))}
      />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: color.bgApp, overflow: 'hidden' },
});
