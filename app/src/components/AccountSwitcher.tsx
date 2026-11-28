import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useActingAs, type MyPage } from '@/lib/actingAs';
import { useMe } from '@/lib/session';
import { fmtNumber } from '@/lib/time';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { RadioDot } from './CreateParts';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';

/**
 * "Skift profil" (som at skifte konto på Instagram): din personlige profil og dine sider.
 * Valget gælder hele appen: Profil viser den valgte, og nye opslag laves som den.
 */
export function AccountSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const { acting, pages, switchTo } = useActingAs(me.id);
  const pick = async (p: MyPage | null) => {
    await switchTo(p);
    onClose();
    router.navigate('/profil');
  };
  return (
    <Sheet open={open} onClose={onClose} title="Skift profil" initialSize="auto" dim>
      <View style={s.list} accessibilityRole="radiogroup" accessibilityLabel="Brug ciircle som">
        <Row
          on={acting.kind === 'person'}
          name={me.name}
          path={me.avatar_path}
          hint={`@${me.username} · Personlig profil`}
          onPress={() => pick(null)}
        />
        {pages.map((p) => (
          <Row
            key={p.id}
            on={acting.kind === 'side' && acting.id === p.id}
            name={p.name}
            path={p.avatar_path}
            page
            hint={`@${p.handle} · Side · ${fmtNumber(p.followers)} ${p.followers === 1 ? 'følger' : 'følgere'}`}
            onPress={() => pick(p)}
          />
        ))}
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            onClose();
            router.push('/sider/ny');
          }}
          style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}
        >
          <View style={s.add}>
            <Icon name="plus" size={20} color={color.green700} />
          </View>
          <View style={s.text}>
            <T v="label">Opret en side</T>
            <T v="caption" c={color.textSecondary}>
              Til en forening, virksomhed eller et fællesskab
            </T>
          </View>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Row({ on, name, path, hint, page, onPress }: { on: boolean; name: string; path: string | null; hint: string; page?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={name} onPress={onPress} style={({ pressed }) => [s.row, on && s.rowOn, pressed && { opacity: 0.85 }]}>
      <View>
        <Avatar name={name} path={path} size="M" />
        {page && (
          <View style={s.pageMark}>
            <Icon name="building" size={10} color={color.white} />
          </View>
        )}
      </View>
      <View style={s.text}>
        <T v="headingS" numberOfLines={1}>
          {name}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {hint}
        </T>
      </View>
      <RadioDot on={on} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  list: { gap: 8, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  rowOn: { borderColor: color.textPrimary },
  text: { flex: 1, minWidth: 0, gap: 2 },
  add: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
  pageMark: { position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: color.ink900, borderWidth: 2, borderColor: color.bgSurface },
});
