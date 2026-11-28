import { StyleSheet, View } from 'react-native';
import { useActingAs } from '@/lib/actingAs';
import { useMe } from '@/lib/session';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { MintTile } from './CreateFlow';
import type { IconName } from './Icon';
import { T } from './T';

/**
 * Vises, når man bruger appen som en side et sted, sider ikke hører til
 * (Offentlig debat, Flicks, moments). Sider deler kun opslag, og de vises under Interesser.
 */
export function PageOnlyNotice({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const me = useMe();
  const { acting, switchTo } = useActingAs(me.id);
  const first = me.name.split(' ')[0] || me.name;
  return (
    <View style={s.card}>
      <MintTile icon={icon} size={48} />
      <T v="titleL" style={s.center} accessibilityRole="header">
        {title}
      </T>
      <T v="bodyS" c={color.textSecondary} style={s.center}>
        {text}
      </T>
      {acting.kind === 'side' && (
        <View style={s.as}>
          <Avatar name={acting.name} path={acting.avatar_path} size={22} />
          <T v="caption" c={color.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
            Du bruger ciircle som {acting.name}
          </T>
        </View>
      )}
      <Button block onPress={() => switchTo(null)}>
        {`Skift til ${first}`}
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', gap: 10, padding: 20, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  center: { textAlign: 'center' },
  as: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', marginBottom: 4 },
});
