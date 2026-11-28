import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnread } from '@/lib/unread';
import { useActingAs } from '@/lib/actingAs';
import { useMe } from '@/lib/session';
import { Avatar } from './Avatar';
import { T } from './T';
import { color, layout, radius } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Wordmark } from './Wordmark';

/**
 * Topbar: wordmark til venstre. Søg, beskeder og notifikationer til højre
 * uden cirkel, så de sidder integreret i siden. Mint prik = ulæst.
 * Lav topbar: lidt luft over (topGap), 10 px under, 20 px i siderne.
 */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  const me = useMe();
  const { acting } = useActingAs(me.id);
  return (
    <View style={[s.bar, { height: layout.appbarHeight + insets.top, paddingTop: layout.topGap + insets.top }]} accessibilityRole="header">
      <Pressable accessibilityRole="link" accessibilityLabel="ciircle, gå til Hjem" onPress={() => router.navigate('/')} style={s.home}>
        <Wordmark />
      </Pressable>
      {/* Som side: et lille mærke, så man altid kan se, hvem man bruger appen som */}
      {acting.kind === 'side' && (
        <Pressable accessibilityRole="link" accessibilityLabel={`Du bruger ciircle som ${acting.name}. Gå til siden`} onPress={() => router.navigate('/profil')} style={s.as}>
          <Avatar name={acting.name} path={acting.avatar_path} size={20} />
          <T v="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {acting.name}
          </T>
        </Pressable>
      )}
      <View style={s.actions}>
        <IconButton icon="search" label="Søg" onPress={() => router.push('/soeg')} />
        <IconButton icon="chat" label="Beskeder" dot={unread.messages > 0} onPress={() => router.push('/beskeder')} />
        <IconButton icon="bell" label="Notifikationer" dot={unread.notifications > 0} onPress={() => router.push('/notifikationer')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: color.bgApp,
    zIndex: 10,
  },
  as: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: 140, minHeight: 28, marginLeft: 10, marginRight: 'auto', paddingLeft: 4, paddingRight: 10, borderRadius: radius.pill, backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
  home: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm },
  /* Ikonerne flugter med højre margen, trykfladen rækker lidt ud. */
  actions: { flexDirection: 'row', gap: 6, marginRight: -10 },
});
